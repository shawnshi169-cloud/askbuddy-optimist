import assert from "node:assert/strict";
import { requirePgTrgmOwnerParity } from "./lib/d1a-pg-trgm-bootstrap.mjs";

// Controlled metadata only. These tests do not connect to or alter any database.
const source = { extension: { name: "pg_trgm", owner: "supabase_admin", owner_oid: 42,
  owner_attributes: { superuser: true, bypassrls: true, createdb: true, createrole: true, inherit: true, login: true, replication: true } } };
const target = structuredClone(source);
requirePgTrgmOwnerParity(source, target);
const owner = patch => ({ extension: { ...target.extension, ...patch } });
assert.throws(() => requirePgTrgmOwnerParity(source, owner({ owner: "postgres", owner_oid: 43 })), /source\/target owner/);
assert.throws(() => requirePgTrgmOwnerParity(owner({ owner: undefined }), target), /Missing source owner/);
assert.throws(() => requirePgTrgmOwnerParity(source, owner({ owner: undefined })), /Missing target owner/);
assert.throws(() => requirePgTrgmOwnerParity({ extension: null }, target), /Missing source pg_trgm/);
assert.throws(() => requirePgTrgmOwnerParity(source, { extension: null }), /Missing target pg_trgm/);
assert.throws(() => requirePgTrgmOwnerParity(owner({ owner: "postgres" }), owner({ owner: "postgres" })), /Unexpected source owner/);
assert.throws(() => requirePgTrgmOwnerParity(source, owner({ owner_oid: 43 })), /source\/target owner/);
assert.throws(() => requirePgTrgmOwnerParity(source, owner({ owner_attributes: { ...target.extension.owner_attributes, superuser: false } })), /source\/target owner/);
assert.throws(() => requirePgTrgmOwnerParity(source, owner({ owner_attributes: null })), /Missing target owner role attribute/);
assert.throws(() => requirePgTrgmOwnerParity(source, owner({ name: "other_extension" })), /Unexpected target extension identity/);
console.log("PASS pg_trgm owner comparison: actual role identity/attributes compared; missing source/target owners/extensions, unexpected source baseline, mismatched name/OID/attributes and wrong extension rejected; no database mutation");
