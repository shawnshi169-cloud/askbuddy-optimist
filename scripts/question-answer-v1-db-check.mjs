import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const directory = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(directory).filter((name) => name.endsWith("_canonical_question_answer_v1.sql"));
assert.equal(files.length, 1);
const sql = readFileSync(new URL(files[0], directory), "utf8");
const source = read("packages/shared-api/src/question-answer-v1.ts");
const expected = [...source.matchAll(/"public\.(\w+)\(([^)]*)\)"/g)].map((match) => [match[1], match[2]]);
assert.equal(expected.length, 12);
const functions = [...sql.matchAll(/CREATE FUNCTION (\w+)\.(\w+)\(([^)]*)\)\s*RETURNS ([\s\S]*?)\n\$\$;/g)];
const publicFunctions = functions.filter((match) => match[1] === "public");
assert.deepEqual(publicFunctions.map((match) => match[2]).sort(), expected.map(([name]) => name).sort());
for (const [name, signature] of expected) {
  const fn = publicFunctions.find((match) => match[2] === name);
  const types = fn[3].split(",").map((param) => param.trim().split(/\s+/).slice(1).join(" ")).join(",");
  assert.equal(types, signature, name);
  assert.match(fn[4], /^jsonb\b/);
  assert.ok(sql.includes(`public.${name}(${signature})`), `explicit ACL signature: ${name}`);
}
for (const fn of functions) {
  assert.match(fn[4], /SECURITY INVOKER SET search_path = ''/, fn[2]);
  assert.doesNotMatch(fn[4], /SECURITY DEFINER|EXECUTE\s+format|EXECUTE\s+['"]/, fn[2]);
}
const tables = ["questions_v1", "answers_v1", "answer_replies_v1", "answer_helpful_marks_v1", "answer_helpful_public_facts_v1"];
for (const name of tables) {
  assert.match(sql, new RegExp(`CREATE TABLE public\\.${name} \\(`));
  assert.ok(sql.includes(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;`));
  assert.ok(sql.includes(`ALTER TABLE public.${name} FORCE ROW LEVEL SECURITY;`));
}
assert.doesNotMatch(sql, /GRANT\s+ALL|GRANT\s+SELECT\s+ON|SELECT\s+\*|\b\w+\.\*/i);
assert.doesNotMatch(sql, /SECURITY DEFINER|ON DELETE CASCADE|p_viewer_person_id|parent_reply_id|reopen_question_v1/);
assert.doesNotMatch(sql, /public\.(experts|questions|answers|answer_likes|orders|profiles|question_tags|hot_topics)\b/);
assert.doesNotMatch(sql, /\b(accepted|bounty|reward_points|expert_id|service_id|order_id|question_topics_v1)\b/i);
assert.match(sql, /deep_exchange_budget_max_cents bigint CHECK/);
assert.match(sql, /deep_exchange_budget_max_cents > 0 AND deep_exchange_budget_max_cents <= 9007199254740991/);
assert.match(sql, /p_topics IS NULL OR cardinality\(p_topics\) <> 0/);
assert.match(sql, /'topicIds', '\[\]'::jsonb/);
assert.equal((sql.match(/DEFERRABLE INITIALLY DEFERRED/g) ?? []).length, 2);
assert.match(sql, /UNIQUE \(answer_id, person_id\)/);
assert.match(sql, /GRANT SELECT \(answer_id\) ON public.answer_helpful_public_facts_v1 TO anon, authenticated/);
assert.doesNotMatch(sql, /GRANT SELECT \([^;]*mark_id[^;]*public\.answer_helpful_public_facts_v1/);
assert.match(sql, /m\.mark_id = answer_helpful_public_facts_v1\.mark_id/);
assert.match(sql, /m\.answer_id = answer_helpful_public_facts_v1\.answer_id AND m\.person_id = \(SELECT auth\.uid\(\)\)/);
assert.match(sql, /a\.author_person_id <> \(SELECT auth\.uid\(\)\)/);
assert.match(sql, /CREATE TRIGGER helpful_marks_v1_guard BEFORE INSERT OR DELETE/);
assert.match(sql, /IF v_author = auth\.uid\(\) THEN RAISE SQLSTATE 'PT403' USING MESSAGE = 'SELF_HELPFUL_FORBIDDEN'/);
assert.match(sql, /IF auth\.uid\(\) IS NULL THEN RETURN false; END IF/);
assert.match(sql, /public\.get_public_person_profile_v1\(p_person\)/);
assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/);
assert.match(sql, /current_setting\('transaction_isolation'\) <> 'read committed'/);
assert.match(sql, /PERFORM ec2_private\.lock_question\(NEW\.question_id, TG_OP = 'INSERT'\)/);
assert.match(sql, /PERFORM ec2_private\.lock_answer\(NEW\.answer_id, TG_OP = 'INSERT'\)/);
assert.match(sql, /BEFORE UPDATE OF title, context, primary_channel, deep_exchange_budget_max_cents/);
assert.match(sql, /NEW\.deleted_at := coalesce\(OLD\.deleted_at, clock_timestamp\(\)\)/);
assert.match(sql, /ORDER BY q\.created_at DESC, q\.id ASC LIMIT p_limit \+ 1 OFFSET p_offset/);
assert.match(sql, /i\.helpful_count ELSE 0 END DESC, i\.created_at DESC, i\.id ASC/);
assert.match(sql, /ORDER BY r\.created_at ASC, r\.id ASC LIMIT p_limit \+ 1 OFFSET p_offset/);
assert.equal((sql.match(/CASE WHEN v_count > p_limit THEN p_offset::bigint \+ jsonb_array_length\(v_rows\) ELSE NULL END/g) ?? []).length, 3);
for (const name of ["list_question_answers_v1", "list_answer_replies_v1"]) {
  const body = publicFunctions.find((match) => match[2] === name)[4];
  assert.match(body, /a\.deleted_at IS NULL AND a\.moderation_visibility = 'visible'/);
  assert.match(body, /q\.deleted_at IS NULL AND q\.moderation_visibility = 'visible'/);
  assert.doesNotMatch(body, /'phone'|'email'|'markId'|'claims'|'deletedAt'|'moderationVisibility'/);
}
for (const code of [
  "TARGET_NOT_FOUND_OR_INACCESSIBLE", "QUESTION_CLOSED", "SELF_HELPFUL_FORBIDDEN",
  "CANONICAL_TOPIC_NOT_READY", "INVALID_INPUT", "AUTHENTICATION_REQUIRED",
  "IMMUTABLE_FIELD", "UNSUPPORTED_TRANSACTION_ISOLATION",
]) {
  assert.ok(sql.includes(`MESSAGE = '${code}'`));
}
const whitelist = read("packages/shared-api/src/rpc-whitelist.ts");
const catalog = read("packages/shared-api/src/rpc-catalog.ts");
for (const [name] of expected) {
  assert.match(whitelist, new RegExp(`\\b${name}: RPC_CATALOG\\.${name}\\.qualifiedName`), `client whitelist: ${name}`);
  assert.match(catalog, new RegExp(`\\b${name}: questionAnswerRpc\\(`), `RPC catalog: ${name}`);
}
assert.match(source, /runtimeStatus: "production-ready"/);
assert.match(source, /productionDeployed: true/);
assert.match(source, /clientConsumable: true/);
assert.match(source, /productionGrantReview: "aligned"/);
console.log(`EC-2B static DB contract PASS: ${tables.length} tables, ${publicFunctions.length} approved RPCs, ${functions.length} invoker functions.`);
console.log("Static checks do not replace EC-2C2/C3 Production evidence; exact 12 consumer RPCs are now aligned.");
