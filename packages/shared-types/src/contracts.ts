/**
 * A - Backend & Shared Contract 唯一契约快照（v1）
 * 说明：
 * - 端侧不得私自扩展字段语义/状态机语义
 * - 冲突以 A - Backend & Shared Contract 仲裁结果为准
 */

export type Id = string;
export type ISODateTime = string;

// -----------------------------
// Unified enum whitelists
// -----------------------------

/**
 * Persisted values accepted by production public.questions.status.
 * @deprecated Legacy runtime compatibility only. Blueprint v1 questions must not
 * derive product semantics from payment/solved statuses.
 */
export const QUESTION_STATUS = [
  "open",
  "pending_payment",
  "paid",
  "closed",
  "solved",
] as const;
export type QuestionStatus = (typeof QUESTION_STATUS)[number];

/**
 * Question drafts are separate public.question_drafts rows, not a
 * public.questions.status value. Visibility is persisted by is_hidden.
 */
export const QUESTION_DRAFT_STORAGE = "question_drafts" as const;
export const QUESTION_VISIBILITY_FIELD = "is_hidden" as const;

/** @deprecated Legacy runtime compatibility only; Blueprint v1 has no accepted answer. */
export const ANSWER_STATUS = ["active", "accepted", "hidden", "rejected"] as const;
export type AnswerStatus = (typeof ANSWER_STATUS)[number];

/** @deprecated Expert review is not Person identity or typed experience verification. */
export const EXPERT_VERIFICATION_STATUS = ["unverified", "pending", "verified", "rejected"] as const;
export type ExpertVerificationStatus = (typeof EXPERT_VERIFICATION_STATUS)[number];

/** @deprecated Legacy expert extension lifecycle; it must not gate Public Person. */
export const EXPERT_PROFILE_STATUS = ["active", "inactive"] as const;
export type ExpertProfileStatus = (typeof EXPERT_PROFILE_STATUS)[number];

/** @deprecated Legacy skill-offer storage, not Blueprint v1 Person Service settings. */
export const SKILL_OFFER_STATUS = ["draft", "pending_review", "published", "offline"] as const;
export type SkillOfferStatus = (typeof SKILL_OFFER_STATUS)[number];

/** @deprecated Legacy SKU pricing modes; Blueprint v1 uses one Person base price per session. */
export const SKILL_PRICING_MODE = ["per_question", "per_session", "per_hour", "negotiable"] as const;
export type SkillPricingMode = (typeof SKILL_PRICING_MODE)[number];

/** @deprecated Legacy skill delivery model; Blueprint v1 service modes are voice/video. */
export const SKILL_DELIVERY_MODE = ["online", "offline", "hybrid"] as const;
export type SkillDeliveryMode = (typeof SKILL_DELIVERY_MODE)[number];

export const POST_VISIBILITY = ["public", "followers", "private"] as const;
export type PostVisibility = (typeof POST_VISIBILITY)[number];

export const POST_STATUS = ["active", "hidden", "deleted"] as const;
export type PostStatus = (typeof POST_STATUS)[number];

/** @deprecated Current search_app_content_v2 compatibility vocabulary. */
export const SEARCH_OBJECT_TYPE = ["all", "question", "expert", "skill", "post"] as const;
export type SearchObjectType = (typeof SEARCH_OBJECT_TYPE)[number];

export const CONVERSATION_TYPE = ["direct", "system", "service"] as const;
export type ConversationType = (typeof CONVERSATION_TYPE)[number];

export const MESSAGE_STATUS = ["active", "deleted"] as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

export const CALL_MODE = ["voice", "video"] as const;
export type CallMode = (typeof CALL_MODE)[number];

export const CALL_STATUS = [
  "initiated",
  "ringing",
  "answered",
  "ended",
  "cancelled",
  "timeout",
  "failed",
] as const;
export type CallStatus = (typeof CALL_STATUS)[number];

export const CALL_ERROR_CODE = [
  "CALL_UNAUTHORIZED",
  "CALL_FORBIDDEN",
  "CALL_NOT_FOUND",
  "CALL_INVALID_STATE",
  "CALL_INVALID_PARTICIPANT",
  "CALL_ALREADY_ENDED",
  "CALL_TIMEOUT",
  "CALL_INTERNAL_ERROR",
] as const;
export type CallErrorCode = (typeof CALL_ERROR_CODE)[number];

