import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import ts from "typescript";

// Offline projection of actual `supabase gen types --local --schema public` output, never a DB client.
const input = process.argv[2];
assert.ok(input, "Pass the full LOCAL generated snapshot path");
const tableNames = ["canonical_topics_v1", "canonical_topic_terms_v1", "question_topics_v1", "experience_topics_v1"];
const rpcNames = ["resolve_canonical_topic_v1", "get_experience_topics_v1", "set_experience_topics_v1"];
const parse = (text) => ts.createSourceFile("database.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const generated = parse(readFileSync(input, "utf8"));
const deployed = parse(readFileSync("src/integrations/supabase/types.ts", "utf8"));
const member = (node, name) => {
  const found = node.members.find((item) => item.name?.getText().replaceAll('"', '') === name);
  assert.ok(found && ts.isPropertySignature(found) && found.type, `missing generated member ${name}`);
  return found;
};
const database = (source) => {
  const node = source.statements.find((item) => ts.isTypeAliasDeclaration(item) && item.name.text === "Database");
  assert.ok(node && ts.isTypeLiteralNode(node.type)); return member(node.type, "public").type;
};
const local = database(generated); const production = database(deployed);
const print = ts.createPrinter({ removeComments: true });
const normalized = (node, source) => print.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s/g, "");
for (const section of ["Tables", "Views", "Functions", "Enums", "CompositeTypes"]) {
  const localMembers = member(local, section).type;
  const existingMembers = member(production, section).type;
  for (const existing of existingMembers.members ?? []) {
    if (!existing.name) continue;
    const current = member(localMembers, existing.name.getText().replaceAll('"', ''));
    assert.equal(normalized(current, generated), normalized(existing, deployed), `STOP unrelated LOCAL schema drift: ${section}/${existing.name.getText()}`);
  }
  const additions = (localMembers.members ?? []).filter((node) => node.name &&
    !(existingMembers.members ?? []).some((old) => old.name?.getText() === node.name.getText()));
  assert.deepEqual(additions.map((node) => node.name.getText()).sort(),
    (section === "Tables" ? [...tableNames] : section === "Functions" ? [...rpcNames] : []).sort(), `unexpected additions: ${section}`);
}
const json = generated.statements.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === "Json");
assert.ok(json);
const select = (section, names) => names.map((name) => print.printNode(ts.EmitHint.Unspecified, member(member(local, section).type, name), generated)).join("\n");
const output = "packages/shared-types/src/generated/canonical-topic-v1-local.ts";
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, "// Generated from LOCAL Supabase schema by canonical-topic-v1-local-types.mjs. Do not edit.\n"
  + "// Topic additions only; NOT Production Database types or consumer authorization.\n"
  + print.printNode(ts.EmitHint.Unspecified, json, generated) + "\n"
  + `export type CanonicalTopicDatabaseV1Local = { public: { Tables: {\n${select("Tables", tableNames)}\n}; Functions: {\n${select("Functions", rpcNames)}\n}; }; };\n`);
console.log("PASS: actual LOCAL types generated; only four tables / three RPC additions, existing public schema unchanged");
