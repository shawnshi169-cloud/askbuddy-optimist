import { DiscoveryError, LIMITS, parseRequest } from "../question-discovery-v1/contract";
import { SqlQuestionRepository } from "../question-discovery-v1/repository";
import { callerBindingKey, QuestionDiscoveryService } from "../question-discovery-v1/service";
import { SupabaseJwtVerifier } from "./auth";
import { CallerDatabase } from "./database";
import { fingerprint, KeyRing, RotatingCursorCodec, TransportError } from "./security";
import { BUDGETS, nextToken, OperationalStore, sessionToken, type SessionToken } from "./store";

const cookieName = "__Host-d1b-scope";
/** PROPOSED / NOT DEPLOYED. Constructed explicitly; no route registration or frontend import. */
export class DiscoveryHttpAdapter {
  private inflight = 0;
  constructor(private readonly auth: SupabaseJwtVerifier, private readonly database: CallerDatabase,
    private readonly storage: OperationalStore, private readonly keys: KeyRing, private readonly allowedOrigin: string,
    private readonly now: () => number = Date.now) {
    if (new URL(allowedOrigin).origin !== allowedOrigin) throw new TransportError("CONFIGURATION_INVALID", 503);
  }
  /** ingressKey comes ONLY from trusted socket/proxy configuration, never forwarded request headers. */
  async handle(request: Request, ingressKey: string): Promise<Response> {
    let setCookie: string | undefined, entered = false;
    const response = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: {
      "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Authorization, Cookie, Origin",
      ...(setCookie ? { "Set-Cookie": setCookie } : {}),
    } });
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
    try {
      if (!/^[a-f0-9]{64}$/.test(ingressKey)) throw new TransportError("UNTRUSTED_INGRESS", 503);
      if (request.method !== "POST") throw new TransportError("METHOD_NOT_ALLOWED", 405);
      if (request.headers.get("Origin") !== this.allowedOrigin) throw new TransportError("ORIGIN_DENIED", 403);
      if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json")
        throw new TransportError("UNSUPPORTED_MEDIA_TYPE", 415);
      if (this.inflight >= 4) throw new TransportError("INSTANCE_BUSY", 503);
      this.inflight++; entered = true;
      await this.storage.rate(fingerprint(["global"]), 600, this.now(), signal);
      await this.storage.rate(fingerprint(["ingress", ingressKey]), 120, this.now(), signal);
      const reader = request.body?.getReader(); if (!reader) throw new DiscoveryError("INVALID_INPUT");
      const chunks: Uint8Array[] = []; let size = 0;
      const abort = () => { void reader.cancel(); };
      signal.addEventListener("abort", abort, { once: true });
      try { for (;;) {
        if (signal.aborted) throw new TransportError("REQUEST_ABORTED", 503);
        const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > LIMITS.requestBytes) throw new TransportError("REQUEST_TOO_LARGE", 413);
        chunks.push(value);
      } } finally { signal.removeEventListener("abort", abort); await reader.cancel(); }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new DiscoveryError("INVALID_INPUT"); }
      const input = parseRequest(body);
      const principal = await this.auth.verify(request.headers.get("Authorization"), signal);
      const cookie = request.headers.get("Cookie") ?? "";
      if (cookie.length > 4096) throw new TransportError("INVALID_SESSION", 409);
      const matches = cookie.split(";").map(s => s.trim()).filter(s => s.startsWith(`${cookieName}=`));
      if (matches.length > 1) throw new TransportError("INVALID_SESSION", 409);
      let token: SessionToken | null = null;
      if (matches.length) {
        try { token = sessionToken.parse(this.keys.open("session", matches[0].slice(cookieName.length + 1), 1024)); }
        catch { throw new TransportError("INVALID_SESSION", 409); }
      }
      if (!token && input.page.cursor) throw new TransportError("SESSION_REQUIRED", 409);
      if (!token) await this.storage.rate(fingerprint(["session-issuance", ingressKey]), 10, this.now(), signal);
      const session = await this.storage.session(token, fingerprint([principal.role, principal.userId, principal.sessionId]), this.now(), signal);
      setCookie = `${cookieName}=${this.keys.seal("session", nextToken(session))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor((session.exp - this.now()) / 1000))}`;
      const subject = fingerprint(["quota", principal.userId ?? session.id]);
      await this.storage.rate(fingerprint(["subject", subject]), 60, this.now(), signal);
      if (!input.page.cursor) await this.storage.rate(fingerprint(["snapshot-issuance", subject]), 4, this.now(), signal);
      const binding = fingerprint([principal.sessionId, session.nonce, session.epoch]);
      const callerKey = callerBindingKey(principal, session.nonce, binding);
      const page = await this.database.run(principal, signal, q => new QuestionDiscoveryService(
        new SqlQuestionRepository(q, BUDGETS.candidates), this.storage.scoped(callerKey, subject, signal),
        new RotatingCursorCodec(this.keys), session.nonce, this.now, undefined, binding, BUDGETS.candidates).page(input));
      if (signal.aborted) throw new TransportError("REQUEST_ABORTED", 503);
      return response(200, { ok: true, page });
    } catch (error) {
      const code = error instanceof TransportError || error instanceof DiscoveryError ? error.code : "BACKEND_UNAVAILABLE";
      const status = error instanceof TransportError ? error.status : error instanceof DiscoveryError ?
        (/CAPACITY|BACKEND|INTEGRITY/.test(code) ? 503 : /CURSOR|SNAPSHOT/.test(code) ? 409 : 400) : 503;
      return response(status, { ok: false, error: code });
    } finally { if (entered) this.inflight--; }
  }
}
