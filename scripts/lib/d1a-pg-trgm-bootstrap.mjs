import assert from "node:assert/strict";
import { pgTrgmEffectiveRoles, verifyPgTrgmFunctionException, verifyPgTrgmEffectivePermissions } from "./d1a-pg-trgm-acl.mjs";

export const pgTrgmDependency = Object.freeze({ name: "pg_trgm", version: "1.6", schema: "public",
  indexes: ["public.idx_profiles_bio_trgm", "public.idx_profiles_nickname_trgm"],
  reason: "Exact existing Profile nickname/bio GIN indexes required by the D1A signup projection bootstrap; not Discovery fuzzy search" });

export async function pgTrgmCatalog(client, { operations = false } = {}) {
  await client.query("SET search_path=pg_catalog");
  const extension = (await client.query(`SELECT e.extname AS name,e.extversion AS version,n.nspname AS schema,
    r.rolname AS owner,r.oid AS owner_oid,
    jsonb_build_object('superuser',r.rolsuper,'bypassrls',r.rolbypassrls,'createdb',r.rolcreatedb,
      'createrole',r.rolcreaterole,'inherit',r.rolinherit,'login',r.rolcanlogin,'replication',r.rolreplication) AS owner_attributes,
    pg_get_userbyid(n.nspowner) AS schema_owner,
    e.extrelocatable,e.extconfig,e.extcondition FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
    JOIN pg_roles r ON r.oid=e.extowner
    WHERE e.extname='pg_trgm'`)).rows[0] ?? null;
  const available = (await client.query(`SELECT name,version,superuser,trusted,relocatable,schema,requires
    FROM pg_available_extension_versions WHERE name='pg_trgm' AND version='1.6'`)).rows;
  const members = (await client.query(`SELECT x.type,x.schema,x.name,x.identity,d.deptype
    FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
    CROSS JOIN LATERAL pg_identify_object(d.classid,d.objid,d.objsubid) x
    WHERE d.refclassid='pg_extension'::regclass AND e.extname='pg_trgm' AND d.deptype='e'
    ORDER BY x.type,x.identity`)).rows;
  const opclasses = (await client.query(`SELECT o.opcname AS name,n.nspname AS schema,pg_get_userbyid(o.opcowner) AS owner,
    a.amname AS method,o.opcintype::regtype::text AS input_type,o.opckeytype::regtype::text AS key_type,
    o.opcdefault,e.extname AS extension,d.deptype FROM pg_opclass o
    JOIN pg_namespace n ON n.oid=o.opcnamespace JOIN pg_am a ON a.oid=o.opcmethod
    JOIN pg_depend d ON d.classid='pg_opclass'::regclass AND d.objid=o.oid AND d.refclassid='pg_extension'::regclass
    JOIN pg_extension e ON e.oid=d.refobjid WHERE e.extname='pg_trgm' ORDER BY name`)).rows;
  const functions = (await client.query(`SELECT p.oid::regprocedure::text AS name,pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef,p.proconfig,p.provolatile,p.proparallel,p.proleakproof,p.prosrc,p.probin,l.lanname,
    pg_get_functiondef(p.oid) AS definition,e.extname AS extension,d.deptype,
    p.proacl::text AS raw_acl,p.proacl IS NULL AS raw_acl_is_null,
    coalesce((SELECT jsonb_agg(jsonb_build_object('type',ip.privtype,'acl',ip.initprivs::text)
      ORDER BY ip.privtype) FROM pg_init_privs ip WHERE ip.classoid='pg_proc'::regclass
      AND ip.objoid=p.oid AND ip.objsubid=0),'[]'::jsonb) AS initial_privileges,
    coalesce((SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(acl.grantor),
      'grantee',CASE WHEN acl.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
      'privilege',acl.privilege_type,'grantable',acl.is_grantable)
      ORDER BY pg_get_userbyid(acl.grantor),acl.grantee,acl.privilege_type)
      FROM aclexplode(p.proacl) acl),'[]'::jsonb) AS explicit_acl,
    (SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(acl.grantor),
      'grantee',CASE WHEN acl.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
      'privilege',acl.privilege_type,'grantable',acl.is_grantable)
      ORDER BY pg_get_userbyid(acl.grantor),acl.grantee,acl.privilege_type)
      FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl) AS acl
    FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
    JOIN pg_depend d ON d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass
    JOIN pg_extension e ON e.oid=d.refobjid WHERE e.extname='pg_trgm' AND d.deptype='e' ORDER BY name`)).rows;
  const roleNames = [...pgTrgmEffectiveRoles.filter(r => r !== 'PUBLIC'), ...(operations ? ['d1b_operations'] : [])];
  const roles = (await client.query(`SELECT rolname,oid,rolsuper,rolbypassrls,rolinherit FROM pg_roles
    WHERE rolname=ANY($1::text[]) ORDER BY rolname`, [roleNames])).rows;
  assert.deepEqual(roles.map(r => r.rolname).sort(), roleNames.sort(), "Missing real pg_trgm comparison role");
  const effective = (await client.query(`WITH roles AS (
    SELECT rolname::text AS role,oid FROM pg_roles WHERE rolname=ANY($1::text[])
    UNION ALL SELECT 'PUBLIC',0::oid)
    SELECT role,p.oid::regprocedure::text AS function,
    has_schema_privilege(roles.oid,p.pronamespace,'USAGE') AS schema_usage,
    has_function_privilege(roles.oid,p.oid,'EXECUTE') AS execute,
    has_function_privilege(roles.oid,p.oid,'EXECUTE WITH GRANT OPTION') AS grantable
    FROM pg_proc p JOIN pg_depend d ON d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass
    JOIN pg_extension e ON e.oid=d.refobjid
    CROSS JOIN roles
    WHERE e.extname='pg_trgm' AND d.deptype='e' ORDER BY role,function`, [roleNames])).rows;
  return { extension, available, members, opclasses, functions, roles, effective };
}

