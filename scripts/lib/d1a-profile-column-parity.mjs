import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const profile = "public.profiles";
export const profileLiveNames = Object.freeze(["id", "user_id", "nickname", "avatar_url", "bio", "phone",
  "created_at", "updated_at", "city", "cover_url", "city_code", "gender", "school", "industry", "is_expert", "is_verified"]);
const droppedSlots = Object.freeze([7, 12, 13]);
const order = rows => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

// Read-only supplement for the three D1A projection tables. No global attnum normalization.
export async function regressionColumnCatalog(client, manifest) {
  await client.query("SET search_path=pg_catalog");
  const tables = manifest.tables;
  const physical = (await client.query(`SELECT attrelid::regclass::text AS relation,attnum,attname AS name,attisdropped
    FROM pg_attribute WHERE attrelid=ANY($1::regclass[]) AND attnum>0 ORDER BY relation,attnum`, [tables])).rows;
  const logical = (await client.query(`SELECT a.attrelid::regclass::text AS relation,a.attname AS name,
    format_type(a.atttypid,-1) AS base_type,a.atttypmod,a.attndims,a.attlen,a.attbyval,a.attalign,
    CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END AS collation,
    a.attnotnull,a.attidentity,a.attgenerated,a.atthasdef,pg_get_expr(d.adbin,d.adrelid) AS expression,
    a.attstorage,a.attcompression,a.attoptions,a.attfdwoptions,a.attstattarget,a.attislocal,a.attinhcount
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=ANY($1::regclass[]) AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY relation,a.attnum`, [tables])).rows;
  // conkey/confkey/indkey/tgattr belong to their own database. Preserve raw
  // references for audit, but resolve every one before comparing semantics.
  const references = (await client.query(`WITH refs AS (
    SELECT 'constraint-key' AS kind,conrelid::regclass::text AS relation,conname AS name,
      conrelid AS reference_relation,conkey::smallint[] AS nums FROM pg_constraint WHERE conrelid=ANY($1::regclass[])
    UNION ALL SELECT 'constraint-foreign',conrelid::regclass::text,conname,confrelid,confkey::smallint[]
      FROM pg_constraint WHERE conrelid=ANY($1::regclass[]) AND contype='f'
    UNION ALL SELECT 'index',indrelid::regclass::text,indexrelid::regclass::text,indrelid,indkey::smallint[]
      FROM pg_index WHERE indrelid=ANY($1::regclass[])
    UNION ALL SELECT 'trigger',tgrelid::regclass::text,tgname,tgrelid,tgattr::smallint[]
      FROM pg_trigger WHERE tgrelid=ANY($1::regclass[]) AND NOT tgisinternal)
    SELECT kind,relation,name,reference_relation::regclass::text AS reference_relation,
      coalesce(nums,'{}'::smallint[]) AS attnums FROM refs ORDER BY kind,relation,name`, [tables])).rows;
  const referenceTables = [...new Set([...tables, ...references.map(r => r.reference_relation)])];
  assert.ok(referenceTables.every(t => tables.includes(t) || t === "auth.users"), "Unreviewed column-reference relation");
  const referenceColumns = (await client.query(`SELECT attrelid::regclass::text AS relation,attnum,attname AS name,attisdropped
    FROM pg_attribute WHERE attrelid=ANY($1::regclass[]) AND attnum>0 ORDER BY relation,attnum`, [referenceTables])).rows;
  const dependencies = (await client.query(`WITH objects AS (
    SELECT 'pg_class'::regclass AS classid,unnest($1::regclass[])::oid AS objid
    UNION SELECT 'pg_class'::regclass,indexrelid FROM pg_index WHERE indrelid=ANY($1::regclass[])
    UNION SELECT 'pg_constraint'::regclass,oid FROM pg_constraint WHERE conrelid=ANY($1::regclass[])
    UNION SELECT 'pg_attrdef'::regclass,oid FROM pg_attrdef WHERE adrelid=ANY($1::regclass[])
    UNION SELECT 'pg_policy'::regclass,oid FROM pg_policy WHERE polrelid=ANY($1::regclass[])
    UNION SELECT 'pg_trigger'::regclass,oid FROM pg_trigger WHERE tgrelid=ANY($1::regclass[]) AND NOT tgisinternal
    UNION SELECT 'pg_proc'::regclass,unnest($2::regprocedure[])::oid)
    SELECT o.type AS object_type,o.identity AS object_identity,r.type AS reference_type,r.identity AS reference_identity,d.deptype,
      CASE WHEN d.classid='pg_class'::regclass AND d.objsubid>0 THEN a.attname::text END AS object_column,
      CASE WHEN d.refclassid='pg_class'::regclass AND d.refobjsubid>0 THEN b.attname::text END AS reference_column,
      (d.classid='pg_class'::regclass AND d.objsubid>0 AND (a.attname IS NULL OR a.attisdropped))
        OR (d.refclassid='pg_class'::regclass AND d.refobjsubid>0 AND (b.attname IS NULL OR b.attisdropped)) AS invalid_column
    FROM pg_depend d JOIN objects x ON x.classid=d.classid AND x.objid=d.objid
    CROSS JOIN LATERAL pg_identify_object(d.classid,d.objid,d.objsubid) o
    CROSS JOIN LATERAL pg_identify_object(d.refclassid,d.refobjid,d.refobjsubid) r
    LEFT JOIN pg_attribute a ON d.classid='pg_class'::regclass AND a.attrelid=d.objid AND a.attnum=d.objsubid
    LEFT JOIN pg_attribute b ON d.refclassid='pg_class'::regclass AND b.attrelid=d.refobjid AND b.attnum=d.refobjsubid
    ORDER BY o.type,o.identity,r.type,r.identity,d.deptype`, [tables, manifest.functions])).rows;
  assert.ok(dependencies.every(d => d.invalid_column === false), "Unmappable/dropped dependency column; STOP");
  return { physical, logical, references, referenceColumns, dependencies };
}

