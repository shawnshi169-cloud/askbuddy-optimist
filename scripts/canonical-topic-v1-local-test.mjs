import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { withTopicLocalContract } from "./lib/topic-local-contract.mjs";

if (process.argv[2] !== "--local") throw new Error("Explicit --local is required");
const cli = process.env.SUPABASE_LOCAL_CLI;
assert.ok(cli && existsSync(cli), "SUPABASE_LOCAL_CLI must name an existing CLI for mandatory LOCAL cleanup reset");
const context = "colima-askbuddy-ec2b";
const container = "supabase_db_askbuddy-ec2b";
const env = { HOME: process.env.HOME, PATH: process.env.PATH };
const endpoint = execFileSync("docker", ["context","inspect",context,"--format","{{.Endpoints.docker.Host}}"], { env, encoding: "utf8" }).trim();
assert.equal(endpoint, `unix://${process.env.HOME}/.colima/askbuddy-ec2b/docker.sock`, "refuse non-local endpoint");
const image = execFileSync("docker", ["--context",context,"inspect",container,"--format","{{.Config.Image}}"], { env, encoding: "utf8" }).trim();
assert.match(image, /^public\.ecr\.aws\/supabase\/postgres:\d+\.\d+\.\d+\.\d+$/);
const args = ["--context",context,"exec","-i",container,"psql","-X","--no-password","-h","/var/run/postgresql",
  "-U","postgres","-d","postgres","-At","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose"];
