import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { MANIFEST_URL, compareText, normalizeTerm, validateCoreV1Manifest, validateManifestShape } from "./canonical-topic-manifest-validator.mjs";
import { PREVIEW_ACTIONS, canonicalSerialize, planManifest, semanticHash, validateSnapshot } from "./canonical-topic-manifest-plan.mjs";
import { previewCoreV1 } from "./canonical-topic-manifest-preview.mjs";
import { withTopicLocalContract } from "./lib/topic-local-contract.mjs";

const read = (path) => readFileSync(path, "utf8");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const bytes = readFileSync(MANIFEST_URL);
const manifest = JSON.parse(bytes);
const approvedBytes = read("scripts/fixtures/core-v1-approved-content.json");
const approved = JSON.parse(approvedBytes);
const clone = (value) => structuredClone(value);
const byAlias = (a, b) => compareText(normalizeTerm(a), normalizeTerm(b));
const tests = [];
function check(name, run) { run(); tests.push(name); console.log(`PASS: ${name}`); }
const changed = (change) => { const value = clone(manifest); change(value); return value; };
const expectInvalid = (change, error) => assert.throws(() => validateCoreV1Manifest(changed(change)), error);
function snapshotFor(value) {
  return {
    topics: value.topics.map((t) => ({ topicId: t.topicId, canonicalName: t.canonicalName, normalizedName: normalizeTerm(t.canonicalName), status: t.status })),
    terms: value.topics.flatMap((t) => [t.canonicalName, ...t.aliases].map((term) => ({ topicId: t.topicId, term, normalizedTerm: normalizeTerm(term) }))),
  };
}
const empty = { topics: [], terms: [] };
const matching = snapshotFor(manifest);
const operations = (plan, type) => plan.operations.filter((op) => op.type === type);
const first = manifest.topics[0];

check("79 exact approved names/aliases, fixed once-only v4 identities, no extra business fields", () => {
  assert.equal(sha(bytes), "fe1591a81323092d745e08cd9fa024808033c5c95dcc0ca89bd41f8739deda6f", "frozen identity/content bytes require Product Owner review to change");
  assert.equal(sha(approvedBytes), "dbe233395a594e88c2b1369c451c3c5b54cfc7dc9d0b64bbf17f99d6b53f80f9", "independent approved-content fixture");
  assert.deepEqual(validateCoreV1Manifest(manifest), { topicCount: 79, aliasCount: 113, normalizedTermCount: 192, collisionCount: 0 });
  assert.deepEqual(manifest.topics.map(({ canonicalName, aliases }) => ({ canonicalName, aliases })).sort((a, b) => compareText(a.canonicalName, b.canonicalName)),
    [...approved].sort((a, b) => compareText(a.canonicalName, b.canonicalName)));
  const all = manifest.topics.flatMap((topic) => [topic.canonicalName, ...topic.aliases]);
  for (const omitted of ["人像摄影", "PM", "手冲咖啡", "旅行攻略", "海外硕士申请", "Personal Statement", "学校面试", "路跑", "自驾租车"]) assert.ok(!all.includes(omitted));
});

check("strict invalid fields, values, counts and stable ordering fail closed", () => {
  expectInvalid((m) => { m.extra = true; }, /fields/);
  expectInvalid((m) => { delete m.manifestId; }, /fields/);
  for (const field of ["channel", "primaryChannel", "parentTopicId", "children", "description", "icon", "rank", "sortOrder", "heat", "popularity", "searchCount", "city", "location", "aiScore", "verification", "whyIncluded", "reviewNote", "candidateId"]) {
    expectInvalid((m) => { m.topics[0][field] = "forbidden"; }, /fields/);
  }
  expectInvalid((m) => { m.schemaVersion = 2; }, /schemaVersion/);
  expectInvalid((m) => { m.manifestId = "core-v2"; }, /manifestId/);
  expectInvalid((m) => { m.topics[0].topicId = first.topicId.replace(/-4/, "-5"); }, /UUID v4/);
  expectInvalid((m) => { m.topics[0].topicId = first.topicId.toUpperCase(); }, /UUID v4/);
  expectInvalid((m) => { m.topics[1].topicId = first.topicId; }, /duplicate topicId/);
  expectInvalid((m) => { m.topics.reverse(); }, /topicId ASC/);
  expectInvalid((m) => { m.topics.find((t) => t.aliases.length === 2).aliases.reverse(); }, /alias ASC/);
  expectInvalid((m) => { m.topics[0].canonicalName = " \t\n"; }, /empty/);
  expectInvalid((m) => { m.topics[0].aliases = [""]; }, /empty/);
  expectInvalid((m) => { m.topics[0].aliases = "invalid"; }, /array/);
  expectInvalid((m) => { m.topics[0].canonicalName = "bad\0term"; }, /invalid term/);
  expectInvalid((m) => { m.topics[0].status = "hidden"; }, /status/);
  expectInvalid((m) => { m.topics[0].status = "deprecated"; }, /initial status/);
  expectInvalid((m) => { m.topics.pop(); }, /79/);
  expectInvalid((m) => { m.topics[0].canonicalName = "人像摄影"; }, /deferred/);
  expectInvalid((m) => { m.topics[0].aliases = [" 人像摄影 "]; }, /deferred/);
});

