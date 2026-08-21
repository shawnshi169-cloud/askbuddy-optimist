export type PageImplementationStatus =
  | "canonical"
  | "legacy"
  | "blocked"
  | "presentation-only";

export interface PageContract {
  pageId: string;
  page: string;
  readContracts: string[];
  writeContracts: string[];
  implementationStatus: PageImplementationStatus;
  currentReadContracts: string[];
  currentWriteContracts: string[];
  notes: string[];
}

/**
 * Canonical contracts and current implementation truth are intentionally
 * separate. This map does not imply that a desired contract is already wired.
 */
export const PAGE_CONTRACT_MAP: PageContract[] = [
  {
    pageId: "home",
    page: "Home",
    readContracts: [
      "table:questions", "table:experts", "table:skill_offers",
      "table:recommendation_slots", "rpc:get_my_unread_notification_count",
    ],
    writeContracts: [],
    implementationStatus: "legacy",
    currentReadContracts: ["table:questions", "table:experts", "fixture:demo-content"],
    currentWriteContracts: [],
    notes: ["Core App currently merges demo content into real reads."],
  },
  {
    pageId: "search",
    page: "Search",
    readContracts: ["rpc:search_app_content_v2", "rpc:get_search_suggestions_v2"],
    writeContracts: ["rpc:upsert_search_history"],
    implementationStatus: "legacy",
    currentReadContracts: [
      "rpc:search_app_content_v2", "rpc:search_app_content",
      "table:questions", "table:experts", "table:skill_offers", "table:posts",
      "fixture:demo-content",
    ],
    currentWriteContracts: ["rpc:upsert_search_history"],
    notes: ["V2 is canonical; legacy/direct/demo fallbacks remain in Core App."],
  },
  {
    pageId: "ask",
    page: "Ask",
    readContracts: ["table:question_drafts"],
    writeContracts: ["rpc:create_question_secure", "table:question_drafts"],
    implementationStatus: "legacy",
    currentReadContracts: ["storage:local-question-draft"],
    currentWriteContracts: ["rpc:create_question_secure", "fallback:table:questions"],
    notes: ["Draft is not a questions.status value; direct write fallback remains."],
  },
  {
    pageId: "discover",
    page: "Discover",
    readContracts: ["table:posts", "table:post_media", "table:profiles"],
    writeContracts: [
      "table:posts", "table:post_likes", "table:post_favorites", "table:post_comments",
    ],
    implementationStatus: "legacy",
    currentReadContracts: ["table:posts", "table:notifications", "fixture:interactions"],
    currentWriteContracts: [
      "table:posts", "table:post_likes", "table:post_favorites", "table:post_comments",
    ],
    notes: ["Primary post writes are real; interactions still fall back to fixtures."],
  },
  {
    pageId: "messages",
    page: "Messages",
    readContracts: [
      "rpc:get_user_conversations", "table:messages", "table:notifications",
      "rpc:get_my_unread_message_count", "rpc:get_my_unread_notification_count",
    ],
    writeContracts: ["rpc:send_direct_message", "rpc:mark_notifications_read"],
    implementationStatus: "legacy",
    currentReadContracts: [
      "rpc:get_user_conversations", "fallback:table:messages", "fixture:demo-conversations",
    ],
    currentWriteContracts: [
      "rpc:send_direct_message", "fallback:table:messages",
      "rpc:mark_notifications_read", "fallback:table:notifications",
    ],
    notes: ["RPC-to-table fallbacks and demo conversations remain."],
  },
  {
    pageId: "profile",
    page: "Profile",
    readContracts: [
      "table:profiles", "table:point_accounts", "table:orders",
      "table:point_transactions", "table:earning_transactions",
    ],
    writeContracts: ["table:profiles", "table:user_settings"],
    implementationStatus: "legacy",
    currentReadContracts: [
      "table:profiles", "table:point_accounts", "table:orders",
      "table:point_transactions", "table:earning_transactions", "fixture:community",
    ],
    currentWriteContracts: ["table:profiles", "table:user_settings"],
    notes: ["Ledger reads are canonical; community sections remain presentation data."],
  },
  {
    pageId: "question-detail",
    page: "Question Detail",
    readContracts: ["table:questions", "table:answers", "table:profiles"],
    writeContracts: ["rpc:create_answer_secure", "rpc:accept_answer_v2"],
    implementationStatus: "legacy",
    currentReadContracts: ["table:questions", "table:answers", "table:profiles"],
    currentWriteContracts: [
      "rpc:create_answer_secure", "fallback:table:answers",
      "rpc:accept_answer_and_transfer_points", "table:questions:view_count",
    ],
    notes: ["Core App has not switched acceptance to accept_answer_v2."],
  },
  {
    pageId: "channel",
    page: "Channel",
    readContracts: ["rpc:get_channel_feed"],
    writeContracts: [],
    implementationStatus: "legacy",
    currentReadContracts: ["rpc:get_channel_feed", "fixture:channel-content"],
    currentWriteContracts: [],
    notes: ["Real channel responses are currently merged with demo content."],
  },
  {
    pageId: "topic-detail",
    page: "Topic Detail",
    readContracts: ["table:hot_topics", "table:topic_discussions"],
    writeContracts: ["rpc:create_topic_discussion_secure"],
    implementationStatus: "legacy",
    currentReadContracts: ["table:hot_topics", "table:topic_discussions", "fixture:topics"],
    currentWriteContracts: [
      "rpc:create_topic_discussion_secure", "fallback:table:topic_discussions",
    ],
    notes: ["The create RPC remains compatibility-only until moderation vocabulary is aligned."],
  },
  {
    pageId: "expert-detail",
    page: "Expert Detail",
    readContracts: ["table:experts", "table:skill_offers", "table:profiles"],
    writeContracts: ["capability:consultation-order"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:experts", "fixture:demo-experts"],
    currentWriteContracts: ["rpc:create_consultation_order"],
    notes: ["Consultation order RPC is not canonical and is blocked by Pack06 incompatibility."],
  },
  {
    pageId: "skill-publish",
    page: "Skill Publish",
    readContracts: ["table:skill_categories", "table:skill_offers"],
    writeContracts: ["table:skill_offers"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:skill_categories", "table:experts"],
    currentWriteContracts: ["table:experts"],
    notes: ["Current UI writes an expert profile instead of a skill offer."],
  },
  {
    pageId: "chat-detail",
    page: "Chat Detail",
    readContracts: ["table:messages", "table:conversations"],
    writeContracts: ["rpc:send_direct_message"],
    implementationStatus: "legacy",
    currentReadContracts: ["table:messages", "fixture:demo-chat"],
    currentWriteContracts: ["rpc:send_direct_message", "fallback:table:messages", "local:demo-noop"],
    notes: ["Demo chat submission can appear successful without a server write."],
  },
  {
    pageId: "post-editor",
    page: "Post Editor",
    readContracts: ["table:drafts"],
    writeContracts: ["table:posts", "table:post_media"],
    implementationStatus: "legacy",
    currentReadContracts: ["storage:local-post-draft"],
    currentWriteContracts: ["table:posts", "miniapp:local-draft-only"],
    notes: ["Core App writes real posts; Mini Program is explicitly presentation-only."],
  },
  {
    pageId: "call",
    page: "Call",
    readContracts: ["table:call_sessions"],
    writeContracts: [
      "rpc:create_call_session_v1", "rpc:accept_call_v1",
      "rpc:reject_call_v1", "rpc:end_call_v1",
    ],
    implementationStatus: "blocked",
    currentReadContracts: ["table:call_sessions"],
    currentWriteContracts: [
      "rpc:create_call_session_v1", "rpc:accept_call_v1",
      "rpc:reject_call_v1", "rpc:end_call_v1",
    ],
    notes: ["Session lifecycle is canonical; RTC media and complete product UI are unavailable."],
  },
];
