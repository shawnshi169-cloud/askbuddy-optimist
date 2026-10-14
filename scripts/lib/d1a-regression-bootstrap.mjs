import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalCatalog, canonicalManifest } from "./d1b-canonical-bootstrap.mjs";
import { auditSqlDependencies } from "./d1a-sql-dependencies.mjs";
import { regressionColumnCatalog, verifyRegressionColumnParity, auditProfilePositionalUsage } from "./d1a-profile-column-parity.mjs";

// Additive TEST ONLY closure; the D1B five-table/ten-function bootstrap remains unchanged.
export const regressionManifest = Object.freeze({
  schemas: canonicalManifest.schemas,
  tables: ["public.profiles", "public.user_settings", "public.point_accounts"],
  functions: ["public.update_updated_at_column()", "public.handle_new_user_pack01()",
    "ec3_topic_private.validate_ids(uuid[])", "ec2_private.validate_question(text,text,text,uuid[],bigint)",
    "ec3_topic_private.replace_question_topics(uuid,uuid[])", "public.update_question_v1(uuid,text,text,text,uuid[],bigint)"],
  sources: ["supabase/migrations/20260416143000_pack_01_user_and_accounts.sql",
    "supabase/migrations/20260915140330_canonical_topic_local_foundation_v1.sql"],
  authColumns: ["id", "email", "raw_user_meta_data"],
  authTrigger: "on_auth_user_created_pack01",
});
export const regressionTables = ["auth.users", ...canonicalManifest.tables, ...regressionManifest.tables];
export const regressionCounts = async client => (await client.query(`SELECT jsonb_build_object(${regressionTables.map(t =>
  `'${t}',(SELECT count(*) FROM ${t})`).join(",")}) AS counts`)).rows[0].counts;
const uidColumns = async client => (await client.query(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
  a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS expression FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid='auth.users'::regclass AND a.attname=ANY($1) ORDER BY name`, [regressionManifest.authColumns])).rows;
const authTriggers = async client => (await client.query(`SELECT tgname,tgenabled,tgfoid::regprocedure::text AS function,
  pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal ORDER BY tgname`)).rows;

export async function prepareRegressionBootstrap(source, tableDump) {
  const catalog = await canonicalCatalog(source, regressionManifest);
  const columnAudit = await regressionColumnCatalog(source, regressionManifest);
  assert.ok(catalog.tables.every(t => t.owner === "postgres" && t.relrowsecurity && !t.relforcerowsecurity));
  const columns = await uidColumns(source);
  assert.deepEqual(columns, [
    { name: "email", type: "character varying(255)", attnotnull: false, expression: null },
    { name: "id", type: "uuid", attnotnull: true, expression: null },
    { name: "raw_user_meta_data", type: "jsonb", attnotnull: false, expression: null },
  ]);
  const triggers = await authTriggers(source);
  assert.equal(triggers.length, 1); assert.equal(triggers[0].tgname, regressionManifest.authTrigger);
  assert.equal(triggers[0].function, "public.handle_new_user_pack01()"); assert.equal(triggers[0].tgenabled, "O");
  assert.deepEqual([...new Set(catalog.triggers.map(t => t.function))], ["public.update_updated_at_column()"]);
  assert.doesNotMatch(tableDump, /realtime\.|storage\.|log_min_messages|CREATE (?:OR REPLACE )?FUNCTION/);
  assert.deepEqual([...tableDump.matchAll(/^CREATE TABLE (public\.\w+) \(/gm)].map(m => m[1]).sort(), [...regressionManifest.tables].sort());
  for (const ref of tableDump.matchAll(/REFERENCES ((?:public|auth)\.\w+)\(/g)) assert.equal(ref[1], "auth.users");
  for (const f of catalog.functions) {
    assert.equal(f.owner, "postgres");
    const signup = f.name === "public.handle_new_user_pack01()";
    assert.equal(f.prosecdef, signup);
    assert.deepEqual(f.proconfig, f.name.startsWith("public.") && !f.name.startsWith("public.update_question_v1(")
      ? ["search_path=public"] : ['search_path=""']);
    const name = f.name.slice(0, f.name.indexOf("(")).replaceAll(".", "\\.");
    const body = regressionManifest.sources.map(file => readFileSync(file, "utf8"))
      .flatMap(sql => [...sql.matchAll(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${name}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`, "g"))]).at(-1);
    assert.ok(body, `Missing reviewed source: ${f.name}`); assert.equal(f.body, body[1]);
    assert.doesNotMatch(f.body, /http|pg_net|webhook|notification|payment|dblink|EXECUTE\s/i);
    const functions = [...canonicalManifest.functions, ...regressionManifest.functions, "auth.uid()"];
    auditSqlDependencies(f.body, { tables: regressionTables, functions });
    if (signup) assert.deepEqual([...f.body.matchAll(/INSERT INTO public\.(\w+)/g)].map(m => m[1]),
      ["profiles", "user_settings", "point_accounts"]);
  }
  auditProfilePositionalUsage(catalog.functions);
  // PL/pgSQL bodies are restored verbatim before their table/trigger definitions; owners and ACLs are retained.
  const functions = catalog.functions.flatMap(f => [`${f.definition};`, `ALTER FUNCTION ${f.name} OWNER TO postgres;`,
    `REVOKE ALL ON FUNCTION ${f.name} FROM PUBLIC;`, ...f.acl.map(a => {
      assert.ok(["PUBLIC", "postgres", "anon", "authenticated", "service_role"].includes(a.grantee));
      return `GRANT EXECUTE ON FUNCTION ${f.name} TO ${a.grantee}${a.grantable ? " WITH GRANT OPTION" : ""};`;
    })]);
  return { catalog, columnAudit, columns, triggers, sql: ["-- TEST ONLY Auth extension; no credentials or Auth service.",
    "ALTER TABLE auth.users ADD COLUMN email character varying(255), ADD COLUMN raw_user_meta_data jsonb;",
    ...functions, tableDump, `${triggers[0].definition};`].join("\n") };
}

