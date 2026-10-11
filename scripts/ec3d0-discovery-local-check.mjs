import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

assert.deepEqual(process.argv.slice(2), ["--local"], "Explicit --local only; no remote target accepted");
const context = "colima-askbuddy-ec2b";
const container = "supabase_db_askbuddy-ec2b";
const env = { HOME: process.env.HOME, PATH: process.env.PATH };
const docker = (args, input) => execFileSync("docker", args, {
  env, input, encoding: "utf8", timeout: 90000, maxBuffer: 4 * 1024 * 1024,
});
assert.equal(docker(["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"] ).trim(),
  `unix://${process.env.HOME}/.colima/askbuddy-ec2b/docker.sock`);
const image = docker(["--context", context, "inspect", container, "--format", "{{.Config.Image}}"] ).trim();
assert.equal(image, "public.ecr.aws/supabase/postgres:17.6.1.095");
const sql = (input) => docker(["--context", context, "exec", "-i", container, "psql", "-X", "--no-password",
  "-h", "/var/run/postgresql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], input).trim();
const tables = ["auth.users", "public.profiles", "public.user_settings", "public.point_accounts",
  "public.canonical_topics_v1", "public.canonical_topic_terms_v1", "public.question_topics_v1",
  "public.experience_topics_v1", "public.questions_v1", "public.answers_v1", "public.answer_replies_v1",
  "public.answer_helpful_marks_v1", "public.answer_helpful_public_facts_v1", "public.person_experiences",
  "public.experience_transitions", "public.experience_claims"];
const counts = () => JSON.parse(sql(`SELECT jsonb_build_object(${tables.map(t => `'${t}',(SELECT count(*) FROM ${t})`).join(",")});`));
assert.equal(sql("SELECT max(version) FROM supabase_migrations.schema_migrations;"), "20260915140330");
const before = counts();
assert.ok(Object.values(before).every(n => n === 0), "Refuse nonempty isolated database; never reset existing data");

// Fingerprints of these bodies were independently read from Production on 2026-10-11.
// This is scoped body parity, not parity with later Production profile grants.
const expectedBodies = {
  "get_public_person_profile_v1": "a7adfe471f5dcbcbd2a0f8e159665840",
  "get_public_person_experiences_v1": "26e364bb21f16112f463c018885b9bc0",
  "create_person_experience_v1": "2bb54cf05bd865bd61fc5d947ec67d1f",
  "delete_person_experience_v1": "c638966a5c6c239148dfb7dae86f4a5c",
  "get_experience_topics_v1": "4f1cabf79566135ef1d603e08176595b",
  "set_experience_topics_v1": "27a0f6a536674232f542d10c53a37a30",
  "resolve_canonical_topic_v1": "a7aa5f6795c9fa8b57fed04f9bdd257d",
  "create_question_v1": "252f5348742aa5772dd2f33a448c1e32",
  "get_question_detail_v1": "7dfda78254842a705e6a7af16a97a2fe",
  "list_question_answers_v1": "67d29221db1e20d520142f9be2281859",
};
const names = Object.keys(expectedBodies).map(n => `'${n}'`).join(",");
const actual = JSON.parse(sql(`SELECT jsonb_object_agg(proname,md5(prosrc)) FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND proname IN (${names});`));
assert.deepEqual(actual, expectedBodies);
const suite = readFileSync(new URL("./sql/ec3d0-discovery-local.sql", import.meta.url), "utf8");
assert.match(suite, /^-- LOCAL ONLY[\s\S]*\nBEGIN;/);
assert.match(suite, /\nROLLBACK;\s*$/);
assert.doesNotMatch(suite, /\bCOMMIT\b|CREATE\s+(?:TABLE|FUNCTION|SCHEMA)|ALTER\s|DROP\s|GRANT\s|REVOKE\s/i);
console.log(`LOCAL ONLY: ${context}/${container}; ${image}; 10 Production body fingerprints matched`);
try {
  console.log(sql(suite));
} finally {
  // ON_ERROR_STOP disconnects on any failure, rolling back the same top-level transaction.
  const after = counts();
  assert.deepEqual(after, before, "Local rollback count mismatch; STOP, do not delete or repair");
  console.log(`ROLLBACK VERIFIED: ${JSON.stringify(after)}`);
}
