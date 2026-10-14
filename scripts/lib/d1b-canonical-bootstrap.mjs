import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// Exact dependency closure of repository.ts plus the tables' ordinary write/fixture triggers.
// Every table's columns, constraints, indexes, policies, triggers and ACLs are retained by pg_dump -t.
export const canonicalManifest = Object.freeze({
  sourceMigrationHead: "20260915140330",
  schemas: ["public", "ec2_private", "ec3_topic_private"],
  tables: ["public.questions_v1", "public.answers_v1", "public.canonical_topics_v1",
    "public.canonical_topic_terms_v1", "public.question_topics_v1"],
  functions: ["ec2_private.lock_question(uuid,boolean)", "ec2_private.guard_question()",
    "ec2_private.guard_question_edit()", "ec2_private.guard_answer()",
    "ec3_topic_private.normalize_term(text)", "ec3_topic_private.guard_root()",
    "ec3_topic_private.ensure_canonical_term()", "ec3_topic_private.require_active(uuid)",
    "ec3_topic_private.lock_question_owner(uuid)", "ec3_topic_private.guard_question_link()"],
  sources: ["supabase/migrations/20260904174215_canonical_question_answer_v1.sql",
    "supabase/migrations/20260915140330_canonical_topic_local_foundation_v1.sql"],
  auth: "TEST ONLY auth.users(id uuid primary key); exact source auth.uid() definition, test owner postgres",
  excluded: ["realtime", "storage", "extensions", "Experience", "Messaging", "Payment", "Search",
    "profiles", "user_settings", "point_accounts", "handle_new_user_pack01", "Reply", "Helpful", "public RPCs"],
});
const quote = name => `"${name.replaceAll('"', '""')}"`;
const grantee = name => name === "PUBLIC" ? "PUBLIC" : quote(name);
const sha = text => createHash("sha256").update(text).digest("hex");
const acl = expression => `COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'grantor',pg_get_userbyid(entry.grantor),'grantee',CASE WHEN entry.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(entry.grantee) END,
  'privilege',entry.privilege_type,'grantable',entry.is_grantable)
  ORDER BY pg_get_userbyid(entry.grantor),CASE WHEN entry.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(entry.grantee) END,entry.privilege_type,entry.is_grantable)
  FROM aclexplode(${expression}) entry),'[]'::jsonb)`;

export const columnAclMetadata = expression => `${expression} IS NULL AS acl_is_null,
  cardinality(${expression}) AS acl_cardinality,array_ndims(${expression}) AS acl_ndims,array_dims(${expression}) AS acl_dimensions`;
// NULL/zero-dimensional empty arrays have no explicit grants. Nonempty malformed arrays
// are never flattened or discarded: the shape audit rejects them before expansion.
export const explicitColumnAcl = expression => acl(`CASE WHEN ${expression} IS NOT NULL
  AND cardinality(${expression})>0 THEN ${expression} ELSE NULL::aclitem[] END`);
export function assertColumnAclShape(rows) {
  for (const row of rows) if (row.acl_cardinality > 0)
    assert.equal(row.acl_ndims, 1, `Malformed nonempty column ACL: ${row.relation ?? "fixture"}.${row.name}; STOP`);
}

