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
const tempRoot = mkdtempSync(join(tmpdir(), "askbuddy-contract-truth-"));
const require = createRequire(import.meta.url);

const sourceFiles = [
  "packages/shared-types/src/contracts.ts",
  "packages/shared-api/src/moderation.ts",
  "packages/shared-api/src/notification.ts",
  "packages/shared-api/src/search-v2.ts",
  "packages/shared-api/src/rpc-catalog.ts",
  "packages/shared-api/src/rpc-whitelist.ts",
  "packages/shared-api/src/page-contract-map.ts",
  "packages/shared-api/src/capabilities.ts",
];

const transpile = (relativePath) => {
  const sourcePath = join(root, relativePath);
  const outputPath = join(tempRoot, relativePath.replace(/\.ts$/, ".js"));
  const output = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
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

  const sharedTypes = require(join(tempRoot, "packages/shared-types/src/contracts.js"));
  const moderation = require(join(tempRoot, "packages/shared-api/src/moderation.js"));
  const notifications = require(join(tempRoot, "packages/shared-api/src/notification.js"));
  const search = require(join(tempRoot, "packages/shared-api/src/search-v2.js"));
  const rpcCatalog = require(join(tempRoot, "packages/shared-api/src/rpc-catalog.js"));
  const rpcWhitelist = require(join(tempRoot, "packages/shared-api/src/rpc-whitelist.js"));
  const pageMap = require(join(tempRoot, "packages/shared-api/src/page-contract-map.js"));
  const capabilities = require(join(tempRoot, "packages/shared-api/src/capabilities.js"));

  assert.deepEqual(sharedTypes.QUESTION_STATUS, [
    "open", "pending_payment", "paid", "closed", "solved",
  ]);
  assert.equal(sharedTypes.QUESTION_DRAFT_STORAGE, "question_drafts");
  assert.equal(sharedTypes.QUESTION_VISIBILITY_FIELD, "is_hidden");
  for (const invalidStatus of ["draft", "matched", "hidden"]) {
    assert.equal(sharedTypes.QUESTION_STATUS.includes(invalidStatus), false);
  }

  assert.deepEqual(sharedTypes.MODERATION_TARGET_TYPE, [
    "question", "answer", "post", "skill_offer", "expert", "message",
    "user_verifications",
  ]);
  assert.deepEqual(sharedTypes.MODERATION_REPORT_STATUS, [
    "pending", "in_review", "resolved", "rejected",
  ]);
  assert.equal(moderation.normalizeModerationTargetType("discussion"), "post");
  assert.equal(moderation.normalizeModerationTargetType("profile"), "expert");
  assert.equal(
    moderation.normalizeModerationTargetType("user_verification"),
    "user_verifications",
  );
  assert.equal(moderation.normalizeModerationTargetType("unknown"), null);
  assert.equal(moderation.normalizeModerationReportStatus("reviewing"), "in_review");

  const notificationBase = {
    id: "notification-id",
    user_id: "user-id",
    type: "system",
    title: "Title",
    sender_id: null,
    is_read: null,
    created_at: null,
    updated_at: "2026-08-21T00:00:00Z",
  };
  const canonicalNotification = notifications.normalizeNotification({
    ...notificationBase,
    body: "canonical body",
    target_type: "question",
    target_id: "canonical-target",
    content: "legacy body",
    related_type: "post",
    related_id: "legacy-target",
  });
  assert.equal(canonicalNotification.body, "canonical body");
  assert.equal(canonicalNotification.targetType, "question");
  assert.equal(canonicalNotification.targetId, "canonical-target");
  assert.equal(canonicalNotification.isRead, false);

  const legacyNotification = notifications.normalizeNotification({
    ...notificationBase,
    body: null,
    target_type: null,
    target_id: null,
    content: "legacy body",
    related_type: "post",
    related_id: "legacy-target",
  });
  assert.equal(legacyNotification.body, "legacy body");
  assert.equal(legacyNotification.targetType, "post");
  assert.equal(legacyNotification.targetId, "legacy-target");

  const moderationNotification = notifications.normalizeNotification({
    ...notificationBase,
    body: "Verification reviewed",
    target_type: "user_verifications",
    target_id: "verification-target",
    content: null,
    related_type: null,
    related_id: null,
  });
  assert.equal(moderationNotification.targetType, "user_verifications");

  const searchPayload = {
    questions: [{
      id: "q1", title: "Question", content: null, bounty_points: 10,
      view_count: 2, created_at: "2026-08-21T00:00:00Z", author_id: "u1",
      profile_nickname: "User", profile_avatar: null, answers_count: 1,
      category: null, tags: ["tag"],
    }],
    experts: [{
      id: "e1", user_id: "u2", nickname: "Expert", avatar_url: null,
      headline: null, intro: null, verification_status: "verified",
      follower_count: 3, service_count: 4,
    }],
    skills: [{
      id: "s1", expert_id: "u2", title: "Skill", description: null,
      pricing_mode: "per_session", price_amount: 20, price_currency: "CNY",
      city: null, city_code: null, is_remote_supported: true,
      delivery_mode: "online", created_at: "2026-08-21T00:00:00Z",
      category_name: null, expert_nickname: "Expert", expert_avatar: null,
    }],
    posts: [{
      id: "p1", author_id: "u3", content: "Post", city: null,
      city_code: null, created_at: "2026-08-21T00:00:00Z", like_count: 1,
      favorite_count: 2, comment_count: 3, author_nickname: "Author",
      author_avatar: null,
    }],
  };
  const parsedSearch = search.parseSearchAppContentV2Result(searchPayload);
  assert.deepEqual(
    [
      parsedSearch.questions[0].kind,
      parsedSearch.experts[0].kind,
      parsedSearch.skills[0].kind,
      parsedSearch.posts[0].kind,
    ],
    ["question", "expert", "skill", "post"],
  );
  assert.deepEqual(parsedSearch.questions[0].navigationTarget, {
    kind: "question",
    id: "q1",
  });
  assert.throws(
    () => search.parseSearchAppContentV2Result({ ...searchPayload, posts: [{}] }),
    TypeError,
  );

  const searchContractText = readFileSync(
    join(root, "packages/shared-api/src/search-v2.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    searchContractText,
    /\b(?:questions|experts|skills|posts):\s*(?:unknown|any)\[\]/,
  );

  const catalog = rpcCatalog.RPC_CATALOG;
  assert.equal(catalog.accept_answer_v2.status, "canonical");
  assert.equal(catalog.accept_answer_and_transfer_points.status, "deprecated");
  assert.equal(catalog.recharge_points.status, "deprecated");
  assert.equal(catalog.search_app_content.status, "deprecated");
  assert.equal(catalog.create_consultation_order.status, "blocked");
  assert.equal(catalog.create_recharge_payment_order.status, "blocked");
  assert.equal(catalog.claim_wechat_identity_v1.authentication, "service_role");
  assert.equal(catalog.create_system_notification_v2.authentication, "service_role");
  assert.equal(catalog.transition_order_status_v2.authentication, "service_role");

  const catalogNames = Object.values(catalog).map((entry) => entry.name);
  assert.equal(new Set(catalogNames).size, catalogNames.length);
  for (const name of Object.keys(rpcWhitelist.CLIENT_RPC_WHITELIST)) {
    assert.equal(catalog[name].status, "canonical", `${name} is not canonical`);
    assert.notEqual(catalog[name].authentication, "service_role");
  }
  for (const name of Object.keys(rpcWhitelist.SERVER_RPC_WHITELIST)) {
    assert.equal(catalog[name].status, "canonical", `${name} is not canonical`);
    assert.equal(catalog[name].authentication, "service_role");
  }

  assert.equal(capabilities.PAYMENT_CAPABILITIES.wechatPrepay.availability, "mock");
  assert.equal(capabilities.PAYMENT_CAPABILITIES.wechatPrepay.productionReady, false);
  assert.equal(capabilities.CONSULTATION_CAPABILITY.availability, "unavailable");
  assert.equal(capabilities.SKILL_OFFER_CAPABILITY.storage.availability, "real");
  assert.equal(
    capabilities.SKILL_OFFER_CAPABILITY.publishAction.availability,
    "unavailable",
  );

  const requiredPages = [
    "home", "search", "ask", "discover", "messages", "profile",
    "question-detail", "channel", "topic-detail", "expert-detail",
    "skill-publish", "chat-detail", "post-editor", "call",
  ];
  assert.deepEqual(
    pageMap.PAGE_CONTRACT_MAP.map((entry) => entry.pageId),
    requiredPages,
  );
  const questionDetail = pageMap.PAGE_CONTRACT_MAP.find(
    (entry) => entry.pageId === "question-detail",
  );
  assert.ok(questionDetail.writeContracts.includes("rpc:accept_answer_v2"));
  assert.ok(
    questionDetail.currentWriteContracts.includes("rpc:accept_answer_and_transfer_points"),
  );
  assert.equal(
    pageMap.PAGE_CONTRACT_MAP.find((entry) => entry.pageId === "skill-publish")
      .implementationStatus,
    "blocked",
  );

  const migrations = readFileSync(
    join(root, "supabase/migrations/20260418014000_pack_07_patch_preflight_safety.sql"),
    "utf8",
  );
  for (const value of sharedTypes.MODERATION_TARGET_TYPE) {
    assert.ok(migrations.includes(`'${value}'`), `Pack07 migration missing ${value}`);
  }
  for (const value of sharedTypes.MODERATION_REPORT_STATUS) {
    assert.ok(migrations.includes(`'${value}'`), `Pack07 migration missing ${value}`);
  }

  console.log("P1.4a contract truth checks passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
