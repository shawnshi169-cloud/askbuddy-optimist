import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { withQuestionDiscovery } from "./lib/question-discovery-local.mjs";

assert.deepEqual(process.argv.slice(2), ["--local"], "Only an explicit local target is accepted");
const context = "colima-askbuddy-ec2b", container = "supabase_db_askbuddy-ec2b";
const env = { HOME: process.env.HOME, PATH: process.env.PATH };
const docker = args => execFileSync("docker", args, { env, encoding: "utf8", timeout: 30000 }).trim();
assert.equal(docker(["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"]),
  `unix://${process.env.HOME}/.colima/askbuddy-ec2b/docker.sock`);
assert.equal(docker(["--context", context, "inspect", container, "--format", "{{.Config.Image}}"]),
  "public.ecr.aws/supabase/postgres:17.6.1.095");
const ports = JSON.parse(docker(["--context", context, "inspect", container, "--format", "{{json .NetworkSettings.Ports}}"]));
assert.ok(ports["5432/tcp"].every(port => port.HostPort === "54322"));
const systemId = docker(["--context", context, "exec", container, "psql", "-X", "-U", "postgres", "-d", "postgres",
  "-At", "-c", "SELECT system_identifier FROM pg_control_system();"]);
// This local-only password stays in memory and is never logged, persisted or accepted from a remote URL.
const password = docker(["--context", context, "exec", container, "printenv", "POSTGRES_PASSWORD"]);
const client = new pg.Client({ host: "127.0.0.1", port: 54322, user: "postgres", database: "postgres", password,
  ssl: false, connectionTimeoutMillis: 5000, application_name: "ec3d1a-local-rollback-only" });
const tables = ["auth.users", "public.profiles", "public.user_settings", "public.point_accounts",
  "public.canonical_topics_v1", "public.canonical_topic_terms_v1", "public.question_topics_v1",
  "public.experience_topics_v1", "public.questions_v1", "public.answers_v1", "public.answer_replies_v1",
  "public.answer_helpful_marks_v1", "public.answer_helpful_public_facts_v1", "public.person_experiences",
  "public.experience_transitions", "public.experience_claims"];
const counts = async () => (await client.query(`SELECT jsonb_build_object(${tables.map(table =>
  `'${table}',(SELECT count(*) FROM ${table})`).join(",")}) AS counts`)).rows[0].counts;
