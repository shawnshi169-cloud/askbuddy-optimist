/**
 * Compatibility export for existing feature adapters.
 * RPC_CATALOG is the source of truth for status, auth boundary and contracts.
 */
import { RPC_CATALOG } from "./rpc-catalog";

export {
  BLOCKED_RPC_NAMES,
  DEPRECATED_RPC_NAMES,
  RPC_CATALOG,
} from "./rpc-catalog";

export type {
  AcceptAnswerV2Params,
  AcceptAnswerV2Result,
  CallActionV1Result,
  CreateCallSessionV1Params,
  CreateCallSessionV1Result,
  CreateSystemNotificationV2Params,
  GetSearchSuggestionsV2Params,
  GetSearchSuggestionsV2Result,
  RpcAuthenticationBoundary,
  RpcCatalogName,
  RpcContractStatus,
  RpcRequest,
  RpcResponse,
  SearchAppContentV2Params,
  TransitionOrderStatusV2Params,
  TransitionOrderStatusV2Result,
  UpsertSearchHistoryParams,
} from "./rpc-catalog";

export type {
  ContentTargetType,
  SearchObjectType,
} from "../../shared-types/src/contracts";

export type AcceptCallV1Params = import("./rpc-catalog").CallSessionActionParams;
export type AcceptCallV1Result = import("./rpc-catalog").CallActionV1Result;
export type RejectCallV1Params = import("./rpc-catalog").CallSessionActionWithReasonParams;
export type RejectCallV1Result = import("./rpc-catalog").CallActionV1Result;
export type EndCallV1Params = import("./rpc-catalog").CallSessionActionWithReasonParams;
export type EndCallV1Result = import("./rpc-catalog").CallActionV1Result;

export const CLIENT_RPC_WHITELIST = {
  accept_answer_v2: RPC_CATALOG.accept_answer_v2.qualifiedName,
  create_question_secure: RPC_CATALOG.create_question_secure.qualifiedName,
  create_answer_secure: RPC_CATALOG.create_answer_secure.qualifiedName,
  send_direct_message: RPC_CATALOG.send_direct_message.qualifiedName,
  get_user_conversations: RPC_CATALOG.get_user_conversations.qualifiedName,
  get_my_unread_message_count: RPC_CATALOG.get_my_unread_message_count.qualifiedName,
  get_my_unread_notification_count: RPC_CATALOG.get_my_unread_notification_count.qualifiedName,
  mark_notifications_read: RPC_CATALOG.mark_notifications_read.qualifiedName,
  search_app_content_v2: RPC_CATALOG.search_app_content_v2.qualifiedName,
  get_search_suggestions_v2: RPC_CATALOG.get_search_suggestions_v2.qualifiedName,
  upsert_search_history: RPC_CATALOG.upsert_search_history.qualifiedName,
  get_channel_feed: RPC_CATALOG.get_channel_feed.qualifiedName,
  get_public_person_profile_v1: RPC_CATALOG.get_public_person_profile_v1.qualifiedName,
  get_public_person_experiences_v1:
    RPC_CATALOG.get_public_person_experiences_v1.qualifiedName,
  get_my_person_experiences_v1: RPC_CATALOG.get_my_person_experiences_v1.qualifiedName,
  create_person_experience_v1: RPC_CATALOG.create_person_experience_v1.qualifiedName,
  update_person_experience_v1: RPC_CATALOG.update_person_experience_v1.qualifiedName,
  set_person_experience_visibility_v1:
    RPC_CATALOG.set_person_experience_visibility_v1.qualifiedName,
  reorder_person_experiences_v1: RPC_CATALOG.reorder_person_experiences_v1.qualifiedName,
  delete_person_experience_v1: RPC_CATALOG.delete_person_experience_v1.qualifiedName,
  create_experience_transition_v1:
    RPC_CATALOG.create_experience_transition_v1.qualifiedName,
  update_experience_transition_v1:
    RPC_CATALOG.update_experience_transition_v1.qualifiedName,
  delete_experience_transition_v1:
    RPC_CATALOG.delete_experience_transition_v1.qualifiedName,
  create_experience_claim_v1: RPC_CATALOG.create_experience_claim_v1.qualifiedName,
  update_experience_claim_v1: RPC_CATALOG.update_experience_claim_v1.qualifiedName,
  delete_experience_claim_v1: RPC_CATALOG.delete_experience_claim_v1.qualifiedName,
  submit_content_report: RPC_CATALOG.submit_content_report.qualifiedName,
  get_nearby_experts: RPC_CATALOG.get_nearby_experts.qualifiedName,
  create_call_session_v1: RPC_CATALOG.create_call_session_v1.qualifiedName,
  accept_call_v1: RPC_CATALOG.accept_call_v1.qualifiedName,
  reject_call_v1: RPC_CATALOG.reject_call_v1.qualifiedName,
  end_call_v1: RPC_CATALOG.end_call_v1.qualifiedName,
} as const;

export const SERVER_RPC_WHITELIST = {
  create_system_notification_v2: RPC_CATALOG.create_system_notification_v2.qualifiedName,
  transition_order_status_v2: RPC_CATALOG.transition_order_status_v2.qualifiedName,
  claim_wechat_identity_v1: RPC_CATALOG.claim_wechat_identity_v1.qualifiedName,
} as const;

export const COMPATIBILITY_RPC_NAMES = {
  create_topic_discussion_secure: RPC_CATALOG.create_topic_discussion_secure.qualifiedName,
  review_content_report: RPC_CATALOG.review_content_report.qualifiedName,
  apply_content_moderation_action: RPC_CATALOG.apply_content_moderation_action.qualifiedName,
  list_content_reports: RPC_CATALOG.list_content_reports.qualifiedName,
  get_admin_dashboard: RPC_CATALOG.get_admin_dashboard.qualifiedName,
  get_app_configs: RPC_CATALOG.get_app_configs.qualifiedName,
  upsert_app_config: RPC_CATALOG.upsert_app_config.qualifiedName,
} as const;

/** @deprecated Prefer CLIENT_RPC_WHITELIST or SERVER_RPC_WHITELIST. */
export const RPC_WHITELIST = {
  ...CLIENT_RPC_WHITELIST,
  ...SERVER_RPC_WHITELIST,
} as const;

export type RpcName = keyof typeof RPC_WHITELIST;

export const RESERVED_CALL_RPC_NAMES = [
  "heartbeat_call_v1",
  "mark_call_timeout_v1",
] as const;
export type ReservedCallRpcName = (typeof RESERVED_CALL_RPC_NAMES)[number];