export async function canonicalCatalog(client, manifest = canonicalManifest) {
  // Connection-local rendering context only; no source schema/config mutation.
  await client.query("SET search_path=pg_catalog");
  const tables = manifest.tables, functions = manifest.functions;
  const result = {};
  result.schemas = (await client.query(`SELECT n.nspname AS name,pg_get_userbyid(n.nspowner) AS owner,
    ${acl("coalesce(n.nspacl,acldefault('n',n.nspowner))")} AS acl FROM pg_namespace n WHERE n.nspname=ANY($1) ORDER BY name`, [manifest.schemas])).rows;
  result.tables = (await client.query(`SELECT c.oid::regclass::text AS name,pg_get_userbyid(c.relowner) AS owner,
    c.relrowsecurity,c.relforcerowsecurity,${acl("coalesce(c.relacl,acldefault('r',c.relowner))")} AS acl
    FROM pg_class c WHERE c.oid=ANY($1::regclass[]) ORDER BY name`, [tables])).rows;
  const columnShapes = (await client.query(`SELECT a.attrelid::regclass::text AS relation,a.attname AS name,
    ${columnAclMetadata("a.attacl")} FROM pg_attribute a
    WHERE a.attrelid=ANY($1::regclass[]) AND a.attnum>0 AND NOT a.attisdropped ORDER BY relation,a.attnum`, [tables])).rows;
  assertColumnAclShape(columnShapes);
  result.columns = (await client.query(`SELECT c.oid::regclass::text AS relation,a.attname AS name,a.attnum,
    format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attgenerated,a.attidentity,
    pg_get_expr(d.adbin,d.adrelid) AS expression,${columnAclMetadata("a.attacl")},${explicitColumnAcl("a.attacl")} AS acl
    FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE c.oid=ANY($1::regclass[]) AND a.attnum>0 AND NOT a.attisdropped ORDER BY relation,a.attnum`, [tables])).rows;
  assert.deepEqual(result.columns.map(({ relation, name, acl_is_null, acl_cardinality, acl_ndims, acl_dimensions }) =>
    ({ relation, name, acl_is_null, acl_cardinality, acl_ndims, acl_dimensions })), columnShapes, "Column ACL audit lost or changed a column");
  result.constraints = (await client.query(`SELECT conrelid::regclass::text AS relation,conname AS name,
    contype,convalidated,condeferrable,condeferred,pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE conrelid=ANY($1::regclass[]) ORDER BY relation,name`, [tables])).rows;
  result.indexes = (await client.query(`SELECT i.indrelid::regclass::text AS relation,c.relname AS name,
    pg_get_userbyid(c.relowner) AS owner,i.indisvalid,i.indisready,pg_get_indexdef(c.oid) AS definition
    FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indrelid=ANY($1::regclass[]) ORDER BY relation,name`, [tables])).rows;
  result.policies = (await client.query(`SELECT polrelid::regclass::text AS relation,polname AS name,polcmd,polpermissive,
    ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(polroles) x ORDER BY 1) AS roles,
    pg_get_expr(polqual,polrelid) AS "using",pg_get_expr(polwithcheck,polrelid) AS "check"
    FROM pg_policy WHERE polrelid=ANY($1::regclass[]) ORDER BY relation,name`, [tables])).rows;
  result.triggers = (await client.query(`SELECT tgrelid::regclass::text AS relation,tgname AS name,tgenabled,
    tgfoid::regprocedure::text AS function,pg_get_triggerdef(oid) AS definition FROM pg_trigger
    WHERE tgrelid=ANY($1::regclass[]) AND NOT tgisinternal ORDER BY relation,name`, [tables])).rows;
  result.functions = (await client.query(`SELECT p.oid::regprocedure::text AS name,pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef,p.proconfig,p.provolatile,p.proparallel,p.proleakproof,p.prosrc AS body,pg_get_functiondef(p.oid) AS definition,
    ${acl("coalesce(p.proacl,acldefault('f',p.proowner))")} AS acl
    FROM pg_proc p WHERE p.oid=ANY($1::regprocedure[]) ORDER BY name`, [functions])).rows;
  const roles = ["anon", "authenticated", "authenticator", "service_role", "postgres"];
  result.effective = (await client.query(`SELECT role,t::text AS relation,privilege,has_table_privilege(role,t,privilege) AS allowed,
    has_table_privilege(role,t,privilege || ' WITH GRANT OPTION') AS grantable
    FROM unnest($2::text[]) role
    CROSS JOIN unnest($1::regclass[]) t CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
    ORDER BY role,relation,privilege`, [tables, roles])).rows;
  result.effectiveSchemas = (await client.query(`SELECT role,schema,privilege,has_schema_privilege(role,schema,privilege) AS allowed,
    has_schema_privilege(role,schema,privilege || ' WITH GRANT OPTION') AS grantable
    FROM unnest($1::text[]) schema CROSS JOIN unnest($2::text[]) role
    CROSS JOIN unnest(ARRAY['USAGE','CREATE']) privilege ORDER BY role,schema,privilege`, [manifest.schemas, roles])).rows;
  result.effectiveColumns = (await client.query(`SELECT role,a.attrelid::regclass::text AS relation,a.attname AS name,privilege,
    has_column_privilege(role,a.attrelid,a.attnum,privilege) AS allowed,
    has_column_privilege(role,a.attrelid,a.attnum,privilege || ' WITH GRANT OPTION') AS grantable
    FROM pg_attribute a CROSS JOIN unnest($2::text[]) role
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) privilege
    WHERE a.attrelid=ANY($1::regclass[]) AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY role,relation,a.attnum,privilege`, [tables, roles])).rows;
  assert.equal(result.effectiveColumns.length, result.columns.length * roles.length * 4);
  assert.equal(result.tables.length, tables.length); assert.equal(result.functions.length, functions.length);
  return result;
}

