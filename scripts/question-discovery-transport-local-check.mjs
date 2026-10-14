import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { withDiscoveryTransport } from "./lib/question-discovery-transport-local.mjs";
import { withDisposablePostgres, isolatedPool } from "./lib/d1b-disposable-postgres.mjs";

assert.deepEqual(process.argv.slice(2), ["--local"]);
await withDisposablePostgres(async ({ config, operationalConfig, admin, cleanup, database: disposable }) => {
  await withDiscoveryTransport(async (api, compiled) => {
    const signal = new AbortController().signal;
    const rejects = (fn, code) => assert.rejects(fn, e => e.code === code);
    let now = Date.now(); const clock = () => now;
    const keysConfiguration = JSON.stringify({ active: "local", keys: [{ id: "local", secret: randomBytes(32).toString("base64url"),
      notBefore: now - 1000, encryptUntil: now + 7200000, decryptUntil: now + 9000000 }] });
    const keys = new api.KeyRing(keysConfiguration, clock);
    const pools = [0, 1].map(() => isolatedPool(operationalConfig, "d1b_operations", 2));
    const callerPool = isolatedPool(config, "authenticator", 2);
    for (const pool of [...pools, callerPool]) cleanup.push(() => pool.end());
    const stores = pools.map(pool => api.OperationalStore.postgres(pool, keys));
    const leases = await Promise.all(pools.map(pool => pool.connect()));
    try {
      const identities = await Promise.all(leases.map(c => c.query("SELECT current_user::text AS role,session_user::text AS session,pg_backend_pid() AS pid")));
      assert.equal(new Set(identities.map(r => r.rows[0].pid)).size, 2);
      for (const r of identities) { assert.equal(r.rows[0].role, "d1b_operations"); assert.equal(r.rows[0].session, "d1b_operations"); }
    } finally { leases.forEach(c => c.release()); }
    const ck = api.fingerprint("caller"), quota = api.fingerprint("subject");
    const scope = stores.map(s => s.scoped(ck, quota, signal));
    const record = () => ({ id: randomUUID(), callerKey: ck, binding: api.fingerprint("filter"), rank: api.RANK_VERSION,
      expiresAt: now + 600000, ids: Array.from({ length: 2000 }, () => randomUUID()).sort() });
    const original = record(), start = performance.now();
    await scope[0].put(original, now); assert.deepEqual(await scope[1].get(original.id, now), original);
    assert.equal(await stores[1].scoped(api.fingerprint("other"), quota, signal).get(original.id, now), undefined);
    const fullSize = (await admin.query("SELECT bytes FROM d1b_operational.snapshots WHERE id=$1", [original.id])).rows[0].bytes;
    assert.ok(fullSize < 110000);
    await rejects(() => scope[0].put(original, now), "DATA_INTEGRITY_ERROR");
    await rejects(() => scope[0].put({ ...record(), ids: Array.from({ length: 2001 }, () => randomUUID()) }, now), "DATA_INTEGRITY_ERROR");
    const concurrent = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => scope[i % 2].put(record(), now)));
    assert.equal(concurrent.filter(r => r.status === "fulfilled").length, 3);
    assert.ok(concurrent.filter(r => r.status === "rejected").every(r => r.reason.code === "SNAPSHOT_CAPACITY_EXCEEDED"));
    assert.equal((await admin.query("SELECT count(*)::int AS n FROM d1b_operational.snapshots")).rows[0].n, 4);
    console.log(`PASS committed shared SQL storage: independent pools/connections, 2000 IDs, sealed bytes=${fullSize}, concurrent quota 3/8 admitted with one existing, total=${(performance.now() - start).toFixed(1)}ms`);
    await admin.query("UPDATE d1b_operational.snapshots SET sealed='tampered' WHERE id=$1", [original.id]);
    await rejects(() => scope[1].get(original.id, now), "STORAGE_CORRUPT");
    await scope[0].remove(original.id); assert.equal(await scope[1].get(original.id, now), undefined);
    const expiry = record(); await scope[0].put(expiry, now); now += 600001;
    await rejects(() => scope[1].get(expiry.id, now), "SNAPSHOT_EXPIRED");
    const fresh = record(); await scope[0].put(fresh, now);
    assert.equal((await admin.query("SELECT count(*)::int AS n FROM d1b_operational.snapshots")).rows[0].n, 1);
    await scope[0].remove(fresh.id);
    const modeA = api.fingerprint("anon"), modeB = api.fingerprint("authenticated"), modeC = api.fingerprint("account-b");
    const session = await stores[0].session(null, modeA, now, signal);
    assert.deepEqual(await stores[1].session(api.nextToken(session), modeA, now, signal), session);
    const login = await stores[1].session(api.nextToken(session), modeB, now, signal);
    assert.notEqual(login.nonce, session.nonce); assert.equal(login.epoch, session.epoch + 1);
    await rejects(() => stores[0].session(api.nextToken(session), modeA, now, signal), "SESSION_UNAVAILABLE");
    const switched = await stores[0].session(api.nextToken(login), modeC, now, signal);
    assert.notEqual(switched.nonce, login.nonce);
    await rejects(() => stores[1].session(api.nextToken(login), modeB, now, signal), "SESSION_UNAVAILABLE");
    await rejects(() => stores[0].session({ ...api.nextToken(switched), exp: now - 1 }, modeC, now, signal), "SESSION_EXPIRED");
    await rejects(() => stores[0].session({ ...api.nextToken(switched), id: randomUUID() }, modeC, now, signal), "SESSION_UNAVAILABLE");
    const rate = api.fingerprint("rate");
    const rates = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => stores[i % 2].rate(rate, 3, now, signal)));
    assert.equal(rates.filter(r => r.status === "fulfilled").length, 3);
    assert.ok(rates.filter(r => r.status === "rejected").every(r => r.reason.code === "RATE_LIMITED"));
    assert.equal(Number((await admin.query("SELECT window_bucket FROM d1b_operational.rates WHERE key=$1", [rate])).rows[0].window_bucket), Math.floor(now / 60000));
    now += 60000; await stores[1].rate(rate, 3, now, signal);
    // Fill live global slots without evicting any. Distinct subjects test the global quota separately.
    for (let i = 0; i < api.BUDGETS.snapshots; i++) await stores[i % 2].scoped(ck, api.fingerprint(["quota", i]), signal)
      .put({ ...record(), ids: [] }, now);
    await rejects(() => stores[1].scoped(ck, api.fingerprint("overflow"), signal).put(record(), now), "SNAPSHOT_CAPACITY_EXCEEDED");
    assert.equal((await admin.query("SELECT count(*)::int AS n FROM d1b_operational.snapshots")).rows[0].n, 128);
    // Test-owned operational rows only; runtime prunes expired rows and never evicts live state.
    await admin.query("DELETE FROM d1b_operational.snapshots");
    console.log("PASS real SQL: corruption/missing/TTL, atomic cross-connection caller/global quota, minute rate window, session epoch isolation; no live eviction or silent truncation");

    const pair = await generateKeyPair("ES256"), userA = randomUUID(), userB = randomUUID();
    const issuer = "http://127.0.0.1:54321/auth/v1", jwk = { ...await exportJWK(pair.publicKey), kid: "isolated" };
    const verifier = new api.SupabaseJwtVerifier(issuer, async (_t, id) => [userA, userB].includes(id), { now: clock,
      localTestKeys: createLocalJWKSet({ keys: [jwk] }) });
    const token = sub => new SignJWT({ role: "authenticated", session_id: randomUUID() }).setProtectedHeader({ alg: "ES256", kid: "isolated" })
      .setSubject(sub).setIssuer(issuer).setAudience("authenticated").setIssuedAt(Math.floor(now / 1000)).setExpirationTime(Math.floor(now / 1000) + 3600).sign(pair.privateKey);
    const authA = `Bearer ${await token(userA)}`, authB = `Bearer ${await token(userB)}`;
    const principals = await Promise.all([authA, authB, null].map(t => verifier.verify(t, signal)));
    const database = new api.CallerDatabase(callerPool), pids = new Set();
    await Promise.all(Array.from({ length: 18 }, (_, i) => database.run(principals[i % 3], signal, async q => {
      const row = (await q(`SELECT current_user::text AS role,session_user::text AS session,auth.uid()::text AS uid,
        current_setting('request.jwt.claims')::jsonb AS claims,pg_backend_pid() AS pid,pg_sleep(0.005)`, [])).rows[0];
      assert.equal(row.role, principals[i % 3].role); assert.equal(row.uid, principals[i % 3].userId);
      assert.equal(row.session, "authenticator"); assert.equal(row.claims.session_id, principals[i % 3].sessionId); pids.add(row.pid);
      assert.deepEqual(await new api.SqlQuestionRepository(q, 2000).identity(), { role: principals[i % 3].role, userId: principals[i % 3].userId });
    })));
    assert.equal(pids.size, 2);
    await rejects(() => database.run(principals[0], signal, q => q("SELECT 1/0", [])), "DATABASE_UNAVAILABLE");
    await rejects(() => database.run(principals[0], signal, q => q("SELECT pg_sleep(3)", [])), "DATABASE_UNAVAILABLE");
    const cancelled = new AbortController(); const timer = setTimeout(() => cancelled.abort(), 30);
    try { await rejects(() => database.run(principals[1], cancelled.signal, q => q("SELECT pg_sleep(3)", [])), "REQUEST_ABORTED"); }
    finally { clearTimeout(timer); }
    for (const p of principals) await database.run(p, signal, async q => {
      assert.equal((await q("SHOW transaction_read_only", [])).rows[0].transaction_read_only, "on");
      assert.equal((await q("SELECT auth.uid()::text AS id", [])).rows[0].id, p.userId);
    });
    console.log("PASS ordinary caller SQL: 18 concurrent A/B/anon requests, 2 reused backends, READ ONLY, claims isolation, error rollback, statement timeout, abort and replacement connections");

    // All business fixtures are synthetic and committed ONLY in the disposable database.
    const ids = Array.from({ length: 2000 }, () => randomUUID()).sort(), hidden = randomUUID(), deleted = randomUUID(), topic = randomUUID();
    await admin.query("BEGIN");
    try {
      await admin.query("INSERT INTO auth.users(id) VALUES($1),($2)", [userA, userB]);
      await admin.query(`INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,created_at,status)
        SELECT x.id,$2,'D1B synthetic question','Stored synthetic context',
          CASE WHEN x.n<=1000 THEN 'career-development' ELSE 'hobbies-skills' END,'2026-10-01T00:00:00Z',
          CASE WHEN x.n=2 THEN 'closed' ELSE 'open' END FROM unnest($1::uuid[]) WITH ORDINALITY x(id,n)`, [ids, userA]);
      await admin.query(`INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,moderation_visibility,deleted_at)
        VALUES($1,$3,'Hidden','Stored hidden','career-development','hidden',NULL),
          ($2,$3,'Deleted','Stored deleted','career-development','visible',clock_timestamp())`, [hidden, deleted, userA]);
      await admin.query(`INSERT INTO public.answers_v1(question_id,author_person_id,body,moderation_visibility,deleted_at)
        VALUES($1,$2,'Visible answer','visible',NULL),($1,$2,'Hidden answer','hidden',NULL),
          ($1,$2,'Deleted answer','visible',clock_timestamp())`, [ids[0], userB]);
      await admin.query("INSERT INTO public.canonical_topics_v1(topic_id,canonical_name) VALUES($1,'D1B synthetic topic')", [topic]);
      await admin.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [userA]);
      await admin.query("INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES($1,$2)", [ids[0], topic]);
      await admin.query("COMMIT");
    } catch (error) { await admin.query("ROLLBACK"); throw error; }
    const request = { scope: { kind: "home" }, topicId: null, city: null, page: { cursor: null, limit: 20 } };
    for (const p of principals) await database.run(p, signal, async q => {
      const repository = new api.SqlQuestionRepository(q, 2000);
      assert.deepEqual(await repository.recall(request, p), ids);
      const cards = await repository.hydrate(ids.slice(0, 20), request, p);
      assert.equal(cards[0].answerCount, 1); assert.equal(cards[1].status, "closed"); assert.deepEqual(cards[0].topicIds, [topic]);
      assert.deepEqual(await repository.recall({ ...request, topicId: topic }, p), [ids[0]]);
      assert.deepEqual(await repository.recall({ ...request, scope: { kind: "channel", primaryChannel: "career-development" } }, p), ids.slice(0, 1000));
    });
    console.log(`PASS disposable-only canonical fixtures: ${disposable}; 2000 eligible + hidden/deleted excluded, owner/nonowner/anon parity, real visible Answer count, exact Topic/Channel`);

    // Independent OS processes share only committed PostgreSQL state and configured active keys.
    const origin = "https://d1b.local.invalid", workers = [];
    const message = (worker, predicate) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("WORKER_TIMEOUT")), 15000);
      const receive = value => { if (value.failed) finish(new Error(value.failed)); else if (predicate(value)) finish(null, value); };
      const exit = () => finish(new Error("WORKER_EXITED"));
      const finish = (error, value) => { clearTimeout(timer); worker.off("message", receive); worker.off("exit", exit); error ? reject(error) : resolve(value); };
      worker.on("message", receive); worker.once("exit", exit);
    });
    for (let i = 0; i < 2; i++) {
      const worker = fork("scripts/lib/d1b-http-worker.mjs", [], { stdio: ["ignore", "ignore", "ignore", "ipc"],
        env: { PATH: process.env.PATH, HOME: process.env.HOME } });
      cleanup.push(async () => {
        if (worker.exitCode !== null || worker.signalCode !== null) return;
        await new Promise(resolve => {
          const timer = setTimeout(() => worker.kill("SIGTERM"), 5000);
          worker.once("exit", () => { clearTimeout(timer); resolve(); }); worker.send({ command: "stop" });
        });
      });
      const ready = message(worker, m => m.ready);
      worker.send({ compiled, config, operationalConfig, keys: keysConfiguration, now, issuer, jwk, users: [userA, userB], origin });
      const state = await ready; assert.notEqual(state.pid, process.pid); workers.push({ worker, ...state });
    }
    assert.notEqual(workers[0].pid, workers[1].pid);
    const clockWorkers = async () => { for (const { worker } of workers) {
      const ready = message(worker, m => m.clock === now); worker.send({ command: "clock", now }); await ready;
    } };
    const timings = [];
    const send = async (body = request, { cookie, auth, instance = 0, raw } = {}) => {
      const started = performance.now();
      const response = await fetch(`http://127.0.0.1:${workers[instance].port}/proposed/questions`, {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}), ...(auth ? { Authorization: auth } : {}) }, body: raw ?? JSON.stringify(body) });
      timings.push(performance.now() - started);
      return { ...await response.json(), status: response.status, cookie: response.headers.get("Set-Cookie")?.split(";")[0] };
    };
    const first = await send(); assert.equal(first.status, 200); assert.equal(first.page.items.length, 20);
    assert.equal(first.page.items[0].answerCount, 1);
    const next = { ...request, page: { cursor: first.page.nextCursor, limit: 20 } };
    const second = await send(next, { cookie: first.cookie, instance: 1 });
    assert.equal(second.status, 200); assert.equal(second.page.snapshotId, first.page.snapshotId);
    assert.deepEqual(second.page.items.map(q => q.questionId), ids.slice(20, 40));
    const replay = await send(next, { cookie: first.cookie });
    assert.deepEqual(replay.page.items, second.page.items); assert.equal(replay.page.snapshotId, second.page.snapshotId);
    const other = await send();
    assert.equal((await send(next, { cookie: other.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send(next)).error, "SESSION_REQUIRED");
    assert.equal((await send(request, { cookie: "__Host-d1b-scope=" + randomUUID() })).error, "INVALID_SESSION");
    assert.equal((await send({ ...next, topicId: topic }, { cookie: first.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send({ ...next, scope: { kind: "channel", primaryChannel: "career-development" } }, { cookie: first.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send({ ...next, page: { ...next.page, limit: 10 } }, { cookie: first.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send({ ...request, city: "Shanghai" })).error, "UNSUPPORTED_CITY_FILTER");
    assert.equal((await send({ ...request, viewerId: userB })).error, "INVALID_INPUT");
    assert.equal((await send(request, { raw: "x".repeat(2049) })).status, 413);
    const tamper = next.page.cursor.split("."); tamper[3] = (tamper[3][0] === "A" ? "B" : "A") + tamper[3].slice(1);
    assert.equal((await send({ ...next, page: { ...next.page, cursor: tamper.join(".") } }, { cookie: first.cookie })).error, "INVALID_CURSOR");
    const loginPage = await send(next, { cookie: first.cookie, auth: authA });
    assert.equal(loginPage.error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send(request, { cookie: first.cookie })).error, "SESSION_UNAVAILABLE");
    const pageA = await send(request, { cookie: loginPage.cookie, auth: authA, instance: 1 }); assert.equal(pageA.status, 200);
    const nextA = { ...request, page: { cursor: pageA.page.nextCursor, limit: 20 } };
    const switchB = await send(nextA, { cookie: pageA.cookie, auth: authB }); assert.equal(switchB.error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send(nextA, { cookie: pageA.cookie, auth: authA })).error, "SESSION_UNAVAILABLE");
    assert.equal((await send(nextA, { cookie: switchB.cookie })).error, "CURSOR_CONTEXT_MISMATCH");
    assert.equal((await send(request, { auth: "Bearer invalid" })).status, 401);
    console.log("PASS two OS processes + loopback HTTP + ordinary SQL + committed shared snapshots: cross-session/user/account-switch, fixation, body limits, filter/page binding and cursor tamper rejection");

    // Real SQL traversal; clock-only advancement respects the implemented 60/min subject budget.
    now += 60000; await clockWorkers();
    const walk = await send(); assert.equal(walk.status, 200);
    await admin.query("UPDATE public.questions_v1 SET moderation_visibility='hidden' WHERE id=$1", [ids[20]]);
    await admin.query("UPDATE public.questions_v1 SET deleted_at=clock_timestamp() WHERE id=$1", [ids[21]]);
    await admin.query("UPDATE public.answers_v1 SET moderation_visibility='hidden' WHERE question_id=$1", [ids[0]]);
    let cursor = walk.page.nextCursor, seen = walk.page.items.map(q => q.questionId), pages = 1;
    while (cursor) {
      if (pages % 40 === 0) { now += 60000; await clockWorkers(); }
      const page = await send({ ...request, page: { cursor, limit: 20 } }, { cookie: walk.cookie, instance: pages % 2 });
      assert.equal(page.status, 200); assert.equal(page.page.snapshotId, walk.page.snapshotId);
      seen.push(...page.page.items.map(q => q.questionId)); cursor = page.page.nextCursor; pages++;
    }
    assert.equal(pages, 100); assert.deepEqual(seen, ids.filter(id => ![ids[20], ids[21]].includes(id)));
    assert.equal(new Set(seen).size, 1998);
    const newPage = await send(); assert.equal(newPage.page.items[0].answerCount, 0);
    now += 600001; await clockWorkers();
    assert.equal((await send({ ...request, page: { cursor: walk.page.nextCursor, limit: 20 } }, { cookie: walk.cookie })).error, "SNAPSHOT_EXPIRED");
    // Three new rows make the live eligible set 2001; overflow must not pretend to be complete.
    await admin.query(`INSERT INTO public.questions_v1(requester_person_id,title,context,primary_channel)
      SELECT $1,'Overflow test','Stored context','career-development' FROM generate_series(1,3)`, [userA]);
    assert.equal((await send()).error, "SNAPSHOT_CAPACITY_EXCEEDED");
    timings.sort((a, b) => a - b);
    console.log(`PASS real multi-process traversal: 2000 snapshot identities / 100 pages / 1998 after live exclusion, current Answer counts, expiry, 2001 explicit overflow; HTTP p50=${timings[Math.floor(timings.length * .5)].toFixed(1)}ms p95=${timings[Math.floor(timings.length * .95)].toFixed(1)}ms max=${timings.at(-1).toFixed(1)}ms n=${timings.length}`);
    console.log("REAL SUPABASE AUTH: NOT VERIFIED. Signatures are from an isolated test issuer; account lookup is a double. No Production/real Auth/Edge access. Original foundation predates profile privacy cutover.");
  });
});
