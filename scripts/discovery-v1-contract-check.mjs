import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const temp = mkdtempSync(join(tmpdir(), "askbuddy-discovery-contract-"));
const require = createRequire(import.meta.url);
const sources = [
  "packages/shared-types/src/discovery-v1.ts",
  "packages/shared-types/src/product-blueprint-v1.ts",
  "packages/shared-types/src/product-channels.ts",
  "packages/shared-api/src/discovery-v1.ts",
  "packages/shared-api/src/product-blueprint-v1.ts",
  "packages/shared-api/src/page-contract-map.ts",
];

try {
  // Compile type-level negative cases as well as semantic metadata: DTO segregation must be real.
  const probe = join(temp, "probe.ts");
  writeFileSync(probe, `
import type { QuestionDiscoveryCardV1Target as Q, PersonDiscoveryCardV1Target as P,
  SearchAllSectionsV1Target as All, EditorialContentBlockV1Target as Block,
  EditorialFeatureSummaryV1Target as Feature, ExperienceTopicAssociationsV1Target as ET,
  PersonDiscoveryEvidenceV1Target as Evidence, ChannelDiscoveryScopeV1Target as Channel
} from "${root}/packages/shared-types/src/discovery-v1";
import type { DiscoveryOperationsV1Target as Ops, DiscoveryFeedRequestV1Target as Feed } from "${root}/packages/shared-api/src/discovery-v1";
import type { CanonicalQuestionV1 } from "${root}/packages/shared-types/src/question-answer-v1";
import type { ProductChannelSlug } from "${root}/packages/shared-types/src/product-channels";
type Assert<T extends true> = T;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type QOnly = Assert<Equal<Ops["questionDiscovery"]["response"]["items"][number], Q>>;
type POnly = Assert<Equal<Ops["personDiscovery"]["response"]["items"][number], P>>;
type SearchAll = Assert<Equal<keyof All, "questions" | "persons">>;
type SearchQ = Assert<Equal<All["questions"]["items"][number], Q>>;
type SearchP = Assert<Equal<All["persons"]["items"][number], P>>;
type Blocks = Assert<Equal<Block["kind"], "heading" | "paragraph" | "image" | "quote">>;
type PublishedOnly = Assert<Equal<Feature["state"], "published">>;
type EvidenceKinds = Assert<Equal<Evidence["kind"], "experience" | "public-answer">>;
type QChannel = Assert<Equal<Q["primaryChannel"], ProductChannelSlug>>;
type ChannelScope = Assert<Equal<Channel["primaryChannel"], ProductChannelSlug>>;
type QTopic = Assert<Equal<Q["topicIds"], CanonicalQuestionV1["topicIds"]>>;
type ETopic = Assert<Equal<ET["topicIds"], CanonicalQuestionV1["topicIds"]>>;
type NoEChannel = Assert<Equal<Extract<keyof ET, "primaryChannel">, never>>;
type NoPrivatePerson = Assert<Equal<Extract<keyof P, "expertId" | "profileId" | "phone" | "claims" | "matchScore" | "verified" | "price">, never>>;
type NoBounty = Assert<Equal<Extract<keyof Q, "accepted" | "best" | "bounty" | "reward" | "views" | "matchScore">, never>>;
type NoViewerImpersonation = Assert<Equal<Extract<keyof Feed, "viewerPersonId" | "p_viewer_person_id">, never>>;
declare const person: P;
declare const question: Q;
// @ts-expect-error Person cannot be a Question feed item.
const mixedQ: Ops["questionDiscovery"]["response"]["items"] = [person];
// @ts-expect-error Question cannot be a Person feed item.
const mixedP: Ops["personDiscovery"]["response"]["items"] = [question];
// @ts-expect-error Editorial is not arbitrary raw HTML.
const html: Block = { kind: "html", html: "<script></script>" };
// @ts-expect-error Question channel is mandatory.
const missingChannel: Q = { questionId: "q", title: "q", topicIds: [], contextExcerpt: "c", deepExchangeBudgetMaxCents: null, createdAt: "t", status: "open", answerCount: 0 };
`);
  const program = ts.createProgram([...sources.map((path) => join(root, path)), probe], {
    strict: true, noEmit: true, skipLibCheck: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (path) => path, getCurrentDirectory: () => root, getNewLine: () => "\n",
  }));
  for (const source of sources) {
    const out = join(temp, source.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, ts.transpileModule(read(source), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText);
  }
  const { DISCOVERY_V1_CONTRACT: c } = require(join(temp, "packages/shared-api/src/discovery-v1.js"));
  const types = require(join(temp, "packages/shared-types/src/discovery-v1.js"));
  const { PRODUCT_BLUEPRINT_V1_DOMAIN_MAP: domains } = require(join(temp, "packages/shared-api/src/product-blueprint-v1.js"));
  const { PAGE_CONTRACT_MAP: pages } = require(join(temp, "packages/shared-api/src/page-contract-map.js"));
  const page = (id) => { const p = pages.find((item) => item.pageId === id); assert.ok(p, id); return p; };
  assert.equal(c.contractStatus, "approved-frozen");
  for (const field of ["productionDeployed", "clientConsumable", "implementationStarted", "rpcNamesFrozen"]) assert.equal(c[field], false);
  assert.equal(c.implementationScope, "home-search-matching-editorial");
  assert.deepEqual(types.DISCOVERY_MODE_V1, ["questions", "persons"]);
  assert.deepEqual(c.home.structure, ["brand-city-action-bell", "search", "four-channels", "editorial-features", "discovery-mode", "mode-feed", "bottom-navigation"]);
  assert.deepEqual(c.home.bottomNavigation, ["首页", "发现", "＋", "消息", "我的"]);
  assert.deepEqual(c.home.centralPublish, ["我有问题", "我有经验 / 技能"]);
  assert.equal(c.home.firstMode, "questions");
  assert.deepEqual(c.home.modes, { questions: "大家都在问", persons: "找TA问问" });
  assert.equal(c.home.rememberMode, "last-used-light-preference-not-persona");
  assert.equal(c.home.mixedFeedAllowed, false);
  assert.equal(c.home.cityPrecision, "city");
  assert.equal(c.home.preciseLocationRequired, false);
  assert.equal(c.home.bell, "priority-actionable-only");
  assert.equal(c.home.ordinaryUnreadDestination, "messages");
  assert.equal(c.home.searchPlaceholder, "搜问题、找经历过的人");
  assert.equal(c.channels.scope, "temporary-domain-focus");
  assert.deepEqual(c.channels.modes, types.DISCOVERY_MODE_V1);
  assert.equal(c.channels.exit, "restore-global-home-personalization");
  assert.equal(c.channels.permanentPersona, false);
  assert.equal(c.channels.questionFilter, "exact-primary-channel");
  assert.equal(c.channels.personFilter, "relevant-public-experience-or-contribution");
  assert.deepEqual(c.search.tabs, ["all", "person", "question"]);
  assert.deepEqual(c.search.labels, { all: "综合", person: "人", question: "问题" });
  assert.deepEqual(c.search.allSections, ["questions", "persons"]);
  assert.equal(c.search.independentRanking, true);
  assert.deepEqual(c.search.allowedEntities, ["question", "person"]);
  assert.deepEqual(c.search.excludedEntities, ["discover-post", "community", "standalone-experience"]);
  assert.equal(c.search.generatedAnswerReplacement, false);
  assert.equal(c.search.empty, "real-empty-no-fallback");
  assert.equal(c.search.queryToDraft, "idea-only-no-invented-context");
  assert.equal(c.editorial.entity, "editorial-feature-article");
  assert.equal(c.editorial.sameAsTopic, false);
  assert.equal(c.editorial.algorithmicRanking, false);
  assert.equal(c.editorial.administration, "authorized-admin-editorial-operator-only");
  assert.equal(c.editorial.ordinaryPersonPublish, false);
  assert.deepEqual(c.editorial.actions, ["create", "edit", "publish", "unpublish", "place"]);
  assert.deepEqual(c.editorial.bodyKinds, ["heading", "paragraph", "image", "quote"]);
  assert.deepEqual(types.EDITORIAL_PUBLICATION_STATE_V1_TARGET, ["draft", "published", "unpublished"]);
  assert.equal(c.editorial.rawHtmlAllowed, false);
  assert.equal(c.editorial.comments, "planned-not-runtime");
  assert.equal(c.editorial.commentCount, "real-facts-only-or-omit");
  assert.equal(c.editorial.share, "published-public-link");
  assert.deepEqual(c.editorial.relatedEntities, ["canonical-topic", "question", "person"]);
  assert.equal(c.editorial.quoteSource, "real-public-answer-or-editorial-emphasis-never-fabricated-testimonial");
  assert.equal(c.editorial.emptyPublishedModule, "hide");
  assert.equal(c.editorial.fixtureFallback, false);
  assert.deepEqual(c.editorial.visibleCardsIntent, [1.15, 1.3]);
  assert.deepEqual(c.topics.sharedBy, ["question", "experience", "editorial", "search", "matching", "future-community", "future-discover-mapping"]);
  assert.equal(c.topics.questionTargetCardinality, "0..N");
  assert.equal(c.topics.experienceTargetCardinality, "0..N");
  assert.equal(c.topics.questionPrimaryChannelRequired, true);
  assert.equal(c.topics.experienceChannelRequired, false);
  for (const field of ["userStringCreatesTopic", "aiCreatesTopic", "transitionIsTopic", "locationIsTopic"]) assert.equal(c.topics[field], false);
  assert.equal(c.topics.currentQuestionTopicIds, "empty-only");
  assert.equal(c.topics.runtimeUnlockPhase, "EC-3B");
  assert.equal(c.personalization.timeDecayRequired, true);
  assert.deepEqual(c.personalization.strong, ["own-question", "active-search", "repeated-topic-view", "ask-person", "future-booking", "real-experience-related-action"]);
  assert.deepEqual(c.personalization.medium, ["save", "deep-answer-read", "follow-relevant-person", "explicit-interest", "future-community-action"]);
  assert.deepEqual(c.personalization.weak, ["incidental-like", "one-off-impression"]);
  assert.equal(c.personalization.needAutomaticallyCreatesExperience, false);
  assert.equal(c.personalization.experienceRequiresExplicitFactConfirmation, true);
  assert.equal(c.personalization.unsupportedPrecisionClaim, false);
  assert.deepEqual(c.ranking.personPriority, ["experience-relevance", "reputation-trust", "service-fit", "social-activity"]);
  assert.deepEqual(c.ranking.personEvidence, ["relevant-public-experience", "fallback-relevant-public-answer"]);
  for (const field of ["numericWeightsFrozen", "publicNumericMatchScore", "paidPlacementOverride", "fakeHeatViewsUrgency", "helpfulIsReputation", "serviceRequiredForDiscovery"]) assert.equal(c.ranking[field], false);
  assert.equal(c.ranking.averageRatingMinimumCount, 3);
  assert.equal(c.boundaries.personIdentity, "PublicPersonId");
  assert.equal(c.boundaries.ec4Actions, false);
  assert.equal(c.boundaries.privateEvidenceAllowed, false);
  assert.equal(c.boundaries.cta, "问问TA");
  assert.equal(c.boundaries.personDestination, "/person/:userId");
  assert.equal(c.pagination.mechanism, "opaque-cursor-stable-snapshot");
  assert.deepEqual(c.pagination.binding, ["viewer-or-anon", "mode-or-section", "query", "channel-scope", "city", "ranking-version", "snapshot"]);
  assert.equal(c.pagination.tieBreaker, "canonical-entity-id-asc");
  assert.equal(c.pagination.duplicatePolicy, "no-duplicate-entity-within-section-snapshot");
  assert.equal(c.pagination.expiredOrMismatchedCursor, "explicit-failure-restart-not-silent-reseed");
  assert.equal(c.pagination.safety, "recheck-public-visibility-on-every-page");

  for (const [key, runtime] of Object.entries({
    homeSearchMatching: "legacy-compatibility", productChannels: "partial", canonicalTopic: "not-deployed",
    editorialFeature: "not-deployed", location: "partial", dynamicNeedInterestSignals: "not-deployed",
  })) {
    assert.equal(domains[key].contractStatus, "approved-frozen", key);
    assert.equal(domains[key].runtimeStatus, runtime, key);
    assert.notEqual(domains[key].newCodePolicy, "may-use-deployed-contract", key);
  }
  for (const id of ["home", "search", "channel"]) {
    assert.equal(page(id).implementationStatus, "legacy");
    assert.match(page(id).notes.join("\n"), /EC-3A target contract frozen, runtime not cut over/);
  }
  assert.equal(page("editorial-feature-detail").implementationStatus, "blocked");
  assert.deepEqual(page("editorial-feature-detail").currentReadContracts, []);
  assert.deepEqual(page("editorial-feature-detail").currentWriteContracts, []);
  assert.equal(page("ask").implementationStatus, "canonical");
  assert.equal(page("question-detail").implementationStatus, "canonical");
  for (const source of ["packages/shared-types/src/discovery-v1.ts", "packages/shared-api/src/discovery-v1.ts"]) {
    const ast = ts.createSourceFile(source, read(source), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      assert.notEqual(node.kind, ts.SyntaxKind.AnyKeyword, source);
      assert.ok(!ts.isCallExpression(node), `${source}: semantic contract must not call runtime code`);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.doesNotMatch(read(source), /createClient|\.rpc\(|fetch\(|from\s+["'].*supabase/);
  }
  const doc = read("docs/ec3-discovery-contract-decision.md");
  for (const phrase of ["fa6acd091468e730991df855f519b82ad6848a01", "Article != Topic", "LOCAL ISOLATED QA", "BLOCKED BY ENVIRONMENT", "REMAINS", "Production EC-2 topicIds=[] remains locked", "DO NOT START EC-3B"]) assert.ok(doc.includes(phrase), phrase);
  assert.ok(JSON.parse(read("package.json")).scripts["test:contracts"].includes("discovery-v1-contract-check.mjs"));
  console.log("EC-3A Discovery contract PASS: semantic/type boundaries frozen; no runtime, RPC or consumer unlock.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
