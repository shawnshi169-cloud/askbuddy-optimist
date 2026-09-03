import type {
  CallMode,
  ContentTargetType,
  ModerationReportStatus,
  ModerationTargetType,
  NotificationTargetType,
  OrderStatus,
  SearchObjectType,
} from "../../shared-types/src/contracts";
import type { ProductChannelSlug } from "../../shared-types/src/product-channels";
import type { SearchAppContentV2RawResult } from "./search-v2";
import type {
  GetPublicPersonProfileV1Params,
  GetPublicPersonProfileV1Result,
} from "./public-person-v1";
import type {
  CreateExperienceClaimV1Params,
  CreateExperienceTransitionV1Params,
  CreatePersonExperienceV1Params,
  DeleteExperienceClaimV1Params,
  DeleteExperienceTransitionV1Params,
  DeletePersonExperienceV1Params,
  GetMyPersonExperiencesV1Params,
  GetMyPersonExperiencesV1Result,
  GetPublicPersonExperiencesV1Params,
  GetPublicPersonExperiencesV1Result,
  ReorderPersonExperiencesV1Params,
  SetPersonExperienceVisibilityV1Params,
  UpdateExperienceClaimV1Params,
  UpdateExperienceTransitionV1Params,
  UpdatePersonExperienceV1Params,
} from "./experience-v1";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type RpcContractStatus =
  | "canonical"
  | "deprecated"
  | "compatibility-only"
  | "blocked";

/**
 * `RpcContractStatus` describes the deployed P1.4 runtime contract. Blueprint v1
 * product eligibility is defined separately by PRODUCT_BLUEPRINT_V1_RPC_POLICY.
 */

export type RpcAuthenticationBoundary =
  | "anon"
  | "authenticated"
  | "service_role"
  | "admin"
  | "service_role_or_admin";

export type RpcFeatureOwner =
  | "questions"
  | "messages"
  | "topics"
  | "search"
  | "channels"
  | "notifications"
  | "moderation"
  | "payments"
  | "orders"
  | "experts"
  | "people"
  | "experience"
  | "call"
  | "auth"
  | "operations";

export type ProductionGrantReview =
  | "aligned"
  | "overbroad"
  | "server-guarded"
  | "pending-deployment";

export interface RpcContractDefinition<Request, Response, Name extends string = string> {
  name: Name;
  qualifiedName: `public.${Name}`;
  status: RpcContractStatus;
  authentication: RpcAuthenticationBoundary;
  featureOwner: RpcFeatureOwner;
  requestType: string;
  responseType: string;
  productionGrantReview: ProductionGrantReview;
  note?: string;
  readonly __request?: Request;
  readonly __response?: Response;
}

const defineRpc = <Request, Response, Name extends string>(
  definition: Omit<RpcContractDefinition<Request, Response, Name>, "qualifiedName">,
): RpcContractDefinition<Request, Response, Name> => ({
  ...definition,
  qualifiedName: `public.${definition.name}` as `public.${Name}`,
});

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

export interface AcceptAnswerLegacyParams {
  p_answer_id: string;
  p_question_id: string;
}

export interface CreateQuestionSecureParams {
  p_title: string;
  p_content?: string | null;
  p_category?: string | null;
  p_tags?: string[] | null;
  p_bounty_points?: number;
}

export interface CreateAnswerSecureParams {
  p_question_id: string;
  p_content: string;
}

export interface CreateTopicDiscussionSecureParams {
  p_topic_id: string;
  p_content: string;
}

export interface SendDirectMessageParams {
  p_receiver_id: string;
  p_content: string;
  p_message_type?: string;
}

