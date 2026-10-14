import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { DiscoveryError, LIMITS, uuid } from "../question-discovery-v1/contract";
import type { BoundQuery } from "../question-discovery-v1/repository";
import type { Snapshot, SnapshotStore } from "../question-discovery-v1/snapshot";
import { transaction, type PoolPort } from "./database";
import { KeyRing, TransportError } from "./security";

export const BUDGETS = Object.freeze({ candidates: 2000, snapshots: 128, perSubject: 4,
  bytes: 16 * 1024 * 1024, sessions: 1024, sessionTtlMs: 1_800_000, rateKeys: 4096 });
export const sessionToken = z.object({ id: uuid, epoch: z.number().int().positive().max(2147483647),
  exp: z.number().int().positive().safe() }).strict();
export type SessionToken = z.infer<typeof sessionToken>;
export interface ScopeSession extends SessionToken { nonce: string }
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const snapshotSchema = z.object({ id: uuid, callerKey: hash, binding: hash, rank: z.string().min(1).max(64),
  expiresAt: z.number().int().positive().safe(), ids: z.array(uuid).max(BUDGETS.candidates),
}).strict().refine(s => new Set(s.ids).size === s.ids.length);
export type Operation = <T>(signal: AbortSignal, work: (query: BoundQuery) => Promise<T>) => Promise<T>;

