import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditSqlDependencies } from "./lib/d1a-sql-dependencies.mjs";
import { regressionManifest, regressionTables } from "./lib/d1a-regression-bootstrap.mjs";
import { canonicalManifest } from "./lib/d1b-canonical-bootstrap.mjs";

const manifest = { tables: regressionTables, functions: [...canonicalManifest.functions, ...regressionManifest.functions, "auth.uid()"] };
const audit = sql => auditSqlDependencies(sql, manifest);
for (const name of regressionTables) assert.deepEqual(audit(`SELECT * FROM ${name};`).relations, [name]);
for (const name of ["public.question_topics_v2", "public.question_topics_v1_extra", "public.question_topics_v1evil",
  "public.unknown_table_v1", "public.private_records_v1", "auth.unknown_table_v1", "public.question_topics_v1$evil"]) {
  assert.throws(() => audit(`SELECT * FROM ${name};`), error => error.message === `Unreviewed relation dependency ${name}`);
}
assert.deepEqual(audit("SELECT * FROM PUBLIC . QUESTION_TOPICS_V1\n JOIN public.questions_v1 q ON true; SELECT * FROM public.answers_v1;"),
  { relations: ["public.answers_v1", "public.question_topics_v1", "public.questions_v1"], functions: [] });
assert.deepEqual(audit("SELECT * FROM public.questions_v1; SELECT * FROM public.questions_v1;"), { relations: ["public.questions_v1"], functions: [] });
assert.deepEqual(audit("SELECT * FROM public.questions_v1, public.answers_v1;"), { relations: ["public.answers_v1", "public.questions_v1"], functions: [] });
assert.deepEqual(audit(""), { relations: [], functions: [] });
assert.deepEqual(audit("-- FROM public.unknown_table_v1\n /* nested /* FROM auth.unknown_table_v1 */ comment */ SELECT 'FROM public.private_records_v1; ''JOIN'' auth.unknown_table_v1';"), { relations: [], functions: [] });
assert.deepEqual(audit("SELECT * FROM /* ignored */ public /* separator */ . question_topics_v1;"), { relations: ["public.question_topics_v1"], functions: [] });
for (const sql of [
  "SELECT 'FROM public.questions_v1' FROM public.unknown_table_v1;",
  "-- FROM public.questions_v1\n SELECT * FROM public.unknown_table_v1;",
  "SELECT * FROM public.questions_v1, public.unknown_table_v1;",
  "SELECT * FROM public.questions_v1, unknown_schema.unknown_table_v1;",
  "SELECT * FROM public.question_topics_v1evil /* public.question_topics_v1 */;",
]) assert.throws(() => audit(sql), /Unreviewed relation dependency/);
for (const sql of [
  'SELECT * FROM public."question_topics_v1";', 'SELECT * FROM "public".questions_v1;',
  "SELECT * FROM public.1questions;", "SELECT * FROM public.;", "SELECT * FROM public..questions_v1;",
  "SELECT * FROM public.questions_v1.extra;", "SELECT * FROM public.questions_v1-evil;",
  "SELECT * FROM public.questions_v1\\evil;", "SELECT * FROM public.questions_v1私;",
  "SELECT * FROM public." + "x".repeat(64), "SELECT * FROM questions_v1;", "SELECT * FROM",
  "/* unterminated", "SELECT 'unterminated", "SELECT E'escaped\\n';", "SELECT $$FROM public.questions_v1$$;",
  "EXECUTE 'SELECT * FROM public.questions_v1';",
]) assert.throws(() => audit(sql), /Unsupported dependency syntax/);
assert.deepEqual(audit("PERFORM AUTH.UID(); PERFORM ec3_topic_private.validate_ids(ids);"),
  { relations: [], functions: ["auth.uid", "ec3_topic_private.validate_ids"] });
assert.throws(() => audit("PERFORM ec3_topic_private.validate_ids_extra(ids);"), /Unreviewed function dependency/);
assert.deepEqual(audit("SELECT * FROM unnest(ids) AS input(id); INSERT INTO public.question_topics_v1(question_id,topic_id) VALUES (a,b);"),
  { relations: ["public.question_topics_v1"], functions: [] });
// Scan the exact six reviewed bodies, not hand-simplified approximations.
for (const signature of regressionManifest.functions) {
  const name = signature.slice(0, signature.indexOf("(")).replaceAll(".", "\\.");
  const body = regressionManifest.sources.map(file => readFileSync(file, "utf8"))
    .flatMap(sql => [...sql.matchAll(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${name}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`, "g"))]).at(-1);
  assert.ok(body, `Missing reviewed source: ${signature}`); audit(body[1]);
}
console.log("PASS dependency scanner: all 9 reviewed relations and 6 source bodies; complete numeric/$ identifiers, exact allowlist, case folding, duplicates, comments/literals, prefix spoofing and unsupported syntax rejection");