check("one global normalized collision domain, including own canonical alias", () => {
  expectInvalid((m) => { m.topics[1].canonicalName = m.topics[0].canonicalName; }, /collision/);
  expectInvalid((m) => { m.topics[1].aliases = [m.topics[0].canonicalName]; }, /collision/);
  expectInvalid((m) => { m.topics[0].aliases = [m.topics[1].canonicalName]; }, /collision/);
  expectInvalid((m) => { m.topics[0].aliases = ["Same Term"]; m.topics[1].aliases = [" same\tTERM "]; }, /collision/);
  expectInvalid((m) => { m.topics[0].aliases = ["same", "SAME"]; }, /collision/);
  expectInvalid((m) => { m.topics[0].aliases = [m.topics[0].canonicalName]; }, /collision/);
});

check("normalization preserves non-ASCII and punctuation", () => {
  for (const [input, expected] of [[" \tRESEARCH\n\v\f\r Experience ", "research experience"], ["汉字 A/B", "汉字 a/b"],
    ["ÉＡİ 汉字", "ÉＡİ 汉字"], ["\u00a0A\u00a0", "\u00a0a\u00a0"], ["\u3000A\u3000", "\u3000a\u3000"], ["A-B", "a-b"], [" ", ""]]) {
    assert.equal(normalizeTerm(input), expected);
  }
});
await withTopicLocalContract(async (_local, _question, backend) => {
  const topic = { topicId: first.topicId, canonicalName: "RESEARCH Experience", aliases: [], status: "active" };
  backend.CANONICAL_TOPIC_V1_RPCS.resolve_canonical_topic_v1.parseResult({ topic }, { p_term: " \tResearch\nExperience " });
  assert.throws(() => backend.canonicalTopicV1Schema.parse({ ...topic, aliases: ["research\tEXPERIENCE"] }));
  assert.equal(backend.CANONICAL_TOPIC_V1_STATE.clientConsumable, true);
});
console.log("PASS: normalization is shared with current app-facing Topic parser");

check("empty Production -> 79 CREATE with complete alias payload", () => {
  const plan = planManifest(manifest, empty);
  assert.equal(plan.counts.CREATE_TOPIC, 79);
  assert.equal(plan.effectiveChangeCount, 79);
  assert.equal(plan.highRiskCount, 0); assert.equal(plan.governanceSensitiveCount, 0);
  assert.equal(plan.collisionCount, 0);
  assert.deepEqual(plan.operations.map((op) => op.payload), manifest.topics);
  assert.ok(plan.operations.every((op) => op.action === "NONE" && op.explicitFutureApprovalRequired));
  const { planHash, ...semantic } = plan;
  assert.equal(planHash, semanticHash(semantic));
  assert.equal(plan.applyAuthorized, false);
});

check("exact same state -> NO_CHANGE, zero effective changes", () => {
  const plan = planManifest(manifest, matching);
  assert.equal(plan.counts.NO_CHANGE, 79); assert.equal(plan.effectiveChangeCount, 0);
});

