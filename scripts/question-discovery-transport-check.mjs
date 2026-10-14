import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { withDiscoveryTransport } from "./lib/question-discovery-transport-local.mjs";

const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
for (const file of [...files("src"), ...files("packages"), ...files("supabase/functions")].filter(p => /\.[jt]sx?$/.test(p)))
  assert.doesNotMatch(readFileSync(file, "utf8"), /question-discovery-transport-v1|DiscoveryHttpAdapter/);
const sql = readFileSync("local-backend/question-discovery-transport-v1/operational.proposed.sql", "utf8");
assert.match(sql, /PROPOSED \/ NOT DEPLOYED/);
assert.doesNotMatch(sql, /GRANT[^;]*\b(?:public\.|auth\.)|CREATE (?:OR REPLACE )?FUNCTION|DISABLE ROW LEVEL|BYPASSRLS\s+LOGIN/);

await withDiscoveryTransport(async api => {
  const { SupabaseJwtVerifier, supabaseUserCheck, KeyRing, RotatingCursorCodec, CallerDatabase, DiscoveryHttpAdapter,
    fingerprint, assertPrincipal, BUDGETS, callerBindingKey } = api;
  const signal = new AbortController().signal;
  const rejects = (fn, code) => assert.rejects(fn, e => e.code === code);
  let now = 1_800_000_000_000;
  const clock = () => now;
  const secretA = randomBytes(32).toString("base64url"), secretB = randomBytes(32).toString("base64url");
  const key = (id, secret, encryptUntil = now + 3600000) => ({ id, secret, notBefore: now - 1000,
    encryptUntil, decryptUntil: encryptUntil + 1800000 });
  const a = key("a", secretA), b = key("b", secretB);
  const ring = (active, keys) => new KeyRing(JSON.stringify({ active, keys }), clock);
  const keys = ring("a", [a]);
  const old = new RotatingCursorCodec(keys), rotated = new RotatingCursorCodec(ring("b", [a, b]));
  const value = { s: randomUUID(), p: 20, b: fingerprint("binding"), r: api.RANK_VERSION, exp: now + 600000 };
  const token = old.encode(value);
  assert.deepEqual(rotated.decode(token), value);
  assert.deepEqual(new RotatingCursorCodec(ring("b", [a, b])).decode(rotated.encode(value)), value);
  assert.throws(() => new RotatingCursorCodec(ring("b", [b])).decode(token), e => e.code === "INVALID_CURSOR");
  for (const index of [1, 2, 3, 4]) {
    const parts = token.split("."); parts[index] = (parts[index][0] === "A" ? "B" : "A") + parts[index].slice(1);
    assert.throws(() => rotated.decode(parts.join(".")), e => e.code === "INVALID_CURSOR");
  }
  assert.throws(() => keys.open("session", token, 1024), e => e.code === "SEALED_STATE_INVALID");
  assert.ok(!token.includes(value.s));
  now = a.decryptUntil; assert.throws(() => old.decode(token), e => e.code === "INVALID_CURSOR");
  assert.throws(() => old.encode(value), e => e.code === "KEY_UNAVAILABLE"); now = 1_800_000_000_000;
  for (const config of ["{}", JSON.stringify({ active: "a", keys: [a, a] }), JSON.stringify({ active: "a", keys: [{ ...a, secret: "bad" }] })])
    assert.throws(() => new KeyRing(config), e => e.code === "KEY_CONFIGURATION_INVALID");
  console.log("PASS cursor cryptography: AEAD, key id, cross-instance active keys, overlap, retirement, tampering, purpose binding; secrets ephemeral");

  // Test issuer only: cryptographically real signatures, NOT locally issued Supabase Auth sessions.
  const pair = await generateKeyPair("ES256"), wrongPair = await generateKeyPair("ES256");
  const jwk = { ...await exportJWK(pair.publicKey), kid: "local-test" };
  const issuer = "http://127.0.0.1:54321/auth/v1", userA = randomUUID(), userB = randomUUID(), sessionId = randomUUID();
  let accepted = true;
  const verifier = new SupabaseJwtVerifier(issuer, async () => accepted,
    { localTestKeys: createLocalJWKSet({ keys: [jwk] }), now: clock });
  const sign = (overrides = {}, privateKey = pair.privateKey) => new SignJWT({ role: "authenticated", session_id: sessionId,
    iss: issuer, aud: "authenticated", sub: userA, iat: now / 1000, exp: now / 1000 + 3600, ...overrides })
    .setProtectedHeader({ alg: "ES256", kid: "local-test" }).sign(privateKey);
  const bearer = async (overrides = {}, privateKey) => `Bearer ${await sign(overrides, privateKey)}`;
  const authA = await bearer(), authB = await bearer({ sub: userB });
  const principal = await verifier.verify(authA, signal);
  assert.equal(principal.userId, userA); assert.equal(principal.sessionId, sessionId); assertPrincipal(principal);
  assert.throws(() => assertPrincipal({ ...principal }), e => e.code === "UNVERIFIED_IDENTITY");
  for (const overrides of [{ iss: "https://evil.invalid/auth/v1" }, { aud: "service_role" }, { role: "service_role" },
    { exp: now / 1000 - 1 }, { session_id: null }, { sub: "forged" }, { iat: now / 1000 + 60 },
    { exp: now / 1000 + 7201 }, { aud: ["authenticated"] }])
    await rejects(async () => verifier.verify(await bearer(overrides), signal), "INVALID_AUTH_TOKEN");
  await rejects(async () => verifier.verify(await bearer({}, wrongPair.privateKey), signal), "INVALID_AUTH_TOKEN");
  for (const input of ["", "Bearer not-a-jwt", "Bearer " + "x".repeat(9000), "Basic abc"])
    await rejects(() => verifier.verify(input, signal), "INVALID_AUTH_TOKEN");
  accepted = false; await rejects(() => verifier.verify(authA, signal), "INVALID_AUTH_TOKEN"); accepted = true;
  assert.equal((await verifier.verify(null, signal)).role, "anon");
  let lookup;
  const check = supabaseUserCheck(issuer, "sb_publishable_test", async (url, options) => {
    lookup = { url: String(url), options }; return Response.json({ id: userA });
  });
  assert.equal(await check("ephemeral-token", userA, signal), true);
  assert.equal(lookup.url, `${issuer}/user`); assert.equal(lookup.options.redirect, "error");
  assert.equal(await check("ephemeral-token", userB, signal), false);
  await rejects(() => supabaseUserCheck(issuer, "sb_publishable_test", async () => Response.json({}, { status: 500 }))("x", userA, signal), "AUTH_UNAVAILABLE");
  assert.throws(() => supabaseUserCheck(issuer, "service-role-not-allowed"), e => e.code === "AUTH_CONFIGURATION_INVALID");
  console.log("PASS JWT verifier with isolated signed test issuer; genuine Supabase Auth token verification NOT VERIFIED (no local Auth service)");

  // Session-state pool double validates adapter cleanup mechanics, not PostgreSQL execution/RLS.
  const pool = { releases: [], connects: 0, async connect() {
    this.connects++; let role = "authenticator", sub = null, claims = null, claimRole = null;
    return { query: async (query, values) => {
      if (query.startsWith("SELECT set_config")) { [role, sub, claims] = values; claimRole = role; sub ||= null; return { rows: [] }; }
      if (query === "COMMIT" || query === "ROLLBACK") { role = "authenticator"; sub = claims = claimRole = null; return { rows: [] }; }
      if (query.includes("auth.uid()")) return { rows: [{ role, sub }] };
      if (query.includes("current_setting")) return { rows: [{ role, session: "authenticator", rolsuper: false, rolbypassrls: false, sub, claims, claim_role: claimRole }] };
      return { rows: [] };
    }, release: destroy => this.releases.push(Boolean(destroy)) };
  } };
  const database = new CallerDatabase(pool);
  for (const auth of [authA, authB, null]) {
    const p = await verifier.verify(auth, signal);
    await database.run(p, signal, async q => assert.deepEqual((await q("SELECT auth.uid()", [])).rows[0], { role: p.role, sub: p.userId }));
  }
  assert.equal(pool.releases.filter(Boolean).length, 0);
  await rejects(() => database.run(principal, signal, async () => { throw new api.DiscoveryError("TOPIC_INVALID_OR_INACTIVE"); }), "TOPIC_INVALID_OR_INACTIVE");
  assert.equal(pool.releases.at(-1), true);
  await rejects(() => database.run({ ...principal }, signal, async () => {}), "UNVERIFIED_IDENTITY");
  const controller = new AbortController(); controller.abort();
  await rejects(() => database.run(principal, controller.signal, async () => {}), "REQUEST_ABORTED");
  console.log("PASS database adapter unit: branded principals, A/B/anon context, rollback/destroy, stable domain errors, cancellation; real pool evidence is separate");

  // HTTP protocol test double; PostgreSQL operational protocol is exercised by the local suite.
  const sessions = new Map(), snapshots = new Map();
  const store = { rate: async () => {}, session: async (token, mode) => {
    if (!token) { const row = { id: randomUUID(), epoch: 1, exp: now + 1800000, nonce: randomBytes(32).toString("hex"), mode };
      sessions.set(row.id, row); return row; }
    if (token.exp <= now) throw new api.TransportError("SESSION_EXPIRED", 409);
    const row = sessions.get(token.id);
    if (!row || row.epoch !== token.epoch || row.exp !== token.exp) throw new api.TransportError("SESSION_UNAVAILABLE", 409);
    if (row.mode !== mode) { row.mode = mode; row.epoch++; row.nonce = randomBytes(32).toString("hex"); }
    return row;
  }, scoped: caller => ({ put: async s => { snapshots.set(s.id, structuredClone(s)); },
    get: async id => snapshots.get(id)?.callerKey === caller ? structuredClone(snapshots.get(id)) : undefined,
    remove: async id => { if (snapshots.get(id)?.callerKey === caller) snapshots.delete(id); } }) };
  const ids = Array.from({ length: 2000 }, () => randomUUID()).sort();
  let visible = new Set(ids), overflow = false;
  const db = { run: async (p, _signal, work) => {
    assertPrincipal(p);
    const caller = { role: p.role, userId: p.userId };
    return work(async (query, params) => {
      if (query === api.CANDIDATE_SQL) {
        assert.equal(params[2], 2001);
        return { rows: [{ caller, topicValid: true, ids: overflow ? [...ids, randomUUID()] : ids }] };
      }
      if (query === api.HYDRATE_SQL) return { rows: [{ caller, topicValid: true,
        items: params[2].filter(id => visible.has(id)).map(id => ({ questionId: id, title: "Stored question", primaryChannel: "career-development",
          topicIds: [], deepExchangeBudgetMaxCents: null, createdAt: "2026-10-11T00:00:00Z", status: "open", contextExcerpt: "Stored context", answerCount: 2 })) }] };
      return { rows: [caller] };
    });
  } };
  const origin = "https://d1b.local.invalid", ingress = fingerprint("loopback-socket");
  const instances = [0, 1].map(() => new DiscoveryHttpAdapter(verifier, db, store, keys, origin, clock));
  const base = { scope: { kind: "home" }, topicId: null, city: null, page: { cursor: null, limit: 20 } };
  const send = async (body = base, { cookie, auth = null, instance = 0, headers = {}, method = "POST", raw } = {}) => {
    const response = await instances[instance].handle(new Request(`${origin}/proposed/questions`, { method,
      headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}),
        ...(auth ? { Authorization: auth } : {}), ...headers }, ...(method === "POST" ? { body: raw ?? JSON.stringify(body) } : {}) }), ingress);
    return { ...await response.json(), status: response.status, cookie: response.headers.get("Set-Cookie")?.split(";")[0], headers: response.headers };
  };
  const first = await send(); assert.equal(first.status, 200); assert.equal(first.page.items.length, 20);
  assert.match(first.headers.get("Set-Cookie"), /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(first.headers.get("Cache-Control"), "no-store");
  const next = { ...base, page: { cursor: first.page.nextCursor, limit: 20 } };
  assert.equal((await send(next, { cookie: first.cookie, instance: 1 })).page.items[0].questionId, ids[20]);
  const other = await send();
  assert.equal((await send(next, { cookie: other.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
  assert.equal((await send(next)).error, "SESSION_REQUIRED");
  assert.equal((await send(base, { cookie: "__Host-d1b-scope=" + randomUUID() })).error, "INVALID_SESSION");
  assert.equal((await send(base, { cookie: first.cookie + "; " + first.cookie })).error, "INVALID_SESSION");
  assert.equal((await send({ ...next, topicId: randomUUID() }, { cookie: first.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
  assert.equal((await send({ ...next, scope: { kind: "channel", primaryChannel: "career-development" } }, { cookie: first.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
  const login = await send(next, { cookie: first.cookie, auth: authA });
  assert.equal(login.error, "CURSOR_CONTEXT_MISMATCH"); assert.ok(login.cookie);
  assert.equal((await send(base, { cookie: first.cookie })).error, "SESSION_UNAVAILABLE");
  const aPage = await send(base, { cookie: login.cookie, auth: authA });
  const aNext = { ...base, page: { cursor: aPage.page.nextCursor, limit: 20 } };
  const switched = await send(aNext, { cookie: aPage.cookie, auth: authB });
  assert.equal(switched.error, "CURSOR_CONTEXT_MISMATCH");
  assert.equal((await send(aNext, { cookie: aPage.cookie, auth: authA })).error, "SESSION_UNAVAILABLE");
  const logout = await send(aNext, { cookie: switched.cookie });
  assert.equal(logout.error, "CURSOR_CONTEXT_MISMATCH");
  assert.notEqual(callerBindingKey(principal, "a".repeat(64), "s1"), callerBindingKey(principal, "a".repeat(64), "s2"));
  assert.equal((await send(base, { headers: { Origin: "https://evil.invalid" } })).error, "ORIGIN_DENIED");
  assert.equal((await send(base, { method: "GET" })).status, 405);
  assert.equal((await send(base, { raw: "x".repeat(2049) })).status, 413);
  assert.equal((await send({ ...base, viewerId: userB })).error, "INVALID_INPUT");
  assert.equal((await send({ ...base, city: "Shanghai" })).error, "UNSUPPORTED_CITY_FILTER");
  assert.equal((await send({ ...base, page: { cursor: null, limit: 21 } })).error, "INVALID_PAGE_LIMIT");
  overflow = true; assert.equal((await send()).error, "SNAPSHOT_CAPACITY_EXCEEDED"); overflow = false;
  const walk = await send(); let page = walk.page, cursor = page.nextCursor, seen = page.items.map(i => i.questionId), pages = 1;
  visible.delete(ids[20]);
  while (cursor) { const result = await send({ ...base, page: { cursor, limit: 20 } }, { cookie: walk.cookie, instance: pages % 2 });
    assert.equal(result.status, 200); seen.push(...result.page.items.map(i => i.questionId)); cursor = result.page.nextCursor; pages++; }
  assert.equal(pages, 100); assert.equal(seen.length, 1999); assert.equal(new Set(seen).size, 1999);
  assert.ok(!seen.includes(ids[20]));
  now += 600000; assert.equal((await send({ ...base, page: { cursor: walk.page.nextCursor, limit: 20 } }, { cookie: walk.cookie })).error, "SNAPSHOT_EXPIRED");
  console.log(`PASS Web Request/Response contract: two adapter instances (shared test double), identity transitions, fixation rejection, ${BUDGETS.candidates} complete candidates / 100 pages, live exclusion, no silent overflow`);
  console.log("NOT VERIFIED here: actual HTTP sockets, genuine Supabase Auth, concurrent PostgreSQL quota and cross-connection commit visibility; see local integration evidence");
});
