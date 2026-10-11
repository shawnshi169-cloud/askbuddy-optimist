import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { DiscoveryError, LIMITS, uuid } from "./contract";

export interface Snapshot {
  id: string; callerKey: string; binding: string; rank: string; expiresAt: number; ids: readonly string[];
}
export interface SnapshotStore {
  put(snapshot: Snapshot, now: number): Promise<void>;
  get(id: string, now: number): Promise<Snapshot | undefined>;
  remove(id: string): Promise<void>;
}
export const accountedBytes = (snapshot: Snapshot) =>
  4096 + snapshot.ids.length * 64 + Buffer.byteLength(JSON.stringify(snapshot), "utf8") * 2;

/** LOCAL ONLY: bounded process-local store, NOT durable or shared across instances. */
export class MemorySnapshotStore implements SnapshotStore {
  private readonly rows = new Map<string, { snapshot: Snapshot; bytes: number }>();
  private bytes = 0;
  constructor(private readonly budgets = {
    count: LIMITS.snapshots, perCaller: LIMITS.snapshotsPerCaller, bytes: LIMITS.memoryBytes,
  }) {}
  private prune(now: number) {
    for (const [id, row] of this.rows) if (row.snapshot.expiresAt <= now) this.drop(id);
  }
  private drop(id: string) {
    const row = this.rows.get(id);
    if (row) { this.bytes -= row.bytes; this.rows.delete(id); }
  }
  async put(snapshot: Snapshot, now: number): Promise<void> {
    this.prune(now);
    if (snapshot.expiresAt <= now) throw new DiscoveryError("SNAPSHOT_EXPIRED");
    if (snapshot.expiresAt - now > LIMITS.ttlMs || snapshot.ids.length > LIMITS.candidates || this.rows.has(snapshot.id))
      throw new DiscoveryError("DATA_INTEGRITY_ERROR");
    const copy = { ...snapshot, ids: [...snapshot.ids] };
    const bytes = accountedBytes(copy);
    const callers = [...this.rows.values()].filter(row => row.snapshot.callerKey === copy.callerKey).length;
    if (this.rows.size >= this.budgets.count || callers >= this.budgets.perCaller || this.bytes + bytes > this.budgets.bytes)
      throw new DiscoveryError("SNAPSHOT_CAPACITY_EXCEEDED");
    // No await between quota check and insert: atomic within this single-process prototype.
    this.rows.set(copy.id, { snapshot: copy, bytes }); this.bytes += bytes;
  }
  async get(id: string, now: number): Promise<Snapshot | undefined> {
    const row = this.rows.get(id);
    if (!row) return undefined;
    if (row.snapshot.expiresAt <= now) { this.drop(id); throw new DiscoveryError("SNAPSHOT_EXPIRED"); }
    return { ...row.snapshot, ids: [...row.snapshot.ids] };
  }
  async remove(id: string): Promise<void> { this.drop(id); }
  usage() { return { count: this.rows.size, accountedBytes: this.bytes }; }
}

const tokenSchema = z.object({
  s: uuid, p: z.number().int().min(1).max(LIMITS.candidates),
  b: z.string().regex(/^[a-f0-9]{64}$/), r: z.string().min(1).max(64),
  exp: z.number().int().positive().safe(),
}).strict();
export type CursorToken = z.infer<typeof tokenSchema>;
const aad = Buffer.from("ec3d1a:question-discovery:cursor:v1", "utf8");
function decodePart(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new DiscoveryError("INVALID_CURSOR");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw new DiscoveryError("INVALID_CURSOR");
  return decoded;
}

export class CursorCodec {
  private readonly key: Buffer;
  constructor(key: Uint8Array) {
    if (key.length !== 32) throw new Error("A server-managed 32-byte cursor key is required");
    this.key = Buffer.from(key);
  }
  encode(value: CursorToken): string {
    const token = tokenSchema.parse(value);
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, nonce);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(token), "utf8"), cipher.final()]);
    const output = ["v1", nonce.toString("base64url"), encrypted.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
    if (output.length > LIMITS.cursorBytes) throw new DiscoveryError("DATA_INTEGRITY_ERROR");
    return output;
  }
  decode(value: string): CursorToken {
    try {
      if (value.length > LIMITS.cursorBytes) throw new Error("length");
      const parts = value.split(".");
      if (parts.length !== 4 || parts[0] !== "v1") throw new Error("version");
      const [nonce, ciphertext, tag] = parts.slice(1).map(decodePart);
      if (nonce.length !== 12 || tag.length !== 16) throw new Error("shape");
      const decipher = createDecipheriv("aes-256-gcm", this.key, nonce);
      decipher.setAAD(aad); decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return tokenSchema.parse(JSON.parse(plaintext.toString("utf8")));
    } catch { throw new DiscoveryError("INVALID_CURSOR"); }
  }
}