export function verifyPgTrgmParity(source, target, options = {}) {
  requirePgTrgm(source); requirePgTrgm(target); requirePgTrgmOwnerParity(source, target);
  const structure = ({ functions, effective, ...metadata }) => metadata;
  assert.deepEqual(structure(target), structure(source), "pg_trgm extension/member/operator/role structural parity failed");
  const exception = verifyPgTrgmFunctionException(source.functions, target.functions);
  verifyPgTrgmEffectivePermissions(source.effective, target.effective, options);
  console.log(`PASS pg_trgm structural parity: ${source.members.length} members, 31 exact function signatures/definitions/security, owner and operator metadata; effective permission matrix ${target.effective.length} rows (schema USAGE/EXECUTE/grant option)`);
  console.log(`PG_TRGM_RAW_ACL_PARITY = ${exception.rawAclParity}; PG_TRGM_RAW_ACL_EXCEPTION = ${exception.rawAclException}; exactly 124 missing explicit non-grantable EXECUTE entries; PUBLIC retained; no GRANT restoration`);
  return exception;
}

export function requirePgTrgmOwnerParity(source, target) {
  assert.ok(source?.extension, "Missing source pg_trgm extension");
  assert.ok(target?.extension, "Missing target pg_trgm extension");
  for (const [label, catalog] of [["source", source], ["target", target]]) {
    const e = catalog.extension;
    assert.equal(e.name, "pg_trgm", `Unexpected ${label} extension identity`);
    assert.ok(typeof e.owner === "string" && e.owner.length > 0, `Missing ${label} owner`);
    assert.ok(Number.isInteger(e.owner_oid) && e.owner_oid > 0, `Missing ${label} owner OID`);
    for (const attribute of ["superuser", "bypassrls", "createdb", "createrole", "inherit", "login", "replication"])
      assert.equal(typeof e.owner_attributes?.[attribute], "boolean", `Missing ${label} owner role attribute ${attribute}`);
  }
  assert.equal(source.extension.owner, "supabase_admin", "Unexpected source owner versus reviewed local baseline");
  assert.deepEqual(
    { oid: target.extension.owner_oid, name: target.extension.owner, attributes: target.extension.owner_attributes },
    { oid: source.extension.owner_oid, name: source.extension.owner, attributes: source.extension.owner_attributes },
    "pg_trgm source/target owner role identity or attributes differ");
}

export async function verifyOperationalExtensionIsolation(source) {
  // Role metadata is cluster-wide; this is read-only, not an operational login to the source DB.
  const access = (await source.query(`SELECT r.rolsuper,r.rolbypassrls,
    pg_has_role(r.oid,e.extowner,'USAGE') AS owner_usage,pg_has_role(r.oid,e.extowner,'SET') AS owner_set,
    has_database_privilege(r.oid,current_database(),'CREATE') AS database_create,
    has_schema_privilege(r.oid,e.extnamespace,'CREATE') AS schema_create
    FROM pg_roles r CROSS JOIN pg_extension e WHERE r.rolname='d1b_operations' AND e.extname='pg_trgm'`)).rows;
  assert.deepEqual(access, [{ rolsuper: false, rolbypassrls: false, owner_usage: false, owner_set: false,
    database_create: false, schema_create: false }], "Operational role can manage pg_trgm or escalate to its owner");
  console.log("PASS operational extension isolation: no superuser/BYPASSRLS, no owner-role access or SET, no database/schema CREATE; source inspected read-only");
}