check("rename same ID, no automatic old-name alias, trigger retention explicitly removed", () => {
  const desired = changed((m) => { m.topics[0].canonicalName = "Approved future rename"; });
  const plan = planManifest(desired, matching);
  assert.deepEqual(operations(plan, "RENAME_TOPIC")[0].payload, { from: first.canonicalName, to: "Approved future rename" });
  assert.equal(operations(plan, "RENAME_TOPIC")[0].topicId, first.topicId);
  assert.equal(plan.counts.ADD_ALIAS, 0);
  const removal = operations(plan, "REMOVE_ALIAS")[0];
  assert.equal(removal.payload.normalizedTerm, normalizeTerm(first.canonicalName));
  assert.equal(removal.governanceSensitive, true);
  desired.topics[0].aliases.push(first.canonicalName); desired.topics[0].aliases.sort(byAlias);
  assert.equal(planManifest(desired, matching).counts.REMOVE_ALIAS, 0, "old name retained only on explicit manifest instruction");
});

check("add alias explicitly", () => {
  const desired = changed((m) => { m.topics[0].aliases.push("Future approved alias"); m.topics[0].aliases.sort(byAlias); });
  const plan = planManifest(desired, matching);
  assert.equal(plan.counts.ADD_ALIAS, 1); assert.equal(plan.counts.REMOVE_ALIAS, 0);
});

check("remove alias explicitly, governance sensitive", () => {
  const desired = changed((m) => { m.topics.find((t) => t.aliases.length > 0).aliases.pop(); });
  const plan = planManifest(desired, matching);
  assert.equal(plan.counts.REMOVE_ALIAS, 1);
  assert.equal(operations(plan, "REMOVE_ALIAS")[0].governanceSensitive, true);
});

check("alias display change is explicit removal/addition, not silent normalization", () => {
  const before = snapshotFor({ topics: [{ ...first, aliases: ["Example Alias"] }] });
  const desired = { ...manifest, topics: [{ ...first, aliases: ["example alias"] }] };
  const plan = planManifest(desired, before);
  assert.equal(plan.counts.REMOVE_ALIAS, 1); assert.equal(plan.counts.ADD_ALIAS, 1);
});

check("alias promoted to canonical keeps the canonical term", () => {
  const source = manifest.topics.find((t) => t.aliases.length > 0);
  const desired = { ...manifest, topics: [{ ...source, canonicalName: source.aliases[0], aliases: [source.canonicalName, ...source.aliases.slice(1)].sort(byAlias) }] };
  const plan = planManifest(desired, snapshotFor({ topics: [source] }));
  assert.equal(plan.counts.RENAME_TOPIC, 1); assert.equal(plan.counts.REMOVE_ALIAS, 0);
});

check("active -> deprecated, no historical association action", () => {
  const plan = planManifest(changed((m) => { m.topics[0].status = "deprecated"; }), matching);
  assert.equal(plan.counts.DEPRECATE_TOPIC, 1);
  assert.equal(operations(plan, "DEPRECATE_TOPIC")[0].governanceSensitive, true);
  assert.equal(plan.effectiveChangeCount, 1);
});

check("deprecated -> active is HIGH risk with explicit future approval", () => {
  const before = clone(matching); before.topics[0].status = "deprecated";
  const plan = planManifest(manifest, before);
  assert.equal(plan.counts.REACTIVATE_TOPIC, 1); assert.equal(plan.highRiskCount, 1);
  assert.equal(operations(plan, "REACTIVATE_TOPIC")[0].explicitFutureApprovalRequired, true);
});

const unmanaged = { topicId: "f0000000-0000-4000-8000-000000000001", canonicalName: "Existing governed root", aliases: [], status: "active" };
check("Production-only unmanaged -> NONE, never omission-based deprecation", () => {
  const before = snapshotFor({ topics: [...manifest.topics, unmanaged] });
  const plan = planManifest(manifest, before);
  assert.equal(plan.counts.PRODUCTION_ONLY_UNMANAGED, 1); assert.equal(plan.effectiveChangeCount, 0);
  assert.equal(operations(plan, "PRODUCTION_ONLY_UNMANAGED")[0].action, "NONE");
});

