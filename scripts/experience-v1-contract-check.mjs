import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const migrationPath =
  "supabase/migrations/20260902145009_canonical_experience_v1.sql";
const contractPath = "packages/shared-api/src/experience-v1.ts";
const tempRoot = mkdtempSync(join(tmpdir(), "askbuddy-experience-v1-"));
const require = createRequire(import.meta.url);

const output = ts.transpileModule(read(contractPath), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: contractPath,
  reportDiagnostics: true,
});
const errors = (output.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.deepEqual(errors, [], "Experience v1 parser must transpile without errors");
const outputPath = join(tempRoot, "experience-v1.cjs");
writeFileSync(outputPath, output.outputText);

const personId = "11111111-1111-4111-8111-111111111111";
const experienceId = "22222222-2222-4222-8222-222222222222";
const transitionId = "33333333-3333-4333-8333-333333333333";
const claimId = "44444444-4444-4444-8444-444444444444";

const publicExperience = {
  experienceId,
  personId,
  title: "从化工背景到大客户销售",
  description: "用户确认的经历描述",
  kind: "journey",
  timeRange: {
    startYear: 2022,
    startMonth: null,
    endYear: 2024,
    endMonth: null,
    isCurrent: false,
  },
  location: { label: "上海", city: "上海", cityCode: null },
  canShare: ["技术转销售", "大客户销售"],
  visibility: "public",
  transitions: [{
    transitionId,
    experienceId,
    personId,
    fromLabel: "技术",
    toLabel: "销售",
    occurredYear: 2023,
    occurredMonth: null,
    sortOrder: 0,
  }],
  sortOrder: 0,
  createdAt: "2026-09-02T00:00:00Z",
  updatedAt: "2026-09-02T00:00:00Z",
};

try {
  const {
    parseGetMyPersonExperiencesV1Result,
    parseGetPublicPersonExperiencesV1Result,
  } = require(outputPath);

  const publicResult = {
    personId,
    experiences: [publicExperience],
    page: { limit: 20, offset: 0, hasMore: false },
  };
  assert.deepEqual(parseGetPublicPersonExperiencesV1Result(publicResult), publicResult);

  const ownerResult = {
    personId,
    experiences: [{
      ...publicExperience,
      visibility: "private",
      claims: [{
        claimId,
        experienceId,
        personId,
        claimType: "employer",
        value: "用户确认的雇主",
        createdAt: "2026-09-02T00:00:00Z",
        updatedAt: "2026-09-02T00:00:00Z",
      }],
    }],
    page: { limit: 50, offset: 0, hasMore: false },
  };
  assert.deepEqual(parseGetMyPersonExperiencesV1Result(ownerResult), ownerResult);

  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{ ...publicExperience, visibility: "private" }],
    }),
    TypeError,
    "Public parser must reject private Experience",
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{ ...publicExperience, claims: [] }],
    }),
    TypeError,
    "Public parser must reject owner-only Claim metadata",
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{ ...publicExperience, phone: "forbidden" }],
    }),
    TypeError,
    "Public parser must reject phone",
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{ ...publicExperience, deletedAt: null }],
    }),
    TypeError,
    "Public parser must reject internal deletion metadata",
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{ ...publicExperience, kind: "expert" }],
    }),
    TypeError,
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{
        ...publicExperience,
        timeRange: { ...publicExperience.timeRange, startMonth: 3, startYear: null },
      }],
    }),
    TypeError,
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      experiences: [{
        ...publicExperience,
        transitions: [{ ...publicExperience.transitions[0], personId: claimId }],
      }],
    }),
    TypeError,
    "Transition owner must match its parent Experience",
  );
  assert.throws(
    () => parseGetPublicPersonExperiencesV1Result({
      ...publicResult,
      personId: claimId,
    }),
    TypeError,
    "Result personId must match every Experience owner",
  );

  const sharedTypes = read("packages/shared-types/src/experience-v1.ts");
  assert.match(sharedTypes, /personId: PublicPersonId/);
  assert.match(sharedTypes, /visibility: "public"/);
  assert.match(sharedTypes, /visibility: ExperienceVisibilityV1/);
  assert.match(sharedTypes, /claimId: ExperienceClaimId/);
  assert.match(sharedTypes, /fromLabel: string/);
  assert.match(sharedTypes, /toLabel: string/);
  assert.doesNotMatch(
    sharedTypes,
    /expertId|serviceId|verified|verificationStatus|canonicalTopicId|currentNeed|currentInterest/i,
  );

  const migration = read(migrationPath);
  for (const table of [
    "person_experiences",
    "experience_transitions",
    "experience_claims",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE public\\.${table}\\b`));
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} FORCE ROW LEVEL SECURITY`));
  }
  assert.match(migration, /person_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /visibility IN \('public', 'private'\)/);
  assert.doesNotMatch(migration, /matching_only/);
  assert.match(migration, /from_label text NOT NULL/);
  assert.match(migration, /to_label text NOT NULL/);
  assert.doesNotMatch(migration, /canonical_topic_id|current_need|current_interest|service_id|expert_id/i);
  assert.match(migration, /experience_claims[\s\S]*?id uuid PRIMARY KEY/);
  assert.doesNotMatch(migration, /is_verified|verification_status|evidence(_|\b)/i);
  assert.doesNotMatch(migration, /INSERT[\s\S]{0,300}SELECT[\s\S]{0,300}experts/i);

  const publicFunctionStart = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public.get_public_person_experiences_v1",
  );
  const publicFunctionEnd = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public.create_person_experience_v1",
    publicFunctionStart,
  );
  const publicFunction = migration.slice(publicFunctionStart, publicFunctionEnd);
  assert.match(publicFunction, /SECURITY INVOKER/);
  assert.match(publicFunction, /SET search_path = ''/);
  assert.match(publicFunction, /item\.visibility = 'public'/);
  assert.match(publicFunction, /item\.deleted_at IS NULL/);
  assert.doesNotMatch(publicFunction, /SELECT\s+(?:\w+\.)?\*/i);
  assert.doesNotMatch(publicFunction, /experience_claims|'claims'|claim_value/);
  assert.doesNotMatch(publicFunction, /phone|profiles|experts/i);

  const functionNames = [
    "get_public_person_experiences_v1",
    "get_my_person_experiences_v1",
    "create_person_experience_v1",
    "update_person_experience_v1",
    "set_person_experience_visibility_v1",
    "reorder_person_experiences_v1",
    "delete_person_experience_v1",
    "create_experience_transition_v1",
    "update_experience_transition_v1",
    "delete_experience_transition_v1",
    "create_experience_claim_v1",
    "update_experience_claim_v1",
    "delete_experience_claim_v1",
  ];
  for (const name of functionNames) {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
    assert.ok(start >= 0, `Missing ${name}`);
    const next = migration.indexOf("CREATE OR REPLACE FUNCTION public.", start + 1);
    const definition = migration.slice(start, next < 0 ? migration.length : next);
    assert.match(definition, /SECURITY INVOKER/, `${name} must be invoker`);
    assert.match(definition, /SET search_path = ''/, `${name} needs an empty search_path`);
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(`));
  }

  assert.match(migration, /CREATE POLICY person_experiences_anon_select_v1[\s\S]*?TO anon[\s\S]*?visibility = 'public'[\s\S]*?deleted_at IS NULL/);
  assert.match(migration, /CREATE POLICY person_experiences_authenticated_select_v1[\s\S]*?TO authenticated[\s\S]*?visibility = 'public' OR \(SELECT auth\.uid\(\)\) = person_id/);
  assert.doesNotMatch(migration, /TO anon, authenticated[\s\S]{0,120}USING/);
  assert.match(migration, /CREATE POLICY experience_claims_owner_select_v1[\s\S]*?TO authenticated/);
  assert.doesNotMatch(migration, /CREATE POLICY experience_claims_public/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_person_experiences_v1[\s\S]*?TO anon, authenticated, service_role/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_person_experience_v1[\s\S]*?v_uid uuid := \(SELECT auth\.uid\(\)\)/);

  const publicPersonMigration = read(
    "supabase/migrations/20260901154746_canonical_public_person_profile_v1.sql",
  );
  assert.match(publicPersonMigration, /SECURITY INVOKER/);
  assert.doesNotMatch(publicPersonMigration, /'phone'/);

  const catalog = read("packages/shared-api/src/rpc-catalog.ts");
  for (const name of functionNames) {
    assert.match(
      catalog,
      new RegExp(`"${name}"[\\s\\S]{0,260}"pending-deployment"`),
      `${name} must remain pending until Production deployment`,
    );
  }

  const blueprint = read("packages/shared-api/src/product-blueprint-v1.ts");
  assert.match(blueprint, /domain: "experience"[\s\S]*?runtimeStatus: "not-deployed"/);
  for (const name of functionNames) {
    assert.match(
      blueprint,
      new RegExp(`${name}:[\\s\\S]{0,180}newBlueprintCodeMayDepend: false`),
      `${name} must remain unavailable to new consumers until deployment`,
    );
  }

  const clientWhitelist = read("packages/shared-api/src/rpc-whitelist.ts");
  assert.doesNotMatch(
    clientWhitelist,
    /get_(?:public|my)_person_experiences_v1|create_person_experience_v1/,
    "Pending Experience RPCs must not enter the deployed client whitelist",
  );

  const decision = read("docs/canonical-experience-v1-contract-decision.md");
  for (const truth of [
    "SECURITY INVOKER",
    "Production migration **尚未部署**",
    "不自动迁移",
    "Current Need",
    "AI 输出",
    "profiles.phone",
    "REMAINS",
    "BLOCKED",
  ]) {
    assert.ok(decision.includes(truth), `Decision missing: ${truth}`);
  }

  const packageJson = JSON.parse(read("package.json"));
  assert.equal(
    packageJson.scripts["test:experience-v1"],
    "node scripts/experience-v1-contract-check.mjs",
  );
  assert.match(packageJson.scripts["test:contracts"], /experience-v1-contract-check\.mjs/);

  console.log("Canonical Experience v1 contract truth guards passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
