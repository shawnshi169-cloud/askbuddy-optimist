import assert from "node:assert/strict";
import { withDisposablePostgres, isolatedPool } from "./lib/d1b-disposable-postgres.mjs";
assert.deepEqual(process.argv.slice(2), ["--local"]);
await withDisposablePostgres(async ({ config, operationalConfig, admin, cleanup }) => {
  const pool = isolatedPool(operationalConfig, "d1b_operations"); cleanup.push(() => pool.end());
  const callerPool = isolatedPool(config, "authenticator"); cleanup.push(() => callerPool.end());
  const client = await pool.connect();
  try {
    assert.deepEqual((await client.query(`SELECT current_user::text AS current,session_user::text AS session,
      rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,rolinherit,rolcanlogin,rolconnlimit,
      rolvaliduntil>now() AND rolvaliduntil<=now()+interval '30 minutes' AS short_lived
      FROM pg_roles WHERE rolname=current_user`)).rows[0], { current: "d1b_operations", session: "d1b_operations",
      rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false,
      rolinherit: false, rolcanlogin: true, rolconnlimit: 8, short_lived: true });
    assert.equal((await admin.query(`SELECT count(*)::int AS n FROM pg_auth_members
      WHERE member=(SELECT oid FROM pg_roles WHERE rolname='d1b_operations')`)).rows[0].n, 0);
    for (const table of ["public.questions_v1", "public.answers_v1", "public.canonical_topics_v1",
      "public.canonical_topic_terms_v1", "public.question_topics_v1", "auth.users", "pg_catalog.pg_authid"]) {
      await assert.rejects(() => client.query(`SELECT * FROM ${table} LIMIT 0`), e => e.code === "42501");
    }
    for (const role of ["postgres", "anon", "authenticated", "service_role", "authenticator"]) {
      await assert.rejects(() => client.query(`SET ROLE ${role}`), e => e.code === "42501");
    }
    const grants = (await admin.query(`SELECT c.relname,a.privilege_type FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a
      WHERE n.nspname='d1b_operational' AND a.grantee=(SELECT oid FROM pg_roles WHERE rolname='d1b_operations')
      ORDER BY c.relname,a.privilege_type`)).rows;
    assert.deepEqual(grants, ["gate", "rates", "sessions", "snapshots"].flatMap(relname =>
      (relname === "gate" ? ["SELECT", "UPDATE"] : ["DELETE", "INSERT", "SELECT", "UPDATE"])
        .map(privilege_type => ({ relname, privilege_type }))));
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','auth','d1b_operational') AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)`)).rows[0].n, 0);
    for (const role of ["anon", "authenticated", "authenticator"]) {
      assert.equal((await admin.query("SELECT has_schema_privilege($1,'d1b_operational','USAGE') AS access", [role])).rows[0].access, false);
    }
    console.log("PASS direct operational LOGIN: exact session/current identity, short-lived secret, limit=8, no membership/ownership/elevation, canonical/Auth reads denied; exact operational grants only");
    await client.query("INSERT INTO d1b_operational.rates(key,window_bucket,hits) VALUES($1,$2,$3)", ["schema-smoke", 123, 1]);
    assert.deepEqual((await client.query("SELECT window_bucket,hits FROM d1b_operational.rates WHERE key=$1", ["schema-smoke"])).rows[0], { window_bucket: "123", hits: 1 });
    await client.query("DELETE FROM d1b_operational.rates WHERE window_bucket<$1", [124]);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM d1b_operational.rates", [])).rows[0].n, 0);
    console.log("PASS schema/storage smoke: ordinary operational role committed bucket insert/read/prune in disposable DB only");
  } finally { client.release(); }
  const caller = await callerPool.connect();
  try {
    for (const role of ["authenticated", "anon"]) {
      await caller.query("BEGIN READ ONLY");
      try {
        await caller.query("SELECT set_config('role',$1,true)", [role]);
        assert.deepEqual((await caller.query("SELECT current_user::text AS current,session_user::text AS session")).rows[0],
          { current: role, session: "authenticator" });
        await caller.query("SELECT id FROM public.questions_v1 LIMIT 0");
      } finally { await caller.query("ROLLBACK"); }
    }
    console.log("PASS separate canonical direct authenticator LOGIN: existing ordinary-role memberships only, public read access, transaction identity reset");
  } finally { caller.release(); }
});
