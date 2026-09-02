import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const tempRoot = mkdtempSync(join(tmpdir(), "askbuddy-public-person-"));
const require = createRequire(import.meta.url);
const contractPath = "packages/shared-api/src/public-person-v1.ts";
const migrationPath =
  "supabase/migrations/20260901154746_canonical_public_person_profile_v1.sql";

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
assert.deepEqual(errors, [], "Public Person parser must transpile without errors");
const outputPath = join(tempRoot, "public-person-v1.cjs");
writeFileSync(outputPath, output.outputText);

try {
  const { parseGetPublicPersonProfileV1Result } = require(outputPath);
  const ordinaryPerson = {
    person: {
      userId: "11111111-1111-4111-8111-111111111111",
      displayName: "普通用户",
      avatarUrl: null,
      coverUrl: null,
      bio: "真实简介",
      city: "上海",
      school: "示例学校",
      industry: "教育",
      joinedAt: "2026-09-01T00:00:00Z",
      contributionSummary: { answerCount: 2, postCount: 1 },
      expertExtension: null,
    },
  };
  assert.deepEqual(parseGetPublicPersonProfileV1Result(ordinaryPerson), ordinaryPerson);

  const unnamedPerson = {
    person: { ...ordinaryPerson.person, displayName: null },
  };
  assert.deepEqual(parseGetPublicPersonProfileV1Result(unnamedPerson), unnamedPerson);

  const activeExpert = {
    person: {
      ...ordinaryPerson.person,
      expertExtension: {
        headline: "职业经历分享者",
        intro: null,
        expertiseSummary: "职业发展",
      },
    },
  };
  assert.deepEqual(parseGetPublicPersonProfileV1Result(activeExpert), activeExpert);
  assert.throws(
    () => parseGetPublicPersonProfileV1Result({
      person: {
        ...activeExpert.person,
        expertExtension: {
          ...activeExpert.person.expertExtension,
          publishedSkillOfferCount: 1,
        },
      },
    }),
    TypeError,
    "Paid service capability must not be nested under expertExtension",
  );
  assert.deepEqual(parseGetPublicPersonProfileV1Result({ person: null }), { person: null });

  for (const forbiddenField of [
    "phone",
    "id",
    "is_verified",
    "verification_status",
    "education",
    "experience",
  ]) {
    assert.throws(
      () => parseGetPublicPersonProfileV1Result({
        person: { ...ordinaryPerson.person, [forbiddenField]: "forbidden" },
      }),
      TypeError,
      `Public Person response must reject ${forbiddenField}`,
    );
  }
  assert.throws(
    () => parseGetPublicPersonProfileV1Result({
      person: {
        ...ordinaryPerson.person,
        contributionSummary: { answerCount: -1, postCount: 0 },
      },
    }),
    TypeError,
  );
  assert.throws(
    () => parseGetPublicPersonProfileV1Result({
      person: { ...ordinaryPerson.person, userId: "expert-row-id" },
    }),
    TypeError,
  );

  const migration = read(migrationPath);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_public_person_profile_v1\(/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.doesNotMatch(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = ''/);
  for (const relation of ["profiles", "answers", "posts", "experts"]) {
    assert.match(migration, new RegExp(`public\\.${relation}\\b`));
  }
  assert.doesNotMatch(migration, /public\.skill_offers|publishedSkillOfferCount/);
  assert.doesNotMatch(migration, /auth\.users|public\.user_settings/);
  assert.doesNotMatch(
    migration,
    /\b(phone|is_verified|verification_status|education|experience|rating|order_count|consultation_count|followers_count)\b/,
  );
  assert.match(migration, /'userId', p\.user_id/);
  assert.match(migration, /'displayName', nullif\(btrim\(p\.nickname\), ''\)/);
  assert.doesNotMatch(migration, /coalesce\(nullif\(btrim\(p\.nickname\)/);
  assert.match(migration, /e\.user_id = p\.user_id/);
  assert.match(migration, /coalesce\(a\.is_hidden, false\) = false/);
  assert.match(migration, /a\.status IN \('active', 'accepted'\)/);
  assert.match(migration, /post\.status = 'active'/);
  assert.match(migration, /post\.visibility = 'public'/);
  assert.match(migration, /e\.profile_status = 'active'/);
  assert.match(migration, /e\.is_active IS TRUE/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.get_public_person_profile_v1\(uuid\) FROM PUBLIC/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.get_public_person_profile_v1\(uuid\)[\s\S]*TO anon, authenticated, service_role/,
  );

  const decision = read("docs/canonical-public-person-profile-contract-decision.md");
  assert.match(decision, /SECURITY INVOKER/);
  assert.match(decision, /phone.*exposure.*OPEN/s);
  assert.match(decision, /AuthContext\.fetchProfile/);
  assert.match(decision, /PUBLIC_PROFILE_READERS_MIGRATED = YES/);
  assert.match(decision, /Answer\/Question 使用 `author_id`/);
  assert.match(decision, /提问者账号.*回答者账号/);
  assert.match(decision, /Paid service capability.*Person/);
  assert.match(decision, /expertExtension.*不得用于 gate.*paid service capability/s);

  const rpcCatalog = read("packages/shared-api/src/rpc-catalog.ts");
  assert.match(
    rpcCatalog,
    /"get_public_person_profile_v1", "canonical", "anon", "people",[\s\S]*?"aligned"/,
  );
  assert.doesNotMatch(
    rpcCatalog,
    /"get_public_person_profile_v1", "canonical", "anon", "people",[\s\S]*?"pending-deployment"/,
  );

  console.log("Public Person contract checks passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
