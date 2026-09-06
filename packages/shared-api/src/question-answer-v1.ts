import { z } from "zod";
import { PRODUCT_CHANNEL_SLUGS } from "../../shared-types/src/product-channels";
import { ANSWER_ORDER_V1, QUESTION_BUSINESS_STATUS_V1 } from "../../shared-types/src/question-answer-v1";
import type {
  CanonicalQuestionV1,
  CanonicalQuestionDetailV1,
  CanonicalAnswerV1,
  CanonicalAnswerReplyV1,
} from "../../shared-types/src/question-answer-v1";

export const QUESTION_ANSWER_V1_CONTRACT_STATE = {
  runtimeStatus: "production-ready",
  productionDeployed: true,
  productionGrantReview: "aligned",
  clientConsumable: true,
  topicAssociation: "blocked-until-canonical-topic-resolver",
} as const;

/** 已锁定的基础顺序，不是 EC-3 ranking，也不代表数据库算法已部署。 */
export const QUESTION_ANSWER_V1_ORDERING = {
  questionList: ["createdAt DESC", "questionId ASC"],
  comprehensiveAnswers: ["helpfulCount DESC", "createdAt DESC", "answerId ASC"],
  latestAnswers: ["createdAt DESC", "answerId ASC"],
  replies: ["createdAt ASC", "replyId ASC"],
} as const;

/** Product + Architecture 已批准；存储/API 已部署并通过 authenticated HTTP consumer gate。 */
export const QUESTION_ANSWER_V1_PRODUCT_REVIEW = {
  questionReopen: { decision: "close-only", status: "locked" },
  deletedAnswerWithReplies: { decision: "hide-entire-answer-branch", status: "locked" },
  comprehensiveOrder: {
    decision: QUESTION_ANSWER_V1_ORDERING.comprehensiveAnswers,
    status: "locked",
  },
  canonicalTopic: { decision: "empty-topicIds-until-resolver", status: "locked" },
} as const;

/** public-readable 不等于 global-only projection；不得把 authenticated caller 强制降为 anon。 */
export const ANSWER_HELPFUL_VIEWER_SCOPE_V1 = {
  field: "viewerHasMarkedHelpful",
  scope: "viewer",
  identitySource: "auth.uid()",
  anonymousValue: false,
  authenticatedValue: "caller-own-helpful-relation",
  futureConsumerCache: {
    minimumKeyParts: ["question-answers", "questionId", "order", "viewerScope"],
    viewerScope: "viewerPersonId-or-anon",
    includePaginationParams: true,
    shareAcrossViewers: false,
    authChange: "switch-scope-without-reusing-previous-viewer-result",
  },
} as const;

/** 逻辑已锁定；物理实现可经重新 Architecture Review 更换，B 不得自行改变。 */
export const ANSWER_HELPFUL_STORAGE_REVIEW_V1 = {
  logicalInvariants: "locked",
  physicalCandidate: "private-owner-mark-and-anonymous-public-fact",
  physicalStatus: "production-verified",
  productionVerified: true,
  validationRequired: ["local-postgresql", "rls", "grants", "concurrency", "rollback-smoke"],
  alternativeRequiresArchitectureReview: true,
  consumerMayRedefineStorage: false,
} as const;

