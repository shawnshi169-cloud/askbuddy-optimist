import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const sources = [
  "packages/shared-types/src/product-channels.ts",
  "packages/shared-types/src/question-answer-v1.ts",
  "packages/shared-api/src/question-answer-v1.ts",
  "packages/shared-api/src/rpc-catalog.ts",
  "packages/shared-api/src/rpc-whitelist.ts",
  "packages/shared-api/src/page-contract-map.ts",
];
// Generated CommonJS harness stays under node_modules so the existing Zod resolves.
const temp = mkdtempSync(join(root, "node_modules/.ec2-contract-"));
const require = createRequire(import.meta.url);
let assertions = 0;
const check = (name, run) => {
  try { run(); assertions += 1; } catch (error) {
    throw new Error(`EC-2 contract: ${name}`, { cause: error });
  }
};
const rejected = (run) => assert.throws(run, /Invalid EC-2/);

try {
  const program = ts.createProgram(sources.map((path) => join(root, path)), {
    strict: true, noEmit: true, skipLibCheck: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (path) => path, getCurrentDirectory: () => root, getNewLine: () => "\n",
  }));
  writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "commonjs" }));
  for (const source of sources) {
    const out = join(temp, source.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, ts.transpileModule(read(source), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText);
  }
  const api = require(join(temp, "packages/shared-api/src/question-answer-v1.js"));
  const { PAGE_CONTRACT_MAP: pages } = require(join(temp, "packages/shared-api/src/page-contract-map.js"));
  const types = require(join(temp, "packages/shared-types/src/question-answer-v1.js"));
  const { PRODUCT_CHANNEL_SLUGS: channels } = require(join(temp, "packages/shared-types/src/product-channels.js"));
  const rpc = api.QUESTION_ANSWER_V1_RPCS;
  const { RPC_CATALOG } = require(join(temp, "packages/shared-api/src/rpc-catalog.js"));
  const { CLIENT_RPC_WHITELIST } = require(join(temp, "packages/shared-api/src/rpc-whitelist.js"));
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const person = { userId: id(1), displayName: null, avatarUrl: null };
  const question = {
    questionId: id(2), requesterPersonId: id(1), title: "真实问题", context: "真实背景",
    primaryChannel: "education-learning", topicIds: [], deepExchangeBudgetMaxCents: null,
    status: "open", createdAt: "2026-09-05T00:00:00Z", updatedAt: "2026-09-05T00:00:00Z",
  };
  const detail = { ...question, requester: person, answerCount: 1 };
  const answer = {
    answerId: id(3), questionId: id(2), authorPersonId: id(1), author: person, body: "真实回答",
    helpfulCount: 0, viewerHasMarkedHelpful: false, replyCount: 1,
    createdAt: question.createdAt, updatedAt: question.updatedAt,
  };
  const reply = {
    replyId: id(4), answerId: id(3), authorPersonId: id(1), author: person, body: "真实回复",
    createdAt: question.createdAt, updatedAt: question.updatedAt,
  };
  const create = {
    p_title: question.title, p_context: question.context, p_primary_channel: question.primaryChannel,
    p_topic_ids: [], p_deep_exchange_budget_max_cents: null,
  };
  const questionParams = { p_question_id: id(2) };
  const answerParams = { p_answer_id: id(3) };
  const replyParams = { p_reply_id: id(4) };
  const questionsPage = { p_primary_channel: null, p_status: null, p_limit: 10, p_offset: 0 };
  const answersPage = { ...questionParams, p_order: "comprehensive", p_limit: 10, p_offset: 0 };
  const repliesPage = { ...answerParams, p_limit: 10, p_offset: 0 };
  const cases = {
    create_question_v1: ["text,text,text,uuid[],bigint", create, { questionId: id(2) }],
    update_question_v1: ["uuid,text,text,text,uuid[],bigint", { ...questionParams, ...create }, { questionId: id(2) }],
    close_question_v1: ["uuid", questionParams, { questionId: id(2), status: "closed" }],
    get_question_detail_v1: ["uuid", questionParams, { question: detail }],
    list_questions_v1: ["text,text,integer,integer", questionsPage, { questions: [detail], nextOffset: null }],
    create_answer_v1: ["uuid,text", { ...questionParams, p_body: answer.body }, { answerId: id(3) }],
    delete_answer_v1: ["uuid", answerParams, { answerId: id(3) }],
    list_question_answers_v1: ["uuid,text,integer,integer", answersPage, { answers: [answer], nextOffset: null }],
    set_answer_helpful_v1: ["uuid,boolean", { ...answerParams, p_is_helpful: true }, { answerId: id(3), helpfulCount: 1, viewerHasMarkedHelpful: true }],
    create_answer_reply_v1: ["uuid,text", { ...answerParams, p_body: reply.body }, { replyId: id(4) }],
    delete_answer_reply_v1: ["uuid", replyParams, { replyId: id(4) }],
    list_answer_replies_v1: ["uuid,integer,integer", repliesPage, { replies: [reply], nextOffset: null }],
  };
  check("exact deployed consumer capabilities", () => assert.deepEqual(Object.keys(rpc).sort(), Object.keys(cases).sort()));
  const generatedTypes = read("src/integrations/supabase/types.ts");
  for (const [name, [signature, input, output]] of Object.entries(cases)) {
    check(`${name}: aligned exact signature and valid round trip`, () => {
      assert.equal(rpc[name].signature, `public.${name}(${signature})`);
      assert.equal(rpc[name].authentication, /^(get|list)_/.test(name) ? "anon" : "authenticated");
      assert.equal(rpc[name].runtimeStatus, "production-ready");
      assert.equal(rpc[name].use, "canonical-blueprint");
      assert.equal(rpc[name].authenticationMeaning, "minimum-access-requirement");
      assert.equal(rpc[name].preserveCallerIdentity, true);
      assert.equal(rpc[name].productionDeployed, true);
      assert.equal(rpc[name].productionGrantReview, "aligned");
      assert.equal(rpc[name].clientConsumable, true);
      assert.equal(rpc[name].newBlueprintCodeMayDepend, true);
      assert.equal(rpc[name].securityMode, "invoker");
      assert.equal(rpc[name].searchPath, "");
      assert.deepEqual(rpc[name].parseParams(input), input);
      assert.deepEqual(rpc[name].parseResult(output, input), output);
      assert.equal(RPC_CATALOG[name].status, "canonical");
      assert.equal(RPC_CATALOG[name].authentication, /^(get|list)_/.test(name) ? "anon" : "authenticated");
      assert.equal(RPC_CATALOG[name].productionGrantReview, "aligned");
      assert.equal(CLIENT_RPC_WHITELIST[name], `public.${name}`);
      assert.match(generatedTypes, new RegExp(`\\b${name}\\s*:`));
    });
    check(`${name}: rejects missing and unknown fields, no fallback`, () => {
      for (const field of Object.keys(input)) {
        const partial = { ...input }; delete partial[field];
        rejected(() => rpc[name].parseParams(partial));
      }
      for (const field of Object.keys(output)) {
        const partial = { ...output }; delete partial[field];
        rejected(() => rpc[name].parseResult(partial, input));
      }
      for (const field of ["p_person_id", "p_author_person_id", "p_requester_person_id", "p_expert_id", "p_moderation_visibility", "p_status", "p_price"]) {
        if (!(field in input)) rejected(() => rpc[name].parseParams({ ...input, [field]: id(99) }));
      }
      for (const field of ["phone", "claims", "payment", "accepted", "rawMetadata"]) {
        rejected(() => rpc[name].parseResult({ ...output, [field]: "must not leak" }, input));
      }
      for (const bad of [undefined, null, [], "", { error: "not found" }]) {
        rejected(() => rpc[name].parseResult(bad, input));
      }
    });
  }
  check("deployed registry keeps only a deprecated proposal-name alias", () => {
    assert.equal(api.PROPOSED_QUESTION_ANSWER_V1_RPCS, rpc);
    assert.equal(Object.keys(rpc).length, 12);
  });
  const dtoCases = [
    [api.parseCanonicalQuestionV1, question], [api.parseCanonicalQuestionDetailV1, detail],
    [api.parseCanonicalAnswerV1, answer], [api.parseCanonicalAnswerReplyV1, reply],
  ];
  for (const [parse, row] of dtoCases) {
    check(`safe DTO ${Object.keys(row)[0]}`, () => {
      assert.deepEqual(parse(row), row);
      for (const key of Object.keys(row)) {
        const partial = { ...row }; delete partial[key]; rejected(() => parse(partial));
      }
      for (const key of ["phone", "email", "claims", "claimId", "expertId", "profileId", "is_verified", "deletedAt", "moderationVisibility", "accepted", "bestAnswerId", "is_accepted", "reward_points", "price", "payment", "relevantExperience", "parentReplyId", "children", "helped_user_count"]) {
        rejected(() => parse({ ...row, [key]: "untrusted" }));
      }
      for (const key of Object.keys(row).filter((key) => /Id$/.test(key))) {
        rejected(() => parse({ ...row, [key]: "not-a-person-or-entity-uuid" }));
      }
      rejected(() => parse({ ...row, createdAt: "yesterday" }));
      const summaryKey = "author" in row ? "author" : "requester" in row ? "requester" : null;
      if (summaryKey) {
        assert.equal(parse({ ...row, [summaryKey]: null })[summaryKey], null);
        rejected(() => parse({ ...row, [summaryKey]: { ...person, userId: id(99) } }));
        rejected(() => parse({ ...row, [summaryKey]: { ...person, phone: "private" } }));
        rejected(() => parse({ ...row, [summaryKey]: { userId: id(1) } }));
      }
    });
  }
  check("budget: null or positive lossless integer cents, no invented product cap", () => {
    for (const value of [null, 1, 6900, 10000, 999999999999, Number.MAX_SAFE_INTEGER]) {
      assert.equal(api.parseCanonicalQuestionV1({ ...question, deepExchangeBudgetMaxCents: value }).deepExchangeBudgetMaxCents, value);
      assert.equal(rpc.create_question_v1.parseParams({ ...create, p_deep_exchange_budget_max_cents: value }).p_deep_exchange_budget_max_cents, value);
    }
    for (const value of [0, -1, 0.01, 69.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "6900", undefined]) {
      rejected(() => api.parseCanonicalQuestionV1({ ...question, deepExchangeBudgetMaxCents: value }));
      rejected(() => rpc.create_question_v1.parseParams({ ...create, p_deep_exchange_budget_max_cents: value }));
    }
  });
  check("required Question + Context and meaningful Answer/Reply body", () => {
    for (const value of ["", " \n\t", null, 3]) {
      for (const key of ["title", "context"]) rejected(() => api.parseCanonicalQuestionV1({ ...question, [key]: value }));
      for (const key of ["p_title", "p_context"]) rejected(() => rpc.create_question_v1.parseParams({ ...create, [key]: value }));
      rejected(() => api.parseCanonicalAnswerV1({ ...answer, body: value }));
      rejected(() => api.parseCanonicalAnswerReplyV1({ ...reply, body: value }));
    }
  });
  check("Channel reuse and Topic capability closed until canonical resolver", () => {
    assert.deepEqual(channels, ["education-learning", "career-development", "lifestyle-services", "hobbies-skills"]);
    for (const value of channels) assert.equal(api.parseCanonicalQuestionV1({ ...question, primaryChannel: value }).primaryChannel, value);
    for (const value of ["education", "work", "skill", null, []]) rejected(() => rpc.create_question_v1.parseParams({ ...create, p_primary_channel: value }));
    for (const value of [[id(8)], ["#topic"], ["career-development"], null, "topic"]) {
      rejected(() => api.parseCanonicalQuestionV1({ ...question, topicIds: value }));
      rejected(() => rpc.create_question_v1.parseParams({ ...create, p_topic_ids: value }));
      rejected(() => rpc.update_question_v1.parseParams({ ...create, ...questionParams, p_topic_ids: value }));
    }
  });
  check("business lifecycle cannot accept legacy or moderation state", () => {
    assert.deepEqual(types.QUESTION_BUSINESS_STATUS_V1, ["open", "closed"]);
    for (const status of ["open", "closed"]) assert.equal(api.parseCanonicalQuestionV1({ ...question, status }).status, status);
    for (const status of ["accepted", "solved", "paid", "hidden", "moderated-hidden"]) rejected(() => api.parseCanonicalQuestionV1({ ...question, status }));
    rejected(() => rpc.close_question_v1.parseResult({ questionId: id(2), status: "open" }, questionParams));
    assert.equal(rpc.reopen_question_v1, undefined);
  });
  check("counts are real nonnegative integers and Reply has no Helpful", () => {
    for (const value of [-1, 0.5, "100", NaN]) {
      rejected(() => api.parseCanonicalAnswerV1({ ...answer, helpfulCount: value }));
      rejected(() => api.parseCanonicalAnswerV1({ ...answer, replyCount: value }));
      rejected(() => api.parseCanonicalQuestionDetailV1({ ...detail, answerCount: value }));
    }
    rejected(() => api.parseCanonicalAnswerReplyV1({ ...reply, helpfulCount: 1 }));
    rejected(() => api.parseCanonicalAnswerReplyV1({ ...reply, likeCount: 1 }));
  });
  check("explicit idempotent Helpful desired state", () => {
    const parser = rpc.set_answer_helpful_v1;
    for (const value of [true, false]) assert.equal(parser.parseResult({ answerId: id(3), helpfulCount: 0, viewerHasMarkedHelpful: value }, { ...answerParams, p_is_helpful: value }).viewerHasMarkedHelpful, value);
    rejected(() => parser.parseParams({ ...answerParams, p_is_helpful: "toggle" }));
    rejected(() => parser.parseResult({ answerId: id(3), helpfulCount: 1, viewerHasMarkedHelpful: false }, { ...answerParams, p_is_helpful: true }));
  });
  check("response must match requested identity", () => {
    for (const name of ["update_question_v1", "close_question_v1", "delete_answer_v1", "delete_answer_reply_v1", "set_answer_helpful_v1"]) {
      const [, input, output] = cases[name];
      const key = Object.keys(output).find((key) => /Id$/.test(key));
      rejected(() => rpc[name].parseResult({ ...output, [key]: id(99) }, input));
    }
    rejected(() => rpc.get_question_detail_v1.parseResult({ question: { ...detail, questionId: id(99) } }, questionParams));
    assert.equal(rpc.get_question_detail_v1.parseResult({ question: null }, questionParams).question, null);
  });
  for (const [name, key, row, params, parent] of [
    ["list_questions_v1", "questions", detail, questionsPage, null],
    ["list_question_answers_v1", "answers", answer, answersPage, "questionId"],
    ["list_answer_replies_v1", "replies", reply, repliesPage, "answerId"],
  ]) {
    check(`${name}: bounded pagination and relation checks`, () => {
      assert.deepEqual(rpc[name].parseResult({ [key]: [], nextOffset: null }, params), { [key]: [], nextOffset: null });
      assert.equal(rpc[name].parseResult({ [key]: [row], nextOffset: 1 }, params).nextOffset, 1);
      rejected(() => rpc[name].parseResult({ [key]: [], nextOffset: 1 }, params));
      rejected(() => rpc[name].parseResult({ [key]: [row], nextOffset: 100 }, params));
      rejected(() => rpc[name].parseResult({ [key]: [row, row], nextOffset: null }, params));
      rejected(() => rpc[name].parseResult({ [key]: [row], nextOffset: null }, { ...params, p_limit: 0 }));
      for (const value of [-1, 0, 101, 1.5]) rejected(() => rpc[name].parseParams({ ...params, p_limit: value }));
      if (parent) rejected(() => rpc[name].parseResult({ [key]: [{ ...row, [parent]: id(99) }], nextOffset: null }, params));
    });
  }
  check("question filters and answer sort parameter", () => {
    rejected(() => rpc.list_questions_v1.parseResult({ questions: [detail], nextOffset: null }, { ...questionsPage, p_status: "closed" }));
    rejected(() => rpc.list_questions_v1.parseResult({ questions: [detail], nextOffset: null }, { ...questionsPage, p_primary_channel: "hobbies-skills" }));
    assert.deepEqual(types.ANSWER_ORDER_V1, ["comprehensive", "latest"]);
    for (const order of types.ANSWER_ORDER_V1) assert.equal(rpc.list_question_answers_v1.parseParams({ ...answersPage, p_order: order }).p_order, order);
    for (const order of ["accepted", "budget", "expert_score"]) rejected(() => rpc.list_question_answers_v1.parseParams({ ...answersPage, p_order: order }));
  });
  check("locked product boundaries, not database smoke", () => {
    assert.equal(types.QUESTION_BUDGET_CURRENCY_V1, "CNY");
    assert.deepEqual(api.QUESTION_ANSWER_V1_INVARIANTS, {
      personIdentity: "auth.users.id = profiles.user_id", actorSource: "auth.uid()",
      questionRequiresContext: true, businessStatusSeparateFromModeration: true,
      closedAllowsNewAnswerOrReply: false, publicAnswerIsFree: true,
      closeIsIdempotent: true, deletedOrHiddenAnswerHidesEntireBranch: true,
      retainDeletedAnswerAndReplyStorage: true, publicTombstoneCard: false,
      ordering: {
        questionList: ["createdAt DESC", "questionId ASC"],
        comprehensiveAnswers: ["helpfulCount DESC", "createdAt DESC", "answerId ASC"],
        latestAnswers: ["createdAt DESC", "answerId ASC"],
        replies: ["createdAt ASC", "replyId ASC"],
      },
      budgetField: "deepExchangeBudgetMaxCents", budgetCurrency: "CNY", budgetUnit: "cents",
      budgetValidation: "null-or-positive-safe-integer", budgetIsConsumable: false,
      budgetAffectsAnswerRanking: false, legacyBountyMigration: "forbidden", legacyAcceptanceMigration: "forbidden",
      selfHelpfulAllowed: false, helpfulCreatesReputation: false, replyParent: "answer-only",
      helpfulMaxPerPersonAnswer: 1, helpfulCountSource: "real-helpful-facts", helpfulAddRemoveIdempotent: true,
      replyHasHelpful: false, replyCreatesConversation: false, relevantExperience: "omitted-until-EC-3",
    });
    const review = api.QUESTION_ANSWER_V1_PRODUCT_REVIEW;
    assert.deepEqual(Object.keys(review).sort(), ["canonicalTopic", "comprehensiveOrder", "deletedAnswerWithReplies", "questionReopen"]);
    for (const item of Object.values(review)) assert.equal(item.status, "locked");
    assert.equal(review.questionReopen.decision, "close-only");
    assert.equal(review.deletedAnswerWithReplies.decision, "hide-entire-answer-branch");
    assert.deepEqual(review.comprehensiveOrder.decision, ["helpfulCount DESC", "createdAt DESC", "answerId ASC"]);
    assert.equal(review.canonicalTopic.decision, "empty-topicIds-until-resolver");
    assert.equal(rpc.reopen_question_v1, undefined);
  });
  check("locked deterministic listing order without adding a Question order parameter", () => {
    assert.deepEqual(api.QUESTION_ANSWER_V1_ORDERING, {
      questionList: ["createdAt DESC", "questionId ASC"],
      comprehensiveAnswers: ["helpfulCount DESC", "createdAt DESC", "answerId ASC"],
      latestAnswers: ["createdAt DESC", "answerId ASC"],
      replies: ["createdAt ASC", "replyId ASC"],
    });
    assert.deepEqual(rpc.list_questions_v1.defaultOrdering, ["createdAt DESC", "questionId ASC"]);
    assert.deepEqual(rpc.list_question_answers_v1.ordering, {
      comprehensive: ["helpfulCount DESC", "createdAt DESC", "answerId ASC"],
      latest: ["createdAt DESC", "answerId ASC"],
    });
    assert.deepEqual(rpc.list_answer_replies_v1.defaultOrdering, ["createdAt ASC", "replyId ASC"]);
    rejected(() => rpc.list_questions_v1.parseParams({ ...questionsPage, p_order: "latest" }));
    assert.doesNotMatch(JSON.stringify(api.QUESTION_ANSWER_V1_ORDERING), /budget|expert|accepted|bounty|price|score|view|replyCount/i);
  });
  check("public-readable Answer list preserves caller-specific Helpful state", () => {
    const scope = api.ANSWER_HELPFUL_VIEWER_SCOPE_V1;
    assert.deepEqual(rpc.list_question_answers_v1.viewerProjection, scope);
    assert.equal(scope.field, "viewerHasMarkedHelpful");
    assert.equal(scope.scope, "viewer");
    assert.equal(scope.identitySource, "auth.uid()");
    assert.equal(scope.anonymousValue, false);
    assert.equal(scope.authenticatedValue, "caller-own-helpful-relation");
    // Parser does not invent auth: it preserves the server's viewer value, never forces an anon view.
    for (const value of [true, false]) {
      const result = rpc.list_question_answers_v1.parseResult({
        answers: [{ ...answer, viewerHasMarkedHelpful: value }], nextOffset: null,
      }, answersPage);
      assert.equal(result.answers[0].viewerHasMarkedHelpful, value);
    }
    rejected(() => rpc.list_question_answers_v1.parseParams({ ...answersPage, p_viewer_person_id: id(99) }));
  });
  check("Shared Core consumer cache governance includes viewer identity and anon scope", () => {
    assert.deepEqual(api.ANSWER_HELPFUL_VIEWER_SCOPE_V1.futureConsumerCache, {
      minimumKeyParts: ["question-answers", "questionId", "order", "viewerScope"],
      viewerScope: "viewerPersonId-or-anon", includePaginationParams: true,
      shareAcrossViewers: false, authChange: "switch-scope-without-reusing-previous-viewer-result",
    });
    const page = pages.find((entry) => entry.pageId === "question-detail");
    assert.ok(page);
    const notes = page.notes.join("\n");
    assert.match(notes, /question-answers \+ questionId \+ order \+ viewerScope/);
    assert.match(notes, /viewerPersonId \| anon/);
    assert.match(notes, /logout\/login.*不可复用上一 viewer/);
    assert.match(notes, /public-read 是最低访问要求，不强制 anonymous/);
    assert.match(notes, /authenticated 请求保留 caller identity/);
    assert.match(notes, /viewerHasMarkedHelpful.*caller 自己的关系.*anon=false/);
    assert.match(notes, /backend 已部署.*consumer smoke.*消费授权/);
    assert.match(notes, /Shared Core QuestionDetail、Answer、Helpful、Reply 和 owner close 已通过 EC-2D 接线/);
    assert.equal(page.implementationStatus, "canonical");
    assert.deepEqual(page.currentReadContracts, [
      "rpc:get_question_detail_v1", "rpc:list_question_answers_v1", "rpc:list_answer_replies_v1",
    ]);
    for (const name of ["create_answer_v1", "delete_answer_v1", "set_answer_helpful_v1", "create_answer_reply_v1", "delete_answer_reply_v1", "close_question_v1"]) {
      assert.ok(page.currentWriteContracts.includes(`rpc:${name}`));
    }
    assert.ok(!page.currentWriteContracts.includes("rpc:update_question_v1"));
  });
  check("Helpful physical relation is production-verified without changing logical invariants", () => {
    assert.deepEqual(api.ANSWER_HELPFUL_STORAGE_REVIEW_V1, {
      logicalInvariants: "locked",
      physicalCandidate: "private-owner-mark-and-anonymous-public-fact",
      physicalStatus: "production-verified", productionVerified: true,
      validationRequired: ["local-postgresql", "rls", "grants", "concurrency", "rollback-smoke"],
      alternativeRequiresArchitectureReview: true, consumerMayRedefineStorage: false,
    });
  });
  check("stable business errors map only SQLSTATE and exact message key", () => {
    const expectedErrors = [
      ["PT404", "TARGET_NOT_FOUND_OR_INACCESSIBLE"],
      ["PT409", "QUESTION_CLOSED"],
      ["PT403", "SELF_HELPFUL_FORBIDDEN"],
      ["PT422", "CANONICAL_TOPIC_NOT_READY"],
      ["PT400", "INVALID_INPUT"],
      ["PT401", "AUTHENTICATION_REQUIRED"],
      ["PT403", "IMMUTABLE_FIELD"],
      ["PT409", "UNSUPPORTED_TRANSACTION_ISOLATION"],
    ];
    assert.deepEqual(api.QUESTION_ANSWER_V1_STABLE_ERRORS.map((row) => [row.sqlState, row.messageKey]), expectedErrors);
    for (const [code, message] of expectedErrors) {
      assert.deepEqual(
        api.parseQuestionAnswerV1StableError({ code, message, details: "ignored", context: "ignored" }),
        { sqlState: code, messageKey: message },
      );
    }
    assert.equal(api.parseQuestionAnswerV1StableError({ code: "PT409", message: "localized text" }), null);
    assert.equal(api.parseQuestionAnswerV1StableError({ code: "42501", message: "permission denied" }), null);
  });
  check("canonical ID typing and no unsafe casts or network adapter", () => {
    const source = read("packages/shared-types/src/question-answer-v1.ts");
    assert.match(source, /requesterPersonId: PublicPersonId/);
    assert.equal((source.match(/authorPersonId: PublicPersonId/g) ?? []).length, 2);
    assert.match(source, /primaryChannel: ProductChannelSlug/);
    assert.doesNotMatch(source, /expertId\s*:|parentReplyId\s*:|accepted\s*:|bounty\s*:|reward\s*:|price\s*:/);
    const ast = ts.createSourceFile("contract.ts", read("packages/shared-api/src/question-answer-v1.ts"), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      assert.notEqual(node.kind, ts.SyntaxKind.AnyKeyword, "no any in proposed API");
      if (ts.isAsExpression(node)) assert.equal(node.type.getText(ast), "const", "no unchecked type assertions");
      if (ts.isCallExpression(node)) assert.doesNotMatch(node.expression.getText(ast), /^(fetch|.*\.rpc|.*\.from)$/);
      ts.forEachChild(node, visit);
    };
    visit(ast);
  });
  check("Shared Core pages delegate to the adapter; legacy discovery remains separate", () => {
    const sharedApi = read("packages/shared-api/src/question-answer-v1.ts");
    assert.doesNotMatch(sharedApi, /create_question_secure|create_answer_secure|accept_answer_v2|answer_likes|bounty_points|reward_points/);
    for (const path of [
      "src/pages/NewQuestion.tsx",
      "src/pages/QuestionDetail.tsx",
      "src/components/QuestionCard.tsx",
      "src/hooks/useQuestions.ts",
    ]) {
      const ui = read(path);
      for (const name of Object.keys(rpc)) assert.doesNotMatch(ui, new RegExp(`\\b${name}\\b`), `${path}: ${name}`);
    }
    for (const path of ["src/pages/NewQuestion.tsx", "src/pages/QuestionDetail.tsx"]) {
      assert.match(read(path), /@\/hooks\/useQuestionAnswerV1/);
    }
  });
  check("decision retains privacy, deployment and direct DML safety gates", () => {
    const doc = read("docs/canonical-question-answer-v1-contract-decision.md");
    for (const text of ["LEGACY", "SECURITY INVOKER", "search_path = ''", "Direct Data API", "advisory lock", "CLIENT CONSUMER GATE PASSED", "REMAINS", "Static Contract PASS ≠ Database Apply PASS"]) {
      assert.ok(doc.toLowerCase().includes(text.toLowerCase()), `Decision missing ${text}`);
    }
    const deployment = read("docs/canonical-question-answer-v1-production-deployment.md");
    for (const text of ["PRODUCTION MIGRATION APPLIED", "CLIENT NOT CONSUMABLE", "Persistent synthetic rows", "Security | 102 | 102 | 0", "Performance | 323 | 323 | 0", "EC-2C3"]) {
      assert.ok(deployment.toLowerCase().includes(text.toLowerCase()), `Deployment record missing ${text}`);
    }
    const consumerGate = read("docs/canonical-question-answer-v1-consumer-gate.md");
    for (const text of ["AUTHENTICATED HTTP CONSUMER GATE PASSED", "Persistent synthetic rows", "CLIENT_RPC_WHITELIST", "SHARED CORE UI IMPLEMENTED / MERGED", "REMAINS"]) {
      assert.ok(consumerGate.toLowerCase().includes(text.toLowerCase()), `Consumer gate record missing ${text}`);
    }
    const currentStatus = doc.split("## 一、")[0];
    assert.match(currentStatus, /SHARED CORE UI IMPLEMENTED \/ MERGED/);
    assert.match(currentStatus, /PR #43/);
    assert.match(currentStatus, /4f6c04d218b2ed68991e8de8110a23d0d2f63dd8/);
    assert.match(currentStatus, /Android native verification.*PENDING/);
    assert.match(currentStatus, /WeChat.*NOT IMPLEMENTED/);
    assert.match(currentStatus, /iOS keyboard interaction =\s*\*\*BLOCKED BY ENVIRONMENT/);
    assert.doesNotMatch(currentStatus, /UI NOT IMPLEMENTED|Shared Core UI\s*仍未实现/);
    assert.match(doc, /预算默认 null，采纳\/点赞绝不转换为 Helpful\/Closed/);
    assert.doesNotMatch(doc, /pending-review|CONTRACT-PROPOSED/);
    assert.match(doc, /list_questions_v1.*createdAt DESC, questionId ASC/);
    assert.match(doc, /Production 已采用并验证双关系实现/);
    assert.match(doc, /viewerPersonId \| anon/);
    assert.match(doc, /anonymous 和 authenticated\s+均可调用/);
    assert.match(doc, /重新经过 Architecture \/ Security Review/);
    assert.match(read("package.json"), /"test:question-answer-v1"/);
    assert.ok(JSON.parse(read("package.json")).scripts["test:contracts"].includes("question-answer-v1-contract-check.mjs"));
  });
  console.log(`EC-2 Question/Answer contract PASS (${assertions} groups; strict TypeScript + runtime parsers + consumer gates).`);
  console.log("Production contracts and EC-2D Shared Core UI are aligned; EC-3 discovery and platform follow-up remain deferred.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