check("Production canonical/alias collisions fail even if owner would remove/rename", () => {
  for (const occupied of [first.canonicalName, manifest.topics.find((t) => t.aliases.length).aliases[0]]) {
    const before = snapshotFor({ topics: [{ ...unmanaged, canonicalName: occupied }] });
    assert.throws(() => planManifest(manifest, before), /PRODUCTION_TERM_COLLISION/);
    const aliasBefore = snapshotFor({ topics: [{ ...unmanaged, aliases: [occupied] }] });
    assert.throws(() => planManifest(manifest, aliasBefore), /PRODUCTION_TERM_COLLISION/);
  }
  const desired = clone(manifest);
  desired.topics[0].canonicalName = manifest.topics[1].canonicalName;
  desired.topics[1].canonicalName = "Governed future rename";
  assert.throws(() => planManifest(desired, matching), /PRODUCTION_TERM_COLLISION/);
});

check("snapshot rejects corruption, normalization drift and unexpected fields", () => {
  const bad = (change) => { const value = clone(matching); change(value); assert.throws(() => validateSnapshot(value)); };
  bad((s) => { s.terms.pop(); s.terms = s.terms.filter((t) => t.normalizedTerm !== s.topics[0].normalizedName); });
  bad((s) => { s.terms[0].normalizedTerm = "wrong"; });
  bad((s) => { s.topics[0].normalizedName = "wrong"; });
  bad((s) => { s.terms[0].topicId = unmanaged.topicId; });
  bad((s) => { s.terms.push(clone(s.terms[0])); });
  bad((s) => { s.topics[0].updated_at = "not-semantic"; });
});

function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
check("byte-stable plan/hash, snapshot order-independent, inputs unchanged", () => {
  const frozenManifest = freeze(clone(manifest)); const frozenSnapshot = freeze(clone(matching));
  const originalManifest = canonicalSerialize(frozenManifest); const originalSnapshot = canonicalSerialize(frozenSnapshot);
  const firstPlan = planManifest(frozenManifest, frozenSnapshot);
  assert.equal(canonicalSerialize(firstPlan), canonicalSerialize(planManifest(frozenManifest, frozenSnapshot)));
  const reversed = { topics: [...matching.topics].reverse(), terms: [...matching.terms].reverse() };
  assert.equal(canonicalSerialize(firstPlan), canonicalSerialize(planManifest(manifest, reversed)));
  const reorderedKeys = { topics: manifest.topics.map((t) => ({ status: t.status, aliases: t.aliases, canonicalName: t.canonicalName, topicId: t.topicId })), manifestId: "core-v1", schemaVersion: 1 };
  assert.equal(firstPlan.planHash, planManifest(reorderedKeys, matching).planHash);
  assert.equal(canonicalSerialize(frozenManifest), originalManifest); assert.equal(canonicalSerialize(frozenSnapshot), originalSnapshot);
  assert.notEqual(firstPlan.planHash, planManifest(manifest, empty).planHash);
  assert.throws(() => canonicalSerialize(undefined));
});

