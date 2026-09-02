import type { Id, ISODateTime } from "./contracts";
import type { PublicPersonId } from "./public-person";

/** Product Blueprint v1 的目标 contract；不表示对应 storage/RPC 已部署。 */
export const PRODUCT_BLUEPRINT_V1 = "product-blueprint-v1" as const;

/** Home Search V1 唯一允许的一级产品域。 */
export const HOME_SEARCH_DOMAIN_V1 = ["all", "person", "question"] as const;
export type HomeSearchDomainV1 = (typeof HOME_SEARCH_DOMAIN_V1)[number];

export const SERVICE_CURRENCY_V1 = "CNY" as const;
export type ServiceCurrencyV1 = typeof SERVICE_CURRENCY_V1;

/** 金额统一使用人民币分；不得使用 point balance 表达 Blueprint v1 服务交易。 */
export interface CnyAmount {
  amountMinor: number;
  currency: ServiceCurrencyV1;
}

/** EC-1 canonical Experience identity；EC-0 placeholder 已由 additive storage 绑定。 */
export type PersonExperienceId = Id;

export interface PersonExperienceOwnership {
  experienceId: PersonExperienceId;
  personId: PublicPersonId;
}

/**
 * 问题预算是后续深入交流的 CNY 意向，不是公开回答奖励。
 * EC-0 不承诺单值、区间、preset 或 storage/input representation。
 */
export interface QuestionDeepExchangeBudgetIntent {
  currency: ServiceCurrencyV1;
}

/**
 * EC-2 目标问题 contract。当前 public.questions storage 仍是 legacy compatibility，
 * 因此该类型不能被解释为已部署 RPC 的返回值。
 */
export interface PublicQuestionV1Target {
  questionId: Id;
  authorId: PublicPersonId;
  title: string;
  context: string | null;
  deepExchangeBudgetIntent: QuestionDeepExchangeBudgetIntent | null;
  answerCount: number;
  createdAt: ISODateTime;
}

/** Public Answer 免费、可多条且没有 accepted-answer 语义。 */
export interface PublicAnswerV1Target {
  answerId: Id;
  questionId: Id;
  authorId: PublicPersonId;
  content: string;
  helpfulCount: number;
  createdAt: ISODateTime;
}

/** Reply 只表达 Answer 下的一层业务结构，不包含 parentReplyId。 */
export interface AnswerReplyV1Target {
  replyId: Id;
  answerId: Id;
  authorId: PublicPersonId;
  replyToPersonId: PublicPersonId | null;
  content: string;
  createdAt: ISODateTime;
}

export type PersonServiceModesV1 =
  | { voiceEnabled: true; videoEnabled: boolean }
  | { voiceEnabled: boolean; videoEnabled: true };

/** 未开启 Service 的 Person 不需要 price 或 voice/video availability。 */
export interface DisabledPersonServiceSettingsV1Target {
  personId: PublicPersonId;
  enabled: false;
}

/**
 * Service 开启后属于 Person，与 Experience、Verification、legacy Expert extension 独立。
 * Voice/Video 共用一个基础按次价格，且至少开启一种模式。
 */
export interface EnabledPersonServiceSettingsV1Target {
  personId: PublicPersonId;
  enabled: true;
  basePrice: CnyAmount;
  modes: PersonServiceModesV1;
}

export type PersonServiceSettingsV1Target =
  | DisabledPersonServiceSettingsV1Target
  | EnabledPersonServiceSettingsV1Target;

/** 平台费率由 versioned policy/config 决定；contract 不写死百分比。 */
export interface ServiceTransactionMoneyV1Target {
  gross: CnyAmount;
  platformFee: CnyAmount;
  net: CnyAmount;
  feePolicyKey: string;
}

export const CONVERSATION_ENTRY_POINT_V1 = ["chat", "booking"] as const;
export type ConversationEntryPointV1 = (typeof CONVERSATION_ENTRY_POINT_V1)[number];

export interface ServiceReputationSummaryV1Target {
  completedServiceCount: number;
  helpedUserCount: number;
  ratingCount: number;
  averageRating: number | null;
}

/** Social popularity 与 Service Reputation 必须保持独立。 */
export interface SocialPopularitySummaryV1Target {
  followerCount: number;
  postLikeCount: number;
}

/** read 与 action-required/resolved 是正交状态。 */
export interface NotificationAttentionStateV1Target {
  isRead: boolean;
  actionRequired: boolean;
  resolvedAt: ISODateTime | null;
}

export const CONNECTION_KIND_V1 = ["question", "conversation", "community"] as const;
export type ConnectionKindV1 = (typeof CONNECTION_KIND_V1)[number];

export const PAID_MEDIA_RECORDING_CONSENT_V1 = "explicit-before-first-use" as const;
