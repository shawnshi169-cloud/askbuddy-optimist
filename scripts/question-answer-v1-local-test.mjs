import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";

// Fixed LOCAL Docker context/container. Never accept a database URL or inherit PG credentials.
if (process.argv[2] !== "--local") throw new Error("Explicit --local is required");
const context = "colima-askbuddy-ec2b";
const container = "supabase_db_askbuddy-ec2b";
const env = { PATH: process.env.PATH, HOME: process.env.HOME };
const endpoint = execFileSync("docker", ["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"], { env, encoding: "utf8" }).trim();
assert.equal(endpoint, `unix://${process.env.HOME}/.colima/askbuddy-ec2b/docker.sock`, "refuse non-local Docker endpoint");
const args = ["--context", context, "exec", "-i", container, "psql", "-X", "--no-password", "-h", "/var/run/postgresql",
  "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"];
const sessions = new Set();
function session() {
  const child = spawn("docker", args, { env, stdio: ["pipe", "pipe", "pipe"] });
  sessions.add(child);
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => { sessions.delete(child); resolve({ code, stdout, stderr }); });
  });
  const timer = setTimeout(() => child.kill("SIGTERM"), 60000);
  done.finally(() => clearTimeout(timer));
  return { child, done, output: () => stdout };
}
async function sql(query) {
  const s = session(); s.child.stdin.end(query + "\n");
  const r = await s.done;
  if (r.code !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}
async function until(check, label) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${label}`);
}
const id = (n) => `e2400000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = (n) => `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id(n)}',true); SELECT set_config('request.jwt.claim.role','authenticated',true);`;
const firstQ = id(10); const secondQ = id(11); const helpfulQ = id(12);
const firstAnswer = id(20); const helpfulAnswer = id(21);
const tests = [];
const pairCheck = `SELECT (SELECT count(*) FROM public.answer_helpful_marks_v1) = (SELECT count(*) FROM public.answer_helpful_public_facts_v1)
  AND NOT EXISTS (SELECT 1 FROM public.answer_helpful_marks_v1 m FULL JOIN public.answer_helpful_public_facts_v1 f
    USING(mark_id,answer_id) WHERE m.mark_id IS NULL OR f.mark_id IS NULL);`;
async function race(label, firstActor, firstAction, secondActor, secondAction, expectedError) {
  const one = session(); const two = session();
  try {
    one.child.stdin.write(`BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL application_name='ec2-race-first'; ${actor(firstActor)} ${firstAction}; SELECT 'EC2_FIRST_READY';\n`);
    await until(() => one.output().includes("EC2_FIRST_READY"), "first session acquired lock");
    two.child.stdin.end(`BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL application_name='ec2-race-second'; ${actor(secondActor)} ${secondAction}; COMMIT;\n`);
    await until(async () => (await sql("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name='ec2-race-second' AND wait_event_type='Lock' AND wait_event='advisory');")) === "t", "second independent backend waits on advisory lock");
    one.child.stdin.end("COMMIT;\n");
    const firstResult = await one.done;
    assert.equal(firstResult.code, 0, firstResult.stderr);
    const secondResult = await two.done;
    if (expectedError) {
      assert.notEqual(secondResult.code, 0);
      assert.match(secondResult.stderr, new RegExp(expectedError));
    } else assert.equal(secondResult.code, 0, secondResult.stderr);
    assert.equal(await sql(pairCheck), "t", "mark/fact commit integrity");
    tests.push(label);
    console.log(`PASS concurrent: ${label}; first transaction committed before blocked second resumed`);
  } finally {
    one.child.stdin.end(); two.child.stdin.end();
    await one.done; await two.done;
  }
}

const temp = mkdtempSync(join(process.cwd(), "node_modules/.ec2-db-parser-"));
let fixturesCreated = false;
try {
  assert.equal(await sql("SELECT count(*) FROM public.questions_v1;"), "0", "requires fresh LOCAL reset; never delete pre-existing data");
  const contractSource = readFileSync("packages/shared-api/src/question-answer-v1.ts", "utf8");
  const signatures = [...contractSource.matchAll(/"(public\.\w+\([^)]*\))"/g)].map((match) => match[1]);
  assert.equal(signatures.length, 12);
  const reads = new Set(["get_question_detail_v1", "list_questions_v1", "list_question_answers_v1", "list_answer_replies_v1"]);
  for (const signature of signatures) {
    const name = signature.slice("public.".length).split("(")[0];
    const acl = JSON.parse(await sql(`SELECT jsonb_build_object(
      'authenticated', has_function_privilege('authenticated', '${signature}', 'EXECUTE'),
      'anon', has_function_privilege('anon', '${signature}', 'EXECUTE'),
      'public', EXISTS(SELECT 1 FROM pg_proc AS p,
        LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) AS a
        WHERE p.oid = '${signature}'::regprocedure AND a.grantee = 0));`));
    assert.deepEqual(acl, { authenticated: true, anon: reads.has(name), public: false }, signature);
  }
  console.log("PASS: exact 12 approved signatures / anon-read-only / authenticated / PUBLIC ACL");
  const smoke = session();
  smoke.child.stdin.end(readFileSync(new URL("./sql/question-answer-v1-local.sql", import.meta.url), "utf8"));
  const result = await smoke.done;
  process.stdout.write(result.stderr);
  assert.equal(result.code, 0, result.stderr);
  assert.ok(result.stdout.includes("PERSISTENT_LOCAL_SMOKE_ROWS=0"));
  writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "commonjs" }));
  for (const file of ["packages/shared-types/src/product-channels.ts", "packages/shared-types/src/question-answer-v1.ts", "packages/shared-api/src/question-answer-v1.ts"]) {
    const out = join(temp, file.replace(/\.ts$/, ".js")); mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText);
  }
  const api = createRequire(import.meta.url)(join(temp, "packages/shared-api/src/question-answer-v1.js"));
  let projections = 0;
  for (const line of result.stdout.split("\n").filter((value) => value.startsWith("EC2_DTO|"))) {
    const value = JSON.parse(line.slice("EC2_DTO|".length));
    api.PROPOSED_QUESTION_ANSWER_V1_RPCS[value.rpc].parseResult(value.result, value.params);
    projections += 1;
  }
  assert.equal(projections, 8, "all four real read payloads pass approved strict parsers for anon and authenticated");
  console.log("PASS: LOCAL rollback suite / approved runtime parsers / zero persistent rows");

  assert.equal(await sql(`SELECT count(*) FROM auth.users WHERE id IN ('${id(1)}','${id(2)}','${id(3)}');`), "0");
  await sql(`BEGIN;
    INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
      ('${id(1)}','ec2-race-a@example.invalid','{}'),('${id(2)}','ec2-race-b@example.invalid','{}'),('${id(3)}','ec2-race-c@example.invalid','{}');
    INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel) VALUES
      ('${firstQ}','${id(1)}','close-answer','context','education-learning'),
      ('${secondQ}','${id(1)}','close-reply','context','education-learning'),
      ('${helpfulQ}','${id(1)}','helpful-race','context','education-learning');
    INSERT INTO public.answers_v1(id,question_id,author_person_id,body) VALUES
      ('${firstAnswer}','${secondQ}','${id(2)}','answer'),('${helpfulAnswer}','${helpfulQ}','${id(2)}','answer');
    COMMIT;`);
  fixturesCreated = true;
  await race("close vs RPC Answer", 1, `SELECT public.close_question_v1('${firstQ}')`, 2,
    `SELECT public.create_answer_v1('${firstQ}','blocked')`, "PT409.*QUESTION_CLOSED");
  await race("close vs RPC Reply", 1, `SELECT public.close_question_v1('${secondQ}')`, 3,
    `SELECT public.create_answer_reply_v1('${firstAnswer}','blocked')`, "PT409.*QUESTION_CLOSED");
  // Privileged LOCAL setup reopens only fixtures to test the direct-DML paths, not a client capability.
  await sql(`UPDATE public.questions_v1 SET status='open' WHERE id IN ('${firstQ}','${secondQ}');`);
  await race("direct close vs direct Answer", 1, `UPDATE public.questions_v1 SET status='closed' WHERE id='${firstQ}'`, 2,
    `INSERT INTO public.answers_v1(question_id,body) VALUES ('${firstQ}','blocked')`, "PT409.*QUESTION_CLOSED");
  await race("direct close vs direct Reply", 1, `UPDATE public.questions_v1 SET status='closed' WHERE id='${secondQ}'`, 3,
    `INSERT INTO public.answer_replies_v1(answer_id,body) VALUES ('${firstAnswer}','blocked')`, "PT409.*QUESTION_CLOSED");
  assert.equal(await sql(`SELECT count(*) FROM public.answers_v1 WHERE question_id='${firstQ}';`), "0");
  assert.equal(await sql(`SELECT count(*) FROM public.answer_replies_v1 WHERE answer_id='${firstAnswer}';`), "0");
  await race("Helpful same viewer true/true", 1, `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',true)`, 1,
    `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',true)`);
  assert.equal(await sql("SELECT count(*) FROM public.answer_helpful_marks_v1;"), "1");
  await sql(`BEGIN; ${actor(1)} SELECT public.set_answer_helpful_v1('${helpfulAnswer}',false); COMMIT;`);
  await race("Helpful multiple viewers", 1, `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',true)`, 3,
    `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',true)`);
  assert.equal(await sql("SELECT count(*) FROM public.answer_helpful_marks_v1;"), "2");
  await race("Helpful add/remove same viewer", 1, `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',true)`, 1,
    `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',false)`);
  assert.equal(await sql("SELECT count(*) FROM public.answer_helpful_marks_v1;"), "1");
  await race("Helpful false/false retry", 3, `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',false)`, 3,
    `SELECT public.set_answer_helpful_v1('${helpfulAnswer}',false)`);
  assert.equal(await sql("SELECT count(*) FROM public.answer_helpful_marks_v1;"), "0");
  console.log(`PASS: ${tests.length} real two-session concurrency cases`);
} finally {
  for (const child of sessions) child.stdin.end("ROLLBACK;\n");
  if (fixturesCreated) {
    // LOCAL cleanup uses the same owner path for Helpful, then privileged fixture-only content deletion.
    await sql(`BEGIN; ${actor(1)} SELECT public.set_answer_helpful_v1('${helpfulAnswer}',false); COMMIT;
      BEGIN; ${actor(3)} SELECT public.set_answer_helpful_v1('${helpfulAnswer}',false); COMMIT;
      BEGIN;
      DELETE FROM public.answer_replies_v1 WHERE answer_id IN ('${firstAnswer}','${helpfulAnswer}');
      DELETE FROM public.answers_v1 WHERE question_id IN ('${firstQ}','${secondQ}','${helpfulQ}');
      DELETE FROM public.questions_v1 WHERE id IN ('${firstQ}','${secondQ}','${helpfulQ}');
      DELETE FROM auth.users WHERE id IN ('${id(1)}','${id(2)}','${id(3)}');
      COMMIT;`);
  }
  rmSync(temp, { recursive: true, force: true });
}
assert.equal(await sql("SELECT (SELECT count(*) FROM public.questions_v1)+(SELECT count(*) FROM public.answers_v1)+(SELECT count(*) FROM public.answer_replies_v1)+(SELECT count(*) FROM public.answer_helpful_marks_v1)+(SELECT count(*) FROM public.answer_helpful_public_facts_v1);"), "0");
console.log("PERSISTENT_LOCAL_SMOKE_ROWS=0; LOCAL VALIDATED ONLY / NOT DEPLOYED / NOT CLIENT CONSUMABLE");