export async function verifyRegressionBootstrap(source, target, prepared) {
  const columnEvidence = verifyRegressionColumnParity(prepared.catalog, await canonicalCatalog(target, regressionManifest),
    prepared.columnAudit, await regressionColumnCatalog(target, regressionManifest));
  console.log(`PROFILES_PHYSICAL_ATTNUM_PARITY: NOT IDENTICAL / REVIEWED LOCAL EXCEPTION; ${JSON.stringify({ source: columnEvidence.sourcePhysical, target: columnEvidence.targetPhysical })}`);
  console.log(`PASS profiles logical columns: ${columnEvidence.liveColumns} in exact live order; type/typmod/collation/null/default/identity/generation/storage/compression/options/ACL/effective privileges; ${columnEvidence.resolvedReferences.length} resolved constraint/index/trigger references and ${columnEvidence.dependencies} scoped dependencies; named INSERT/trigger fields, no positional profile reads`);
  assert.deepEqual(await uidColumns(target), prepared.columns);
  assert.deepEqual(await authTriggers(target), prepared.triggers);
  assert.equal((await target.query("SELECT to_regnamespace('supabase_migrations') AS n")).rows[0].n, null);
  assert.equal((await target.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth') AND c.relkind='r'")).rows[0].n, 9);
  assert.ok(Object.values(await regressionCounts(target)).every(n => n === 0));
  const a = randomUUID(), b = randomUUID(), question = randomUUID(), topic = randomUUID();
  await target.query("BEGIN");
  try {
    await target.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'d1a-bootstrap@example.invalid',$2),($3,'d1a-other@example.invalid','{}')", [a, JSON.stringify({ nickname: "Synthetic bootstrap" }), b]);
    for (const table of regressionManifest.tables) assert.equal((await target.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 2);
    assert.equal((await target.query("SELECT nickname FROM public.profiles WHERE user_id=$1", [a])).rows[0].nickname, "Synthetic bootstrap");
    await target.query("INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel) VALUES($1,$2,'Probe','Stored context','career-development')", [question, a]);
    await target.query("INSERT INTO public.canonical_topics_v1(topic_id,canonical_name,status) VALUES($1,'D1A deprecated probe','deprecated')", [topic]);
    for (const [role, user, expected] of [["anon", null, 0], ["authenticated", a, 1], ["authenticated", b, 1]]) {
      await target.query("SELECT set_config('role',$1,true),set_config('request.jwt.claim.sub',$2,true)", [role, user ?? ""]);
      for (const table of ["public.user_settings", "public.point_accounts"])
        assert.equal((await target.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, expected);
      assert.equal((await target.query("SELECT count(*)::int AS n FROM public.profiles")).rows[0].n, 2);
    }
    await target.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [a]);
    await target.query("SAVEPOINT deprecated");
    try { await assert.rejects(() => target.query("SELECT public.update_question_v1($1,'Probe','Context','career-development',$2,NULL)",
      [question, [topic]]), e => e.code === "PT422" && e.message === "TOPIC_INVALID_OR_INACTIVE"); }
    finally { await target.query("ROLLBACK TO SAVEPOINT deprecated"); }
    await target.query("SET CONSTRAINTS ALL IMMEDIATE");
  } finally { await target.query("ROLLBACK"); }
  assert.ok(Object.values(await regressionCounts(target)).every(n => n === 0));
  console.log(`PASS D1A additional parity: 3 tables / 6 functions / ${prepared.catalog.policies.length} policies / ${prepared.catalog.constraints.length} constraints / ${prepared.catalog.indexes.length} indexes / ${prepared.catalog.triggers.length + 1} triggers; exact source owners/security/ACLs/RLS; signup and PT422 behavior; 9 disposable tables empty after rollback`);
  console.log(`D1A FUNCTION FINGERPRINTS: ${JSON.stringify(prepared.catalog.functions.map(f => ({ name: f.name, sha256: createHash("sha256").update(f.definition).digest("hex") })))}`);
  console.log("TEST ONLY: auth.users has 3 columns, no credentials/session service; auth.uid owner differs as already disclosed. Signup helper keeps original postgres owner/SECURITY DEFINER/search_path/ACL. Old local profile grants are NOT current Production privacy parity.");
}
