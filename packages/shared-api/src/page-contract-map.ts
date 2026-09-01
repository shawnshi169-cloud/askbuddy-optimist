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
    currentReadContracts: [
      "table:categories", "table:questions", "table:experts", "table:hot_topics",
      "rpc:get_my_unread_notification_count", "fixture:development-only",
    ],
    currentWriteContracts: [],
    notes: ["Presentation fixtures require the explicit development-only runtime gate; production empty/error states never merge or fall back to fixtures."],
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
      "fixture:development-only",
    ],
    currentWriteContracts: ["rpc:upsert_search_history"],
    notes: ["V2 is canonical; production uses no fixture merge or read fallback, while real legacy reads remain capability-gated outside production."],
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
    currentReadContracts: ["table:posts", "table:notifications", "fixture:development-only"],
    currentWriteContracts: [
      "table:posts", "table:post_likes", "table:post_favorites", "table:post_comments",
    ],
    notes: ["Production posts and interactions preserve real loading/empty/error states; presentation interactions are explicit development-only fixtures."],
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
      "rpc:get_user_conversations", "fallback:legacyReadFallback:table:messages", "table:notifications", "fixture:development-only",
    ],
    currentWriteContracts: [
      "rpc:send_direct_message",
      "rpc:mark_notifications_read",
    ],
    notes: ["Production conversation reads fail closed on canonical RPC errors; the legacy table read is capability-gated and unavailable in production/unknown runtime. Notification reads never fall back to fixtures; write paths remain canonical-only."],
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
      "table:point_transactions", "table:earning_transactions", "fixture:development-only",
    ],
    currentWriteContracts: ["table:profiles", "table:user_settings"],
    notes: ["Community presentation data is development-only; production shows unavailable until a real community contract exists."],
  },
  {
    pageId: "public-person",
    page: "Public Person Profile",
    readContracts: ["rpc:get_public_person_profile_v1"],
    writeContracts: [],
    implementationStatus: "blocked",
    currentReadContracts: [],
    currentWriteContracts: [],
    notes: [
      "Architecture A owns PublicPersonId and the safe profile projection; Core UI adoption starts after the RPC deployment gate.",
      "Contribution lists and direct profiles Data API privacy hardening are separate contracts.",
    ],
  },
  {
    pageId: "question-detail",
    page: "Question Detail",
    readContracts: ["table:questions", "table:answers", "table:profiles"],
    writeContracts: ["rpc:create_answer_secure", "rpc:accept_answer_v2"],
    implementationStatus: "legacy",
    currentReadContracts: ["table:questions", "table:answers", "table:profiles", "fixture:development-only"],
    currentWriteContracts: [
      "rpc:create_answer_secure", "rpc:accept_answer_v2",
    ],
    notes: [
      "Demo question routes are development-only; production details preserve real loading/error truth and canonical writes.",
      "Answer submission persists only canonical answer content through create_answer_secure; no asker/answerer scheduling or availability contract currently exists.",
    ],
  },
  {
    pageId: "channel",
    page: "Channel",
    readContracts: ["rpc:get_channel_feed"],
    writeContracts: [],
    implementationStatus: "legacy",
    currentReadContracts: ["rpc:get_channel_feed", "fixture:development-only"],
    currentWriteContracts: [],
    notes: ["Production renders the RPC result, empty, or error directly; presentation feed fixtures require the explicit development-only gate."],
  },
  {
    pageId: "topic-detail",
    page: "Topic Detail",
    readContracts: ["table:hot_topics", "table:topic_discussions"],
    writeContracts: ["capability:topic-discussion-publish"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:hot_topics", "table:topic_discussions", "fixture:development-only"],
    currentWriteContracts: ["capability:unavailable"],
    notes: [
      "create_topic_discussion_secure remains compatibility-only.",
      "Production publishing fails closed until a canonical moderation-aligned action exists.",
      "Production topic reads never fall back to fixtures or generated article content.",
    ],
  },
  {
    pageId: "expert-detail",
    page: "Expert Detail",
    readContracts: ["table:experts", "table:skill_offers", "table:profiles"],
    writeContracts: ["capability:consultation-order"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:experts", "fixture:development-only"],
    currentWriteContracts: ["capability:unavailable"],
    notes: ["Consultation fails closed; demo expert routes are development-only and the incompatible legacy order RPC is not called."],
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
    currentReadContracts: ["table:messages", "fixture:development-only"],
    currentWriteContracts: ["rpc:send_direct_message", "capability:demo-send-unavailable"],
    notes: ["Production demo-chat routes are unavailable; development demo sends fail closed and real sends clear input only after canonical RPC success."],
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