export function requirePgTrgm(catalog) {
  assert.ok(catalog.extension, "Missing pg_trgm dependency");
  assert.equal(catalog.extension.name, "pg_trgm");
  assert.equal(catalog.extension.version, "1.6", "Unexpected pg_trgm version");
  assert.equal(catalog.extension.schema, "public", "Unexpected pg_trgm schema");
  assert.deepEqual(catalog.available, [{ name: "pg_trgm", version: "1.6", superuser: true, trusted: true,
    relocatable: true, schema: null, requires: null }], "Unavailable or changed pg_trgm installation requirements");
  assert.ok(catalog.opclasses.some(o => o.name === "gin_trgm_ops" && o.schema === "public"
    && o.method === "gin" && o.extension === "pg_trgm" && o.deptype === "e"), "Missing GIN extension operator class");
}

export function verifyPgTrgmNegativeCases(catalog) {
  requirePgTrgm(catalog);
  requirePgTrgmOwnerParity(catalog, catalog);
  assert.throws(() => requirePgTrgm({ ...catalog, extension: null }), /Missing pg_trgm/);
  assert.throws(() => requirePgTrgm({ ...catalog, extension: { ...catalog.extension, version: "1.5" } }), /Unexpected pg_trgm version/);
  assert.throws(() => requirePgTrgm({ ...catalog, extension: { ...catalog.extension, schema: "extensions" } }), /Unexpected pg_trgm schema/);
  assert.throws(() => requirePgTrgm({ ...catalog, opclasses: [] }), /Missing GIN/);
  console.log("PASS pg_trgm metadata rejection tests: missing extension/opclass, wrong version and unintended schema rejected (no alternate installation)");
}

export async function installDisposablePgTrgm(target, sourceCatalog, verifyTarget) {
  // The callback checks a private harness capability against actual DB name/OID/system ID.
  await verifyTarget(target);
  const identity = (await target.query(`SELECT current_database() AS database,pg_get_userbyid(d.datdba) AS owner,
    current_user::text AS current,session_user::text AS session,r.rolsuper,
    has_database_privilege(current_user,d.oid,'CREATE') AS can_create
    FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`)).rows[0];
  assert.match(identity.database, /^ec3d1b_disposable_[a-f0-9]{16}$/);
  assert.deepEqual({ ...identity, database: undefined }, { database: undefined, owner: "postgres", current: "postgres", session: "postgres", rolsuper: false, can_create: true });
  assert.equal((await target.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'`)).rows[0].n, 0, "Disposable database must be initially empty");
  assert.deepEqual((await target.query("SELECT extname FROM pg_extension ORDER BY extname")).rows, [{ extname: "plpgsql" }]);
  const before = await pgTrgmCatalog(target);
  assert.equal(before.extension, null); assert.deepEqual(before.available, sourceCatalog.available);
  assert.throws(() => requirePgTrgm(before), /Missing pg_trgm/);
  assert.equal((await target.query("SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname='public'")).rows[0].owner, "pg_database_owner");
  await verifyTarget(target);
  await target.query("CREATE EXTENSION pg_trgm WITH SCHEMA public VERSION '1.6'");
  const installed = await pgTrgmCatalog(target);
  verifyPgTrgmParity(sourceCatalog, installed);
  assert.deepEqual((await target.query("SELECT extname FROM pg_extension ORDER BY extname")).rows, [{ extname: "pg_trgm" }, { extname: "plpgsql" }]);
  console.log(`PASS pg_trgm 1.6/public install: nonsuperuser postgres; source/target extension owner=${installed.extension.owner}, OID=${installed.extension.owner_oid}, attributes=${JSON.stringify(installed.extension.owner_attributes)}; raw ACL exception only, pg_init_privs empty in both; no CASCADE or role changes`);
}

export async function profileTrigramIndexes(client) {
  await client.query("SET search_path=pg_catalog");
  return (await client.query(`SELECT c.oid::regclass::text AS name,pg_get_userbyid(c.relowner) AS owner,
    pg_get_indexdef(c.oid) AS definition,i.indisvalid,i.indisready,i.indislive,
    pg_get_expr(i.indexprs,i.indrelid) AS expression,pg_get_expr(i.indpred,i.indrelid) AS predicate,
    ARRAY(SELECT CASE WHEN x.id=0 THEN '-' ELSE x.id::regcollation::text END FROM unnest(i.indcollation::oid[]) WITH ORDINALITY x(id,n) ORDER BY n) AS collations,
    ARRAY(SELECT n.nspname||'.'||o.opcname FROM unnest(i.indclass::oid[]) WITH ORDINALITY x(id,num)
      JOIN pg_opclass o ON o.oid=x.id JOIN pg_namespace n ON n.oid=o.opcnamespace ORDER BY x.num) AS opclasses
    FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.oid=ANY($1::regclass[]) ORDER BY name`, [pgTrgmDependency.indexes])).rows;
}