/** @deprecated Pack06 runtime vocabulary; not the Blueprint v1 booking/RMB transaction model. */
export const ORDER_TYPE = ["question_reward", "skill_service", "points_recharge", "system_adjustment"] as const;
export type OrderType = (typeof ORDER_TYPE)[number];

export const ORDER_STATUS = [
  "pending_payment",
  "paid",
  "in_service",
  "completed",
  "refunded",
  "closed",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_STATUS = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

/** @deprecated Points remain legacy compatibility and are not Blueprint v1 service currency. */
export const POINT_TX_DIRECTION = ["credit", "debit"] as const;
export type PointTxDirection = (typeof POINT_TX_DIRECTION)[number];

export const POINT_TX_STATUS = ["pending", "completed", "failed", "reversed"] as const;
export type PointTxStatus = (typeof POINT_TX_STATUS)[number];

export const EARNING_TX_DIRECTION = ["income", "expense", "adjustment"] as const;
export type EarningTxDirection = (typeof EARNING_TX_DIRECTION)[number];

export const EARNING_TX_STATUS = ["pending", "available", "settled", "reversed"] as const;
export type EarningTxStatus = (typeof EARNING_TX_STATUS)[number];

export const WECHAT_AUTH_ERROR_CODE = [
  "INVALID_REQUEST",
  "INVALID_WECHAT_CODE",
  "WECHAT_UPSTREAM_ERROR",
  "AUTH_IDENTITY_ERROR",
  "AUTH_SESSION_ERROR",
  "RATE_LIMITED",
] as const;
export type WechatAuthErrorCode = (typeof WECHAT_AUTH_ERROR_CODE)[number];

export const MODERATION_TARGET_TYPE = [
  "question",
  "answer",
  "post",
  "skill_offer",
  "expert",
  "message",
  "user_verifications",
] as const;
export type ModerationTargetType = (typeof MODERATION_TARGET_TYPE)[number];

export const MODERATION_REPORT_STATUS = [
  "pending",
  "in_review",
  "resolved",
  "rejected",
] as const;
export type ModerationReportStatus = (typeof MODERATION_REPORT_STATUS)[number];

export const MODERATION_QUEUE_STATUS = [
  "pending",
  "in_review",
  "processed",
  "closed",
] as const;
export type ModerationQueueStatus = (typeof MODERATION_QUEUE_STATUS)[number];

/**
 * target_type/item_type 统一白名单
 * 用于 notifications.target_type / messages.target_type /
 * content_reports.target_type / moderation_queue.item_type 等跨域字段。
 */
export const CONTENT_TARGET_TYPE = [
  "question",
  "answer",
  "post",
  "skill_offer",
  "expert",
  "message",
  "order",
  "user_verification",
  "manual",
  "call_session",
] as const;
export type ContentTargetType = (typeof CONTENT_TARGET_TYPE)[number];
export type NotificationTargetType = ContentTargetType | ModerationTargetType;

// -----------------------------
// Core entities (Phase 1)
// -----------------------------

export interface Profile {
  user_id: Id;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  city_code: string | null;
  is_expert: boolean;
  is_verified: boolean;
  status: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Legacy persisted question shape. Use PublicQuestionV1Target for new design work. */
export interface Question {
  id: Id;
  author_id: Id;
  title: string;
  description: string | null;
  category_slug: string | null;
  city: string | null;
  city_code: string | null;
  reward_points: number;
  status: QuestionStatus;
  accepted_answer_id: Id | null;
  answer_count: number;
  favorite_count: number;
  view_count: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Legacy persisted answer shape with accepted-answer semantics. */
export interface Answer {
  id: Id;
  question_id: Id;
  author_id: Id;
  content: string;
  status: AnswerStatus;
  is_accepted: boolean;
  like_count: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Legacy optional extension; never use Expert.id as PublicPersonId. */
export interface Expert {
  id: Id;
  user_id: Id;
  headline: string | null;
  intro: string | null;
  expertise_summary: string | null;
  verification_status: ExpertVerificationStatus;
  profile_status: ExpertProfileStatus;
  answer_count: number;
  follower_count: number;
  service_count: number;
  response_rate: number | null;
  response_time_label: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Legacy SKU storage; not Blueprint v1 Person Service settings. */
export interface SkillOffer {
  id: Id;
  expert_id: Id;
  category_id: Id | null;
  title: string;
  description: string | null;
  pricing_mode: SkillPricingMode;
  price_amount: number | null;
  price_currency: string;
  status: SkillOfferStatus;
  city: string | null;
  city_code: string | null;
  is_remote_supported: boolean;
  delivery_mode: SkillDeliveryMode;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Conversation {
  id: Id;
  type: ConversationType;
  created_by: Id | null;
  participant_a: Id | null;
  participant_b: Id | null;
  last_message_at: ISODateTime;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Message {
  id: Id;
  conversation_id: Id;
  sender_id: Id;
  receiver_id: Id | null;
  message_type: string;
  content: string;
  status: MessageStatus;
  target_type: ContentTargetType | null;
  target_id: Id | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Storage shape during the Pack 05 legacy-column compatibility window. */
export interface NotificationRow {
  id: Id;
  user_id: Id;
  type: string;
  title: string;
  content: string | null;
  related_type: string | null;
  related_id: Id | null;
  sender_id: Id | null;
  body: string | null;
  target_type: string | null;
  target_id: Id | null;
  is_read: boolean | null;
  created_at: ISODateTime | null;
  updated_at: ISODateTime;
}

/** Canonical application notification after storage normalization. */
export interface Notification {
  id: Id;
  userId: Id;
  type: string;
  title: string;
  body: string | null;
  targetType: NotificationTargetType | null;
  targetId: Id | null;
  senderId: Id | null;
  isRead: boolean;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime;
}

/** @deprecated Use Notification. */
export type NotificationItem = Notification;

export interface CallSession {
  id: Id;
  order_id: Id | null;
  target_type: ContentTargetType | null;
  target_id: Id | null;
  caller_id: Id;
  callee_id: Id;
  mode: CallMode;
  status: CallStatus;
  started_at: ISODateTime | null;
  ended_at: ISODateTime | null;
  end_reason: string | null;
  rtc_channel: string | null;
  metadata: Record<string, unknown> | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Pack06 runtime order shape; not Blueprint v1 booking/payment contract. */
export interface Order {
  id: Id;
  buyer_id: Id;
  seller_id: Id | null;
  order_type: OrderType;
  biz_ref_type: ContentTargetType | "recharge" | "manual" | null;
  biz_ref_id: Id | null;
  title: string | null;
  amount: number;
  currency: string;
  point_amount: number;
  status: OrderStatus;
  paid_at: ISODateTime | null;
  completed_at: ISODateTime | null;
  closed_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Legacy points compatibility only. */
export interface PointAccount {
  user_id: Id;
  available_balance: number;
  frozen_balance: number;
  total_earned: number;
  total_spent: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** @deprecated Legacy points compatibility only. */
export interface PointTransaction {
  id: Id;
  user_id: Id;
  point_account_id: Id;
  order_id: Id | null;
  direction: PointTxDirection;
  amount: number;
  balance_after: number | null;
  biz_type: string;
  biz_id: Id | null;
  note: string | null;
  status: PointTxStatus;
  idempotency_key: string | null;
  created_at: ISODateTime;
}

export interface EarningTransaction {
  id: Id;
  user_id: Id;
  order_id: Id | null;
  biz_type: string;
  biz_id: Id | null;
  direction: EarningTxDirection;
  amount: number;
  status: EarningTxStatus;
  note: string | null;
  created_at: ISODateTime;
  settled_at: ISODateTime | null;
  updated_at: ISODateTime;
}

// WeChat Auth v1 intentionally has no refresh token. Expiry requires a new
// wx.login code exchange through the server-side bootstrap endpoint.
export interface WechatAuthSession {
  accessToken: string;
  expiresAt: number;
  tokenType: "bearer";
}

export interface WechatAuthUser {
  id: Id;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface WechatAuthResponse {
  session: WechatAuthSession;
  user: WechatAuthUser;
}

export interface WechatAuthErrorPayload {
  code: WechatAuthErrorCode;
  message: string;
  requestId: string;
}
