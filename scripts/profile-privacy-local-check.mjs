import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

assert.equal(process.argv[2], "--local", "Explicit --local required");
const context = "colima-askbuddy-ec2b";
const container = "supabase_db_askbuddy-ec2b";
const endpoint = execFileSync("docker", ["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"], { encoding: "utf8" }).trim();
assert.equal(endpoint, `unix://${process.env.HOME}/.colima/askbuddy-ec2b/docker.sock`);
const image = execFileSync("docker", ["--context", context, "inspect", container, "--format", "{{.Config.Image}}"], { encoding: "utf8" }).trim();
assert.match(image, /^public\.ecr\.aws\/supabase\/postgres:/);
const sql = (input) => execFileSync("docker", ["--context", context, "exec", "-i", container,
  "psql", "-X", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], {
  input, encoding: "utf8", timeout: 60000, maxBuffer: 2 * 1024 * 1024,
});
const before = sql("SELECT count(*) FROM public.profiles; SELECT count(*) FROM auth.users; SELECT max(version) FROM supabase_migrations.schema_migrations;");
assert.equal(before.trim(), "0\n0\n20260915140330", "Require isolated empty B1 local baseline; never reset another task's data");
const migration = readFileSync("supabase/migrations/20261007005206_public_person_privacy_cutover.sql", "utf8");
const checks = readFileSync("scripts/sql/profile-privacy-local.sql", "utf8");
const result = sql(`BEGIN; SET LOCAL statement_timeout = '30s';\n${migration}\n${checks}\nROLLBACK;`);
assert.match(result, /PROFILE_PRIVACY_LOCAL_PASS/);
assert.equal(sql("SELECT to_regprocedure('public.get_my_private_profile_v1()') IS NULL;").trim(), "t");
assert.equal(sql("SELECT count(*) FROM public.profiles; SELECT count(*) FROM auth.users; SELECT max(version) FROM supabase_migrations.schema_migrations;"), before);
console.log("PASS: real LOCAL transactional migration, grants, denied columns, owner RPC auth check, Search V2, Public Person; ROLLBACK; zero users/data created.");
