import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
assert.equal(createHash("sha256").update(migration).digest("hex"),
  "2d97c4944228e6bf0150b76c773855c6c1acc417dd8fd270d729adb70142c53a", "deployed B1 migration must not be rewritten");
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
  assert.ok(read("packages/shared-api/src/rpc-whitelist.ts").includes(`${name}: RPC_CATALOG.${name}.qualifiedName`));
  assert.ok(read("packages/shared-api/src/rpc-catalog.ts").includes(name));
  assert.ok(read("packages/shared-types/src/generated/canonical-topic-v1-local.ts").includes(name));
  assert.ok(read("src/integrations/supabase/types.ts").includes(name));
}
for (const table of tables) assert.ok(read("packages/shared-types/src/generated/canonical-topic-v1-local.ts").includes(table));

// Production generator output must retain the exact approved B1 table/RPC structures.
const generated = (path, alias) => {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === alias);
  assert.ok(declaration && ts.isTypeLiteralNode(declaration.type));
  return { source, type: declaration.type };
};
const member = (node, name) => {
  const found = node.members.find((item) => item.name?.getText().replaceAll('"', '') === name);
  assert.ok(found && found.type, `missing generated member ${name}`); return found.type;
};
const actual = generated("src/integrations/supabase/types.ts", "Database");
const approved = generated("packages/shared-types/src/generated/canonical-topic-v1-local.ts", "CanonicalTopicDatabaseV1Local");
const printer = ts.createPrinter({ removeComments: true });
const normalized = (snapshot, section, name) => printer.printNode(ts.EmitHint.Unspecified,
  member(member(member(snapshot.type, "public"), section), name), snapshot.source).replace(/\s/g, "");
for (const [section, names] of [["Tables", tables], ["Functions", newRpcs]]) {
  for (const name of names) assert.equal(normalized(actual, section, name), normalized(approved, section, name), name);
}

