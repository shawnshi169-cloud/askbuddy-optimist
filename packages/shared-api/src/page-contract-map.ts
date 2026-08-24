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
    currentWriteContracts: ["rpc:create_question_secure"],
    notes: ["Question creation is canonical-only; drafts remain local until draft persistence is aligned."],
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
      "rpc:send_direct_message",
      "rpc:mark_notifications_read",
    ],
    notes: ["Direct-message and notification-read writes are canonical-only; read fixtures remain separate debt."],
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
      "rpc:create_answer_secure", "rpc:accept_answer_v2",
    ],
    notes: ["Answer creation and acceptance are canonical-only; no client-side system counter write remains."],
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
    writeContracts: ["capability:topic-discussion-publish"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:hot_topics", "table:topic_discussions", "fixture:topics"],
    currentWriteContracts: ["capability:unavailable"],
    notes: [
      "create_topic_discussion_secure remains compatibility-only.",
      "Production publishing fails closed until a canonical moderation-aligned action exists.",
    ],
  },
  {
    pageId: "expert-detail",
    page: "Expert Detail",
    readContracts: ["table:experts", "table:skill_offers", "table:profiles"],
    writeContracts: ["capability:consultation-order"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:experts", "fixture:demo-experts"],
    currentWriteContracts: ["capability:unavailable"],
    notes: ["Consultation fails closed; the incompatible legacy order RPC is not called."],
  },
  {
    pageId: "skill-publish",
    page: "Skill Publish",
    readContracts: ["table:skill_categories", "table:experts"],
    writeContracts: ["table:skill_offers"],
    implementationStatus: "canonical",
    currentReadContracts: ["table:skill_categories", "table:experts"],
    currentWriteContracts: ["table:skill_offers"],
    notes: ["Default /skill-publish is create-only and requires the authenticated user to already have an expert profile; no experts write occurs."],
  },
  {
    pageId: "chat-detail",
    page: "Chat Detail",
    readContracts: ["table:messages", "table:conversations"],
    writeContracts: ["rpc:send_direct_message"],
    implementationStatus: "legacy",
    currentReadContracts: ["table:messages", "fixture:demo-chat"],
    currentWriteContracts: ["rpc:send_direct_message", "capability:demo-send-unavailable"],
    notes: ["Real sends clear input only after canonical RPC success; demo sends fail closed."],
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
