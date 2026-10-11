import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { withQuestionDiscovery } from "./lib/question-discovery-local.mjs";

const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
for (const file of [...files("src"), ...files("packages")].filter(path => /\.[cm]?[jt]sx?$/.test(path)))
  assert.doesNotMatch(readFileSync(file, "utf8"), /local-backend\/question-discovery|QuestionDiscoveryService|SqlQuestionRepository/,
    `No deployed client/shared runtime import: ${file}`);
for (const file of files("local-backend/question-discovery-v1"))
  assert.doesNotMatch(readFileSync(file, "utf8"), /createClient|process\.env|fetch\(|\.listen\(|SECURITY DEFINER|\b(?:GRANT|REVOKE|INSERT INTO|ALTER TABLE)\b/,
    `No automatic endpoint, connection, mutation or privilege bypass: ${file}`);

await withQuestionDiscovery(async (api, discovery) => {
  const { parseRequest, parsePage, LIMITS, DiscoveryError, MemorySnapshotStore, CursorCodec,
    QuestionDiscoveryService, newAnonymousScope, handleLocalJson } = api;
  for (const flag of ["productionDeployed", "clientConsumable", "implementationStarted", "rpcNamesFrozen"])
    assert.equal(discovery.DISCOVERY_V1_CONTRACT[flag], false, flag);
  const id = n => `d1a00000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const topic = id(80);
  const base = { scope: { kind: "home" }, topicId: null, city: null, page: { cursor: null, limit: 2 } };
  const reject = async (fn, code) => assert.rejects(fn, error => error instanceof DiscoveryError && error.code === code);
  const invalid = (input, code = "INVALID_INPUT") => assert.throws(() => parseRequest(input), error => error.code === code);
  assert.deepEqual(parseRequest(base), base);
  assert.equal(parseRequest({ ...base, topicId: topic.toUpperCase() }).topicId, topic);
  for (const primaryChannel of ["education-learning", "career-development", "lifestyle-services", "hobbies-skills"])
    assert.equal(parseRequest({ ...base, scope: { kind: "channel", primaryChannel } }).scope.primaryChannel, primaryChannel);
  invalid({ ...base, scope: { kind: "channel", primaryChannel: "invented" } }, "INVALID_CHANNEL");
  invalid({ ...base, scope: { kind: "home", primaryChannel: "career-development" } });
  invalid({ ...base, scope: { kind: "persons" } });
  invalid({ ...base, viewerId: id(1) });
  invalid({ ...base, query: "hidden text search" });
  invalid({ ...base, topicId: "not-a-uuid" });
  invalid({ ...base, topicId: [topic] });
  invalid({ ...base, city: { city: "Shanghai", cityCode: null } }, "UNSUPPORTED_CITY_FILTER");
  invalid({ ...base, city: "ignored-city" }, "UNSUPPORTED_CITY_FILTER");
  for (const limit of [0, -1, 21, 1.5, "2", NaN]) invalid({ ...base, page: { cursor: null, limit } }, "INVALID_PAGE_LIMIT");
  invalid({ ...base, page: { cursor: "x".repeat(513), limit: 2 } });
  console.log("PASS contract: exact channels, optional exact UUID, null city, limit, no viewer/query injection");

  const card = (n, overrides = {}) => ({ questionId: id(n), title: `Question ${n}`, primaryChannel: "career-development",
    topicIds: [], deepExchangeBudgetMaxCents: null, createdAt: "2026-10-11T00:00:00Z", status: "open",
    contextExcerpt: "Stored context prefix", answerCount: 0, ...overrides });
  const payload = { items: [card(1)], snapshotId: id(90), nextCursor: null };
  assert.deepEqual(parsePage(payload), payload);
  for (const field of ["phone", "email", "requesterPersonId", "requester", "matchScore", "views", "bounty", "isVerified", "acceptedAnswerId"])
    assert.throws(() => parsePage({ ...payload, items: [card(1, { [field]: "FORBIDDEN" })] }), error => error.code === "DATA_INTEGRITY_ERROR");
  assert.throws(() => parsePage({ ...payload, items: [card(1), card(1)] }));
  assert.throws(() => parsePage({ ...payload, items: [card(1, { topicIds: [id(82), id(81)] })] }));
  assert.throws(() => parsePage({ ...payload, items: [card(1, { topicIds: [topic, topic] })] }));
  assert.deepEqual(parsePage({ ...payload, items: [card(1, { topicIds: [id(81), id(82)] })] }).items[0].topicIds, [id(81), id(82)]);
  console.log("PASS output: frozen target mapping, no private/enrichment/fabricated fields, unique ASC Topic IDs");

  const build = () => {
    let now = 1_800_000_000_000;
    let caller = { role: "authenticated", userId: id(1) };
    const rows = new Map([1, 2, 3, 4, 5].map(n => [id(n), card(n)]));
    let active = true;
    let recalls = 0;
    const repository = {
      identity: async () => ({ ...caller }),
      recall: async request => { recalls++; return [...rows.values()].filter(row => eligible(row, request))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.questionId.localeCompare(b.questionId)).map(row => row.questionId); },
      hydrate: async (ids, request) => {
        if (request.topicId && !active) throw new DiscoveryError("TOPIC_INVALID_OR_INACTIVE");
        return ids.flatMap(key => rows.has(key) && eligible(rows.get(key), request) ? [{ ...rows.get(key) }] : []);
      },
    };
    const eligible = (row, request) => row !== undefined &&
      (request.scope.kind === "home" || row.primaryChannel === request.scope.primaryChannel) &&
      (request.topicId === null || row.topicIds.includes(request.topicId));
    const store = new MemorySnapshotStore();
    const key = randomBytes(32), codec = new CursorCodec(key), anon = newAnonymousScope();
    const make = (scope = anon, rank = api.RANK_VERSION) => new QuestionDiscoveryService(repository, store, codec, scope, () => now, rank);
    return { service: make(), make, store, codec, key, rows, repository,
      setCaller: value => { caller = value; }, expire: () => { now += LIMITS.ttlMs; },
      deactivate: () => { active = false; }, recalls: () => recalls };
  };
  {
    const test = build();
    const first = await test.service.page(base);
    assert.deepEqual(first.items.map(row => row.questionId), [id(1), id(2)]);
    const secondRequest = { ...base, page: { ...base.page, cursor: first.nextCursor } };
    const second = await test.service.page(secondRequest);
    assert.deepEqual(second.items.map(row => row.questionId), [id(3), id(4)]);
    assert.deepEqual((await test.service.page(secondRequest)).items, second.items, "same cursor scans same positions");
    const third = await test.service.page({ ...base, page: { ...base.page, cursor: second.nextCursor } });
    assert.deepEqual(third.items.map(row => row.questionId), [id(5)]);
    assert.equal(third.nextCursor, null);
    assert.equal(new Set([...first.items, ...second.items, ...third.items].map(row => row.questionId)).size, 5);
    assert.equal(test.recalls(), 1);
    assert.equal(first.snapshotId, third.snapshotId);
    assert.equal(first.nextCursor.includes(id(1)), false);
    assert.equal(first.nextCursor.includes(first.snapshotId), false);
    for (const section of [1, 2, 3]) {
      const pieces = first.nextCursor.split(".");
      pieces[section] = (pieces[section][0] === "A" ? "B" : "A") + pieces[section].slice(1);
      await reject(() => test.service.page({ ...secondRequest, page: { cursor: pieces.join("."), limit: 2 } }), "INVALID_CURSOR");
    }
    for (const cursor of ["v0.bad.token.tag", "v1.invalid", first.nextCursor + "=", "not-a-cursor"])
      await reject(() => test.service.page({ ...base, page: { cursor, limit: 2 } }), "INVALID_CURSOR");
    await reject(() => test.make(undefined, "new-rank").page(secondRequest), "CURSOR_RANK_MISMATCH");
    await reject(() => test.service.page({ ...secondRequest, topicId: topic }), "CURSOR_CONTEXT_MISMATCH");
    await reject(() => test.service.page({ ...secondRequest, scope: { kind: "channel", primaryChannel: "career-development" } }), "CURSOR_CONTEXT_MISMATCH");
    await reject(() => test.service.page({ ...secondRequest, page: { cursor: first.nextCursor, limit: 1 } }), "CURSOR_CONTEXT_MISMATCH");
    test.setCaller({ role: "authenticated", userId: id(2) });
    await reject(() => test.service.page(secondRequest), "CURSOR_CONTEXT_MISMATCH");
    test.setCaller({ role: "anon", userId: null });
    await reject(() => test.service.page(secondRequest), "CURSOR_CONTEXT_MISMATCH");
    test.setCaller({ role: "authenticated", userId: id(1) });
    await test.store.remove(first.snapshotId);
    await reject(() => test.service.page(secondRequest), "SNAPSHOT_UNAVAILABLE");
  }
  {
    const test = build();
    test.setCaller({ role: "anon", userId: null });
    const first = await test.service.page(base);
    const next = { ...base, page: { cursor: first.nextCursor, limit: 2 } };
    assert.equal((await test.make().page(next)).items.length, 2, "same trusted anon scope works");
    await reject(() => test.make(newAnonymousScope()).page(next), "CURSOR_CONTEXT_MISMATCH");
    test.expire();
    await reject(() => test.service.page(next), "SNAPSHOT_EXPIRED");
    for (const caller of [{ role: "postgres", userId: id(1) }, { role: "service_role", userId: id(1) },
      { role: "anon", userId: id(1) }, { role: "authenticated", userId: null }]) {
      test.setCaller(caller); await reject(() => test.service.page(base), "UNTRUSTED_CALLER_CONTEXT");
    }
  }
  console.log("PASS cursor: encrypted/authenticated, caller/anon/filter/limit/rank/snapshot binding, expiration, replay, terminal progression");

  {
    const test = build();
    const first = await test.service.page(base);
    test.rows.set(id(6), card(6, { createdAt: "2026-10-12T00:00:00Z" }));
    test.rows.delete(id(3)); test.rows.delete(id(4));
    test.rows.set(id(5), card(5, { status: "closed", createdAt: "2026-10-13T00:00:00Z" }));
    const second = await test.service.page({ ...base, page: { cursor: first.nextCursor, limit: 2 } });
    assert.deepEqual(second.items, []);
    assert.equal(test.codec.decode(second.nextCursor).p, 4, "last scanned, not visible count");
    const third = await test.service.page({ ...base, page: { cursor: second.nextCursor, limit: 2 } });
    assert.deepEqual(third.items.map(row => [row.questionId, row.status]), [[id(5), "closed"]]);
    assert.equal(third.nextCursor, null);
    assert.equal(test.recalls(), 1, "no addition or re-rank of existing snapshot");
  }
  {
    const test = build();
    for (const row of test.rows.values()) row.topicIds = [topic];
    const request = { ...base, topicId: topic, scope: { kind: "channel", primaryChannel: "career-development" } };
    const first = await test.service.page(request);
    const continuation = { ...request, page: { cursor: first.nextCursor, limit: 2 } };
    await reject(() => test.service.page({ ...continuation, scope: { kind: "channel", primaryChannel: "education-learning" } }), "CURSOR_CONTEXT_MISMATCH");
    await reject(() => test.service.page({ ...continuation, topicId: id(81) }), "CURSOR_CONTEXT_MISMATCH");
    test.rows.get(id(3)).topicIds = [];
    test.rows.get(id(4)).primaryChannel = "education-learning";
    const second = await test.service.page({ ...request, page: { cursor: first.nextCursor, limit: 2 } });
    assert.deepEqual(second.items, []);
    test.deactivate();
    await reject(() => test.service.page({ ...request, page: { cursor: second.nextCursor, limit: 2 } }), "TOPIC_INVALID_OR_INACTIVE");
  }
  console.log("PASS snapshot churn: late insert excluded, removed/ineligible items skipped, order fixed, live status/Topic/channel rechecked");

  {
    const test = build();
    test.repository.recall = async () => Array.from({ length: 501 }, (_, n) => id(n));
    await reject(() => test.service.page(base), "SNAPSHOT_CAPACITY_EXCEEDED");
    assert.equal(test.store.usage().count, 0);
    test.repository.recall = async () => [id(1), id(1)];
    await reject(() => test.service.page(base), "DATA_INTEGRITY_ERROR");
    test.repository.recall = async () => [id(1)];
    test.repository.hydrate = async () => [card(2)];
    await reject(() => test.service.page(base), "DATA_INTEGRITY_ERROR");
    assert.equal(test.store.usage().count, 0, "failed first hydration does not leak quota");
    test.repository.hydrate = async () => [card(1, { contextExcerpt: "x".repeat(LIMITS.responseBytes) })];
    await reject(() => test.service.page(base), "RESPONSE_CAPACITY_EXCEEDED");
    test.repository.recall = async () => [];
    test.repository.hydrate = async () => [];
    const empty = await test.service.page(base);
    assert.deepEqual(empty.items, []); assert.equal(empty.nextCursor, null);
  }
  {
    const now = 1_800_000_000_000;
    const record = (n, caller = String(n)) => ({ id: id(n), callerKey: caller.padStart(64, "0"), binding: "b".repeat(64), rank: api.RANK_VERSION,
      expiresAt: now + LIMITS.ttlMs, ids: Array.from({ length: 500 }, (_, i) => id(i + 1000)) });
    const store = new MemorySnapshotStore();
    const result = await Promise.allSettled(Array.from({ length: 130 }, (_, n) => store.put({ ...record(n), ids: [] }, now)));
    assert.equal(result.filter(item => item.status === "fulfilled").length, 128);
    assert.ok(store.usage().accountedBytes <= LIMITS.memoryBytes);
    const fullStore = new MemorySnapshotStore();
    const fullResults = await Promise.allSettled(Array.from({ length: 128 }, (_, n) => fullStore.put(record(n), now)));
    const fullCount = fullResults.filter(item => item.status === "fulfilled").length;
    assert.ok(fullCount > 100 && fullCount < 128, "byte budget binds before count budget for full snapshots");
    assert.ok(fullStore.usage().accountedBytes <= LIMITS.memoryBytes);
    const original = record(400);
    const local = new MemorySnapshotStore();
    await local.put(original, now); original.ids.length = 0;
    const copy = await local.get(original.id, now); copy.ids.length = 0;
    assert.equal((await local.get(original.id, now)).ids.length, 500, "no mutable alias into store");
    const quota = new MemorySnapshotStore();
    for (let n = 1; n <= 4; n++) await quota.put(record(n, "same"), now);
    await reject(() => quota.put(record(5, "same"), now), "SNAPSHOT_CAPACITY_EXCEEDED");
    await quota.put({ ...record(6, "same"), expiresAt: now + 2 * LIMITS.ttlMs }, now + LIMITS.ttlMs);
    assert.equal(quota.usage().count, 1, "expired entries reclaimed without evicting live ones");
    await reject(() => new MemorySnapshotStore({ count: 1, perCaller: 1, bytes: 1 }).put(record(1), now), "SNAPSHOT_CAPACITY_EXCEEDED");
    console.log(`PASS budgets: 500 IDs/snapshot; 128 empty or ${fullCount} full snapshots / ${fullStore.usage().accountedBytes} accounted bytes; caller quota, TTL reclaim, concurrent capacity`);
  }
  {
    const test = build();
    const wire = JSON.parse(await handleLocalJson(test.service, JSON.stringify(base)));
    assert.equal(wire.ok, true); parsePage(wire.page);
    assert.deepEqual(JSON.parse(await handleLocalJson(test.service, "{")), { ok: false, error: "INVALID_INPUT" });
    assert.deepEqual(JSON.parse(await handleLocalJson(test.service, "x".repeat(2049))), { ok: false, error: "INVALID_INPUT" });
    test.repository.identity = async () => { throw new Error("SENSITIVE INTERNAL DATABASE DETAIL"); };
    assert.deepEqual(JSON.parse(await handleLocalJson(test.service, JSON.stringify(base))), { ok: false, error: "BACKEND_UNAVAILABLE" });
    assert.throws(() => new CursorCodec(randomBytes(31)));
    const keyA = new CursorCodec(randomBytes(32)), keyB = new CursorCodec(randomBytes(32));
    const token = keyA.encode({ s: randomUUID(), p: 1, b: "a".repeat(64), r: "v0", exp: 1_900_000_000_000 });
    assert.throws(() => keyB.decode(token), error => error.code === "INVALID_CURSOR");
  }
  console.log("PASS local JSON parser boundary and error redaction; HTTP/JWT transport NOT VERIFIED / NOT DEPLOYED");
});