// B2C authorizes contracts only; no Topic feature hookup or direct table access in UI/native code.
const gatedSymbols = /canonical-topic-v1|CANONICAL_TOPIC_V1_(?:LOCAL_)?(?:RPCS|STATE)|parseQuestion(?:WithTopics|TopicWrite)V1|canonicalTopicV1(?:Local)?Schema|experienceTopicsV1(?:Local)?Schema|resolve_canonical_topic_v1|get_experience_topics_v1|set_experience_topics_v1|canonical_topics_v1|canonical_topic_terms_v1|question_topics_v1|experience_topics_v1/;
const clientFiles = execFileSync("git", ["ls-files", "--", "src", "apps"], { encoding: "utf8" }).trim().split("\n");
for (const path of clientFiles.filter((path) => /\.[cm]?[jt]sx?$/.test(path) && path !== "src/integrations/supabase/types.ts")) {
  assert.doesNotMatch(read(path), gatedSymbols, `${path}: Topic UI/native hookup is outside B2C`);
}
assert.doesNotMatch(read("packages/shared-api/src/canonical-topic-v1.ts"), /createClient|\.rpc\(|fetch\(/);
const runner = read("scripts/canonical-topic-v1-local-test.mjs");
assert.match(runner, /refuse non-local endpoint/);
assert.match(runner, /"db","reset","--local","--no-seed"/);
const localSql = read("scripts/sql/canonical-topic-v1-local.sql");
for (const name of ["privileged Experience parent hard delete cascades old/new children", "account cascade removes Experience and old/new children",
  "non-owner association delete changes zero rows", "soft delete retains parent and child storage"]) assert.ok(localSql.includes(name));
assert.doesNotMatch(runner, /--linked|--db-url|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
assert.match(read("packages/shared-api/src/question-answer-v1.ts"), /export const questionTopicIdsInput/);
assert.match(read("packages/shared-api/src/question-answer-v1.ts"), /export const questionTopicIdsOutput/);
assert.doesNotMatch(read("packages/shared-api/src/canonical-topic-v1.ts"), /topicIds: \[\]|p_topic_ids: \[\]/, "QA helpers must not strip/reinsert IDs");
assert.ok(read("packages/shared-api/src/product-blueprint-v1.ts").includes("EC-3B2B Production"));
assert.ok(read("docs/ec3b1-canonical-topic-foundation.md").includes("NOT DEPLOYED"));
const evidence = read("docs/ec3b2b-canonical-topic-production-deploy.md");
for (const phrase of ["PRODUCTION DEPLOYED / VERIFIED", "CLIENT NOT ENABLED", "EC-3B2C PENDING", "Persistent synthetic rows = 0"]) assert.ok(evidence.includes(phrase));
assert.ok(JSON.parse(read("package.json")).scripts["test:contracts"].includes("test:canonical-topic-v1"));

await withTopicLocalContract(async (api, production, backend, contracts) => {
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE, backend.CANONICAL_TOPIC_V1_STATE);
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_RPCS, backend.CANONICAL_TOPIC_V1_RPCS);
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE.productionDeployed, true);
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE.clientConsumable, true);
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.productionGrantReview, "aligned");
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.productionQuestionTopics, "active-canonical-ids-with-historical-deprecated-retention");
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.productionExperienceTopics, "deployed");
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.productionResolver, "deployed");
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.sharedCoreQuestionTopics, "0..N-canonical-topic-ids");
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.consumerUnlockPhase, "EC-3B2C");
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.consumerGateStatus, "verified");
  assert.equal(production.QUESTION_ANSWER_V1_CONTRACT_STATE.topicAssociation, "canonical-topic-v1-consumable");
  for (const name of newRpcs) {
    assert.equal(contracts.RPC_CATALOG[name].status, "canonical");
    assert.equal(contracts.RPC_CATALOG[name].productionGrantReview, "aligned");
    assert.equal(contracts.RPC_CATALOG[name].authentication, name.startsWith("set_") ? "authenticated" : "anon");
    assert.equal(contracts.CLIENT_RPC_WHITELIST[name], contracts.RPC_CATALOG[name].qualifiedName);
    assert.equal(contracts.PRODUCT_BLUEPRINT_V1_RPC_POLICY[name].use, "canonical-blueprint");
    assert.equal(contracts.PRODUCT_BLUEPRINT_V1_RPC_POLICY[name].newBlueprintCodeMayDepend, true);
    assert.match(contracts.PRODUCT_BLUEPRINT_V1_RPC_POLICY[name].replacement, /EC-3B2C/);
    assert.equal(backend.CANONICAL_TOPIC_V1_RPCS[name].clientConsumable, true);
  }
  assert.deepEqual(Object.keys(contracts.CLIENT_RPC_WHITELIST).filter((name) => contracts.RPC_CATALOG[name].featureOwner === "topics").sort(), [...newRpcs].sort());
  assert.equal(api.CANONICAL_TOPIC_V1_LOCAL_STATE.duplicateInput, "reject-INVALID_INPUT");
  assert.deepEqual(Object.keys(api.CANONICAL_TOPIC_V1_LOCAL_RPCS), newRpcs);
  const a = "e3b10000-0000-4000-8000-000000000010";
  const b = "e3b10000-0000-4000-8000-000000000011";
  const request = { p_title: "title", p_context: "context", p_primary_channel: "education-learning", p_topic_ids: [a], p_deep_exchange_budget_max_cents: null };
  assert.deepEqual(api.parseQuestionTopicWriteV1Local("create_question_v1", request).p_topic_ids, [a]);
  assert.deepEqual(production.QUESTION_ANSWER_V1_RPCS.create_question_v1.parseParams(request), request);
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
await import("./canonical-topic-consumer-check.mjs");
console.log("PASS: Canonical Topic B2C consumer contract verified; exact three RPCs authorized, no Topic UI or seed");