/** Shared PostgreSQL protocol; the injected runner must exclusively lease a short transaction. */
export class OperationalStore {
  constructor(private readonly run: Operation, private readonly keys: KeyRing) {}
  static postgres(pool: PoolPort, keys: KeyRing) {
    return new OperationalStore((signal, work) => transaction(pool, signal, "d1b_operations", false, work), keys);
  }
  private locked<T>(signal: AbortSignal, now: number, work: (q: BoundQuery) => Promise<T>): Promise<T> {
    return this.run(signal, async q => {
      const lock = await q("SELECT id FROM d1b_operational.gate WHERE id=true FOR UPDATE", []);
      if (lock.rows.length !== 1) throw new TransportError("STORAGE_CORRUPT", 503);
      // Only expired state is removed. No eviction of live snapshots to make room.
      await q("DELETE FROM d1b_operational.snapshots WHERE expires_at<=$1", [now]);
      await q("DELETE FROM d1b_operational.sessions WHERE expires_at<=$1", [now]);
      await q("DELETE FROM d1b_operational.rates WHERE window_bucket<$1", [Math.floor(now / 60000)]);
      return work(q);
    });
  }
  async rate(key: string, maximum: number, now: number, signal: AbortSignal): Promise<void> {
    hash.parse(key);
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 10000) throw new TransportError("CONFIGURATION_INVALID", 503);
    // A denied rate check still commits its expired-state pruning, but not an additional hit.
    const allowed = await this.locked(signal, now, async q => {
      const row = (await q("SELECT hits FROM d1b_operational.rates WHERE key=$1", [key])).rows[0];
      if (row && Number(row.hits) >= maximum) return false;
      if (!row && Number((await q("SELECT count(*) AS n FROM d1b_operational.rates", [])).rows[0].n) >= BUDGETS.rateKeys)
        throw new TransportError("RATE_STORAGE_CAPACITY", 503);
      await q(`INSERT INTO d1b_operational.rates(key,window_bucket,hits) VALUES($1,$2,1)
        ON CONFLICT(key) DO UPDATE SET hits=d1b_operational.rates.hits+1`, [key, Math.floor(now / 60000)]);
      return true;
    });
    if (!allowed) throw new TransportError("RATE_LIMITED", 429);
  }
  async session(token: SessionToken | null, mode: string, now: number, signal: AbortSignal): Promise<ScopeSession> {
    hash.parse(mode);
    return this.locked(signal, now, async q => {
      if (!token) {
        if (Number((await q("SELECT count(*) AS n FROM d1b_operational.sessions", [])).rows[0].n) >= BUDGETS.sessions)
          throw new TransportError("SESSION_CAPACITY_EXCEEDED", 503);
        const value = { id: randomUUID(), epoch: 1, exp: now + BUDGETS.sessionTtlMs, nonce: randomBytes(32).toString("hex") };
        await q("INSERT INTO d1b_operational.sessions(id,mode,epoch,expires_at,nonce) VALUES($1,$2,$3,$4,$5)",
          [value.id, mode, value.epoch, value.exp, value.nonce]); return value;
      }
      sessionToken.parse(token);
      if (token.exp <= now) throw new TransportError("SESSION_EXPIRED", 409);
      const row = (await q("SELECT mode,epoch,expires_at,nonce FROM d1b_operational.sessions WHERE id=$1", [token.id])).rows[0];
      if (!row || Number(row.epoch) !== token.epoch || Number(row.expires_at) !== token.exp)
        throw new TransportError("SESSION_UNAVAILABLE", 409);
      if (!hash.safeParse(row.nonce).success || !hash.safeParse(row.mode).success) throw new TransportError("STORAGE_CORRUPT", 503);
      if (row.mode === mode) return { ...token, nonce: String(row.nonce) };
      // A login/logout/account change invalidates old cookie epochs and old cursor bindings atomically.
      const next = { id: token.id, epoch: token.epoch + 1, exp: now + BUDGETS.sessionTtlMs, nonce: randomBytes(32).toString("hex") };
      sessionToken.parse(nextToken(next));
      await q("UPDATE d1b_operational.sessions SET mode=$2,epoch=$3,expires_at=$4,nonce=$5 WHERE id=$1",
        [next.id, mode, next.epoch, next.exp, next.nonce]); return next;
    });
  }
  scoped(callerKey: string, quotaKey: string, signal: AbortSignal): SnapshotStore {
    hash.parse(callerKey); hash.parse(quotaKey);
    return {
      put: async (snapshot: Snapshot, now: number) => {
        if (!snapshotSchema.safeParse(snapshot).success || snapshot.callerKey !== callerKey ||
          snapshot.expiresAt <= now || snapshot.expiresAt - now > LIMITS.ttlMs) throw new DiscoveryError("DATA_INTEGRITY_ERROR");
        const sealed = this.keys.seal("snapshot", snapshot), bytes = Buffer.byteLength(sealed) + 512;
        await this.locked(signal, now, async q => {
          const usage = (await q(`SELECT count(*) AS count,coalesce(sum(bytes),0) AS bytes,
            count(*) FILTER(WHERE quota_key=$1) AS subject FROM d1b_operational.snapshots`, [quotaKey])).rows[0];
          if (Number(usage.count) >= BUDGETS.snapshots || Number(usage.subject) >= BUDGETS.perSubject ||
            Number(usage.bytes) + bytes > BUDGETS.bytes) throw new DiscoveryError("SNAPSHOT_CAPACITY_EXCEEDED");
          if ((await q("SELECT id FROM d1b_operational.snapshots WHERE id=$1", [snapshot.id])).rows.length)
            throw new DiscoveryError("DATA_INTEGRITY_ERROR");
          await q("INSERT INTO d1b_operational.snapshots(id,caller_key,quota_key,expires_at,bytes,sealed) VALUES($1,$2,$3,$4,$5,$6)",
            [snapshot.id, callerKey, quotaKey, snapshot.expiresAt, bytes, sealed]);
        });
      },
      get: (id: string, now: number) => this.run(signal, async q => {
        uuid.parse(id);
        const row = (await q("SELECT sealed,expires_at,bytes FROM d1b_operational.snapshots WHERE id=$1 AND caller_key=$2", [id, callerKey])).rows[0];
        if (!row) return undefined;
        if (Number(row.expires_at) <= now) throw new DiscoveryError("SNAPSHOT_EXPIRED");
        try {
          const value = snapshotSchema.parse(this.keys.open("snapshot", String(row.sealed), 220000));
          if (value.id !== id || value.callerKey !== callerKey || value.expiresAt !== Number(row.expires_at) ||
            Buffer.byteLength(String(row.sealed)) + 512 !== Number(row.bytes)) throw new Error();
          return value;
        } catch { throw new TransportError("STORAGE_CORRUPT", 503); }
      }),
      remove: (id: string) => this.run(signal, async q => {
        uuid.parse(id); await q("DELETE FROM d1b_operational.snapshots WHERE id=$1 AND caller_key=$2", [id, callerKey]);
      }),
    };
  }
}
export const nextToken = (session: ScopeSession): SessionToken => ({ id: session.id, epoch: session.epoch, exp: session.exp });