export function resolveColumnReferences({ references, referenceColumns }) {
  return references.map(({ attnums, reference_relation, ...object }) => ({ ...object, reference_relation,
    columns: attnums.map(attnum => {
      if (attnum === 0 && object.kind === "index") return "<expression>";
      const matches = referenceColumns.filter(c => c.relation === reference_relation && c.attnum === attnum);
      assert.equal(matches.length, 1, `Unmappable attnum: ${object.name}/${attnum}`);
      assert.equal(matches[0].attisdropped, false, `Reference to dropped column: ${object.name}/${attnum}`);
      return matches[0].name;
    }) }));
}

export function verifyRegressionColumnParity(sourceCatalog, targetCatalog, source, target) {
  const tables = sourceCatalog.tables.map(t => t.name).sort();
  assert.deepEqual(targetCatalog.tables.map(t => t.name).sort(), tables);
  for (const [label, view, catalog] of [["source", source, sourceCatalog], ["target", target, targetCatalog]]) {
    assert.deepEqual([...new Set(view.physical.map(c => c.relation))].sort(), tables, `${label} physical relations differ`);
    for (const table of tables) {
      const physical = view.physical.filter(c => c.relation === table);
      assert.deepEqual(physical.map(c => c.attnum), physical.map((_, i) => i + 1), `${label} incomplete physical catalog`);
      const live = physical.filter(c => !c.attisdropped);
      assert.equal(new Set(live.map(c => c.name)).size, live.length);
      assert.deepEqual(catalog.columns.filter(c => c.relation === table).map(c => ({ name: c.name, attnum: c.attnum })),
        live.map(c => ({ name: c.name, attnum: c.attnum })), `${label} physical/live catalog mismatch`);
      assert.deepEqual(view.logical.filter(c => c.relation === table).map(c => c.name), live.map(c => c.name), `${label} logical column lost/reordered`);
      if (table === profile) {
        assert.deepEqual(physical.filter(c => c.attisdropped).map(c => c.attnum), label === "source" ? droppedSlots : [],
          `Unreviewed ${label} profiles dropped slots`);
        assert.deepEqual(live.map(c => c.name), profileLiveNames, `${label} reviewed live sequence differs`);
      }
    }
    assert.ok(view.dependencies.every(d => d.invalid_column === false), `${label} unmappable dependency column`);
  }
  assert.ok(tables.includes(profile), "profiles exception requires actual profiles metadata");
  assert.deepEqual(target.physical.filter(c => c.relation !== profile), source.physical.filter(c => c.relation !== profile),
    "Unapproved table physical attnum/dropped mismatch");
  assert.deepEqual(target.logical, source.logical, "Surviving column semantic attributes differ");
  assert.deepEqual(resolveColumnReferences(target), resolveColumnReferences(source), "Resolved dependent column identity mismatch");
  assert.deepEqual(order(target.dependencies), order(source.dependencies), "Scoped dependent object semantics differ");
  const logicalCatalog = catalog => ({ ...catalog, columns: catalog.columns.map(column => {
    if (column.relation !== profile) return column;
    const { attnum, ...attributes } = column;
    return attributes;
  }) });
  // This is the only normalization. Everything else, including ALL ACL/effective
  // privileges/owners/RLS/functions/constraints/indexes/triggers, stays exact.
  assert.deepEqual(logicalCatalog(targetCatalog), logicalCatalog(sourceCatalog), "D1A logical security/catalog parity failed");
  return { sourcePhysical: source.physical.filter(c => c.relation === profile),
    targetPhysical: target.physical.filter(c => c.relation === profile),
    liveColumns: profileLiveNames.length, resolvedReferences: resolveColumnReferences(target), dependencies: target.dependencies.length };
}

export function auditProfilePositionalUsage(functions) {
  const migration = readFileSync("supabase/migrations/20260416143000_pack_01_user_and_accounts.sql", "utf8");
  for (const column of ["points_balance", "latitude", "longitude"])
    assert.ok(migration.includes(`ALTER TABLE public.profiles DROP COLUMN IF EXISTS ${column};`));
  for (const f of functions) {
    assert.doesNotMatch(f.body, /\battnum\b|\bTG_ARGV\b|\bSELECT\s+\*|%ROWTYPE|\bROW\s*\(|\bEXECUTE\b/i,
      `Unreviewed positional/dynamic function usage: ${f.name}`);
    for (const match of f.body.matchAll(/INSERT\s+INTO\s+([a-z_]+\.[a-z_0-9]+)\s*/gi))
      assert.equal(f.body[match.index + match[0].length], "(", `Positional INSERT: ${f.name}/${match[1]}`);
  }
  const runner = readFileSync("scripts/question-discovery-v1-local-check.mjs", "utf8");
  for (const match of runner.matchAll(/INSERT\s+INTO\s+([a-z_]+\.[a-z_0-9]+)\s*/gi))
    assert.equal(runner[match.index + match[0].length], "(", `Positional D1A fixture INSERT: ${match[1]}`);
  assert.doesNotMatch(runner, /\bSELECT\s+\*|%ROWTYPE|\battnum\b/);
  assert.doesNotMatch(readFileSync("local-backend/question-discovery-v1/repository.ts", "utf8"), /public\.profiles|%ROWTYPE|\battnum\b/);
}
