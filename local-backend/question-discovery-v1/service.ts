import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DiscoveryError, LIMITS, RANK_VERSION, parsePage, parseRequest, uuid, type Page, type Request } from "./contract";
import type { QuestionRepository } from "./repository";
import { CursorCodec, type Snapshot, type SnapshotStore } from "./snapshot";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
// A future transport must retain this server-generated anonymous scope in a protected session.
// Losing/rotating it deliberately invalidates old anonymous cursors; clients cannot supply a viewer UUID.
export const newAnonymousScope = () => randomBytes(32).toString("hex");

export class QuestionDiscoveryService {
  constructor(private readonly repository: QuestionRepository, private readonly store: SnapshotStore,
    private readonly codec: CursorCodec, private readonly anonymousScope: string,
    private readonly now: () => number = Date.now, private readonly rank = RANK_VERSION) {
    if (!/^[a-f0-9]{64}$/.test(anonymousScope) || rank.length < 1 || rank.length > 64)
      throw new Error("Invalid server-side discovery configuration");
  }
  async page(value: unknown): Promise<Page> {
    const request = parseRequest(value);
    const caller = await this.repository.identity();
    if (!((caller.role === "anon" && caller.userId === null) ||
      (caller.role === "authenticated" && uuid.safeParse(caller.userId).success)))
      throw new DiscoveryError("UNTRUSTED_CALLER_CONTEXT");
    const callerKey = hash(caller.role === "anon" ? ["anon", this.anonymousScope] : ["authenticated", caller.userId]);
    const binding = hash(["questions", "no-text-query-v1", callerKey, request.scope, request.topicId,
      request.city, request.page.limit]);
    let snapshot: Snapshot;
    let position = 0;
    let created = false;
    if (request.page.cursor !== null) {
      const token = this.codec.decode(request.page.cursor);
      if (token.r !== this.rank) throw new DiscoveryError("CURSOR_RANK_MISMATCH");
      if (token.b !== binding) throw new DiscoveryError("CURSOR_CONTEXT_MISMATCH");
      if (token.exp <= this.now()) throw new DiscoveryError("SNAPSHOT_EXPIRED");
      const found = await this.store.get(token.s, this.now());
      if (!found) throw new DiscoveryError("SNAPSHOT_UNAVAILABLE");
      if (found.binding !== binding || found.callerKey !== callerKey || found.rank !== token.r ||
        found.expiresAt !== token.exp || token.p >= found.ids.length)
        throw new DiscoveryError("INVALID_CURSOR");
      snapshot = found; position = token.p;
    } else {
      const ids = await this.repository.recall(request, caller);
      if (ids.length > LIMITS.candidates) throw new DiscoveryError("SNAPSHOT_CAPACITY_EXCEEDED");
      if (new Set(ids).size !== ids.length || ids.some(id => !uuid.safeParse(id).success))
        throw new DiscoveryError("DATA_INTEGRITY_ERROR");
      snapshot = { id: randomUUID(), callerKey, binding, rank: this.rank, expiresAt: this.now() + LIMITS.ttlMs, ids };
      await this.store.put(snapshot, this.now()); created = true;
    }
    try {
      const end = Math.min(position + request.page.limit, snapshot.ids.length);
      const window = snapshot.ids.slice(position, end);
      const items = await this.repository.hydrate(window, request, caller);
      const positions = items.map(item => window.indexOf(item.questionId));
      if (positions.some((p, i) => p < 0 || (i > 0 && p <= positions[i - 1])))
        throw new DiscoveryError("DATA_INTEGRITY_ERROR");
      if (snapshot.expiresAt <= this.now()) throw new DiscoveryError("SNAPSHOT_EXPIRED");
      // Progress by scanned identities, not returned cards. A short/empty page may have a nextCursor.
      const page = parsePage({ items, snapshotId: snapshot.id,
        nextCursor: end < snapshot.ids.length ? this.codec.encode({ s: snapshot.id, p: end,
          b: binding, r: this.rank, exp: snapshot.expiresAt }) : null });
      if (Buffer.byteLength(JSON.stringify(page), "utf8") > LIMITS.responseBytes)
        throw new DiscoveryError("RESPONSE_CAPACITY_EXCEEDED");
      return page;
    } catch (error) {
      if (created) await this.store.remove(snapshot.id);
      throw error;
    }
  }
}

/** In-process JSON boundary only: NOT an HTTP endpoint, JWT verifier, RPC or deploy entrypoint. */
export async function handleLocalJson(service: QuestionDiscoveryService, body: string): Promise<string> {
  try {
    if (Buffer.byteLength(body, "utf8") > LIMITS.requestBytes) throw new DiscoveryError("INVALID_INPUT");
    let request: Request;
    try { request = parseRequest(JSON.parse(body)); }
    catch (error) { throw error instanceof DiscoveryError ? error : new DiscoveryError("INVALID_INPUT"); }
    return JSON.stringify({ ok: true, page: await service.page(request) });
  } catch (error) {
    return JSON.stringify({ ok: false, error: error instanceof DiscoveryError ? error.code : "BACKEND_UNAVAILABLE" });
  }
}