export const QUESTION_ANSWER_V1_INVARIANTS = {
  personIdentity: "auth.users.id = profiles.user_id",
  actorSource: "auth.uid()",
  questionRequiresContext: true,
  businessStatusSeparateFromModeration: true,
  closedAllowsNewAnswerOrReply: false,
  closeIsIdempotent: true,
  deletedOrHiddenAnswerHidesEntireBranch: true,
  retainDeletedAnswerAndReplyStorage: true,
  publicTombstoneCard: false,
  ordering: QUESTION_ANSWER_V1_ORDERING,
  publicAnswerIsFree: true,
  budgetField: "deepExchangeBudgetMaxCents",
  budgetCurrency: "CNY",
  budgetUnit: "cents",
  budgetValidation: "null-or-positive-safe-integer",
  budgetIsConsumable: false,
  budgetAffectsAnswerRanking: false,
  legacyBountyMigration: "forbidden",
  legacyAcceptanceMigration: "forbidden",
  selfHelpfulAllowed: false,
  helpfulMaxPerPersonAnswer: 1,
  helpfulCountSource: "real-helpful-facts",
  helpfulAddRemoveIdempotent: true,
  helpfulCreatesReputation: false,
  replyParent: "answer-only",
  replyHasHelpful: false,
  replyCreatesConversation: false,
  relevantExperience: "omitted-until-EC-3",
} as const;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const text = z.string().refine((value) => value.trim().length > 0);
const timestamp = z.string().datetime({ offset: true });
const count = z.number().int().nonnegative().safe();
const budget = z.number().int().positive().safe().nullable();
// 只验证空关联；UUID 格式不能证明 Canonical Topic 已存在。绝不丢弃非空输入。
const topicIds = z.array(uuid).length(0);
const channel = z.enum(PRODUCT_CHANNEL_SLUGS);
const personSummary = z.object({
  userId: uuid,
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
}).strict().transform((row) => ({
  userId: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl,
})).nullable();
const question = z.object({
  questionId: uuid,
  requesterPersonId: uuid,
  title: text,
  context: text,
  primaryChannel: channel,
  topicIds,
  deepExchangeBudgetMaxCents: budget,
  status: z.enum(QUESTION_BUSINESS_STATUS_V1),
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict();

// 显式构造 required DTO，兼容仓库 strictNullChecks=false；不靠类型断言绕过验证。
const questionDto = (row: z.infer<typeof question>): CanonicalQuestionV1 => ({
  questionId: row.questionId, requesterPersonId: row.requesterPersonId,
  title: row.title, context: row.context, primaryChannel: row.primaryChannel,
  topicIds: row.topicIds, deepExchangeBudgetMaxCents: row.deepExchangeBudgetMaxCents,
  status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt,
});
export const canonicalQuestionV1Schema = question.transform(questionDto);
export const canonicalQuestionDetailV1Schema: z.ZodType<CanonicalQuestionDetailV1, z.ZodTypeDef, unknown> = question.extend({
  requester: personSummary,
  answerCount: count,
}).strict().refine((row) => row.requester === null || row.requester.userId === row.requesterPersonId)
  .transform((row) => ({ ...questionDto(row), requester: row.requester, answerCount: row.answerCount }));

export const canonicalAnswerV1Schema: z.ZodType<CanonicalAnswerV1, z.ZodTypeDef, unknown> = z.object({
  answerId: uuid,
  questionId: uuid,
  authorPersonId: uuid,
  author: personSummary,
  body: text,
  helpfulCount: count,
  viewerHasMarkedHelpful: z.boolean(),
  replyCount: count,
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict().refine((row) => row.author === null || row.author.userId === row.authorPersonId)
  .transform((row) => ({
    answerId: row.answerId, questionId: row.questionId, authorPersonId: row.authorPersonId,
    author: row.author, body: row.body, helpfulCount: row.helpfulCount,
    viewerHasMarkedHelpful: row.viewerHasMarkedHelpful, replyCount: row.replyCount,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  }));

export const canonicalAnswerReplyV1Schema: z.ZodType<CanonicalAnswerReplyV1, z.ZodTypeDef, unknown> = z.object({
  replyId: uuid,
  answerId: uuid,
  authorPersonId: uuid,
  author: personSummary,
  body: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict().refine((row) => row.author === null || row.author.userId === row.authorPersonId)
  .transform((row) => ({
    replyId: row.replyId, answerId: row.answerId, authorPersonId: row.authorPersonId,
    author: row.author, body: row.body, createdAt: row.createdAt, updatedAt: row.updatedAt,
  }));

const questionFields = {
  p_title: text,
  p_context: text,
  p_primary_channel: channel,
  p_topic_ids: topicIds,
  p_deep_exchange_budget_max_cents: budget,
};
// 分页上限是响应体保护，不是业务金额限制。
const pagination = { p_limit: z.number().int().min(1).max(100), p_offset: count };
const nextOffset = count.nullable();
const questionIdResult = z.object({ questionId: uuid }).strict().transform((row) => ({ questionId: row.questionId }));
const answerIdResult = z.object({ answerId: uuid }).strict().transform((row) => ({ answerId: row.answerId }));
const replyIdResult = z.object({ replyId: uuid }).strict().transform((row) => ({ replyId: row.replyId }));
const createQuestionParams = z.object(questionFields).strict();
const questionInput = (row: z.infer<typeof createQuestionParams>) => ({
  p_title: row.p_title, p_context: row.p_context, p_primary_channel: row.p_primary_channel,
  p_topic_ids: row.p_topic_ids, p_deep_exchange_budget_max_cents: row.p_deep_exchange_budget_max_cents,
});
const questionIdParams = z.object({ p_question_id: uuid }).strict().transform((row) => ({ p_question_id: row.p_question_id }));
const answerIdParams = z.object({ p_answer_id: uuid }).strict().transform((row) => ({ p_answer_id: row.p_answer_id }));
const replyIdParams = z.object({ p_reply_id: uuid }).strict().transform((row) => ({ p_reply_id: row.p_reply_id }));

function parseContract<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown, context: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new TypeError(`Invalid EC-2 ${context} contract`);
  return result.data;
}

function canonicalRpc<P, R>(
  authentication: "anon" | "authenticated",
  signature: string,
  params: z.ZodType<P, z.ZodTypeDef, unknown>,
  result: z.ZodType<R, z.ZodTypeDef, unknown>,
  matchesRequest: (request: P, response: R) => boolean = () => true,
) {
  return {
    ...QUESTION_ANSWER_V1_CONTRACT_STATE,
    use: "canonical-blueprint",
    authentication,
    authenticationMeaning: "minimum-access-requirement",
    preserveCallerIdentity: true,
    intendedConsumer: authentication === "anon" ? "public-read" : "authenticated-person",
    newBlueprintCodeMayDepend: true,
    securityMode: "invoker",
    searchPath: "",
    signature,
    parseParams: (value: unknown): P => parseContract(params, value, "request"),
    parseResult: (value: unknown, request: unknown): R => {
      const input = parseContract(params, request, "request");
      const output = parseContract(result, value, "response");
      if (!matchesRequest(input, output)) throw new TypeError("Invalid EC-2 response/request relationship");
      return output;
    },
  } as const;
}

function validPage(
  request: { p_limit: number; p_offset: number },
  ids: readonly string[],
  next: number | null,
): boolean {
  return ids.length <= request.p_limit && new Set(ids).size === ids.length
    && (next === null || (ids.length > 0 && next === request.p_offset + ids.length));
}

/** Production 已部署且 consumer gate 已验证的 exact 12 RPC；本 registry 只负责 parser/metadata，不发起网络请求。 */
export const QUESTION_ANSWER_V1_RPCS = {
  create_question_v1: canonicalRpc("authenticated", "public.create_question_v1(text,text,text,uuid[],bigint)",
    createQuestionParams.transform(questionInput), questionIdResult),
  update_question_v1: canonicalRpc("authenticated", "public.update_question_v1(uuid,text,text,text,uuid[],bigint)",
    z.object({ p_question_id: uuid, ...questionFields }).strict()
      .transform((row) => ({ p_question_id: row.p_question_id, ...questionInput(row) })), questionIdResult,
    (request, response) => request.p_question_id === response.questionId),
  close_question_v1: canonicalRpc("authenticated", "public.close_question_v1(uuid)",
    questionIdParams, z.object({ questionId: uuid, status: z.literal("closed") }).strict()
      .transform((row) => ({ questionId: row.questionId, status: row.status })),
    (request, response) => request.p_question_id === response.questionId),
  get_question_detail_v1: canonicalRpc("anon", "public.get_question_detail_v1(uuid)",
    questionIdParams, z.object({ question: canonicalQuestionDetailV1Schema.nullable() }).strict()
      .transform((row) => ({ question: row.question })),
    (request, response) => response.question === null || request.p_question_id === response.question.questionId),
  list_questions_v1: {
    defaultOrdering: QUESTION_ANSWER_V1_ORDERING.questionList,
    ...canonicalRpc("anon", "public.list_questions_v1(text,text,integer,integer)",
    z.object({ p_primary_channel: channel.nullable(), p_status: z.enum(QUESTION_BUSINESS_STATUS_V1).nullable(), ...pagination }).strict()
      .transform((row) => ({ p_primary_channel: row.p_primary_channel, p_status: row.p_status, p_limit: row.p_limit, p_offset: row.p_offset })),
    z.object({ questions: z.array(canonicalQuestionDetailV1Schema).max(100), nextOffset }).strict()
      .transform((row) => ({ questions: row.questions, nextOffset: row.nextOffset })),
    (request, response) => validPage(request, response.questions.map((row) => row.questionId), response.nextOffset)
      && response.questions.every((row) => (request.p_primary_channel === null || row.primaryChannel === request.p_primary_channel)
        && (request.p_status === null || row.status === request.p_status))),
  },
  create_answer_v1: canonicalRpc("authenticated", "public.create_answer_v1(uuid,text)",
    z.object({ p_question_id: uuid, p_body: text }).strict()
      .transform((row) => ({ p_question_id: row.p_question_id, p_body: row.p_body })), answerIdResult),
  delete_answer_v1: canonicalRpc("authenticated", "public.delete_answer_v1(uuid)",
    answerIdParams, answerIdResult,
    (request, response) => request.p_answer_id === response.answerId),
  list_question_answers_v1: {
    ordering: {
      comprehensive: QUESTION_ANSWER_V1_ORDERING.comprehensiveAnswers,
      latest: QUESTION_ANSWER_V1_ORDERING.latestAnswers,
    },
    viewerProjection: ANSWER_HELPFUL_VIEWER_SCOPE_V1,
    ...canonicalRpc("anon", "public.list_question_answers_v1(uuid,text,integer,integer)",
    z.object({ p_question_id: uuid, p_order: z.enum(ANSWER_ORDER_V1), ...pagination }).strict()
      .transform((row) => ({ p_question_id: row.p_question_id, p_order: row.p_order, p_limit: row.p_limit, p_offset: row.p_offset })),
    z.object({ answers: z.array(canonicalAnswerV1Schema).max(100), nextOffset }).strict()
      .transform((row) => ({ answers: row.answers, nextOffset: row.nextOffset })),
    (request, response) => validPage(request, response.answers.map((row) => row.answerId), response.nextOffset)
      && response.answers.every((row) => row.questionId === request.p_question_id)),
  },
  set_answer_helpful_v1: canonicalRpc("authenticated", "public.set_answer_helpful_v1(uuid,boolean)",
    z.object({ p_answer_id: uuid, p_is_helpful: z.boolean() }).strict()
      .transform((row) => ({ p_answer_id: row.p_answer_id, p_is_helpful: row.p_is_helpful })),
    z.object({ answerId: uuid, helpfulCount: count, viewerHasMarkedHelpful: z.boolean() }).strict()
      .transform((row) => ({ answerId: row.answerId, helpfulCount: row.helpfulCount, viewerHasMarkedHelpful: row.viewerHasMarkedHelpful })),
    (request, response) => request.p_answer_id === response.answerId && request.p_is_helpful === response.viewerHasMarkedHelpful),
  create_answer_reply_v1: canonicalRpc("authenticated", "public.create_answer_reply_v1(uuid,text)",
    z.object({ p_answer_id: uuid, p_body: text }).strict()
      .transform((row) => ({ p_answer_id: row.p_answer_id, p_body: row.p_body })), replyIdResult),
  delete_answer_reply_v1: canonicalRpc("authenticated", "public.delete_answer_reply_v1(uuid)",
    replyIdParams, replyIdResult,
    (request, response) => request.p_reply_id === response.replyId),
  list_answer_replies_v1: {
    defaultOrdering: QUESTION_ANSWER_V1_ORDERING.replies,
    ...canonicalRpc("anon", "public.list_answer_replies_v1(uuid,integer,integer)",
    z.object({ p_answer_id: uuid, ...pagination }).strict()
      .transform((row) => ({ p_answer_id: row.p_answer_id, p_limit: row.p_limit, p_offset: row.p_offset })),
    z.object({ replies: z.array(canonicalAnswerReplyV1Schema).max(100), nextOffset }).strict()
      .transform((row) => ({ replies: row.replies, nextOffset: row.nextOffset })),
    (request, response) => validPage(request, response.replies.map((row) => row.replyId), response.nextOffset)
      && response.replies.every((row) => row.answerId === request.p_answer_id)),
  },
} as const;

/** @deprecated 使用 QUESTION_ANSWER_V1_RPCS；保留历史名称避免破坏已编译的 contract consumer。 */
export const PROPOSED_QUESTION_ANSWER_V1_RPCS = QUESTION_ANSWER_V1_RPCS;

export type QuestionAnswerV1RpcName = keyof typeof QUESTION_ANSWER_V1_RPCS;
/** @deprecated 使用 QuestionAnswerV1RpcName。 */
export type QuestionAnswerV1ProposedRpcName = QuestionAnswerV1RpcName;
export type QuestionAnswerV1RpcParams<N extends QuestionAnswerV1RpcName> =
  ReturnType<(typeof QUESTION_ANSWER_V1_RPCS)[N]["parseParams"]>;
export type QuestionAnswerV1RpcResult<N extends QuestionAnswerV1RpcName> =
  ReturnType<(typeof QUESTION_ANSWER_V1_RPCS)[N]["parseResult"]>;

export const QUESTION_ANSWER_V1_STABLE_ERRORS = [
  { sqlState: "PT404", messageKey: "TARGET_NOT_FOUND_OR_INACCESSIBLE" },
  { sqlState: "PT409", messageKey: "QUESTION_CLOSED" },
  { sqlState: "PT403", messageKey: "SELF_HELPFUL_FORBIDDEN" },
  { sqlState: "PT422", messageKey: "CANONICAL_TOPIC_NOT_READY" },
  { sqlState: "PT400", messageKey: "INVALID_INPUT" },
  { sqlState: "PT401", messageKey: "AUTHENTICATION_REQUIRED" },
  { sqlState: "PT403", messageKey: "IMMUTABLE_FIELD" },
  { sqlState: "PT409", messageKey: "UNSUPPORTED_TRANSACTION_ISOLATION" },
] as const;
export type QuestionAnswerV1StableError = (typeof QUESTION_ANSWER_V1_STABLE_ERRORS)[number];

const stableErrorEnvelope = z.object({ code: z.string(), message: z.string() }).passthrough();

/** 只信任 SQLSTATE 与稳定 message key；忽略且不向 consumer 传播 backend detail/context。 */
export function parseQuestionAnswerV1StableError(value: unknown): QuestionAnswerV1StableError | null {
  const parsed = stableErrorEnvelope.safeParse(value);
  if (!parsed.success) return null;
  return QUESTION_ANSWER_V1_STABLE_ERRORS.find(
    (candidate) => candidate.sqlState === parsed.data.code
      && candidate.messageKey === parsed.data.message,
  ) ?? null;
}

export const parseCanonicalQuestionV1 = (value: unknown): CanonicalQuestionV1 =>
  parseContract(canonicalQuestionV1Schema, value, "question");
export const parseCanonicalQuestionDetailV1 = (value: unknown): CanonicalQuestionDetailV1 =>
  parseContract(canonicalQuestionDetailV1Schema, value, "question detail");
export const parseCanonicalAnswerV1 = (value: unknown): CanonicalAnswerV1 =>
  parseContract(canonicalAnswerV1Schema, value, "answer");
export const parseCanonicalAnswerReplyV1 = (value: unknown): CanonicalAnswerReplyV1 =>
  parseContract(canonicalAnswerReplyV1Schema, value, "reply");