const id = n => `d1a10000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const a = id(9001), b = id(9002), c = id(9003), t = id(8001), u = id(8002), deprecated = id(8003);
const q = (sql, values = []) => client.query(sql, values);
const as = async (role, userId = null) => {
  assert.ok(["postgres", "anon", "authenticated"].includes(role));
  await q("SELECT set_config('role',$1,true),set_config('request.jwt.claim.sub',$2,true),set_config('request.jwt.claim.role',$1,true)",
    [role, userId ?? ""]);
  const actual = (await q("SELECT current_user::text AS role,auth.uid()::text AS id")).rows[0];
  assert.deepEqual(actual, { role, id: userId });
};

await client.connect();
let before;
try {
  assert.equal((await q("SELECT system_identifier::text AS id FROM pg_control_system()")).rows[0].id, systemId);
  assert.equal((await q("SELECT max(version) AS version FROM supabase_migrations.schema_migrations")).rows[0].version, "20260915140330");
  const triggers = (await q(`SELECT t.tgname,p.proname,p.prosrc FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE t.tgrelid='auth.users'::regclass AND NOT t.tgisinternal`)).rows;
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].tgname, "on_auth_user_created_pack01");
  assert.equal(triggers[0].proname, "handle_new_user_pack01");
  assert.doesNotMatch(triggers[0].prosrc, /http|pg_net|webhook|notification|payment|dblink/i);
  assert.deepEqual([...triggers[0].prosrc.matchAll(/INSERT INTO public\.(\w+)/g)].map(match => match[1]),
    ["profiles", "user_settings", "point_accounts"]);
  before = await counts();
  assert.ok(Object.values(before).every(value => value === 0), "Refuse nonempty local database; do not reset or clean it");
  console.log("LOCAL ONLY: pinned Docker identity + loopback endpoint; Postgres 17.6.1.095; migration head 20260915140330");
  await q("BEGIN");
  await q("SET LOCAL statement_timeout='2s'");
  await q("SET LOCAL lock_timeout='1s'");
  await withQuestionDiscovery(async api => {
    const { SqlQuestionRepository, MemorySnapshotStore, CursorCodec, QuestionDiscoveryService,
      newAnonymousScope, parseRequest, parsePage, handleLocalJson, LIMITS } = api;
    const base = { scope: { kind: "home" }, topicId: null, city: null, page: { cursor: null, limit: 20 } };
    const rejected = (run, code) => assert.rejects(run, error => error.code === code);
    const calls = [];
    const repository = new SqlQuestionRepository(async (sql, values) => {
      assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|GRANT|REVOKE)\b/);
      assert.ok(Array.isArray(values));
      calls.push({ sql, values });
      return q(sql, values);
    });
    const make = () => new QuestionDiscoveryService(repository, new MemorySnapshotStore(),
      new CursorCodec(randomBytes(32)), newAnonymousScope());
    const read = request => make().page(request ?? base);
    const keys = page => page.items.map(item => item.questionId);
    await q("INSERT INTO auth.users(id,email) SELECT x.id,x.email FROM unnest($1::uuid[],$2::text[]) x(id,email)",
      [[a, b, c], ["ec3d1a-local-a@example.invalid", "ec3d1a-local-b@example.invalid", "ec3d1a-local-c@example.invalid"]]);
    await q("INSERT INTO public.canonical_topics_v1(topic_id,canonical_name) SELECT x.id,x.name FROM unnest($1::uuid[],$2::text[]) x(id,name)",
      [[t, u, deprecated], ["D1A Local Topic", "D1A Unrelated Topic", "D1A Historical Topic"]]);
    const channels = ["career-development", "career-development", "career-development", "career-development",
      "career-development", "career-development", "career-development", "career-development", "education-learning",
      "lifestyle-services", "hobbies-skills", "career-development"];
    await q(`INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,created_at)
      SELECT x.id,CASE WHEN x.ordinal=12 THEN $4::uuid ELSE $3::uuid END,'Local question '||x.ordinal,
        repeat('Stored context ',30),x.channel,'2026-10-11T00:00:00Z'::timestamptz
      FROM unnest($1::uuid[],$2::text[]) WITH ORDINALITY x(id,channel,ordinal)`,
    [Array.from({ length: 12 }, (_, n) => id(n + 1)), channels, a, c]);
    await as("authenticated", a);
    for (const [question, topics] of [[5, [t]], [6, [t, u]], [7, [u]], [8, [deprecated]]])
      await q("INSERT INTO public.question_topics_v1(question_id,topic_id) SELECT $1::uuid,unnest($2::uuid[])", [id(question), topics]);
    await as("postgres");
    await q("UPDATE public.questions_v1 SET status='closed' WHERE id=$1", [id(2)]);
    await q("UPDATE public.questions_v1 SET moderation_visibility='hidden' WHERE id=$1", [id(3)]);
    await q("UPDATE public.questions_v1 SET deleted_at=clock_timestamp() WHERE id=$1", [id(4)]);
    await q("UPDATE public.canonical_topics_v1 SET status='deprecated' WHERE topic_id=$1", [deprecated]);
    await q("DELETE FROM public.profiles WHERE user_id=$1", [c]);
    await q(`INSERT INTO public.answers_v1(id,question_id,author_person_id,body,moderation_visibility,deleted_at)
      VALUES($1,$6,$9,'Visible canonical answer','visible',NULL),
        ($2,$6,$9,'Hidden canonical answer','hidden',NULL),
        ($3,$6,$9,'Deleted canonical answer','visible',clock_timestamp()),
        ($4,$7,$9,'Hidden parent answer','visible',NULL),($5,$8,$9,'Deleted parent answer','visible',NULL)`,
    [id(101), id(102), id(103), id(104), id(105), id(1), id(3), id(4), b]);
    for (const [role, userId] of [["anon", null], ["authenticated", a], ["authenticated", b]]) {
      await as(role, userId);
      assert.deepEqual(await repository.identity(), { role, userId });
      const start = calls.length;
      const page = await read();
      assert.equal(calls.length - start, 3, "one identity + one recall + one hydration, not N+1");
      assert.deepEqual(keys(page), [1, 2, 5, 6, 7, 8, 9, 10, 11, 12].map(id));
      assert.equal(page.items.find(item => item.questionId === id(2)).status, "closed");
      assert.deepEqual(page.items[0].topicIds, []);
      assert.equal(page.items[0].contextExcerpt, "Stored context ".repeat(30).slice(0, 240));
      assert.equal(page.items[0].answerCount, 1);
      assert.deepEqual(page.items.find(item => item.questionId === id(6)).topicIds, [t, u]);
      assert.deepEqual(page.items.find(item => item.questionId === id(8)).topicIds, [deprecated]);
      assert.ok(keys(page).includes(id(12)), "missing requester profile does not fabricate or drop Question");
      for (const card of page.items) assert.deepEqual(Object.keys(card).sort(), ["questionId", "title", "primaryChannel", "topicIds",
        "deepExchangeBudgetMaxCents", "createdAt", "status", "contextExcerpt", "answerCount"].sort());
      parsePage(page);
      assert.deepEqual(keys(await read({ ...base, topicId: t })), [id(5), id(6)]);
      assert.deepEqual(keys(await read({ ...base, topicId: u })), [id(6), id(7)]);
      await rejected(() => read({ ...base, topicId: id(8999) }), "TOPIC_INVALID_OR_INACTIVE");
      await rejected(() => read({ ...base, topicId: deprecated }), "TOPIC_INVALID_OR_INACTIVE");
      for (const [primaryChannel, expected] of [["education-learning", [9]], ["lifestyle-services", [10]],
        ["hobbies-skills", [11]], ["career-development", [1, 2, 5, 6, 7, 8, 12]]])
        assert.deepEqual(keys(await read({ ...base, scope: { kind: "channel", primaryChannel } })), expected.map(id));
      await rejected(() => read({ ...base, scope: { kind: "channel", primaryChannel: "injected' OR true--" } }), "INVALID_CHANNEL");
      await rejected(() => read({ ...base, city: { city: "Test", cityCode: null } }), "UNSUPPORTED_CITY_FILTER");
      const caller = await repository.identity();
      assert.deepEqual(await repository.hydrate([id(3), id(4)], parseRequest(base), caller), []);
      assert.deepEqual(await repository.hydrate([id(6), id(1)], parseRequest(base), caller).then(rows => rows.map(row => row.questionId)), [id(6), id(1)]);
      const wire = JSON.parse(await handleLocalJson(make(), JSON.stringify(base)));
      assert.equal(wire.ok, true); parsePage(wire.page);
      console.log(`PASS SQL ${role}/${userId === a ? "owner" : userId === b ? "non-owner" : "visitor"}: visibility, closed, Topics/history, exact channels, counts, privacy, order, local JSON`);
    }
    await as("postgres");
    await rejected(() => read(), "UNTRUSTED_CALLER_CONTEXT");
    await as("authenticated", a);
    const expectedCaller = await repository.identity();
    await as("authenticated", b);
    await rejected(() => repository.recall(parseRequest(base), expectedCaller), "UNTRUSTED_CALLER_CONTEXT");
    await as("authenticated", a);
    await q("SAVEPOINT deprecated_rejection");
    try {
      await assert.rejects(() => q("SELECT public.update_question_v1($1,'Local question','Context','career-development',$2,NULL)",
        [id(1), [deprecated]]), error => error.code === "PT422" && error.message === "TOPIC_INVALID_OR_INACTIVE");
    } finally { await q("ROLLBACK TO SAVEPOINT deprecated_rejection"); }
    assert.deepEqual((await read()).items.find(item => item.questionId === id(8)).topicIds, [deprecated]);
    console.log("PASS SQL identity: privileged refusal, role drift rejection, deprecated new association rejected, history retained");

    // Mutations below are privileged fixture setup only, in this same rollback-contained LOCAL transaction.
    await as("postgres");
    await q("SAVEPOINT live_changes");
    await as("anon");
    const service = make(), request = { ...base, page: { cursor: null, limit: 2 } };
    const first = await service.page(request);
    assert.deepEqual(keys(first), [id(1), id(2)]);
    await as("postgres");
    await q(`INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,created_at)
      VALUES($1,$2,'Later insert','Not in issued snapshot','career-development','2026-10-12T00:00:00Z')`, [id(20), a]);
    await q("UPDATE public.questions_v1 SET deleted_at=clock_timestamp() WHERE id=$1", [id(5)]);
    await q("UPDATE public.questions_v1 SET moderation_visibility='hidden' WHERE id=$1", [id(6)]);
    await q("UPDATE public.questions_v1 SET created_at='2026-10-13T00:00:00Z',status='closed' WHERE id=$1", [id(7)]);
    await as("anon");
    const second = await service.page({ ...request, page: { cursor: first.nextCursor, limit: 2 } });
    assert.deepEqual(second.items, []); assert.notEqual(second.nextCursor, null);
    const third = await service.page({ ...request, page: { cursor: second.nextCursor, limit: 2 } });
    assert.deepEqual(keys(third), [id(7), id(8)]);
    assert.equal(third.items[0].status, "closed");
    const replay = await service.page({ ...request, page: { cursor: second.nextCursor, limit: 2 } });
    assert.deepEqual(replay.items, third.items);
    const all = [...first.items, ...third.items];
    let cursor = third.nextCursor;
    while (cursor) {
      const page = await service.page({ ...request, page: { cursor, limit: 2 } });
      all.push(...page.items); cursor = page.nextCursor;
    }
    assert.deepEqual(all.map(card => card.questionId), [1, 2, 7, 8, 9, 10, 11, 12].map(id));
    assert.equal(new Set(all.map(card => card.questionId)).size, all.length);
    await as("postgres");
    await q("ROLLBACK TO SAVEPOINT live_changes");
    await as("authenticated", a);
    const scoped = make(), scopedRequest = { ...base, scope: { kind: "channel", primaryChannel: "career-development" },
      topicId: t, page: { cursor: null, limit: 1 } };
    const scopedFirst = await scoped.page(scopedRequest);
    assert.deepEqual(keys(scopedFirst), [id(5)]);
    await q("DELETE FROM public.question_topics_v1 WHERE question_id=$1 AND topic_id=$2", [id(6), t]);
    const scopedSecond = await scoped.page({ ...scopedRequest, page: { cursor: scopedFirst.nextCursor, limit: 1 } });
    assert.deepEqual(scopedSecond.items, []); assert.equal(scopedSecond.nextCursor, null);
    await q("INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES($1,$2)", [id(6), t]);
    await q("UPDATE public.questions_v1 SET primary_channel='education-learning' WHERE id=$1", [id(6)]);
    assert.deepEqual((await scoped.page({ ...scopedRequest, page: { cursor: scopedFirst.nextCursor, limit: 1 } })).items, []);
    await as("postgres");
    await q("UPDATE public.canonical_topics_v1 SET status='deprecated' WHERE topic_id=$1", [t]);
    await as("anon");
    // Use the same authenticated caller for a live Topic-status check; an anon would fail cursor binding first.
    await as("authenticated", a);
    await rejected(() => scoped.page({ ...scopedRequest, page: { cursor: scopedFirst.nextCursor, limit: 1 } }), "TOPIC_INVALID_OR_INACTIVE");
    await as("postgres");
    await q("ROLLBACK TO SAVEPOINT live_changes");
    console.log("PASS SQL snapshot churn: insert excluded; deletion/moderation skipped; closed included; timestamp order frozen; Topic/channel recheck; replay/terminal/dedup");

    const bulk = async (start, count) => q(`INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,created_at)
      SELECT x.id,$2::uuid,'Local scale fixture','Local scale context','career-development',
        '2026-10-10T00:00:00Z'::timestamptz - x.ordinal * interval '1 second'
      FROM unnest($1::uuid[]) WITH ORDINALITY x(id,ordinal)`, [Array.from({ length: count }, (_, n) => id(start + n)), a]);
    await bulk(10000, 490);
    await as("anon");
    const cap = make();
    const full = await cap.page({ ...base, page: { cursor: null, limit: 20 } });
    let total = full.items.length, pages = 1, next = full.nextCursor;
    const seen = new Set(keys(full));
    while (next) {
      const page = await cap.page({ ...base, page: { cursor: next, limit: 20 } });
      for (const key of keys(page)) { assert.equal(seen.has(key), false); seen.add(key); }
      total += page.items.length; pages++; next = page.nextCursor;
    }
    assert.equal(total, 500); assert.equal(pages, 25);
    await as("postgres"); await bulk(10490, 1510);
    await as("authenticated", a);
    await q("INSERT INTO public.question_topics_v1(question_id,topic_id) SELECT unnest($1::uuid[]),$2::uuid",
      [Array.from({ length: 50 }, (_, n) => id(10000 + n)), t]);
    for (const [role, userId] of [["anon", null], ["authenticated", a]]) {
      await as(role, userId);
      await rejected(() => read(), "SNAPSHOT_CAPACITY_EXCEEDED");
      const caller = await repository.identity();
      for (const [label, channel, topicId] of [["home", null, null], ["channel", "career-development", null], ["topic", null, t]]) {
        const parameters = [channel, topicId, LIMITS.candidates + 1, caller.role, caller.userId];
        const plan = (await q(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${api.CANDIDATE_SQL}`, parameters)).rows[0]["QUERY PLAN"][0];
        const nodes = [];
        const walk = node => { nodes.push(node); for (const child of node.Plans ?? []) walk(child); };
        walk(plan.Plan);
        const evidence = { role, query: label, fixtures: 2012, executionMs: plan["Execution Time"], planningMs: plan["Planning Time"],
          sharedHitBlocks: plan.Plan["Shared Hit Blocks"], indexes: [...new Set(nodes.map(node => node["Index Name"]).filter(Boolean))],
          maxNodeLoops: Math.max(...nodes.map(node => node["Actual Loops"] ?? 0)) };
        console.log(`EXPLAIN ${JSON.stringify(evidence)}`);
      }
      const ids = Array.from({ length: 20 }, (_, n) => id(10000 + n));
      const plan = (await q(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${api.HYDRATE_SQL}`,
        [null, t, ids, caller.role, caller.userId])).rows[0]["QUERY PLAN"][0];
      console.log(`EXPLAIN ${JSON.stringify({ role, query: "hydrate-20", executionMs: plan["Execution Time"],
        planningMs: plan["Planning Time"], sharedHitBlocks: plan.Plan["Shared Hit Blocks"] })}`);
      assert.equal((await read({ ...base, topicId: t })).items.length, 20);
    }
    console.log("PASS SQL capacity: complete 500-ID/25-page snapshot; 2010 eligible overflow explicitly rejected; set-based EXPLAIN recorded; no indexes added");
    await as("postgres");
    await q("SET CONSTRAINTS ALL IMMEDIATE");
  });
} finally {
  try {
    await q("ROLLBACK");
    if (before) {
      const after = await counts();
      assert.deepEqual(after, before, "Rollback count mismatch: STOP, no delete/repair");
      console.log(`ROLLBACK VERIFIED: ${JSON.stringify(after)}`);
    }
  } finally { await client.end(); }
}
