import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { uuid } from "../question-discovery-v1/contract";
import { TransportError } from "./security";

export type Principal = Readonly<{ role: "anon"; userId: null; sessionId: null } |
  { role: "authenticated"; userId: string; sessionId: string }>;
const verified = new WeakSet<object>();
function register(value: Principal): Principal { const principal = Object.freeze(value); verified.add(principal); return principal; }
export function assertPrincipal(principal: Principal): void {
  if (!verified.has(principal)) throw new TransportError("UNVERIFIED_IDENTITY", 401);
}
export type UserCheck = (token: string, userId: string, signal: AbortSignal) => Promise<boolean>;

export class SupabaseJwtVerifier {
  private readonly key: JWTVerifyGetKey;
  constructor(private readonly issuer: string, private readonly userCheck: UserCheck,
    options: { localTestKeys?: JWTVerifyGetKey; now?: () => number } = {}) {
    const url = new URL(issuer);
    if (url.pathname !== "/auth/v1" || url.search || url.hash || url.username || url.password ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))))
      throw new TransportError("AUTH_CONFIGURATION_INVALID", 503);
    // Test keys are explicit dependency injection, never inferred from request headers/JWT jku.
    this.key = options.localTestKeys ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`),
      { timeoutDuration: 1500, cooldownDuration: 30_000, cacheMaxAge: 600_000 });
    this.now = options.now ?? Date.now;
  }
  private readonly now: () => number;
  async verify(authorization: string | null, signal: AbortSignal): Promise<Principal> {
    if (signal.aborted) throw new TransportError("REQUEST_ABORTED", 503);
    if (authorization === null) return register({ role: "anon", userId: null, sessionId: null });
    if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization) || authorization.length > 8192)
      throw new TransportError("INVALID_AUTH_TOKEN", 401);
    try {
      const { payload } = await jwtVerify(authorization.slice(7), this.key, { algorithms: ["ES256", "RS256"],
        issuer: this.issuer, audience: "authenticated", requiredClaims: ["exp", "iat", "sub", "session_id"],
        currentDate: new Date(this.now()), clockTolerance: 0 });
      if (payload.aud !== "authenticated" || payload.role !== "authenticated" ||
        !uuid.safeParse(payload.sub).success || !uuid.safeParse(payload.session_id).success ||
        !Number.isSafeInteger(payload.iat) || payload.iat! > this.now() / 1000 + 30 ||
        !Number.isSafeInteger(payload.exp) || payload.exp! <= payload.iat! || payload.exp! - payload.iat! > 7200)
        throw new Error();
      if (signal.aborted) throw new TransportError("REQUEST_ABORTED", 503);
      if (!await this.userCheck(authorization.slice(7), payload.sub!, signal)) throw new Error();
      return register({ role: "authenticated", userId: payload.sub!, sessionId: payload.session_id as string });
    } catch (error) {
      if (error instanceof TransportError && error.status === 503) throw error;
      throw new TransportError("INVALID_AUTH_TOKEN", 401);
    }
  }
}

/** No service key, no Auth-table SELECT. This is NOT a promise of immediate global token revocation. */
export function supabaseUserCheck(issuer: string, publicApiKey: string, request = fetch): UserCheck {
  const url = new URL(`${issuer}/user`);
  if (url.pathname !== "/auth/v1/user" || url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))))
    throw new TransportError("AUTH_CONFIGURATION_INVALID", 503);
  // Only publishable keys here; legacy/service JWT keys are intentionally not accepted.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicApiKey)) throw new TransportError("AUTH_CONFIGURATION_INVALID", 503);
  return async (token, userId, signal) => {
    try {
      const response = await request(url, { headers: { apikey: publicApiKey, Authorization: `Bearer ${token}` },
        redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) });
      if (response.status === 401 || response.status === 403) return false;
      if (!response.ok || !response.body) throw new Error();
      const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
      try { for (;;) { const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > 32768) throw new Error(); chunks.push(value); }
      } finally { await reader.cancel(); }
      const user = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { id?: unknown };
      return user.id === userId;
    } catch { throw new TransportError("AUTH_UNAVAILABLE", 503); }
  };
}
