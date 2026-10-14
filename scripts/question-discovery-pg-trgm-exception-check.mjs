import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pgTrgmFunctionSignatures, pgTrgmEffectiveRoles, verifyPgTrgmFunctionException,
  verifyPgTrgmEffectivePermissions } from "./lib/d1a-pg-trgm-acl.mjs";
import { verifyPgTrgmParity } from "./lib/d1a-pg-trgm-bootstrap.mjs";

// Controlled metadata, never GRANT/REVOKE or owner changes in any database.
const grants = recipients => recipients.map(grantee => ({ grantee, grantor: "supabase_admin", privilege: "EXECUTE", grantable: false }));
const source = pgTrgmFunctionSignatures.map(name => ({ name, owner: "supabase_admin", prosecdef: false,
  proconfig: null, initial_privileges: [], extension: "pg_trgm", deptype: "e", definition: `FUNCTION ${name}`,
  raw_acl_is_null: false, raw_acl: "reviewed source metadata fixture",
  acl: grants(["PUBLIC", "supabase_admin", "postgres", "anon", "authenticated", "service_role"]),
  explicit_acl: grants(["PUBLIC", "supabase_admin", "postgres", "anon", "authenticated", "service_role"]) }));
const target = source.map(f => ({ ...structuredClone(f), raw_acl: null, raw_acl_is_null: true,
  acl: grants(["PUBLIC", "supabase_admin"]), explicit_acl: [] }));
const result = verifyPgTrgmFunctionException(source, target);
assert.equal(result.rawAclParity, "NOT IDENTICAL");
assert.equal(result.rawAclException, "REVIEWED LOCAL ONLY");
assert.equal(result.differences.length, 31);
assert.equal(result.differences.flatMap(r => r.missingExplicitGrants).length, 124);
const reject = (label, mutate) => {
  const s = structuredClone(source), t = structuredClone(target); mutate(s, t);
  assert.throws(() => verifyPgTrgmFunctionException(s, t), undefined, label);
};
reject("extra EXECUTE grant", (_, t) => t[0].acl.push(...grants(["anon"])));
reject("unexpected grant recipient", (_, t) => t[0].acl.push(...grants(["unknown_role"])));
reject("unexpected grantor", (_, t) => { t[0].acl[0].grantor = "postgres"; });
reject("extra grant option", (_, t) => { t[0].acl[0].grantable = true; });
reject("unexpected source grant option", s => { s[0].acl[0].grantable = true; });
reject("missing PUBLIC EXECUTE", (_, t) => { t[0].acl = t[0].acl.filter(a => a.grantee !== "PUBLIC"); });
reject("missing source grantee", s => s[0].acl.pop());
reject("unknown extension function", (_, t) => { t[0].name = "public.unknown_trgm(text)"; });
reject("changed SECURITY DEFINER", (_, t) => { t[0].prosecdef = true; });
reject("changed owner", (_, t) => { t[0].owner = "postgres"; });
reject("changed signature", (_, t) => { t[0].name += "extra"; });
reject("changed function body", (_, t) => { t[0].definition += " altered"; });
reject("changed proconfig", (_, t) => { t[0].proconfig = ["search_path=public"]; });
reject("missing member", (_, t) => t.pop());
reject("additional member", (_, t) => t.push(structuredClone(t[0])));
reject("changed membership", (_, t) => { t[0].extension = "other"; });
reject("changed initial privileges", (_, t) => { t[0].initial_privileges = ["unexpected"]; });
reject("unrelated public function ACL exception", (s, t) => { s[0].name = t[0].name = "public.unrelated_rpc()"; });
reject("Canonical function ACL exception", (s, t) => { s[0].name = t[0].name = "public.update_question_v1(uuid,text,text,text,uuid[],bigint)"; });
reject("unreviewed new privilege", (_, t) => { t[0].acl[0].privilege = "SELECT"; });
reject("same unexpected grants on both sides", (s, t) => {
  s[0].acl.push(...grants(["unknown_role"])); t[0].acl.push(...grants(["unknown_role"]));
});

const effective = operations => [...pgTrgmEffectiveRoles, ...(operations ? ["d1b_operations"] : [])].flatMap(role =>
  pgTrgmFunctionSignatures.map(fn => ({ role, function: fn, schema_usage: true, execute: true, grantable: role === "supabase_admin" })));
for (const operations of [false, true]) {
  const rows = effective(operations);
  verifyPgTrgmEffectivePermissions(rows, structuredClone(rows), { operations });
  for (const field of ["schema_usage", "execute", "grantable"]) {
    const changed = structuredClone(rows); changed[0][field] = !changed[0][field];
    assert.throws(() => verifyPgTrgmEffectivePermissions(rows, changed, { operations }));
  }
  assert.throws(() => verifyPgTrgmEffectivePermissions(rows, rows.slice(1), { operations }));
}
const extension = { name: "pg_trgm", version: "1.6", schema: "public", owner: "supabase_admin", owner_oid: 10,
  owner_attributes: Object.fromEntries(["superuser", "bypassrls", "createdb", "createrole", "inherit", "login", "replication"].map(k => [k, true])) };
const metadata = { extension, available: [{ name: "pg_trgm", version: "1.6", superuser: true, trusted: true,
  relocatable: true, schema: null, requires: null }], members: [{ identity: "reviewed member fixture" }],
  opclasses: [{ name: "gin_trgm_ops", schema: "public", method: "gin", extension: "pg_trgm", deptype: "e" }],
  effective: effective(false) };
const original = { ...structuredClone(metadata), functions: source }, restored = { ...structuredClone(metadata), functions: target };
verifyPgTrgmParity(original, restored);
for (const mutate of [t => t.members.push({ identity: "unexpected" }), t => t.members.pop(),
  t => { t.opclasses[0].method = "btree"; }]) {
  const changed = structuredClone(restored); mutate(changed);
  assert.throws(() => verifyPgTrgmParity(original, changed));
}
// The exception helper must never be substituted into Canonical/Auth catalog parity.
for (const file of ["scripts/lib/d1b-canonical-bootstrap.mjs", "scripts/lib/d1a-regression-bootstrap.mjs"])
  assert.doesNotMatch(readFileSync(file, "utf8"), /verifyPgTrgmFunctionException|verifyPgTrgmParity/);
console.log("PASS pg_trgm reviewed raw-ACL exception: exact 31 signatures/124 missing entries accepted; 21 function/ACL negatives, effective role-matrix negatives and extension-member/operator negatives rejected; no SQL grants changed; Canonical checks separate");