function session() {
  const child = spawn("docker", args, { env, stdio: ["pipe","pipe","pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on("error", reject); child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  const timer = setTimeout(() => child.kill("SIGTERM"), 120000);
  done.finally(() => clearTimeout(timer));
  return { child, done, output: () => stdout };
}
async function sql(query) {
  const s = session(); s.child.stdin.end(query + "\n"); const result = await s.done;
  assert.equal(result.code, 0, result.stderr); return result.stdout.trim();
}
async function until(check, label) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(`Timed out: ${label}`);
}
const id = (n) => `e3b20000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const actor = `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id(1)}',true); SELECT set_config('request.jwt.claim.role','authenticated',true);`;
const update = (title, topics) => `SELECT public.update_question_v1('${id(10)}','${title}','context','education-learning',ARRAY[${topics.map((n) => `'${id(n)}'`).join(",")}]::uuid[],null)`;
async function race(name, first, second, expectedError, firstRole = actor, secondRole = actor) {
  const one = session(); const two = session();
  try {
    one.child.stdin.write(`BEGIN; SET LOCAL statement_timeout='30s'; ${firstRole} ${first}; SELECT 'FIRST_LOCK_HELD';\n`);
    await until(() => one.output().includes("FIRST_LOCK_HELD"), "first transaction lock");
    two.child.stdin.end(`BEGIN; SET LOCAL application_name='ec3b1-second'; SET LOCAL statement_timeout='30s'; ${secondRole} ${second}; COMMIT;\n`);
    await until(async () => (await sql("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='ec3b1-second' AND wait_event_type='Lock');")) === "t", "independent backend actually blocked");
    one.child.stdin.end("COMMIT;\n");
    const r1 = await one.done; const r2 = await two.done;
    assert.equal(r1.code,0,r1.stderr);
    if (expectedError) { assert.notEqual(r2.code,0); assert.match(r2.stderr,expectedError); }
    else assert.equal(r2.code,0,r2.stderr);
    console.log(`PASS concurrent: ${name}; second backend waited for first commit`);
  } finally {
    if (!one.child.stdin.writableEnded) one.child.stdin.end("ROLLBACK;\n");
    if (!two.child.stdin.writableEnded) two.child.stdin.end("ROLLBACK;\n");
    await one.done; await two.done;
  }
}
const migration = "20260915140330";
const checksum = createHash("sha256").update(readFileSync(`supabase/migrations/${migration}_canonical_topic_local_foundation_v1.sql`)).digest("hex");
let cleanupEligible = false;
try {
  assert.equal(await sql("SELECT (SELECT count(*) FROM auth.users)+(SELECT count(*) FROM public.questions_v1)+(SELECT count(*) FROM public.person_experiences)+(SELECT count(*) FROM public.canonical_topics_v1);"),"0","requires empty isolated LOCAL reset; refuse existing data");
  assert.equal(await sql("SELECT max(version) FROM supabase_migrations.schema_migrations;"), migration);
  cleanupEligible = true;
  console.log(`LOCAL image=${image}; migration=${migration}; sha256=${checksum}`);
  // Metadata proves denied EXECUTE without relying on a crash-prone denial path in other images.
  assert.equal(await sql("SELECT NOT has_function_privilege('anon','public.set_experience_topics_v1(uuid,uuid[])','EXECUTE') AND has_function_privilege('authenticated','public.set_experience_topics_v1(uuid,uuid[])','EXECUTE');"),"t");
  const suite = session(); suite.child.stdin.end(readFileSync("scripts/sql/canonical-topic-v1-local.sql","utf8"));
  const result = await suite.done; process.stdout.write(result.stderr);
  assert.equal(result.code,0,result.stderr);
  assert.ok(result.stdout.includes("PERSISTENT_TOPIC_SQL_SMOKE_ROWS=0"));
  await withTopicLocalContract(async (api) => {
    let count = 0;
    for (const line of result.stdout.split("\n")) {
      if (line.startsWith("TOPIC_DTO|")) {
        const row = JSON.parse(line.slice("TOPIC_DTO|".length));
        api.CANONICAL_TOPIC_V1_LOCAL_RPCS[row.rpc].parseResult(row.result,row.params); count++;
      } else if (line.startsWith("TOPIC_QUESTION|")) {
        api.parseQuestionWithTopicsV1Local(JSON.parse(line.slice("TOPIC_QUESTION|".length))); count++;
      }
    }
    assert.equal(count,3,"actual SQL payloads parsed");
  });
  console.log("PASS: rollback SQL / real local parsers / root+alias / deprecated / RLS");

  // Reuse the full EC-2 regression matrix, changing only the two explicitly superseded Topic errors.
  let ec2 = readFileSync("scripts/sql/question-answer-v1-local.sql","utf8");
  const oldError = "'PT422', 'CANONICAL_TOPIC_NOT_READY'";
  assert.equal(ec2.split(oldError).length-1,2);
  ec2 = ec2.replace(oldError,"'PT422', 'TOPIC_INVALID_OR_INACTIVE'").replace(oldError,"'PT400', 'INVALID_INPUT'");
  const regression = session(); regression.child.stdin.end(ec2);
  const reg = await regression.done; assert.equal(reg.code,0,reg.stderr);
  assert.ok(reg.stdout.includes("PERSISTENT_LOCAL_SMOKE_ROWS=0"));
  console.log("PASS: full EC-2 rollback regression, only approved local Topic error expectations substituted");

  await sql(`BEGIN; INSERT INTO auth.users(id,email) VALUES ('${id(1)}','topic-race@example.invalid');
    INSERT INTO public.canonical_topics_v1(topic_id,canonical_name) VALUES ('${id(20)}','Local race A'),('${id(21)}','Local race B');
    INSERT INTO public.questions_v1(id,requester_person_id,title,context,primary_channel) VALUES ('${id(10)}','${id(1)}','initial','context','education-learning'); COMMIT;`);
  await race("two desired-state replacements",update("first",[20]),update("second",[21]));
  assert.equal(await sql(`SELECT title='second' AND (SELECT array_agg(topic_id ORDER BY topic_id) FROM public.question_topics_v1 WHERE question_id='${id(10)}')=ARRAY['${id(21)}']::uuid[] FROM public.questions_v1 WHERE id='${id(10)}';`),"t");
  await race("content update vs Topic replacement",`UPDATE public.questions_v1 SET title='content winner' WHERE id='${id(10)}'`,
    `SELECT ec3_topic_private.replace_question_topics('${id(10)}',ARRAY['${id(20)}']::uuid[])`);
  assert.equal(await sql(`SELECT title='content winner' AND (SELECT array_agg(topic_id) FROM public.question_topics_v1 WHERE question_id='${id(10)}')=ARRAY['${id(20)}']::uuid[] FROM public.questions_v1 WHERE id='${id(10)}';`),"t");
  await race("close wins against Topic replacement",`SELECT public.close_question_v1('${id(10)}')`,update("must fail",[21]),/PT409.*QUESTION_CLOSED/);
  await sql(`UPDATE public.questions_v1 SET status='open' WHERE id='${id(10)}';`);
  await race("Topic replacement before close",update("before close",[21]),`SELECT public.close_question_v1('${id(10)}')`);
  assert.equal(await sql(`SELECT status='closed' AND title='before close' FROM public.questions_v1 WHERE id='${id(10)}';`),"t");
  await sql(`UPDATE public.questions_v1 SET status='open' WHERE id='${id(10)}';`);
  await race("deprecation wins against new association",`UPDATE public.canonical_topics_v1 SET status='deprecated' WHERE topic_id='${id(20)}'`,update("must fail",[20]),/PT422.*TOPIC_INVALID_OR_INACTIVE/,"");
  assert.equal(await sql(`SELECT array_agg(topic_id) = ARRAY['${id(21)}']::uuid[] FROM public.question_topics_v1 WHERE question_id='${id(10)}';`),"t");
  console.log("PASS: five real two-session concurrency cases; no lost/partial desired state");
} finally {
  if (cleanupEligible) {
    const scratch = mkdtempSync(join(tmpdir(),"askbuddy-topic-local-reset-"));
    try {
      mkdirSync(join(scratch,"supabase/.temp"),{recursive:true});
      writeFileSync(join(scratch,"supabase/config.toml"),'project_id = "askbuddy-ec2b"\n[db]\nmajor_version = 17\n[db.seed]\nenabled = false\n');
      // QA reset reuses the actual local image; no pin is added to Product/runtime configuration.
      writeFileSync(join(scratch,"supabase/.temp/postgres-version"),image.split(":").at(-1));
      symlinkSync(resolve("supabase/migrations"),join(scratch,"supabase/migrations"));
      execFileSync(cli,["db","reset","--local","--no-seed","--workdir",scratch,"--yes"], {
        env:{PATH:process.env.PATH,HOME:scratch,DOCKER_HOST:endpoint},encoding:"utf8",timeout:300000,stdio:["ignore","pipe","pipe"],
      });
      console.log("PASS: LOCAL clean reset cleanup; no root hard-delete bypass");
    } finally { rmSync(scratch,{recursive:true,force:true}); }
  }
}
assert.equal(await sql("SELECT (SELECT count(*) FROM auth.users)+(SELECT count(*) FROM public.questions_v1)+(SELECT count(*) FROM public.person_experiences)+(SELECT count(*) FROM public.canonical_topics_v1)+(SELECT count(*) FROM public.canonical_topic_terms_v1)+(SELECT count(*) FROM public.question_topics_v1)+(SELECT count(*) FROM public.experience_topics_v1);"),"0");
console.log("PERSISTENT_LOCAL_TOPIC_ROWS=0; LOCAL ONLY / PRODUCTION NOT DEPLOYED / CLIENT NOT CONSUMABLE");
