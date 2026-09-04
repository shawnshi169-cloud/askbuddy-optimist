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
      "contract:product-channel-catalog", "capability:home-person-discovery-v1",
      "capability:home-question-feed-v1", "capability:home-action-attention-v1",
    ],
    writeContracts: [],
    implementationStatus: "legacy",
    currentReadContracts: [
      "table:categories", "table:questions", "table:experts", "table:hot_topics",
      "rpc:get_my_unread_notification_count", "fixture:development-only",
    ],
    currentWriteContracts: [],
    notes: [
      "Blueprint v1 target recommends Person and Question; Expert/Skill rows remain current compatibility data only.",
      "Presentation fixtures require the explicit development-only runtime gate; production empty/error states never merge or fall back to fixtures.",
    ],
  },
  {
    pageId: "search",
    page: "Search",
    readContracts: ["capability:home-search-v1"],
    writeContracts: ["capability:home-search-history-v1"],
    implementationStatus: "legacy",
    currentReadContracts: [
      "rpc:search_app_content_v2", "rpc:search_app_content",
      "table:questions", "table:experts", "table:skill_offers", "table:posts",
      "fixture:development-only",
    ],
    currentWriteContracts: ["rpc:upsert_search_history"],
    notes: [
      "Blueprint v1 Home Search target domains are all/person/question; current V2 expert/skill/post results are legacy compatibility.",
      "Production uses no fixture merge or read fallback, while real legacy reads remain capability-gated outside production.",
    ],
  },
  {
    pageId: "ask",
    page: "Ask",
    readContracts: ["capability:question-draft-v1"],
    writeContracts: ["capability:public-question-publish-v1"],
    implementationStatus: "legacy",
    currentReadContracts: ["storage:local-question-draft"],
    currentWriteContracts: ["rpc:create_question_secure"],
    notes: [
      "Current create_question_secure includes legacy bounty points and is not the Blueprint v1 publish contract.",
      "Blueprint v1 question budget is an optional deep-exchange budget; public answers remain free.",
      "EC-2A create_question_v1 is contract-proposed only: required Context, one Product Channel, nullable positive CNY deepExchangeBudgetMaxCents; no deployed consumer authorization.",
    ],
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
      "capability:person-conversation-v1", "capability:notification-history-v1",
      "capability:action-attention-v1",
    ],
    writeContracts: ["capability:conversation-message-v1", "capability:notification-state-v1"],
    implementationStatus: "legacy",
    currentReadContracts: [
      "rpc:get_user_conversations", "fallback:legacyReadFallback:table:messages", "table:notifications", "fixture:development-only",
    ],
    currentWriteContracts: [
      "rpc:send_direct_message",
      "rpc:mark_notifications_read",
    ],
    notes: [
      "Blueprint v1 uses Conversation; only chat or booking may create/enter it. Current direct-message RPCs remain compatibility paths.",
      "Notification read history and Home action-required attention are separate target contracts.",
      "Production conversation reads fail closed on canonical RPC errors; the legacy table read is capability-gated and unavailable in production/unknown runtime. Notification reads never fall back to fixtures.",
    ],
  },
  {
    pageId: "profile",
    page: "Profile",
    readContracts: [
      "capability:self-profile-v1", "capability:person-experience-v1",
      "capability:person-service-settings-v1", "capability:service-reputation-v1",
    ],
    writeContracts: [
      "capability:self-profile-v1", "capability:person-experience-owner-v1",
      "capability:person-service-settings-v1",
    ],
    implementationStatus: "legacy",
    currentReadContracts: [
      "table:profiles", "table:point_accounts", "table:orders",
      "table:point_transactions", "table:earning_transactions", "fixture:development-only",
    ],
    currentWriteContracts: ["table:profiles", "table:user_settings"],
    notes: [
      "Point accounts and Pack06 orders are current legacy runtime only and cannot define Blueprint v1 Person Service.",
      "Community presentation data is development-only; production shows unavailable until a real Community contract exists.",
    ],
  },
  {
    pageId: "public-person",
    page: "Public Person Profile",
    readContracts: [
      "rpc:get_public_person_profile_v1", "rpc:get_public_person_experiences_v1",
    ],
    writeContracts: [],
    implementationStatus: "blocked",
    currentReadContracts: [],
    currentWriteContracts: [],
    notes: [
      "Architecture A owns PublicPersonId and the deployed safe profile projection; Core UI adoption is not yet implemented.",
      "The EC-1A public Experience RPC is deployed and remote-smoke verified, but it remains a target read contract until the Shared Core consumer is wired.",
      "Contribution lists and direct profiles Data API privacy hardening are separate contracts.",
    ],
  },
  {
    pageId: "question-detail",
    page: "Question Detail",
    readContracts: ["capability:public-question-answer-reply-v1"],
    writeContracts: [
      "capability:public-answer-publish-v1", "capability:answer-helpful-v1",
      "capability:answer-reply-v1", "capability:ask-person-v1",
    ],
    implementationStatus: "legacy",
    currentReadContracts: ["table:questions", "table:answers", "table:profiles", "fixture:development-only"],
    currentWriteContracts: [
      "rpc:create_answer_secure", "rpc:accept_answer_v2",
    ],
    notes: [
      "Blueprint v1 has no accepted answer; current accept_answer_v2 remains currentWriteContracts compatibility truth only.",
      "EC-2A Question/Answer/Reply proposals are not deployed; current table reads and legacy writes are unchanged. Ordinary moderation mutation is not a client capability.",
      "Public Answer is free; Helpful is answer feedback and never counts as helpedUserCount.",
      "Current create_answer_secure has no asker/answerer scheduling or availability contract.",
      "Demo question routes are development-only; production details preserve real loading/error truth.",
    ],
  },
  {
    pageId: "channel",
    page: "Channel",
    readContracts: ["contract:product-channel-catalog", "capability:channel-person-question-feed-v1"],
    writeContracts: [],
    implementationStatus: "legacy",
    currentReadContracts: ["rpc:get_channel_feed", "fixture:development-only"],
    currentWriteContracts: [],
    notes: [
      "Four Product Channel slugs remain canonical; the current RPC experts collection is legacy compatibility output.",
      "Production renders the RPC result, empty, or error directly; presentation feed fixtures require the explicit development-only gate.",
    ],
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
    readContracts: ["rpc:get_public_person_profile_v1", "capability:person-service-settings-v1"],
    writeContracts: ["capability:chat-or-book-person-v1"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:experts", "fixture:development-only"],
    currentWriteContracts: ["capability:unavailable"],
    notes: [
      "Legacy /expert routes must resolve to PublicPersonId before entering Blueprint v1 code.",
      "Person Service is not gated by an expert row; current consultation remains unavailable and fails closed.",
    ],
  },
  {
    pageId: "skill-publish",
    page: "Skill Publish",
    readContracts: ["capability:person-service-settings-v1"],
    writeContracts: ["capability:person-service-settings-v1"],
    implementationStatus: "legacy",
    currentReadContracts: ["table:skill_categories", "table:experts"],
    currentWriteContracts: ["table:skill_offers"],
    notes: [
      "Current action remains create-only; it requires an existing expert profile and no experts write occurs.",
      "Current /skill-publish writes legacy skill_offers and requires experts; new Blueprint v1 features must not extend this model.",
      "Target Service belongs to Person, uses one RMB base price, and requires voice or video without an expert gate.",
    ],
  },
  {
    pageId: "chat-detail",
    page: "Chat Detail",
    readContracts: ["capability:person-conversation-v1"],
    writeContracts: ["capability:conversation-message-v1"],
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
    readContracts: ["capability:booking-exchange-session-v1"],
    writeContracts: ["capability:booking-exchange-session-v1"],
    implementationStatus: "blocked",
    currentReadContracts: ["table:call_sessions"],
    currentWriteContracts: [
      "rpc:create_call_session_v1", "rpc:accept_call_v1",
      "rpc:reject_call_v1", "rpc:end_call_v1",
    ],
    notes: [
      "Current call-session RPCs are lifecycle compatibility only; Booking, RMB payment, RTC, and recording consent are not deployed.",
    ],
  },
];
