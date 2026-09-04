import type { Id, ISODateTime } from "./contracts";
import type { ProductChannelSlug } from "./product-channels";
import type { PublicPersonId, PublicPersonSummary } from "./public-person";

/** EC-2A 审查中的目标 DTO，不是已部署 RPC 或 legacy row 的别名。 */
export type CanonicalQuestionIdV1 = Id;
export type CanonicalAnswerIdV1 = Id;
export type CanonicalAnswerReplyIdV1 = Id;

/** 预留跨模块 Canonical Topic identity；当前无 resolver，parser 仅接受空 topicIds。 */
export type CanonicalTopicIdV1 = Id;

export const QUESTION_BUSINESS_STATUS_V1 = ["open", "closed"] as const;
export type QuestionBusinessStatusV1 = (typeof QUESTION_BUSINESS_STATUS_V1)[number];

/** 内部状态维度，不是普通客户端可设置的业务 status。 */
export type QuestionAnswerModerationVisibilityV1 = "visible" | "hidden";
export const QUESTION_BUDGET_CURRENCY_V1 = "CNY" as const;
export const ANSWER_ORDER_V1 = ["comprehensive", "latest"] as const;
export type AnswerOrderV1 = (typeof ANSWER_ORDER_V1)[number];

export interface CanonicalQuestionV1 {
  questionId: CanonicalQuestionIdV1;
  requesterPersonId: PublicPersonId;
  title: string;
  context: string;
  primaryChannel: ProductChannelSlug;
  topicIds: CanonicalTopicIdV1[];
  /** 可选后续单次 1:1 交流最高预算意愿；CNY 分，null 或正整数，不是成交价。 */
  deepExchangeBudgetMaxCents: number | null;
  status: QuestionBusinessStatusV1;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CanonicalQuestionDetailV1 extends CanonicalQuestionV1 {
  /** 缺少公开资料时为 null，不虚构昵称，不改变 requesterPersonId。 */
  requester: PublicPersonSummary | null;
  /** 只统计当前公开、未删除且父 Question 可见的 Answer。 */
  answerCount: number;
}

export interface AnswerHelpfulSummaryV1 {
  helpfulCount: number;
  /** anon 为 false；authenticated 只反映当前 caller 的真实 Helpful 关系。 */
  viewerHasMarkedHelpful: boolean;
}

export interface CanonicalAnswerV1 extends AnswerHelpfulSummaryV1 {
  answerId: CanonicalAnswerIdV1;
  questionId: CanonicalQuestionIdV1;
  authorPersonId: PublicPersonId;
  author: PublicPersonSummary | null;
  body: string;
  /** 只统计当前公开且未删除的一级 Reply。Reply 内容通过独立分页 RPC 获取。 */
  replyCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CanonicalAnswerReplyV1 {
  replyId: CanonicalAnswerReplyIdV1;
  answerId: CanonicalAnswerIdV1;
  authorPersonId: PublicPersonId;
  author: PublicPersonSummary | null;
  body: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
