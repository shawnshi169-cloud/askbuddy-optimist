import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { withTopicLocalContract } from "./lib/topic-local-contract.mjs";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");
const program = ts.createProgram([
  "packages/shared-api/src/canonical-topic-v1-local.ts",
  "packages/shared-types/src/canonical-topic-v1-local.ts",
  "packages/shared-types/src/generated/canonical-topic-v1-local.ts",
], { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler });
assert.equal(ts.getPreEmitDiagnostics(program).length, 0, "local contracts must compile strictly");
const migration = read("supabase/migrations/20260915140330_canonical_topic_local_foundation_v1.sql");
assert.equal(createHash("sha256").update(read("supabase/migrations/20260904174215_canonical_question_answer_v1.sql")).digest("hex"),
  "46bdfa8ca8daea8950f98271013da782bc3fe9b9c75612919c8a92f1857557f7", "reviewed EC-2 migration unchanged");
assert.match(migration, /^BEGIN;/);
assert.match(migration, /COMMIT;\s*$/);
assert.doesNotMatch(migration, /SECURITY DEFINER|GRANT ALL|SELECT\s+\*|hot_topics|can_share|experience_transitions|entity_type|entity_id|p_viewer_person_id|profiles\./i);
const tables = ["canonical_topics_v1", "canonical_topic_terms_v1", "question_topics_v1", "experience_topics_v1"];
assert.deepEqual([...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((m) => m[1]), tables);
for (const table of tables) {
  assert.ok(migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`));
  assert.ok(migration.includes(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`));
}
assert.doesNotMatch(migration, /GRANT SELECT\s+ON/i, "SELECT must enumerate columns");
assert.match(migration, /normalized_term text GENERATED ALWAYS AS .* STORED PRIMARY KEY/);
assert.match(migration, /FOREIGN KEY \(topic_id, normalized_name\)[\s\S]*?DEFERRABLE INITIALLY DEFERRED/);
assert.match(migration, /question_id uuid NOT NULL REFERENCES public.questions_v1\(id\) ON DELETE RESTRICT/);
assert.match(migration, /experience_id uuid NOT NULL REFERENCES public.person_experiences\(id\) ON DELETE CASCADE/);
assert.equal([...migration.matchAll(/topic_id uuid NOT NULL REFERENCES public.canonical_topics_v1\(topic_id\) ON DELETE RESTRICT/g)].length, 3);
assert.match(migration, /PRIMARY KEY \(question_id, topic_id\)/);
assert.match(migration, /PRIMARY KEY \(experience_id, topic_id\)/);
assert.match(migration, /pg_advisory_xact_lock_shared/);
assert.match(migration, /TOPIC_INVALID_OR_INACTIVE/);
assert.doesNotMatch(migration, /CANONICAL_TOPIC_NOT_READY/);
const body = (name) => {
  const match = migration.match(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${name.replaceAll(".", "\\.")}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`));
  assert.ok(match, name); return match[1];
};
for (const kind of ["question", "experience"]) {
  const guard = body(`ec3_topic_private.guard_${kind}_link`);
  assert.match(guard, new RegExp(`lock_${kind}_owner\\(OLD.${kind}_id\\)`));
  assert.match(guard, new RegExp(`lock_${kind}_owner\\(NEW.${kind}_id\\)`));
  assert.match(guard, /require_active\(NEW.topic_id\)/);
}
assert.match(body("ec3_topic_private.lock_question_owner"), /UPDATE public.questions_v1 AS q SET title = q.title/);
assert.doesNotMatch(body("ec3_topic_private.lock_question_owner"), /pg_advisory/,
  "do not reverse row -> existing EC-2 advisory lock order");
assert.match(body("ec3_topic_private.lock_experience_owner"), /e.person_id = auth.uid\(\) AND e.deleted_at IS NULL FOR NO KEY UPDATE/);
assert.match(body("ec3_topic_private.guard_experience_link"),
  /IF TG_OP = 'DELETE' THEN\s*--[^\n]*\n\s*--[^\n]*\n\s*IF CURRENT_USER IN \('postgres', 'supabase_admin', 'service_role'\)\s*AND NOT EXISTS \(SELECT 1 FROM public.person_experiences AS e WHERE e.id = OLD.experience_id\) THEN\s*RETURN OLD;\s*END IF;\s*PERFORM ec3_topic_private.lock_experience_owner\(OLD.experience_id\);/,
  "only trusted-role deletion of a physically absent parent may skip the owner JWT gate");
assert.doesNotMatch(body("ec3_topic_private.guard_experience_link"), /current_setting|SESSION_USER|pg_trigger_depth/i);
assert.doesNotMatch(migration, /GRANT[\s\S]*?DELETE[^;]*ON public.person_experiences/i);
for (const name of ["ec3_topic_private.replace_question_topics", "public.set_experience_topics_v1"]) {
  assert.match(body(name), /IF NOT EXISTS[\s\S]*?require_active/);
  assert.match(body(name), /ORDER BY input.id/);
}
const resolver = body("public.resolve_canonical_topic_v1");
assert.match(resolver, /term.normalized_term = ec3_topic_private.normalize_term\(p_term\) AND t.status = 'active'/);
assert.doesNotMatch(resolver, /INSERT|UPDATE|DELETE/);
const newRpcs = ["resolve_canonical_topic_v1", "get_experience_topics_v1", "set_experience_topics_v1"];
for (const name of newRpcs) {
  assert.ok(!read("packages/shared-api/src/rpc-whitelist.ts").includes(name));
  assert.ok(!read("packages/shared-api/src/rpc-catalog.ts").includes(name));
  assert.ok(read("packages/shared-types/src/generated/canonical-topic-v1-local.ts").includes(name));
  assert.ok(!read("src/integrations/supabase/types.ts").includes(name));
}
for (const table of tables) assert.ok(read("packages/shared-types/src/generated/canonical-topic-v1-local.ts").includes(table));
const runner = read("scripts/canonical-topic-v1-local-test.mjs");
assert.match(runner, /refuse non-local endpoint/);
assert.match(runner, /"db","reset","--local","--no-seed"/);
const localSql = read("scripts/sql/canonical-topic-v1-local.sql");
for (const name of ["privileged Experience parent hard delete cascades old/new children", "account cascade removes Experience and old/new children",
  "non-owner association delete changes zero rows", "soft delete retains parent and child storage"]) assert.ok(localSql.includes(name));
assert.doesNotMatch(runner, /--linked|--db-url|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
assert.match(read("packages/shared-api/src/question-answer-v1.ts"), /const topicIds = z.array\(uuid\).length\(0\)/);
assert.ok(read("packages/shared-api/src/product-blueprint-v1.ts").includes("EC-3B1 local"));
assert.ok(read("docs/ec3b1-canonical-topic-foundation.md").includes("NOT DEPLOYED"));
assert.ok(JSON.parse(read("package.json")).scripts["test:contracts"].includes("test:canonical-topic-v1"));

await withTopicLocalContract(async (api, production) => {
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE.productionDeployed, false);
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE.clientConsumable, false);
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE.duplicateInput, "reject-INVALID_INPUT");
  assert.deepEqual(Object.keys(api.CANONICAL_TOPIC_V1_LOCAL_RPCS), newRpcs);
  const a = "e3b10000-0000-4000-8000-000000000010";
  const b = "e3b10000-0000-4000-8000-000000000011";
  const request = { p_title: "title", p_context: "context", p_primary_channel: "education-learning", p_topic_ids: [a], p_deep_exchange_budget_max_cents: null };
  assert.deepEqual(api.parseQuestionTopicWriteV1Local("create_question_v1", request).p_topic_ids, [a]);
  assert.throws(() => production.QUESTION_ANSWER_V1_RPCS.create_question_v1.parseParams(request));
  for (const invalid of [null, [null], [a, a], ["bad"], [[a]]]) {
    assert.throws(() => api.parseQuestionTopicWriteV1Local("create_question_v1", { ...request, p_topic_ids: invalid }));
  }
  assert.throws(() => api.parseQuestionTopicWriteV1Local("create_question_v1", { ...request, requesterPersonId: a }));
  const resolve = api.CANONICAL_TOPIC_V1_LOCAL_RPCS.resolve_canonical_topic_v1;
  const topic = { topicId: a, canonicalName: "LOCAL topic", aliases: ["本地合成"], status: "active" };
  assert.equal(resolve.parseResult({ topic }, { p_term: " local  TOPIC " }).topic.topicId, a);
  assert.equal(resolve.parseResult({ topic: null }, { p_term: "unknown" }).topic, null);
  assert.throws(() => resolve.parseResult({ topic: { ...topic, status: "deprecated" } }, { p_term: "local topic" }));
  assert.throws(() => resolve.parseResult({ topic: { ...topic, internalNotes: "private" } }, { p_term: "local topic" }));
  assert.throws(() => resolve.parseResult({ topic }, { p_term: "unrelated" }));
  assert.throws(() => resolve.parseParams({ p_term: "local", p_viewer_person_id: a }));
  const set = api.CANONICAL_TOPIC_V1_LOCAL_RPCS.set_experience_topics_v1;
  assert.deepEqual(set.parseResult({ experienceId: a, topicIds: [a,b] }, { p_experience_id: a, p_topic_ids: [b,a] }).topicIds, [a,b]);
  assert.throws(() => set.parseResult({ experienceId: a, topicIds: [b,a] }, { p_experience_id: a, p_topic_ids: [a,b] }));
  assert.throws(() => set.parseResult({ experienceId: a, topicIds: [a] }, { p_experience_id: a, p_topic_ids: [b] }));
  assert.equal(api.parseCanonicalTopicErrorV1Local({ code: "PT422", message: "TOPIC_INVALID_OR_INACTIVE" }), "TOPIC_INVALID_OR_INACTIVE");
  assert.equal(api.parseCanonicalTopicErrorV1Local({ code: "PT400", message: "TOPIC_INVALID_OR_INACTIVE" }), null);
});
console.log("PASS: Canonical Topic local schema/contract guard; Production/consumer gate remains closed");
