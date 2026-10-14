import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { canonicalManifest, prepareMinimalBootstrap, verifyMinimalBootstrap } from "./d1b-canonical-bootstrap.mjs";
import { regressionManifest, prepareRegressionBootstrap, verifyRegressionBootstrap } from "./d1a-regression-bootstrap.mjs";
import { verifyAclCatalog } from "./d1b-acl-regression.mjs";
import { pgTrgmCatalog, verifyPgTrgmNegativeCases, installDisposablePgTrgm, profileTrigramIndexes, verifyOperationalExtensionIsolation, verifyPgTrgmParity } from "./d1a-pg-trgm-bootstrap.mjs";

const ownedTargets = new WeakMap();
/** Connection capability issued only after this harness creates and pins the actual database. */
export async function assertDisposableTarget(client) {
  const proof = ownedTargets.get(client);
  assert.ok(proof, "STOP: connection was not created by the disposable harness");
  const actual = (await client.query(`SELECT current_database() AS name,d.oid,
    (SELECT system_identifier::text FROM pg_control_system()) AS system FROM pg_database d WHERE datname=current_database()`)).rows[0];
  assert.deepEqual(actual, proof, "STOP: resolved database differs from the harness-owned target");
  assert.notEqual(actual.name, "postgres");
}

export const trackedTables = ["auth.users", "public.profiles", "public.user_settings", "public.point_accounts",
  "public.canonical_topics_v1", "public.canonical_topic_terms_v1", "public.question_topics_v1",
  "public.experience_topics_v1", "public.questions_v1", "public.answers_v1", "public.answer_replies_v1",
  "public.answer_helpful_marks_v1", "public.answer_helpful_public_facts_v1", "public.person_experiences",
  "public.experience_transitions", "public.experience_claims"];
export const trackedCounts = async client => (await client.query(`SELECT jsonb_build_object(${trackedTables.map(t =>
  `'${t}',(SELECT count(*) FROM ${t})`).join(",")}) AS counts`)).rows[0].counts;

