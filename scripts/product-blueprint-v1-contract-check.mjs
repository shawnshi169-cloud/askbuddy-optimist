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
  const publicPersonSource = read("packages/shared-types/src/public-person.ts");
  assert.match(publicPersonSource, /type PublicPersonId = Id/);
  assert.match(sharedSource, /authorId: PublicPersonId/);
  assert.match(sharedSource, /personId: PublicPersonId/);
  assert.doesNotMatch(sharedSource, /expertId|profilesId|profileId/);

  const interfaceBlock = (name) => {
    const start = sharedSource.indexOf(`export interface ${name}`);
    assert.ok(start >= 0, `Missing interface ${name}`);
    const end = sharedSource.indexOf("\n}", start);
    assert.ok(end > start, `Unterminated interface ${name}`);
    return sharedSource.slice(start, end + 2);
  };

  const questionTarget = interfaceBlock("PublicQuestionV1Target");
  assert.match(questionTarget, /deepExchangeBudget/);
  assert.doesNotMatch(questionTarget, /accepted|reward|bounty|point/i);

  const answerTarget = interfaceBlock("PublicAnswerV1Target");
  assert.match(answerTarget, /helpfulCount/);
  assert.doesNotMatch(answerTarget, /accepted|serviceRating|helpedUser/i);

  const replyTarget = interfaceBlock("AnswerReplyV1Target");
  assert.match(replyTarget, /replyToPersonId/);
  assert.doesNotMatch(replyTarget, /parentReplyId/);

  const serviceTarget = interfaceBlock("PersonServiceSettingsV1Target");
  const transactionMoneyTarget = interfaceBlock("ServiceTransactionMoneyV1Target");
  assert.match(serviceTarget, /personId: PublicPersonId/);
  assert.match(serviceTarget, /basePrice: CnyAmount/);
  assert.match(transactionMoneyTarget, /feePolicyKey/);
  assert.doesNotMatch(serviceTarget, /Point|points|expertId|commissionRate|15%/);

  const domainMap = api.PRODUCT_BLUEPRINT_V1_DOMAIN_MAP;
  assert.equal(domainMap.person.runtimeStatus, "production-ready");
  assert.equal(domainMap.person.newCodePolicy, "may-use-deployed-contract");
  for (const key of [
    "experience",
    "questionAnswerReply",
    "homeSearchMatching",
    "conversation",
    "service",
    "bookingPayment",
    "reputationVerification",
    "notificationAttention",
    "communityRecording",
  ]) {
    assert.notEqual(domainMap[key].runtimeStatus, "production-ready", `${key} is not deployed`);
  }

  const rpcPolicy = api.PRODUCT_BLUEPRINT_V1_RPC_POLICY;
  assert.equal(rpcPolicy.get_public_person_profile_v1.newBlueprintCodeMayDepend, true);
  for (const name of [
    "accept_answer_v2",
    "accept_answer_and_transfer_points",
    "create_question_secure",
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
  assert.ok(page("question-detail").writeContracts.includes("capability:answer-helpful-v1"));
  assert.ok(!page("question-detail").writeContracts.includes("rpc:accept_answer_v2"));
  assert.ok(page("question-detail").currentWriteContracts.includes("rpc:accept_answer_v2"));
  assert.equal(page("skill-publish").implementationStatus, "legacy");
  assert.deepEqual(page("skill-publish").writeContracts, [
    "capability:person-service-settings-v1",
  ]);
  assert.ok(page("skill-publish").currentWriteContracts.includes("table:skill_offers"));

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

  console.log("Product Blueprint v1 contract truth guards passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
