/**
 * A - Backend & Shared Contract RPC 白名单（v1）
 * 规则：
 * - 端侧调用只能从这个白名单选择
 * - 新增/变更 RPC 必须经 A 仲裁后再更新本文件
 */
export type SearchObjectType = "all" | "question" | "expert" | "skill" | "post";
export type ContentTargetType =
  | "question"
  | "answer"
  | "post"
  | "skill_offer"
  | "expert"
  | "message"
  | "order"
  | "user_verification"
  | "manual"
  | "call_session";

export const RPC_WHITELIST = {
  // Pack 08-A
  accept_answer_v2: "public.accept_answer_v2",
  create_system_notification_v2: "public.create_system_notification_v2",
  transition_order_status_v2: "public.transition_order_status_v2",

  // Call v1 (implemented and validated on staging)
  create_call_session_v1: "public.create_call_session_v1",
  accept_call_v1: "public.accept_call_v1",
  reject_call_v1: "public.reject_call_v1",
  end_call_v1: "public.end_call_v1",

  // Pack 08-B
  search_app_content_v2: "public.search_app_content_v2",
  get_search_suggestions_v2: "public.get_search_suggestions_v2",

  // Pack 04/05 compatibility-layer approved RPCs
  upsert_search_history: "public.upsert_search_history",
  get_my_unread_message_count: "public.get_my_unread_message_count",
  get_my_unread_notification_count: "public.get_my_unread_notification_count",
} as const;

export type RpcName = keyof typeof RPC_WHITELIST;

/**
 * Reserved Call v1 names are not deployed RPCs and must not be called by clients.
 * A will move a name into RPC_WHITELIST only after its migration is applied and validated.
 */
export const RESERVED_CALL_RPC_NAMES = [
  "heartbeat_call_v1",
  "mark_call_timeout_v1",
] as const;
export type ReservedCallRpcName = (typeof RESERVED_CALL_RPC_NAMES)[number];

export interface AcceptAnswerV2Params {
  p_question_id: string;
  p_answer_id: string;
}

export interface AcceptAnswerV2Result {
  ok: boolean;
  idempotent: boolean;
  question_id: string;
  accepted_answer_id: string;
}

export interface CreateSystemNotificationV2Params {
  p_user_id: string;
  p_type: string;
  p_title: string;
  p_body: string;
  p_target_type?: ContentTargetType | null;
  p_target_id?: string | null;
}

export type CreateSystemNotificationV2Result = string; // notification id

export interface TransitionOrderStatusV2Params {
  p_order_id: string;
  p_to_status: string;
  p_reason?: string | null;
}

export interface TransitionOrderStatusV2Result {
  ok: boolean;
  idempotent: boolean;
  order_id: string;
  from_status: string;
  to_status: string;
  reason_accepted: string;
}

export interface SearchAppContentV2Params {
  p_query: string;
  p_limit?: number;
}

export interface SearchAppContentV2Result {
  questions: unknown[];
  experts: unknown[];
  skills: unknown[];
  posts: unknown[];
}

export interface GetSearchSuggestionsV2Params {
  p_query?: string;
  p_limit?: number;
  p_type?: SearchObjectType;
}

export interface GetSearchSuggestionsV2Result {
  recent_keywords: string[];
  hot_keywords: string[];
  suggestions: string[];
}

export interface UpsertSearchHistoryParams {
  p_query_text: string;
  p_query_type?: SearchObjectType;
}

export interface CreateCallSessionV1Params {
  p_callee_id: string;
  p_mode: "voice" | "video";
  p_target_type?: ContentTargetType | null;
  p_target_id?: string | null;
  p_order_id?: string | null;
}

export interface CreateCallSessionV1Result {
  call_session_id: string;
  status: "initiated" | "ringing";
}

export interface AcceptCallV1Params {
  p_call_session_id: string;
}

export interface CallActionV1Result {
  ok: boolean;
  idempotent: boolean;
  call_session_id: string;
  status: "answered" | "ended" | "cancelled";
}

export type AcceptCallV1Result = CallActionV1Result;

export interface RejectCallV1Params {
  p_call_session_id: string;
  p_reason?: string | null;
}

export type RejectCallV1Result = CallActionV1Result;

export interface EndCallV1Params {
  p_call_session_id: string;
  p_reason?: string | null;
}

export type EndCallV1Result = CallActionV1Result;