/** Explicit local-only bootstrap. Credentials never leave process memory / private child IPC. */
export async function withDisposablePostgres(check, { profile = "d1b" } = {}) {
  assert.ok(["d1a", "d1b", "acl-read-only", "trgm"].includes(profile), "Only reviewed fixed bootstrap profiles are accepted");
  const needsRegression = ["d1a", "trgm"].includes(profile);
  // D1B also installs the reviewed extension to test the real operational role's
  // effective permissions. It does not acquire the additional D1A business tables.
  const needsTrgm = profile !== "acl-read-only";
  const context = "colima-askbuddy-ec2b", container = "supabase_db_askbuddy-ec2b";
  const docker = (args, input) => execFileSync("docker", args, {
    env: { HOME: process.env.HOME, PATH: process.env.PATH }, encoding: "utf8", timeout: 60000,
    maxBuffer: 20 * 1024 * 1024, ...(input ? { input } : {}), stdio: ["pipe", "pipe", "pipe"],
  }).trim();
  assert.equal(docker(["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"]), `unix://${process.env.HOME}/.colima/askbuddy-ec2b/docker.sock`);
  const meta = JSON.parse(docker(["--context", context, "inspect", container]))[0];
  assert.equal(meta.Name, `/${container}`);
  assert.ok(meta.Id.startsWith("5c5fce8e58be"));
  assert.equal(meta.Config.Image, "public.ecr.aws/supabase/postgres:17.6.1.095");
  assert.equal(meta.State.Running, true);
  assert.ok(meta.NetworkSettings.Ports["5432/tcp"].every(p => p.HostPort === "54322"));
  const systemId = docker(["--context", context, "exec", container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-Atc", "SELECT system_identifier FROM pg_control_system()"]);
  assert.equal(systemId, "7686149510228885542");
  const config = { host: "127.0.0.1", port: 54322, user: "postgres", database: "postgres", ssl: false,
    password: docker(["--context", context, "exec", container, "printenv", "POSTGRES_PASSWORD"]),
    connectionTimeoutMillis: 5000, application_name: "ec3d1b-disposable-only" };
  const source = new pg.Client(config); await source.connect();
  await source.query("SET default_transaction_read_only=on");
  // Cluster lifecycle only. Never use this connection for fixture SQL.
  const control = new pg.Client(config); await control.connect();
  const database = `ec3d1b_disposable_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  assert.match(database, /^ec3d1b_disposable_[a-f0-9]{16}$/);
  let databaseOid, roleOid, admin, before, digest, sourceTrgm, sourceTrigramIndexes;
  const cleanup = [];
  // Whole-source dump is hashed ONLY for no-mutation evidence; never executed in any database.
  const schemaDump = () => docker(["--context", context, "exec", container, "pg_dump", "-U", "postgres", "-d", "postgres", "--schema-only"]);
  const schemaHash = dump => createHash("sha256").update(dump.split("\n").filter(line => !/^\\(?:un)?restrict /.test(line)).join("\n")).digest("hex");
  try {
    assert.equal((await source.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
    await assert.rejects(() => assertDisposableTarget(source), /not created by the disposable harness/);
    await assert.rejects(() => assertDisposableTarget({ query: () => { throw new Error("Must not query a forged target"); } }), /not created by the disposable harness/);
    assert.equal((await source.query("SELECT system_identifier::text AS id FROM pg_control_system()")).rows[0].id, systemId);
    assert.equal((await source.query("SELECT max(version) AS v FROM supabase_migrations.schema_migrations")).rows[0].v, "20260915140330");
    assert.equal((await source.query("SELECT to_regnamespace('d1b_operational') AS ns")).rows[0].ns, null);
    assert.equal((await source.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='d1b_operations'")).rows[0].n, 0, "Role collision: STOP, never drop an existing role");
    assert.equal((await source.query("SELECT count(*)::int AS n FROM pg_database WHERE datname=$1", [database])).rows[0].n, 0);
    before = await trackedCounts(source); assert.ok(Object.values(before).every(n => n === 0), "STOP: nonempty shared local fixture tables");
    digest = schemaHash(schemaDump());
    sourceTrgm = await pgTrgmCatalog(source);
    if (needsTrgm) {
      verifyPgTrgmNegativeCases(sourceTrgm);
      sourceTrigramIndexes = await profileTrigramIndexes(source);
      assert.equal(sourceTrigramIndexes.length, 2);
      assert.ok(sourceTrigramIndexes.every(i => i.indisvalid && i.indisready && i.indislive && i.opclasses.join() === "public.gin_trgm_ops"));
    }
    await verifyAclCatalog(source);
    if (profile === "acl-read-only") return;
    const tableDump = docker(["--context", context, "exec", container, "pg_dump", "-U", "postgres", "-d", "postgres", "--schema-only",
      ...canonicalManifest.tables.flatMap(table => ["--table", table])]);
    const prepared = await prepareMinimalBootstrap(source, tableDump);
    const extension = needsRegression ? await prepareRegressionBootstrap(source,
      docker(["--context", context, "exec", container, "pg_dump", "-U", "postgres", "-d", "postgres", "--schema-only",
        ...regressionManifest.tables.flatMap(table => ["--table", table])])) : null;
    console.log("PASS minimal manifest source validation: five-table allowlist, ten exact migration bodies; no Realtime/managed restore, owners and ACLs retained");
    console.log(`LOCAL PIN: context=${context}; container=${meta.Id.slice(0, 12)}; systemIdentifier=${systemId}; endpoint=127.0.0.1:54322; trackedTables=16/all-zero`);
    await control.query(`CREATE DATABASE "${database}" TEMPLATE template0`);
    databaseOid = (await source.query("SELECT oid FROM pg_database WHERE datname=$1", [database])).rows[0].oid;
    console.log(`DISPOSABLE DATABASE: ${database} oid=${databaseOid}; minimal canonical schema + TEST ONLY Auth, no source data`);
    admin = new pg.Client({ ...config, database }); await admin.connect();
    ownedTargets.set(admin, { name: database, oid: databaseOid, system: systemId });
    await assertDisposableTarget(admin);
    if (needsTrgm) await installDisposablePgTrgm(admin, sourceTrgm, assertDisposableTarget);
    // pg_dump SQL may include psql restrict markers; use psql, not a query parser/rewrite.
    try { docker(["--context", context, "exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "--single-transaction", "-q"], prepared.sql + (extension ? `\n${extension.sql}` : "")); }
    catch (error) {
      const detail = String(error.stderr ?? "").split("\n").filter(line => /ERROR:/.test(line)).join("\n");
      throw new Error(`DISPOSABLE_SCHEMA_COPY_FAILED: ${detail || "restore failed; SQL bodies withheld"}`);
    }
    assert.equal((await admin.query("SELECT current_database() AS db")).rows[0].db, database);
    assert.equal((await admin.query("SELECT system_identifier::text AS id FROM pg_control_system()")).rows[0].id, systemId);
    ownedTargets.set(admin, { name: database, oid: databaseOid, system: systemId });
    await assertDisposableTarget(admin);
    if (needsRegression) {
      assert.deepEqual(await profileTrigramIndexes(admin), sourceTrigramIndexes, "Profile trigram index definition/validity/expression/collation parity failed");
      console.log("PASS both Profile GIN indexes restored unchanged: definitions, owners, validity, expressions, collations and operator classes; no index excluded");
      if (profile === "trgm") return await check({ admin, cleanup, database, systemId });
    }
    await verifyMinimalBootstrap(source, admin, prepared);
    if (extension) {
      await verifyRegressionBootstrap(source, admin, extension);
      console.log("PASS target guard: original/forged connections rejected; actual disposable name/OID/system ID verified; source inspection is session-read-only");
      return await check({ admin, cleanup, database, systemId });
    }
    // Authenticate directly with the existing LOCAL credential; never alter this managed role.
    const callerConfig = { ...config, database, user: "authenticator" };
    const caller = new pg.Client(callerConfig);
    try {
      await caller.connect();
      assert.deepEqual((await caller.query("SELECT current_user::text AS current,session_user::text AS session")).rows[0],
        { current: "authenticator", session: "authenticator" });
    } finally { await caller.end(); }
    await admin.query("BEGIN");
    try {
      await admin.query(readFileSync("local-backend/question-discovery-transport-v1/operational.proposed.sql", "utf8"));
      await admin.query("COMMIT");
    } catch (error) { await admin.query("ROLLBACK"); throw error; }
    roleOid = (await source.query("SELECT oid FROM pg_roles WHERE rolname='d1b_operations'")).rows[0].oid;
    const role = (await source.query("SELECT rolsuper,rolbypassrls,rolcanlogin,rolcreatedb,rolcreaterole,rolreplication,rolinherit FROM pg_roles WHERE oid=$1", [roleOid])).rows[0];
    assert.ok(Object.values(role).every(v => v === false));
    console.log("PASS proposed schema initialization: window_bucket is a minute bucket; operational role NOLOGIN/NOSUPERUSER/NOBYPASSRLS");
    // A password literal must never enter DDL logs, command arguments, files or test output.
    const logging = Object.fromEntries((await admin.query(`SELECT name,setting FROM pg_settings WHERE name IN
      ('log_statement','log_duration','log_min_duration_statement','log_min_duration_sample',
       'log_transaction_sample_rate','log_parameter_max_length_on_error','pgaudit.log',
       'pgaudit.log_parameter','pg_stat_statements.track','auto_explain.log_min_duration')`)).rows.map(r => [r.name, r.setting]));
    assert.deepEqual(logging, { log_statement: "ddl", log_duration: "off", log_min_duration_statement: "-1",
      log_min_duration_sample: "-1", log_transaction_sample_rate: "0", log_parameter_max_length_on_error: "0",
      "pgaudit.log": "none", "pgaudit.log_parameter": "off", "pg_stat_statements.track": "top", "auto_explain.log_min_duration": "10000" });
    const operationalConfig = { ...config, database, user: "d1b_operations", password: randomBytes(32).toString("base64url") };
    await admin.query("BEGIN");
    try {
      await admin.query("SET LOCAL statement_timeout='2s'");
      await admin.query("SELECT set_config('d1b.temporary_password',$1,true)", [operationalConfig.password]);
      // INVOKER anonymous block, not a function/privilege bypass. The caught error cannot echo the secret.
      await admin.query(`DO $bootstrap$ BEGIN
        EXECUTE pg_catalog.format('ALTER ROLE d1b_operations LOGIN CONNECTION LIMIT 8 PASSWORD %L VALID UNTIL %L',
          pg_catalog.current_setting('d1b.temporary_password'), pg_catalog.clock_timestamp() + interval '30 minutes');
        EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'D1B_LOGIN_PROVISIONING_FAILED';
      END $bootstrap$`);
      await admin.query(`GRANT CONNECT ON DATABASE "${database}" TO d1b_operations`);
      await admin.query("COMMIT");
    } catch {
      await admin.query("ROLLBACK");
      throw new Error("D1B_LOGIN_PROVISIONING_FAILED (sensitive details withheld)");
    }
    const originalPrivileges = (await source.query(`SELECT c.oid::regclass::text AS relation
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','auth') AND c.relkind IN ('r','p','v','m')
      AND (has_table_privilege('d1b_operations',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege('d1b_operations',c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))`)).rows;
    assert.deepEqual(originalPrivileges, [], "STOP: operational role has business data privileges in original DB");
    await verifyOperationalExtensionIsolation(source);
    await verifyOperationalExtensionIsolation(admin);
    verifyPgTrgmParity(await pgTrgmCatalog(source, { operations: true }),
      await pgTrgmCatalog(admin, { operations: true }), { operations: true });
    const publicDatabasePrivileges = (await source.query(`SELECT has_database_privilege('d1b_operations','postgres','CONNECT') AS connect,
      has_database_privilege('d1b_operations','postgres','TEMPORARY') AS temporary`)).rows[0];
    console.log(`LOCAL inherited PUBLIC database privileges: ${JSON.stringify(publicDatabasePrivileges)}; no business table/column grants, no original DB login attempted, no new original DB grant`);
    return await check({ config: callerConfig, operationalConfig, admin, cleanup, database, systemId });
  } finally {
    const failures = [];
    for (const close of cleanup.reverse()) { try { await close(); } catch (error) { failures.push(error); } }
    try { if (admin) { ownedTargets.delete(admin); await admin.end(); } } catch (error) { failures.push(error); }
    try {
      if (databaseOid) {
        const row = (await source.query("SELECT oid FROM pg_database WHERE datname=$1", [database])).rows[0];
        assert.equal(row?.oid, databaseOid, "STOP: disposable identity changed; do not drop");
        const active = (await source.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datid=$1", [databaseOid])).rows[0].n;
        assert.equal(active, 0, "STOP: task connections remain; no broad termination/force drop");
        await control.query(`DROP DATABASE "${database}"`);
        assert.equal((await source.query("SELECT count(*)::int AS n FROM pg_database WHERE datname=$1", [database])).rows[0].n, 0);
      }
      if (roleOid) {
        assert.equal((await source.query("SELECT oid FROM pg_roles WHERE rolname='d1b_operations'")).rows[0]?.oid, roleOid);
        await control.query("DROP ROLE d1b_operations");
        assert.equal((await source.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='d1b_operations'")).rows[0].n, 0);
      }
      if (before) assert.deepEqual(await trackedCounts(source), before);
      assert.equal((await source.query("SELECT to_regnamespace('d1b_operational') AS ns")).rows[0].ns, null);
      if (digest) assert.equal(schemaHash(schemaDump()), digest, "Shared local database schema changed");
      if (sourceTrgm) assert.deepEqual(await pgTrgmCatalog(source), sourceTrgm, "Original pg_trgm metadata changed");
    } catch (error) { failures.push(error); }
    await source.end();
    await control.end();
    if (failures.length) throw new AggregateError(failures, `TEARDOWN FAILED: inspect ONLY task resources ${database}, role oid=${roleOid ?? "not-created"}; STOP`);
    console.log(`PASS teardown: ${database} absent; task role absent; original 16 table counts unchanged/all-zero; original schema digest and pg_trgm metadata unchanged; no operational schema in original database`);
  }
}

/** Direct authentication only. Operational and canonical credentials must be supplied separately. */
export function isolatedPool(config, role, max = 2) {
  assert.match(config.database, /^ec3d1b_disposable_[a-f0-9]{16}$/);
  assert.ok(["authenticator", "d1b_operations"].includes(role));
  assert.equal(config.host, "127.0.0.1"); assert.equal(config.port, 54322);
  assert.equal(config.user, role);
  const pool = new pg.Pool({ ...config, max });
  return { end: () => pool.end(), async connect() {
    const client = await pool.connect();
    try {
      assert.deepEqual((await client.query("SELECT current_user::text AS current,session_user::text AS session")).rows[0],
        { current: role, session: role }, "STOP: connection identity does not match authenticated role");
      return { query: (sql, values) => client.query(sql, values), release: destroy => client.release(destroy) };
    } catch (error) { client.release(true); throw error; }
  } };
}
