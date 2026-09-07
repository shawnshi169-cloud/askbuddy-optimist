import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const tempRoot = mkdtempSync(join(tmpdir(), "askbuddy-blueprint-v1-"));
const require = createRequire(import.meta.url);

const sourceFiles = [
  "packages/shared-types/src/product-blueprint-v1.ts",
  "packages/shared-api/src/product-blueprint-v1.ts",
  "packages/shared-api/src/page-contract-map.ts",
];

const transpile = (relativePath) => {
  const sourcePath = join(root, relativePath);
  const outputPath = join(tempRoot, relativePath.replace(/\.ts$/, ".js"));
  const output = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], `Transpile failed for ${relativePath}`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output.outputText);
};

try {
  sourceFiles.forEach(transpile);

  const shared = require(
    join(tempRoot, "packages/shared-types/src/product-blueprint-v1.js"),
  );
  const api = require(
    join(tempRoot, "packages/shared-api/src/product-blueprint-v1.js"),
  );
  const pages = require(
    join(tempRoot, "packages/shared-api/src/page-contract-map.js"),
  );

  assert.equal(shared.PRODUCT_BLUEPRINT_V1, "product-blueprint-v1");
  assert.deepEqual(shared.HOME_SEARCH_DOMAIN_V1, ["all", "person", "question"]);
  assert.equal(shared.SERVICE_CURRENCY_V1, "CNY");
  assert.deepEqual(shared.CONVERSATION_ENTRY_POINT_V1, ["chat", "booking"]);
  assert.deepEqual(shared.CONNECTION_KIND_V1, [
    "question", "conversation", "community",
  ]);
  assert.equal(
    shared.PAID_MEDIA_RECORDING_CONSENT_V1,
    "explicit-before-first-use",
  );

  const sharedSource = read("packages/shared-types/src/product-blueprint-v1.ts");
  const questionAnswerSource = read("packages/shared-types/src/question-answer-v1.ts");
  const publicPersonSource = read("packages/shared-types/src/public-person.ts");
  assert.match(publicPersonSource, /type PublicPersonId = Id/);
  assert.match(questionAnswerSource, /requesterPersonId: PublicPersonId/);
  assert.match(questionAnswerSource, /authorPersonId: PublicPersonId/);
  assert.match(sharedSource, /personId: PublicPersonId/);
  assert.doesNotMatch(sharedSource, /expertId|profilesId|profileId/);

  const interfaceBlock = (name, source = sharedSource) => {
    const start = source.indexOf(`export interface ${name}`);
    assert.ok(start >= 0, `Missing interface ${name}`);
    const end = source.indexOf("\n}", start);
    assert.ok(end > start, `Unterminated interface ${name}`);
    return source.slice(start, end + 2);
  };

  const questionTarget = interfaceBlock("CanonicalQuestionV1", questionAnswerSource);
  assert.match(questionTarget, /deepExchangeBudgetMaxCents: number \| null/);
  assert.match(questionTarget, /context: string;/);
  assert.match(sharedSource, /type PublicQuestionV1Target = CanonicalQuestionV1/);
  assert.match(sharedSource, /@deprecated EC-0 历史语义 placeholder/);
  assert.doesNotMatch(questionTarget, /accepted|reward|bounty|point/i);

  const budgetIntent = interfaceBlock("QuestionDeepExchangeBudgetIntent");
  assert.match(budgetIntent, /currency: ServiceCurrencyV1/);
  assert.doesNotMatch(
    budgetIntent,
    /amount|minimum|maximum|range|preset|storage|input/i,
  );

  const answerTarget = interfaceBlock("CanonicalAnswerV1", questionAnswerSource);
  assert.match(answerTarget, /extends AnswerHelpfulSummaryV1/);
  assert.doesNotMatch(answerTarget, /accepted|serviceRating|helpedUser/i);

  const replyTarget = interfaceBlock("CanonicalAnswerReplyV1", questionAnswerSource);
  assert.match(replyTarget, /answerId: CanonicalAnswerIdV1/);
  assert.doesNotMatch(replyTarget, /parentReplyId/);

  const disabledService = interfaceBlock("DisabledPersonServiceSettingsV1Target");
  const enabledService = interfaceBlock("EnabledPersonServiceSettingsV1Target");
  const transactionMoneyTarget = interfaceBlock("ServiceTransactionMoneyV1Target");
  assert.match(disabledService, /personId: PublicPersonId/);
  assert.match(disabledService, /enabled: false/);
  assert.doesNotMatch(disabledService, /basePrice|modes|voice|video/);
  assert.match(enabledService, /personId: PublicPersonId/);
  assert.match(enabledService, /enabled: true/);
  assert.match(enabledService, /basePrice: CnyAmount/);
  assert.match(enabledService, /modes: PersonServiceModesV1/);
  assert.match(
    sharedSource,
    /type PersonServiceSettingsV1Target\s*=\s*[\s\S]*DisabledPersonServiceSettingsV1Target[\s\S]*EnabledPersonServiceSettingsV1Target/,
  );
  assert.match(transactionMoneyTarget, /feePolicyKey/);
  assert.doesNotMatch(enabledService, /Point|points|expertId|commissionRate|15%/);

  const domainMap = api.PRODUCT_BLUEPRINT_V1_DOMAIN_MAP;
  assert.equal(domainMap.questionAnswerReply.runtimeStatus, "production-ready");
  assert.equal(domainMap.questionAnswerReply.newCodePolicy, "may-use-deployed-contract");
  assert.match(domainMap.questionAnswerReply.currentRuntime, /contract approved/);
  assert.match(domainMap.questionAnswerReply.currentRuntime, /12 canonical RPCs deployed/);
  assert.match(domainMap.questionAnswerReply.currentRuntime, /authenticated HTTP consumer-smoke verified/);
  assert.equal(domainMap.questionAnswerReply.phase, "EC-2");
  assert.match(domainMap.questionAnswerReply.currentRuntime, /Shared Core NewQuestion and QuestionDetail UI implemented/);
  assert.match(domainMap.questionAnswerReply.currentRuntime, /canonical Answer\/Helpful\/Reply and owner close, no legacy fallback/);
  assert.match(domainMap.questionAnswerReply.currentRuntime, /Home\/Search\/Channel question discovery cutover remains deferred to EC-3/);
  assert.doesNotMatch(domainMap.questionAnswerReply.currentRuntime, /UI remains legacy|not wired/);
  assert.equal(domainMap.homeSearchMatching.runtimeStatus, "legacy-compatibility");
  assert.equal(domainMap.productChannels.runtimeStatus, "partial");
  assert.equal(domainMap.canonicalTopic.runtimeStatus, "not-deployed");
  assert.equal(domainMap.canonicalTopic.newCodePolicy, "blocked-until-phase");
  assert.equal(domainMap.dynamicNeedInterestSignals.runtimeStatus, "not-deployed");
  for (const key of ["homeSearchMatching", "productChannels", "canonicalTopic", "dynamicNeedInterestSignals"]) {
    assert.equal(domainMap[key].phase, "EC-3");
  }
  assert.equal(domainMap.person, undefined);
  assert.equal(domainMap.publicPersonIdentityAndRead.runtimeStatus, "production-ready");
  assert.equal(
    domainMap.publicPersonIdentityAndRead.newCodePolicy,
    "may-use-deployed-contract",
  );
  assert.match(domainMap.publicPersonIdentityAndRead.currentRuntime, /route is not wired/);
  assert.equal(domainMap.experience.runtimeStatus, "production-ready");
  assert.equal(domainMap.experience.newCodePolicy, "may-use-deployed-contract");
  assert.match(domainMap.experience.currentRuntime, /Shared Core UI is not wired/);
  assert.equal(domainMap.transition.runtimeStatus, "production-ready");
  assert.equal(domainMap.transition.newCodePolicy, "may-use-deployed-contract");
  for (const key of [
    "homeSearchMatching",
    "productChannels",
    "canonicalTopic",
    "location",
    "personOnboarding",
    "dynamicNeedInterestSignals",
    "conversation",
    "service",
    "bookingPayment",
    "reputationVerification",
    "notificationAttention",
    "community",
    "recordingLifecycle",
  ]) {
    assert.notEqual(domainMap[key].runtimeStatus, "production-ready", `${key} is not deployed`);
  }
  assert.equal(domainMap.communityRecording, undefined);
  assert.equal(domainMap.community.phase, "EC-5");
  assert.equal(domainMap.recordingLifecycle.phase, "EC-4");

  const semanticBoundaries = api.PRODUCT_SEMANTIC_BOUNDARIES_V1;
  assert.equal(semanticBoundaries.channel.isPersonIdentity, false);
  assert.equal(semanticBoundaries.channel.isMatchingCoreProfile, false);
  assert.equal(semanticBoundaries.channel.questionHasOnePrimaryChannel, true);
  assert.equal(semanticBoundaries.channel.experienceRequiresOneChannel, false);
  assert.equal(semanticBoundaries.canonicalTopic.sameAsDiscoverSocialTopic, false);
  assert.equal(semanticBoundaries.transition.sameAsCanonicalTopic, false);
  assert.equal(semanticBoundaries.transition.reducibleToStringTag, false);
  assert.equal(semanticBoundaries.location.sameAsCanonicalTopic, false);
  assert.equal(semanticBoundaries.location.v1Precision, "city");

  const dynamicPerson = api.DYNAMIC_PERSON_MODEL_V1;
  assert.equal(dynamicPerson.permanentUserTypeAllowed, false);
  assert.equal(dynamicPerson.accumulatedExperience, "durable-history");
  assert.equal(dynamicPerson.currentNeed, "dynamic-decaying-signal");
  assert.equal(dynamicPerson.currentInterest, "dynamic-decaying-signal");
  for (const requirement of Object.values(dynamicPerson.onboarding)) {
    if (typeof requirement === "boolean") assert.equal(requirement, false);
  }

  const booking = api.BOOKING_PAYMENT_INVARIANTS_V1;
  assert.equal(booking.bookingRequestChargesPayment, false);
  assert.equal(booking.bookingConfirmedRequiresPaymentSuccess, true);
  assert.equal(booking.paymentTiming, "full-payment-before-exchange");
  assert.equal(
    booking.settlementTiming,
    "after-service-completion-and-finite-dispute-window",
  );
  assert.deepEqual(booking.independentFacts, [
    "payment", "service-completion", "settlement", "rating",
  ]);

  const rpcPolicy = api.PRODUCT_BLUEPRINT_V1_RPC_POLICY;
  assert.equal(rpcPolicy.get_public_person_profile_v1.newBlueprintCodeMayDepend, true);
  for (const name of [
    "create_question_v1", "update_question_v1", "close_question_v1",
    "get_question_detail_v1", "list_questions_v1", "create_answer_v1",
    "delete_answer_v1", "list_question_answers_v1", "set_answer_helpful_v1",
    "create_answer_reply_v1", "delete_answer_reply_v1", "list_answer_replies_v1",
  ]) {
    assert.equal(rpcPolicy[name].use, "canonical-blueprint", name);
    assert.equal(rpcPolicy[name].newBlueprintCodeMayDepend, true, name);
    assert.match(rpcPolicy[name].replacement, /Production deployed|public safe|deterministic public|viewer-scoped/, name);
  }
  for (const name of [
    "create_experience_claim_v1",
    "update_experience_claim_v1",
    "delete_experience_claim_v1",
  ]) {
    assert.equal(rpcPolicy[name].use, "canonical-blueprint", name);
    assert.equal(rpcPolicy[name].newBlueprintCodeMayDepend, false, name);
    assert.match(rpcPolicy[name].replacement, /Verification\/Claim workflow/, name);
  }
  for (const name of [
    "accept_answer_v2",
    "accept_answer_and_transfer_points",
    "create_question_secure",
    "create_answer_secure",
    "search_app_content_v2",
    "get_search_suggestions_v2",
    "get_channel_feed",
    "get_nearby_experts",
    "send_direct_message",
    "create_consultation_order",
    "recharge_points",
  ]) {
    assert.equal(rpcPolicy[name].use, "legacy-compatibility", name);
    assert.equal(rpcPolicy[name].newBlueprintCodeMayDepend, false, name);
  }

  assert.deepEqual(api.LEGACY_CONTRACT_DEPENDENCY_POLICY, {
    expertIdentity: false,
    skillOfferAsService: false,
    acceptedAnswer: false,
    questionRewardPoints: false,
    pointServiceTransaction: false,
    genericVerification: false,
  });

  const pageMap = pages.PAGE_CONTRACT_MAP;
  const page = (pageId) => {
    const result = pageMap.find((entry) => entry.pageId === pageId);
    assert.ok(result, `Missing page ${pageId}`);
    return result;
  };

  assert.deepEqual(page("search").readContracts, ["capability:home-search-v1"]);
  assert.ok(page("search").currentReadContracts.includes("rpc:search_app_content_v2"));
  const ask = page("ask");
  const detail = page("question-detail");
  assert.equal(ask.implementationStatus, "canonical");
  assert.deepEqual(ask.currentReadContracts, [
    "storage:canonical-question-draft-v2", "contract:auth-viewer-state",
    "contract:product-channel-catalog",
  ]);
  assert.deepEqual(ask.currentWriteContracts, ["rpc:create_question_v1"]);
  assert.match(read("src/components/question/questionForm.ts"), /canonical-question-draft-v2/);
  assert.equal(detail.implementationStatus, "canonical");
  assert.deepEqual(detail.currentReadContracts, [
    "rpc:get_question_detail_v1", "rpc:list_question_answers_v1", "rpc:list_answer_replies_v1",
  ]);
  assert.deepEqual(detail.currentWriteContracts, [
    "rpc:create_answer_v1", "rpc:delete_answer_v1", "rpc:set_answer_helpful_v1",
    "rpc:create_answer_reply_v1", "rpc:delete_answer_reply_v1", "rpc:close_question_v1",
    "rpc:submit_content_report",
  ]);
  assert.ok(detail.writeContracts.includes("capability:answer-helpful-v1"));
  assert.ok(!detail.writeContracts.includes("capability:ask-person-v1"), "Person navigation is not an EC-4 write action");
  for (const entry of [ask, detail]) {
    for (const forbidden of ["rpc:create_question_secure", "rpc:create_answer_secure", "rpc:accept_answer_v2", "rpc:update_question_v1"]) {
      assert.ok(![...entry.currentReadContracts, ...entry.currentWriteContracts, ...entry.writeContracts].includes(forbidden), `${entry.pageId}: ${forbidden}`);
    }
    const notes = entry.notes.join("\n");
    assert.match(notes, /Shared Core implementation \(including iOS React\)/);
    assert.match(notes, /iOS keyboard QA is BLOCKED BY ENVIRONMENT/);
    assert.match(notes, /Android native verification is PENDING/);
    assert.match(notes, /WeChat canonical flow is NOT IMPLEMENTED/);
    assert.doesNotMatch(notes, /UI remains legacy|UI 仍是 legacy|尚未接线/);
  }
  assert.match(ask.notes.join("\n"), /topicIds=\[\]/);
  assert.match(ask.notes.join("\n"), /successful real create_question_v1.*\/question\/:questionId/);
  assert.match(detail.notes.join("\n"), /问问TA only navigates to \/person\/:authorPersonId/);
  assert.match(detail.notes.join("\n"), /no Conversation, Chat, Booking, Service or Payment action/);
  for (const pageId of ["home", "search", "channel"]) {
    assert.equal(page(pageId).implementationStatus, "legacy", pageId);
    assert.ok(!page(pageId).currentReadContracts.includes("rpc:list_questions_v1"), `${pageId} discovery not cut over`);
  }
  assert.equal(page("skill-publish").implementationStatus, "legacy");
  assert.deepEqual(page("skill-publish").writeContracts, [
    "capability:person-service-settings-v1",
  ]);
  assert.ok(page("skill-publish").currentWriteContracts.includes("table:skill_offers"));
  assert.equal(page("public-person").implementationStatus, "blocked");
  assert.deepEqual(page("public-person").currentReadContracts, []);

  const targetContracts = pageMap.flatMap((entry) => [
    ...entry.readContracts,
    ...entry.writeContracts,
  ]);
  for (const forbidden of [
    "rpc:accept_answer_v2",
    "rpc:search_app_content_v2",
    "table:experts",
    "table:skill_offers",
    "table:point_accounts",
    "table:point_transactions",
  ]) {
    assert.equal(targetContracts.includes(forbidden), false, forbidden);
  }

  const legacyContracts = read("packages/shared-types/src/contracts.ts");
  for (const marker of [
    "Legacy runtime compatibility only",
    "Legacy optional extension",
    "Legacy SKU storage",
    "Legacy points compatibility only",
  ]) {
    assert.ok(legacyContracts.includes(marker), `Missing legacy marker: ${marker}`);
  }

  const decision = read("docs/product-blueprint-v1-contract-decision.md");
  const matrix = read("docs/product-blueprint-v1-legacy-canonical-matrix.md");
  for (const statement of [
    "profiles.phone",
    "REMAINS",
    "Experience",
    "Verification",
    "Service",
    "Home Search",
    "Canonical Topic",
    "Dynamic Person",
    "Booking Request 阶段不收费",
    "Payment Fact、Service Completion Fact、Settlement Fact、Rating Fact",
    "EC-1",
    "EC-5",
  ]) {
    assert.ok(decision.includes(statement), `Decision missing ${statement}`);
  }
  assert.match(matrix, /Can new code depend on it\?/);
  assert.match(matrix, /accept_answer_v2[\s\S]*?NO/);
  assert.match(matrix, /search_app_content_v2[\s\S]*?NO/);

  const packageJson = JSON.parse(read("package.json"));
  assert.equal(
    packageJson.scripts["test:product-blueprint-v1"],
    "node scripts/product-blueprint-v1-contract-check.mjs",
  );
  assert.match(
    packageJson.scripts["test:contracts"],
    /product-blueprint-v1-contract-check\.mjs/,
  );
  assert.match(packageJson.scripts["test:contracts"], /p1-4d-demo-fixture-isolation-check\.mjs/);
  assert.match(packageJson.scripts["test:contracts"], /p1-4c-production-writes-check\.mjs/);
  assert.match(packageJson.scripts["test:contracts"], /question-answer-v1-contract-check\.mjs/);

  console.log("Product Blueprint v1 contract truth guards passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