export async function prepareMinimalBootstrap(source, tableDump) {
  const catalog = await canonicalCatalog(source);
  assert.ok(catalog.tables.every(t => t.owner === "postgres" && t.relrowsecurity && t.relforcerowsecurity));
  assert.ok(catalog.functions.every(f => f.owner === "postgres" && !f.prosecdef && JSON.stringify(f.proconfig) === JSON.stringify(['search_path=""'])));
  assert.deepEqual([...new Set(catalog.triggers.map(t => t.function))].sort(), [
    "ec2_private.guard_answer()", "ec2_private.guard_question()", "ec2_private.guard_question_edit()",
    "ec3_topic_private.ensure_canonical_term()", "ec3_topic_private.guard_question_link()", "ec3_topic_private.guard_root()"].sort());
  for (const f of catalog.functions) {
    const functionName = f.name.slice(0, f.name.indexOf("(")).replaceAll(".", "\\.");
    const definition = canonicalManifest.sources.map(file => readFileSync(file, "utf8"))
      .flatMap(sql => [...sql.matchAll(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${functionName}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`, "g"))]).at(-1);
    assert.ok(definition, `Missing approved migration source: ${f.name}`);
    assert.equal(f.body, definition[1], `Local function body differs from reviewed migration: ${f.name}`);
    for (const ref of f.definition.matchAll(/(?:ec2_private|ec3_topic_private)\.([a-z_]+)\(/g))
      assert.ok(canonicalManifest.functions.some(name => name.startsWith(ref[0])), `Unreviewed function dependency: ${ref[0]}`);
    assert.doesNotMatch(f.definition, /realtime\.|storage\.|profiles|experience|dblink|pg_net/);
    assert.ok(!f.acl.some(a => a.grantee === "PUBLIC"));
  }
  assert.doesNotMatch(tableDump, /realtime\.|storage\.|log_min_messages|SECURITY DEFINER|CREATE (?:OR REPLACE )?FUNCTION/);
  const dumpedTables = [...tableDump.matchAll(/^CREATE TABLE (public\.\w+) \(/gm)].map(m => m[1]).sort();
  assert.deepEqual(dumpedTables, [...canonicalManifest.tables].sort());
  for (const ref of tableDump.matchAll(/REFERENCES ((?:public|auth)\.\w+)\(/g))
    assert.ok([...canonicalManifest.tables, "auth.users"].includes(ref[1]), `Unreviewed FK dependency: ${ref[1]}`);
  const uid = (await source.query(`SELECT pg_get_functiondef(p.oid) AS definition,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,
    ${acl("coalesce(p.proacl,acldefault('f',p.proowner))")} AS acl FROM pg_proc p WHERE p.oid='auth.uid()'::regprocedure`)).rows[0];
  assert.equal(uid.prosecdef, false); assert.doesNotMatch(uid.definition, /FROM\s|JOIN\s|EXECUTE\s/i);
  const statements = ["-- TEST ONLY disposable Auth identity support; no credentials, signup trigger or real Auth service.",
    "CREATE SCHEMA auth AUTHORIZATION postgres; REVOKE ALL ON SCHEMA auth FROM PUBLIC; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;",
    "CREATE TABLE auth.users(id uuid PRIMARY KEY); REVOKE ALL ON auth.users FROM PUBLIC,anon,authenticated,service_role; ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY; ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;",
    `${uid.definition};`, "REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;",
    ...uid.acl.map(a => `GRANT EXECUTE ON FUNCTION auth.uid() TO ${grantee(a.grantee)}${a.grantable ? " WITH GRANT OPTION" : ""};`)];
  for (const schema of catalog.schemas) {
    assert.equal(schema.owner, schema.name === "public" ? "pg_database_owner" : "postgres");
    if (schema.name !== "public") statements.push(`CREATE SCHEMA ${quote(schema.name)} AUTHORIZATION postgres;`);
    const roles = [...new Set(["PUBLIC", "postgres", "anon", "authenticated", "service_role", ...schema.acl.map(a => a.grantee)])];
    statements.push(`REVOKE ALL ON SCHEMA ${quote(schema.name)} FROM ${roles.map(grantee).join(",")};`);
    for (const a of schema.acl) statements.push(`GRANT ${a.privilege} ON SCHEMA ${quote(schema.name)} TO ${grantee(a.grantee)}${a.grantable ? " WITH GRANT OPTION" : ""};`);
  }
  for (const f of catalog.functions) {
    statements.push(`${f.definition};`, `ALTER FUNCTION ${f.name} OWNER TO postgres;`, `REVOKE ALL ON FUNCTION ${f.name} FROM PUBLIC;`);
    for (const a of f.acl) statements.push(`GRANT EXECUTE ON FUNCTION ${f.name} TO ${grantee(a.grantee)}${a.grantable ? " WITH GRANT OPTION" : ""};`);
  }
  // No SQL statement is removed or rewritten. Dump is selected up-front via five exact -t names.
  return { sql: `${statements.join("\n")}\n${tableDump}`, catalog, uid,
    manifest: { ...canonicalManifest, objects: catalog, fingerprints: catalog.functions.map(f => ({ name: f.name, sha256: sha(f.definition) })) } };
}

export async function verifyMinimalBootstrap(source, target, prepared) {
  assert.deepEqual(await canonicalCatalog(target), prepared.catalog, "Canonical scoped owner/ACL/RLS/catalog parity mismatch: STOP");
  assert.equal((await target.query("SELECT pg_get_functiondef('auth.uid()'::regprocedure) AS definition")).rows[0].definition, prepared.uid.definition);
  const a = randomUUID(), b = randomUUID();
  for (const client of [source, target]) {
    await client.query("BEGIN READ ONLY");
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query("SELECT set_config('role',$1,true)", [role]);
        for (const [sub, claims, expected] of [["", {}, null], [a, {}, a], ["", { sub: b }, b], [a, { sub: b }, a]]) {
          await client.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [sub, JSON.stringify(claims)]);
          assert.equal((await client.query("SELECT auth.uid()::text AS id")).rows[0].id, expected);
        }
      }
    } finally { await client.query("ROLLBACK"); }
  }
  // Disposable-only behavior probe. Nothing inserted into the source; all probe rows roll back.
  await target.query("BEGIN");
  try {
    await target.query("INSERT INTO auth.users(id) VALUES($1),($2)", [a, b]);
    const ids = Array.from({ length: 4 }, () => randomUUID()), topic = randomUUID();
    await target.query("INSERT INTO public.canonical_topics_v1(topic_id,canonical_name) VALUES($1,'D1B bootstrap test')", [topic]);
    await target.query(`INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel,status,moderation_visibility,deleted_at)
      SELECT x.id,$2,'Probe','Stored context','career-development',CASE WHEN x.n=2 THEN 'closed' ELSE 'open' END,
        CASE WHEN x.n=3 THEN 'hidden' ELSE 'visible' END,CASE WHEN x.n=4 THEN clock_timestamp() ELSE NULL END
      FROM unnest($1::uuid[]) WITH ORDINALITY x(id,n)`, [ids, a]);
    for (const [role, user] of [["anon", null], ["authenticated", a], ["authenticated", b]]) {
      await target.query("SELECT set_config('role',$1,true),set_config('request.jwt.claim.sub',$2,true),set_config('request.jwt.claims',$3,true)", [role, user ?? "", JSON.stringify({ sub: user })]);
      assert.deepEqual((await target.query("SELECT id FROM public.questions_v1 ORDER BY id")).rows.map(r => r.id), ids.slice(0, 2).sort());
    }
    await target.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [a]);
    await target.query("INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES($1,$2)", [ids[0], topic]);
    await target.query("INSERT INTO public.answers_v1(question_id,body) VALUES($1,'Canonical visible answer')", [ids[0]]);
    await target.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [b]);
    const denied = await target.query("DELETE FROM public.question_topics_v1 WHERE question_id=$1 RETURNING question_id", [ids[0]]);
    assert.equal(denied.rowCount, 0);
    await target.query("SET CONSTRAINTS ALL IMMEDIATE");
  } finally { await target.query("ROLLBACK"); }
  console.log(`PASS scoped canonical parity: 5 tables, 10 functions, ${prepared.catalog.policies.length} policies, ${prepared.catalog.constraints.length} constraints, ${prepared.catalog.indexes.length} indexes, 6 triggers; exact owner/ACL/proconfig/body + ordinary-role behavior`);
  console.log(`FUNCTION FINGERPRINTS: ${JSON.stringify(prepared.manifest.fingerprints)}`);
  console.log(`TEST ONLY Auth: source-equivalent auth.uid behavior/body; owner ${prepared.uid.owner} -> postgres; auth.users=id-only/no signup trigger. Not real Auth/Production parity.`);
}
