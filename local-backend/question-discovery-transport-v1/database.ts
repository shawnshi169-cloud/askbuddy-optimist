import type { BoundQuery } from "../question-discovery-v1/repository";
import { DiscoveryError } from "../question-discovery-v1/contract";
import { assertPrincipal, type Principal } from "./auth";
import { TransportError } from "./security";

export interface Lease { query: BoundQuery; release(destroy?: boolean): void }
export interface PoolPort { connect(): Promise<Lease> }
async function acquire(pool: PoolPort, signal: AbortSignal): Promise<Lease> {
  if (signal.aborted) throw new TransportError("REQUEST_ABORTED", 503);
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = () => { finished = true; clearTimeout(timer); signal.removeEventListener("abort", abort); };
    const abort = () => { if (!finished) { finish(); reject(new TransportError("DATABASE_UNAVAILABLE", 503)); } };
    const timer = setTimeout(abort, 1000);
    signal.addEventListener("abort", abort, { once: true });
    pool.connect().then(client => { if (finished) client.release(true); else { finish(); resolve(client); } }, abort);
  });
}

export async function transaction<T>(pool: PoolPort, signal: AbortSignal, login: string, readOnly: boolean,
  work: (query: BoundQuery) => Promise<T>): Promise<T> {
  const client = await acquire(pool, signal);
  let destroyed = false, begun = false;
  const destroy = () => { if (!destroyed) { destroyed = true; client.release(true); } };
  const query: BoundQuery = async (sql, values) => {
    if (signal.aborted || destroyed) throw new TransportError("REQUEST_ABORTED", 503);
    return client.query(sql, values);
  };
  signal.addEventListener("abort", destroy, { once: true });
  try {
    const row = (await query(`SELECT current_user::text AS role,session_user::text AS session,
      r.rolsuper,r.rolbypassrls,current_setting('request.jwt.claim.sub',true) AS sub,
      current_setting('request.jwt.claims',true) AS claims,current_setting('request.jwt.claim.role',true) AS claim_role
      FROM pg_roles r WHERE r.rolname=current_user`, [])).rows[0];
    if (row.role !== login || row.session !== login || row.rolsuper !== false || row.rolbypassrls !== false || row.sub || row.claims || row.claim_role)
      throw new TransportError("UNTRUSTED_DATABASE_SESSION", 503);
    await query(readOnly ? "BEGIN READ ONLY" : "BEGIN", []); begun = true;
    await query("SET LOCAL statement_timeout='2s'", []);
    await query("SET LOCAL lock_timeout='1s'", []);
    await query("SET LOCAL idle_in_transaction_session_timeout='5s'", []);
    const result = await work(query);
    await query("COMMIT", []); begun = false;
    const clean = (await query(`SELECT current_user::text AS role,current_setting('request.jwt.claim.sub',true) AS sub,
      current_setting('request.jwt.claims',true) AS claims,current_setting('request.jwt.claim.role',true) AS claim_role`, [])).rows[0];
    if (clean.role !== login || clean.sub || clean.claims || clean.claim_role) throw new TransportError("DATABASE_CONTEXT_LEAK", 503);
    return result;
  } catch (error) {
    if (!destroyed && begun) { try { await client.query("ROLLBACK", []); } catch { destroy(); } }
    // Discard error/cancelled connections rather than return unknown session state to another caller.
    destroy();
    if (signal.aborted) throw new TransportError("REQUEST_ABORTED", 503);
    throw error instanceof TransportError || error instanceof DiscoveryError ? error : new TransportError("DATABASE_UNAVAILABLE", 503);
  } finally {
    signal.removeEventListener("abort", destroy);
    if (!destroyed) client.release();
  }
}

export class CallerDatabase {
  constructor(private readonly pool: PoolPort) {}
  async run<T>(principal: Principal, signal: AbortSignal, work: (query: BoundQuery) => Promise<T>): Promise<T> {
    assertPrincipal(principal);
    return transaction(this.pool, signal, "authenticator", true, async query => {
      await query(`SELECT set_config('role',$1,true),set_config('request.jwt.claim.sub',$2,true),
        set_config('request.jwt.claim.role',$1,true),set_config('request.jwt.claims',$3,true)`,
      [principal.role, principal.userId ?? "", JSON.stringify({ role: principal.role, sub: principal.userId,
        session_id: principal.sessionId })]);
      const actual = (await query("SELECT current_user::text AS role,auth.uid()::text AS sub", [])).rows[0];
      if (actual.role !== principal.role || actual.sub !== principal.userId) throw new TransportError("DATABASE_CONTEXT_LEAK", 503);
      return work(query);
    });
  }
}