export interface SearchAppContentV2Params {
  p_query: string;
  p_limit?: number;
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

export interface GetChannelFeedParams {
  p_channel: ProductChannelSlug;
  p_subcategory?: string;
  p_questions_limit?: number;
  p_experts_limit?: number;
}

export interface ChannelFeedCollection<Item extends JsonObject = JsonObject> {
  items: Item[];
  next_cursor: string | null;
}

export interface ChannelFeedResult {
  channel: ProductChannelSlug;
  subcategory: string | null;
  featured: JsonObject | null;
  questions: ChannelFeedCollection;
  experts: ChannelFeedCollection;
}

export interface GetUserConversationItem {
  partner_id: string;
  partner_nickname: string | null;
  partner_avatar: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export interface MarkNotificationsReadParams {
  p_notification_ids?: string[] | null;
}

export interface SubmitContentReportParams {
  p_target_id: string;
  p_target_type: ModerationTargetType;
  p_reason: string;
  p_details?: string | null;
}

export interface ReviewContentReportParams {
  p_report_id: string;
  p_status: ModerationReportStatus;
  p_resolution_note?: string | null;
}

export interface ApplyContentModerationActionParams {
  p_target_type: ModerationTargetType;
  p_target_id: string;
  p_action: string;
  p_reason?: string | null;
  p_report_id?: string | null;
}

export interface ListContentReportsParams {
  p_status?: ModerationReportStatus | null;
}

export interface CreateSystemNotificationV2Params {
  p_user_id: string;
  p_type: string;
  p_title: string;
  p_body: string;
  p_target_type?: NotificationTargetType | null;
  p_target_id?: string | null;
}

export interface TransitionOrderStatusV2Params {
  p_order_id: string;
  p_to_status: OrderStatus;
  p_reason?: string | null;
}

export interface TransitionOrderStatusV2Result {
  ok: boolean;
  idempotent: boolean;
  order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  reason_accepted: string;
}

export interface CreateCallSessionV1Params {
  p_callee_id: string;
  p_mode: CallMode;
  p_target_type?: ContentTargetType | null;
  p_target_id?: string | null;
  p_order_id?: string | null;
}

export interface CreateCallSessionV1Result {
  call_session_id: string;
  status: "initiated" | "ringing";
}

export interface CallSessionActionParams {
  p_call_session_id: string;
}

export interface CallSessionActionWithReasonParams extends CallSessionActionParams {
  p_reason?: string | null;
}

export interface CallActionV1Result {
  ok: boolean;
  idempotent: boolean;
  call_session_id: string;
  status: "answered" | "ended" | "cancelled";
}

export interface ClaimWechatIdentityV1Params {
  p_app_id: string;
  p_openid: string;
  p_unionid?: string | null;
  p_candidate_user_id: string;
}

export interface CreateConsultationOrderParams {
  p_expert_id: string;
  p_consult_type?: "text" | "voice" | "video";
}

export interface RechargePointsParams {
  p_amount: number;
  p_payment_method?: string;
}

export interface CreateRechargePaymentOrderParams {
  p_points: number;
  p_payment_method?: string;
}

export interface ConfirmRechargePaymentParams {
  p_order_id: string;
  p_provider_transaction_id: string;
  p_paid_cash: number;
  p_callback_payload?: JsonObject;
}

export interface AdminConfirmRechargeOrderParams {
  p_order_id: string;
  p_provider_transaction_id?: string;
}

export interface GetNearbyExpertsParams {
  p_lat: number;
  p_lng: number;
  p_radius_km?: number;
}

export interface UpsertAppConfigParams {
  p_key: string;
  p_value: JsonObject;
  p_description?: string | null;
}

const rpc = <Request, Response>() => <Name extends string>(
  name: Name,
  status: RpcContractStatus,
  authentication: RpcAuthenticationBoundary,
  featureOwner: RpcFeatureOwner,
  requestType: string,
  responseType: string,
  productionGrantReview: ProductionGrantReview,
  note?: string,
) => defineRpc<Request, Response, Name>({
  name,
  status,
  authentication,
  featureOwner,
  requestType,
  responseType,
  productionGrantReview,
  note,
});

export const RPC_CATALOG = {
  accept_answer_v2: rpc<AcceptAnswerV2Params, AcceptAnswerV2Result>()(
    "accept_answer_v2", "canonical", "authenticated", "questions",
    "AcceptAnswerV2Params", "AcceptAnswerV2Result", "aligned",
    "Canonical for the current runtime only; Blueprint v1 removes accepted-answer semantics and new code must not depend on this RPC.",
  ),
  accept_answer_and_transfer_points: rpc<AcceptAnswerLegacyParams, void>()(
    "accept_answer_and_transfer_points", "deprecated", "service_role", "questions",
    "AcceptAnswerLegacyParams", "void", "aligned",
    "Post-P1.4c server-only compatibility path using deprecated balance and ledger models.",
  ),
  create_question_secure: rpc<CreateQuestionSecureParams, string>()(
    "create_question_secure", "canonical", "authenticated", "questions",
    "CreateQuestionSecureParams", "UUID", "aligned",
    "Current runtime action includes p_bounty_points; Blueprint v1 requires a separate deep-exchange budget contract.",
  ),
  create_answer_secure: rpc<CreateAnswerSecureParams, string>()(
    "create_answer_secure", "canonical", "authenticated", "questions",
    "CreateAnswerSecureParams", "UUID", "aligned",
  ),
  create_topic_discussion_secure: rpc<CreateTopicDiscussionSecureParams, string>()(
    "create_topic_discussion_secure", "compatibility-only", "service_role", "topics",
    "CreateTopicDiscussionSecureParams", "UUID", "aligned",
    "Post-P1.4c server-only compatibility path using legacy discussion moderation vocabulary.",
  ),
  send_direct_message: rpc<SendDirectMessageParams, string>()(
    "send_direct_message", "canonical", "authenticated", "messages",
    "SendDirectMessageParams", "UUID", "aligned",
    "Current runtime compatibility action; Blueprint v1 Conversation creation must be limited to chat or booking entry points.",
  ),
  get_user_conversations: rpc<Record<string, never>, GetUserConversationItem[]>()(
    "get_user_conversations", "canonical", "authenticated", "messages",
    "EmptyParams", "GetUserConversationItem[]", "aligned",
  ),
  get_my_unread_message_count: rpc<Record<string, never>, number>()(
    "get_my_unread_message_count", "canonical", "authenticated", "messages",
    "EmptyParams", "number", "aligned",
  ),
  get_my_unread_notification_count: rpc<Record<string, never>, number>()(
    "get_my_unread_notification_count", "canonical", "authenticated", "notifications",
    "EmptyParams", "number", "aligned",
  ),
  mark_notifications_read: rpc<MarkNotificationsReadParams, number>()(
    "mark_notifications_read", "canonical", "authenticated", "notifications",
    "MarkNotificationsReadParams", "number", "aligned",
  ),
  create_system_notification_v2: rpc<CreateSystemNotificationV2Params, string>()(
    "create_system_notification_v2", "canonical", "service_role", "notifications",
    "CreateSystemNotificationV2Params", "UUID", "aligned",
  ),
  search_app_content_v2: rpc<SearchAppContentV2Params, SearchAppContentV2RawResult>()(
    "search_app_content_v2", "canonical", "anon", "search",
    "SearchAppContentV2Params", "SearchAppContentV2RawResult", "aligned",
    "Current runtime returns question/expert/skill/post; Blueprint v1 Home Search target is all/person/question.",
  ),
  get_search_suggestions_v2: rpc<GetSearchSuggestionsV2Params, GetSearchSuggestionsV2Result>()(
    "get_search_suggestions_v2", "canonical", "anon", "search",
    "GetSearchSuggestionsV2Params", "GetSearchSuggestionsV2Result", "aligned",
    "Current runtime uses legacy SearchObjectType; Blueprint v1 suggestions require the EC-3 domain contract.",
  ),
  upsert_search_history: rpc<UpsertSearchHistoryParams, string>()(
    "upsert_search_history", "canonical", "authenticated", "search",
    "UpsertSearchHistoryParams", "UUID", "aligned",
  ),
  search_app_content: rpc<SearchAppContentV2Params, JsonObject>()(
    "search_app_content", "deprecated", "anon", "search",
    "SearchAppContentV2Params", "LegacySearchResult", "aligned",
  ),
  get_channel_feed: rpc<GetChannelFeedParams, ChannelFeedResult>()(
    "get_channel_feed", "canonical", "anon", "channels",
    "GetChannelFeedParams", "ChannelFeedResult", "aligned",
    "The four Product Channel slugs remain stable, but the current experts collection is Blueprint v1 compatibility output.",
  ),
  get_public_person_profile_v1: rpc<
    GetPublicPersonProfileV1Params,
    GetPublicPersonProfileV1Result
  >()(
    "get_public_person_profile_v1", "canonical", "anon", "people",
    "GetPublicPersonProfileV1Params", "GetPublicPersonProfileV1Result", "aligned",
    "Production uses the SECURITY INVOKER safe public projection with anon/authenticated/service_role EXECUTE; direct profiles Data API privacy remains a separate cutover.",
  ),
  get_public_person_experiences_v1: rpc<
    GetPublicPersonExperiencesV1Params,
    GetPublicPersonExperiencesV1Result
  >()(
    "get_public_person_experiences_v1", "canonical", "anon", "experience",
    "GetPublicPersonExperiencesV1Params", "GetPublicPersonExperiencesV1Result", "aligned",
    "Production-deployed SECURITY INVOKER safe public projection; public/private isolation and response privacy were remote-smoke verified.",
  ),
  get_my_person_experiences_v1: rpc<
    GetMyPersonExperiencesV1Params,
    GetMyPersonExperiencesV1Result
  >()(
    "get_my_person_experiences_v1", "canonical", "authenticated", "experience",
    "GetMyPersonExperiencesV1Params", "GetMyPersonExperiencesV1Result", "aligned",
    "Production-deployed owner projection; normal results exclude Experience and Claim tombstones.",
  ),
  create_person_experience_v1: rpc<CreatePersonExperienceV1Params, string>()(
    "create_person_experience_v1", "canonical", "authenticated", "experience",
    "CreatePersonExperienceV1Params", "UUID", "aligned",
    "Production-deployed owner action; owner is derived from auth.uid() and clients cannot provide person_id.",
  ),
  update_person_experience_v1: rpc<UpdatePersonExperienceV1Params, string>()(
    "update_person_experience_v1", "canonical", "authenticated", "experience",
    "UpdatePersonExperienceV1Params", "UUID", "aligned",
  ),
  set_person_experience_visibility_v1: rpc<
    SetPersonExperienceVisibilityV1Params,
    string
  >()(
    "set_person_experience_visibility_v1", "canonical", "authenticated", "experience",
    "SetPersonExperienceVisibilityV1Params", "UUID", "aligned",
  ),
  reorder_person_experiences_v1: rpc<ReorderPersonExperiencesV1Params, number>()(
    "reorder_person_experiences_v1", "canonical", "authenticated", "experience",
    "ReorderPersonExperiencesV1Params", "number", "aligned",
  ),
  delete_person_experience_v1: rpc<DeletePersonExperienceV1Params, string>()(
    "delete_person_experience_v1", "canonical", "authenticated", "experience",
    "DeletePersonExperienceV1Params", "UUID", "aligned",
    "Production-deployed owner soft delete; owner-only storage tombstones are excluded from normal projections.",
  ),
  create_experience_transition_v1: rpc<CreateExperienceTransitionV1Params, string>()(
    "create_experience_transition_v1", "canonical", "authenticated", "experience",
    "CreateExperienceTransitionV1Params", "UUID", "aligned",
  ),
  update_experience_transition_v1: rpc<UpdateExperienceTransitionV1Params, string>()(
    "update_experience_transition_v1", "canonical", "authenticated", "experience",
    "UpdateExperienceTransitionV1Params", "UUID", "aligned",
  ),
  delete_experience_transition_v1: rpc<DeleteExperienceTransitionV1Params, string>()(
    "delete_experience_transition_v1", "canonical", "authenticated", "experience",
    "DeleteExperienceTransitionV1Params", "UUID", "aligned",
  ),
  create_experience_claim_v1: rpc<CreateExperienceClaimV1Params, string>()(
    "create_experience_claim_v1", "canonical", "authenticated", "experience",
    "CreateExperienceClaimV1Params", "UUID", "aligned",
    "Production-deployed owner-only Claim identity; it is verification infrastructure, not a verified result or public evidence.",
  ),
  update_experience_claim_v1: rpc<UpdateExperienceClaimV1Params, string>()(
    "update_experience_claim_v1", "canonical", "authenticated", "experience",
    "UpdateExperienceClaimV1Params", "UUID", "aligned",
  ),
  delete_experience_claim_v1: rpc<DeleteExperienceClaimV1Params, string>()(
    "delete_experience_claim_v1", "canonical", "authenticated", "experience",
    "DeleteExperienceClaimV1Params", "UUID", "aligned",
    "Production-deployed Claim soft delete preserves stable identity while normal owner projections hide the tombstone.",
  ),
  submit_content_report: rpc<SubmitContentReportParams, string>()(
    "submit_content_report", "canonical", "authenticated", "moderation",
    "SubmitContentReportParams", "UUID", "aligned",
  ),
  review_content_report: rpc<ReviewContentReportParams, boolean>()(
    "review_content_report", "compatibility-only", "admin", "moderation",
    "ReviewContentReportParams", "boolean", "server-guarded",
  ),
  apply_content_moderation_action: rpc<ApplyContentModerationActionParams, boolean>()(
    "apply_content_moderation_action", "compatibility-only", "admin", "moderation",
    "ApplyContentModerationActionParams", "boolean", "server-guarded",
  ),
  list_content_reports: rpc<ListContentReportsParams, JsonObject>()(
    "list_content_reports", "compatibility-only", "admin", "moderation",
    "ListContentReportsParams", "ContentReportList", "server-guarded",
  ),
  create_call_session_v1: rpc<CreateCallSessionV1Params, CreateCallSessionV1Result>()(
    "create_call_session_v1", "canonical", "authenticated", "call",
    "CreateCallSessionV1Params", "CreateCallSessionV1Result", "aligned",
  ),
  accept_call_v1: rpc<CallSessionActionParams, CallActionV1Result>()(
    "accept_call_v1", "canonical", "authenticated", "call",
    "CallSessionActionParams", "CallActionV1Result", "aligned",
  ),
  reject_call_v1: rpc<CallSessionActionWithReasonParams, CallActionV1Result>()(
    "reject_call_v1", "canonical", "authenticated", "call",
    "CallSessionActionWithReasonParams", "CallActionV1Result", "aligned",
  ),
  end_call_v1: rpc<CallSessionActionWithReasonParams, CallActionV1Result>()(
    "end_call_v1", "canonical", "authenticated", "call",
    "CallSessionActionWithReasonParams", "CallActionV1Result", "aligned",
  ),
  claim_wechat_identity_v1: rpc<ClaimWechatIdentityV1Params, string>()(
    "claim_wechat_identity_v1", "canonical", "service_role", "auth",
    "ClaimWechatIdentityV1Params", "UUID", "aligned",
  ),
  transition_order_status_v2: rpc<TransitionOrderStatusV2Params, TransitionOrderStatusV2Result>()(
    "transition_order_status_v2", "canonical", "service_role", "orders",
    "TransitionOrderStatusV2Params", "TransitionOrderStatusV2Result", "aligned",
  ),
  recharge_points: rpc<RechargePointsParams, void>()(
    "recharge_points", "deprecated", "service_role", "payments",
    "RechargePointsParams", "void", "aligned",
    "Post-P1.4c server-only compatibility path using deprecated balance and ledger models.",
  ),
  create_recharge_payment_order: rpc<CreateRechargePaymentOrderParams, JsonObject>()(
    "create_recharge_payment_order", "blocked", "service_role", "payments",
    "CreateRechargePaymentOrderParams", "LegacyRechargeOrderResult", "aligned",
    "Post-P1.4c server-only blocked path using pre-Pack06 order vocabulary.",
  ),
  confirm_recharge_payment: rpc<ConfirmRechargePaymentParams, boolean>()(
    "confirm_recharge_payment", "blocked", "service_role", "payments",
    "ConfirmRechargePaymentParams", "boolean", "aligned",
    "Service-only payment-webhook reconciliation for the blocked legacy recharge contract.",
  ),
  admin_confirm_recharge_order: rpc<AdminConfirmRechargeOrderParams, boolean>()(
    "admin_confirm_recharge_order", "blocked", "admin", "payments",
    "AdminConfirmRechargeOrderParams", "boolean", "server-guarded",
    "Database EXECUTE is granted to authenticated and service_role; effective admin authorization is enforced inside the function.",
  ),
  list_pending_recharge_orders: rpc<Record<string, never>, JsonObject>()(
    "list_pending_recharge_orders", "blocked", "admin", "payments",
    "EmptyParams", "PendingRechargeOrderList", "server-guarded",
    "Database EXECUTE is granted to authenticated and service_role; effective admin/moderator authorization is enforced inside the function.",
  ),
  create_consultation_order: rpc<CreateConsultationOrderParams, string>()(
    "create_consultation_order", "blocked", "service_role", "orders",
    "CreateConsultationOrderParams", "UUID", "aligned",
    "Post-P1.4c server-only blocked path using legacy balances and invalid Pack06 order vocabulary.",
  ),
  get_nearby_experts: rpc<GetNearbyExpertsParams, JsonValue[]>()(
    "get_nearby_experts", "canonical", "anon", "experts",
    "GetNearbyExpertsParams", "NearbyExpert[]", "aligned",
    "Current runtime compatibility only; Blueprint v1 discovery must return Person identity rather than Expert identity.",
  ),
  get_admin_dashboard: rpc<Record<string, never>, JsonObject>()(
    "get_admin_dashboard", "compatibility-only", "admin", "operations",
    "EmptyParams", "AdminDashboardResult", "server-guarded",
  ),
  get_app_configs: rpc<Record<string, never>, JsonObject>()(
    "get_app_configs", "compatibility-only", "admin", "operations",
    "EmptyParams", "AppConfigList", "server-guarded",
  ),
  upsert_app_config: rpc<UpsertAppConfigParams, boolean>()(
    "upsert_app_config", "compatibility-only", "admin", "operations",
    "UpsertAppConfigParams", "boolean", "server-guarded",
    "Legacy app_config path; Pack07 system_configs is the target model.",
  ),
} as const;

export type RpcCatalogName = keyof typeof RPC_CATALOG;

export type RpcRequest<Name extends RpcCatalogName> =
  (typeof RPC_CATALOG)[Name] extends RpcContractDefinition<infer Request, unknown, string>
    ? Request
    : never;

export type RpcResponse<Name extends RpcCatalogName> =
  (typeof RPC_CATALOG)[Name] extends RpcContractDefinition<unknown, infer Response, string>
    ? Response
    : never;

export const DEPRECATED_RPC_NAMES = Object.values(RPC_CATALOG)
  .filter((definition) => definition.status === "deprecated")
  .map((definition) => definition.name);

export const BLOCKED_RPC_NAMES = Object.values(RPC_CATALOG)
  .filter((definition) => definition.status === "blocked")
  .map((definition) => definition.name);
