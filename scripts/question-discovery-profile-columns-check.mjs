import assert from "node:assert/strict";
import { profileLiveNames, verifyRegressionColumnParity, resolveColumnReferences } from "./lib/d1a-profile-column-parity.mjs";

// Pure comparison fixtures only. Physical layouts are deliberately different;
// named semantics/security must be equal without changing any database objects.
function fixture(source) {
  let live = 0;
  const physical = Array.from({ length: source ? 19 : 16 }, (_, i) => {
    const attnum = i + 1, attisdropped = source && [7, 12, 13].includes(attnum);
    return { relation: "public.profiles", attnum, name: attisdropped ? `........pg.dropped.${attnum}........` : profileLiveNames[live++], attisdropped };
  });
  physical.push({ relation: "public.user_settings", attnum: 1, name: "id", attisdropped: false });
  const columns = physical.filter(c => !c.attisdropped).map(({ attisdropped, ...column }) => ({ ...column,
    type: "text", attnotnull: false, expression: null, acl_is_null: true, acl: [] }));
  const catalog = { tables: [{ name: "public.profiles" }, { name: "public.user_settings" }], columns,
    constraints: [{ name: "profiles_pkey", definition: "PRIMARY KEY (id)" }],
    indexes: [{ name: "profiles_created", definition: "INDEX ON public.profiles (created_at)" }],
    triggers: [{ name: "updated_at", definition: "EXECUTE FUNCTION public.update_updated_at_column()" }],
    effectiveColumns: columns.map(c => ({ relation: c.relation, name: c.name, role: "anon", privilege: "SELECT", allowed: true, grantable: false })) };
  const view = { physical, logical: columns.map(c => ({ relation: c.relation, name: c.name, base_type: "text", atttypmod: -1,
    collation: 'pg_catalog."default"', attnotnull: false, expression: null, attidentity: "", attgenerated: "",
    attstorage: "x", attcompression: "", attoptions: null, attfdwoptions: null })),
    references: [{ kind: "index", relation: "public.profiles", name: "profiles_created", reference_relation: "public.profiles", attnums: [source ? 8 : 7] }],
    referenceColumns: structuredClone(physical),
    dependencies: [{ object_identity: "profiles_created", reference_identity: "public.profiles.created_at", invalid_column: false }] };
  return { catalog, view };
}
const source = fixture(true), target = fixture(false);
const proof = verifyRegressionColumnParity(source.catalog, target.catalog, source.view, target.view);
assert.equal(proof.liveColumns, 16);
assert.notDeepEqual(proof.sourcePhysical, proof.targetPhysical);
assert.deepEqual(resolveColumnReferences(source.view), resolveColumnReferences(target.view));
assert.deepEqual(proof.resolvedReferences[0].columns, ["created_at"]);
let negatives = 0;
const reject = (label, mutate) => {
  const s = structuredClone(source), t = structuredClone(target); mutate(s, t);
  assert.throws(() => verifyRegressionColumnParity(s.catalog, t.catalog, s.view, t.view), undefined, label);
  negatives++;
};
reject("unexpected fourth source dropped slot", s => { s.view.physical[18].attisdropped = true; });
reject("dropped target column", (_, t) => { t.view.physical[6].attisdropped = true; });
reject("missing live column", (_, t) => t.catalog.columns.splice(6, 1));
reject("extra live column", (_, t) => t.catalog.columns.push({ ...t.catalog.columns[0], name: "extra" }));
reject("renamed live column", (_, t) => { t.catalog.columns[6].name = "created_at2"; });
reject("reordered live columns", (_, t) => { [t.catalog.columns[6], t.catalog.columns[7]] = [t.catalog.columns[7], t.catalog.columns[6]]; });
reject("changed type", (_, t) => { t.view.logical[0].base_type = "uuid"; });
reject("changed typmod", (_, t) => { t.view.logical[0].atttypmod = 32; });
reject("changed nullability", (_, t) => { t.view.logical[0].attnotnull = true; });
reject("changed default", (_, t) => { t.view.logical[0].expression = "now()"; });
reject("changed column ACL", (_, t) => t.catalog.columns[0].acl.push({ grantee: "anon", privilege: "UPDATE" }));
reject("changed raw ACL null state", (_, t) => { t.catalog.columns[0].acl_is_null = false; });
reject("changed effective permission", (_, t) => { t.catalog.effectiveColumns[0].allowed = false; });
reject("changed grant option", (_, t) => { t.catalog.effectiveColumns[0].grantable = true; });
reject("changed constraint", (_, t) => { t.catalog.constraints[0].definition = "PRIMARY KEY (user_id)"; });
reject("changed index", (_, t) => { t.catalog.indexes[0].definition += " WHERE false"; });
reject("changed trigger", (_, t) => { t.catalog.triggers[0].definition += " changed"; });
reject("mismapped attnum reference", (_, t) => { t.view.references[0].attnums = [8]; });
reject("unmappable attnum reference", (_, t) => { t.view.references[0].attnums = [99]; });
reject("reference to dropped source slot", s => { s.view.references[0].attnums = [7]; });
reject("unapproved table attnum change", (_, t) => { t.view.physical.at(-1).attnum = 2; });
reject("changed dependency", (_, t) => { t.view.dependencies[0].reference_identity = "public.profiles.phone"; });
reject("invalid dependency", (_, t) => { t.view.dependencies[0].invalid_column = true; });
for (const [field, changed] of [["collation", "other"], ["attidentity", "a"], ["attgenerated", "s"],
  ["attstorage", "p"], ["attcompression", "l"], ["attoptions", ["n_distinct=1"]], ["attfdwoptions", ["unknown=x"]]])
  reject(`changed ${field}`, (_, t) => { t.view.logical[0][field] = changed; });
console.log(`PASS profiles physical/logical comparison: only reviewed 7/12/13 source slots; 16 named columns/order/attributes/ACL/effective privileges and resolved dependencies; ${negatives} negative scenarios rejected; no database writes`);
