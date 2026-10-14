import assert from "node:assert/strict";

// Resume #11: exact local extension exception, never a public-schema/RPC wildcard.
export const pgTrgmFunctionSignatures = Object.freeze([
  "public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal)",
  "public.gin_extract_value_trgm(text,internal)",
  "public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal)",
  "public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal)",
  "public.gtrgm_compress(internal)",
  "public.gtrgm_consistent(internal,text,smallint,oid,internal)",
  "public.gtrgm_decompress(internal)",
  "public.gtrgm_distance(internal,text,smallint,oid,internal)",
  "public.gtrgm_in(cstring)",
  "public.gtrgm_options(internal)",
  "public.gtrgm_out(public.gtrgm)",
  "public.gtrgm_penalty(internal,internal,internal)",
  "public.gtrgm_picksplit(internal,internal)",
  "public.gtrgm_same(public.gtrgm,public.gtrgm,internal)",
  "public.gtrgm_union(internal,internal)",
  "public.set_limit(real)",
  "public.show_limit()",
  "public.show_trgm(text)",
  "public.similarity_dist(text,text)",
  "public.similarity_op(text,text)",
  "public.similarity(text,text)",
  "public.strict_word_similarity_commutator_op(text,text)",
  "public.strict_word_similarity_dist_commutator_op(text,text)",
  "public.strict_word_similarity_dist_op(text,text)",
  "public.strict_word_similarity_op(text,text)",
  "public.strict_word_similarity(text,text)",
  "public.word_similarity_commutator_op(text,text)",
  "public.word_similarity_dist_commutator_op(text,text)",
  "public.word_similarity_dist_op(text,text)",
  "public.word_similarity_op(text,text)",
  "public.word_similarity(text,text)",
].sort());

export const pgTrgmEffectiveRoles = Object.freeze([
  "PUBLIC", "anon", "authenticated", "authenticator", "postgres", "service_role", "supabase_admin",
]);
const missingGrantees = Object.freeze(["anon", "authenticated", "postgres", "service_role"]);
const grants = recipients => recipients.map(grantee => ({ grantor: "supabase_admin", grantee,
  privilege: "EXECUTE", grantable: false })).sort((a, b) => a.grantee.localeCompare(b.grantee));
const normalize = acl => {
  assert.ok(Array.isArray(acl), "Missing normalized function ACL");
  return [...acl].sort((a, b) => a.grantee.localeCompare(b.grantee));
};
const sourceGrants = grants(["PUBLIC", "supabase_admin", ...missingGrantees]);
const targetGrants = grants(["PUBLIC", "supabase_admin"]);

export function verifyPgTrgmFunctionException(source, target) {
  for (const [label, functions] of [["source", source], ["target", target]]) {
    assert.ok(Array.isArray(functions), `Missing ${label} extension functions`);
    assert.deepEqual(functions.map(f => f.name).sort(), pgTrgmFunctionSignatures,
      `Unexpected ${label} pg_trgm exact function membership/signatures`);
  }
  const differences = [];
  for (const name of pgTrgmFunctionSignatures) {
    const original = source.find(f => f.name === name), restored = target.find(f => f.name === name);
    const structure = f => {
      const { acl, explicit_acl, raw_acl, raw_acl_is_null, ...metadata } = f;
      return metadata;
    };
    assert.deepEqual(structure(restored), structure(original), `pg_trgm structural mismatch: ${name}`);
    assert.equal(original.owner, "supabase_admin", `Unreviewed owner: ${name}`);
    assert.equal(original.prosecdef, false, `Unreviewed SECURITY DEFINER: ${name}`);
    assert.equal(original.proconfig, null, `Unreviewed proconfig: ${name}`);
    assert.deepEqual(original.initial_privileges, [], `Unreviewed pg_init_privs: ${name}`);
    assert.equal(original.raw_acl_is_null, false, `Missing explicit source ACL: ${name}`);
    assert.equal(typeof original.raw_acl, "string");
    assert.deepEqual(normalize(original.acl), sourceGrants, `Unreviewed source grants: ${name}`);
    assert.deepEqual(normalize(original.explicit_acl), sourceGrants, `Unreviewed source explicit grants: ${name}`);
    assert.equal(restored.raw_acl_is_null, restored.raw_acl === null, `Inconsistent target raw ACL: ${name}`);
    assert.deepEqual(normalize(restored.acl), targetGrants, `Unreviewed target grants: ${name}`);
    assert.deepEqual(normalize(restored.explicit_acl), restored.raw_acl_is_null ? [] : targetGrants,
      `Unreviewed target explicit grants: ${name}`);
    if (!restored.raw_acl_is_null) assert.equal(typeof restored.raw_acl, "string");
    assert.notEqual(restored.raw_acl, original.raw_acl, `Expected reviewed raw ACL difference: ${name}`);
    differences.push({ function: name, missingExplicitGrants: grants(missingGrantees),
      sourceRawAcl: original.raw_acl, targetRawAcl: restored.raw_acl,
      sourceAclIsNull: original.raw_acl_is_null, targetAclIsNull: restored.raw_acl_is_null });
  }
  return { rawAclParity: "NOT IDENTICAL", rawAclException: "REVIEWED LOCAL ONLY", differences };
}

export function verifyPgTrgmEffectivePermissions(source, target, { operations = false } = {}) {
  const roles = [...pgTrgmEffectiveRoles, ...(operations ? ["d1b_operations"] : [])].sort();
  const identities = roles.flatMap(role => pgTrgmFunctionSignatures.map(fn => `${role}:${fn}`)).sort();
  const normalizeRows = rows => [...rows].sort((a, b) => `${a.role}:${a.function}`.localeCompare(`${b.role}:${b.function}`));
  for (const [label, rows] of [["source", source], ["target", target]]) {
    assert.deepEqual(rows.map(r => `${r.role}:${r.function}`).sort(), identities, `Incomplete ${label} effective role matrix`);
    for (const row of rows) {
      assert.equal(row.schema_usage, true, `${label} schema USAGE changed: ${row.role}`);
      assert.equal(row.execute, true, `${label} EXECUTE changed: ${row.role}`);
      assert.equal(row.grantable, row.role === "supabase_admin", `${label} grant option changed: ${row.role}`);
    }
  }
  assert.deepEqual(normalizeRows(target), normalizeRows(source), "pg_trgm effective privilege parity failed");
}
