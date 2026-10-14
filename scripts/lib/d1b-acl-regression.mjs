import assert from "node:assert/strict";
import { canonicalCatalog, canonicalManifest, columnAclMetadata, explicitColumnAcl, assertColumnAclShape } from "./d1b-canonical-bootstrap.mjs";

/** Read-only catalog/VALUES probes. No fixture objects, GRANT, REVOKE or catalog writes. */
export async function verifyAclCatalog(client) {
  assert.equal((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM aclexplode(NULL::aclitem[])")).rows[0].n, 0);
  const fixtures = `WITH fixture(name,attacl) AS (VALUES
    ('null',NULL::aclitem[]),('empty',ARRAY[]::aclitem[]),
    ('select',ARRAY['anon=r/postgres'::aclitem]),
    ('write',ARRAY['authenticated=aw/postgres'::aclitem]),
    ('grantable',ARRAY['authenticated=r*/postgres'::aclitem]),
    ('public',ARRAY['=r/postgres'::aclitem]))`;
  const shapes = (await client.query(`${fixtures} SELECT name,${columnAclMetadata("attacl")} FROM fixture ORDER BY name`)).rows;
  assertColumnAclShape(shapes);
  const rows = (await client.query(`${fixtures} SELECT name,${columnAclMetadata("attacl")},${explicitColumnAcl("attacl")} AS acl
    FROM fixture ORDER BY name`)).rows;
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map(({ acl, ...metadata }) => metadata), shapes);
  const byName = Object.fromEntries(rows.map(row => [row.name, row]));
  assert.deepEqual(byName.null, { name: "null", acl_is_null: true, acl_cardinality: null, acl_ndims: null, acl_dimensions: null, acl: [] });
  assert.deepEqual(byName.empty, { name: "empty", acl_is_null: false, acl_cardinality: 0, acl_ndims: null, acl_dimensions: null, acl: [] });
  const grant = (grantee, privilege, grantable = false) => ({ grantor: "postgres", grantee, privilege, grantable });
  assert.deepEqual(byName.select.acl, [grant("anon", "SELECT")]);
  assert.deepEqual(byName.write.acl, [grant("authenticated", "INSERT"), grant("authenticated", "UPDATE")]);
  assert.deepEqual(byName.grantable.acl, [grant("authenticated", "SELECT", true)]);
  assert.deepEqual(byName.public.acl, [grant("PUBLIC", "SELECT")]);
  const malformed = "ARRAY[['anon=r/postgres'::aclitem],['authenticated=r/postgres'::aclitem]]";
  const malformedShape = (await client.query(`SELECT 'malformed' AS name,${columnAclMetadata(malformed)}`)).rows;
  assert.equal(malformedShape[0].acl_cardinality, 2);
  assert.equal(malformedShape[0].acl_ndims, 2);
  assert.throws(() => assertColumnAclShape(malformedShape), /Malformed nonempty column ACL/);
  // Even if the preflight shape check were bypassed, expansion must fail, never return [].
  await assert.rejects(() => client.query(`SELECT ${explicitColumnAcl(malformed)} AS acl`), error => error.code === "22023");
  console.log("PASS ACL VALUES probes: NULL/empty distinct, SELECT/INSERT/UPDATE/PUBLIC/grant option preserved; malformed nonempty 2-D rejected; no missing rows; no permission changes");

  const tables = ["public.profiles", "public.user_settings", "public.point_accounts"];
  const catalog = await canonicalCatalog(client, { schemas: canonicalManifest.schemas, tables, functions: [] });
  for (const [index, count] of [16, 11, 7].entries()) {
    const columns = catalog.columns.filter(column => column.relation === tables[index]);
    assert.equal(columns.length, count);
    assert.ok(columns.every(column => column.acl_is_null && column.acl.length === 0));
  }
  assert.equal(catalog.effectiveColumns.length, 34 * 5 * 4);
  for (const column of catalog.columns) {
    const privilege = (role, p) => catalog.effectiveColumns.find(row => row.relation === column.relation && row.name === column.name && row.role === role && row.privilege === p);
    assert.equal(privilege("anon", "SELECT").allowed, true, "Table SELECT must contribute to NULL-column-ACL effective privileges");
    assert.ok(catalog.effective.find(row => row.relation === column.relation && row.role === "anon" && row.privilege === "SELECT").allowed);
    for (const p of ["SELECT", "INSERT", "UPDATE", "REFERENCES"]) {
      assert.equal(privilege("authenticator", p).allowed, false, "NOINHERIT caller login must not gain direct column access");
      assert.equal(privilege("postgres", p).allowed, true);
      assert.equal(privilege("postgres", p).grantable, true);
    }
  }
  console.log(`PASS effective ACL matrix: all 34 projection columns retained; ${catalog.effectiveColumns.length} column/role/privilege rows, table and schema permissions + grant options; NULL ACL != no effective access; owner and denied authenticator verified`);
}