const envelope = { projectRef: "fslpvtlavhrnxsygkpvi", projectStatus: "ACTIVE_HEALTHY", counts: {
  canonical_topics_v1: 0, canonical_topic_terms_v1: 0, question_topics_v1: 0, experience_topics_v1: 0,
}, topics: [], terms: [] };
check("offline preview refuses project/health/count drift and unauthorized command arguments", () => {
  assert.equal(previewCoreV1(bytes, envelope).plan.counts.CREATE_TOPIC, 79);
  for (const change of [(s) => { s.projectRef = "other"; }, (s) => { s.projectStatus = "UNHEALTHY"; },
    (s) => { s.counts.question_topics_v1 = 1; }, (s) => { s.counts.canonical_topics_v1 = 1; },
    (s) => { s.topics = matching.topics; }]) {
    const bad = clone(envelope); change(bad); assert.throws(() => previewCoreV1(bytes, bad));
  }
  for (const args of [[], ["--apply"], ["--snapshot", "missing.json", "--apply"]]) {
    const result = spawnSync(process.execPath, ["scripts/canonical-topic-manifest-preview.mjs", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1); assert.match(result.stderr, /usage:/);
  }
});

check("exact action vocabulary has no merge, delete, redirect or apply authorization", () => {
  assert.deepEqual([...PREVIEW_ACTIONS].sort(), ["CREATE_TOPIC", "RENAME_TOPIC", "ADD_ALIAS", "REMOVE_ALIAS", "DEPRECATE_TOPIC", "REACTIVATE_TOPIC", "NO_CHANGE", "PRODUCTION_ONLY_UNMANAGED"].sort());
});

check("review artifact matches exact manifest and recorded read-only snapshot", () => {
  const recordedSnapshot = JSON.parse(read("canonical-topics/reviews/core-v1-production-snapshot.json"));
  const artifact = JSON.parse(read("canonical-topics/reviews/core-v1-production-preview.json"));
  assert.deepEqual(artifact, previewCoreV1(bytes, recordedSnapshot));
  assert.equal(artifact.plan.planHash, "9319fcf1ae9c7641927760f3a679cd5df74c9a5ab944460fa33dec350ed84cc2");
  const review = read("canonical-topics/reviews/core-v1-review.md");
  for (const topic of manifest.topics) {
    assert.ok(review.includes(`| \`${topic.topicId}\` | ${topic.canonicalName} | ${topic.aliases.join(" / ") || "(none)"} | active |`));
  }
  const evidence = read("docs/ec3c0c-canonical-topic-core-seed-preview.md");
  assert.ok(evidence.includes(sha(bytes))); assert.ok(evidence.includes(artifact.plan.planHash));
});

check("C0C has no migration change, seed SQL, executable mutation path or runtime manifest import", () => {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const baseline = "c0625b083decfa07437aabc351ba791593a8e56a";
  assert.equal(git("diff", "--name-only", baseline, "--", "supabase/migrations"), "", "C0C migration freeze");
  assert.equal(git("ls-files", "--others", "--exclude-standard", "--", "supabase/migrations"), "");
  const tooling = ["scripts/canonical-topic-manifest-validator.mjs", "scripts/canonical-topic-manifest-plan.mjs", "scripts/canonical-topic-manifest-preview.mjs", "scripts/lib/topic-normalization.mjs"];
  const allowedImports = new Set(["node:fs", "node:url", "node:crypto", "typescript", "./lib/topic-normalization.mjs", "./canonical-topic-manifest-validator.mjs", "./canonical-topic-manifest-plan.mjs"]);
  for (const path of tooling) {
    const source = read(path);
    assert.doesNotMatch(source, /\b(?:fetch|createClient|XMLHttpRequest|WebSocket|execFileSync|spawnSync|randomUUID|writeFileSync|appendFileSync|unlinkSync)\s*\(|process\.env|Math\.random|Date\.now/);
    assert.doesNotMatch(source, /\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)|supabase\s+db\s+push|sb_secret_[A-Za-z0-9]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i);
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const statement of ast.statements.filter(ts.isImportDeclaration)) {
      assert.ok(allowedImports.has(statement.moduleSpecifier.text), `${path}: unexpected dependency`);
      if (statement.moduleSpecifier.text === "node:fs") assert.equal(statement.importClause.namedBindings.elements.map((e) => e.name.text).join(","), "readFileSync");
    }
  }
  const normalizer = read("packages/shared-api/src/canonical-topic-normalization-v1.ts");
  assert.doesNotMatch(normalizer, /\b(?:import|require|fetch|process|eval)\b/);
  const scripts = JSON.parse(read("package.json")).scripts;
  assert.ok(scripts["test:contracts"].includes("test:canonical-topic-manifest-v1"));
  assert.deepEqual(Object.keys(scripts).filter((key) => key.startsWith("topic:manifest:")).sort(), ["topic:manifest:preview", "topic:manifest:validate"]);
  function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]); }
  for (const path of ["src", "apps", "packages"].flatMap(walk).filter((path) => /\.[cm]?[jt]sx?$/.test(path))) {
    assert.doesNotMatch(read(path), /canonical-topics\/core-v1|canonical-topic-manifest|core-v1-approved-content/, `${path}: governance input must not enter runtime`);
  }
  for (const path of walk("canonical-topics")) assert.doesNotMatch(path, /\.sql$/);
  const discovery = read("packages/shared-api/src/discovery-v1.ts");
  for (const flag of ["productionDeployed", "clientConsumable", "implementationStarted", "rpcNamesFrozen"]) assert.match(discovery, new RegExp(`${flag}: false`));
  assert.match(read("src/pages/NewQuestion.tsx"), /p_topic_ids: \[\]/);
});

console.log(`Canonical Topic manifest/planner: ${tests.length} checks PASS; no Production access.`);
