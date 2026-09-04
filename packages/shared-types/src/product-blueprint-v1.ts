import type { Id, ISODateTime } from "./contracts";
import type { PublicPersonId } from "./public-person";
import type { CanonicalQuestionV1, CanonicalAnswerV1, CanonicalAnswerReplyV1 } from "./question-answer-v1";

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
 * @deprecated EC-0 历史语义 placeholder。EC-2A 已锁定 deepExchangeBudgetMaxCents，
 * 新设计只能使用 CanonicalQuestionV1；此类型不代表另一个可消费 Budget contract。
 */
export interface QuestionDeepExchangeBudgetIntent {
  currency: ServiceCurrencyV1;
}

/** @deprecated EC-0 设计名称；使用 EC-2A CanonicalQuestionV1（仍未部署）。 */
export type PublicQuestionV1Target = CanonicalQuestionV1;
/** @deprecated EC-0 设计名称；使用 EC-2A CanonicalAnswerV1（仍未部署）。 */
export type PublicAnswerV1Target = CanonicalAnswerV1;
/** @deprecated EC-0 设计名称；使用 EC-2A CanonicalAnswerReplyV1（仍未部署）。 */
export type AnswerReplyV1Target = CanonicalAnswerReplyV1;

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
