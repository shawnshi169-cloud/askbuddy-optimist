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
    implementationStatus: "canonical",
    currentReadContracts: [
      "storage:canonical-question-draft-v2", "contract:auth-viewer-state",
      "contract:product-channel-catalog",
    ],
    currentWriteContracts: ["rpc:create_question_v1"],
    notes: [
      "EC-2D Shared Core NewQuestion is canonical: title and context required, exactly one of the four Product Channels, topicIds=[], optional nullable positive safe-integer CNY deepExchangeBudgetMaxCents; public answers remain free.",
      "Local canonical-question-draft-v2 is viewer-scoped with Auth return handoff; only successful real create_question_v1 clears the draft and navigates to /question/:questionId.",
      "No bounty, fake AI tags, Expert consultation, unsupported attachments, or Question Edit UI. update_question_v1 is an adapter capability, not an exposed page action.",
      "Shared Core implementation (including iOS React) is complete; real iOS keyboard QA is BLOCKED BY ENVIRONMENT, Android native verification is PENDING, and WeChat canonical flow is NOT IMPLEMENTED.",
      "Home/Search/Channel feed cutover remains deferred to EC-3; canonical channel selection does not imply canonical discovery feeds or non-empty Canonical Topic associations.",
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
      "capability:answer-reply-v1",
    ],
    implementationStatus: "canonical",
    currentReadContracts: [
      "rpc:get_question_detail_v1", "rpc:list_question_answers_v1", "rpc:list_answer_replies_v1",
    ],
    currentWriteContracts: [
      "rpc:create_answer_v1", "rpc:delete_answer_v1", "rpc:set_answer_helpful_v1",
      "rpc:create_answer_reply_v1", "rpc:delete_answer_reply_v1", "rpc:close_question_v1",
      "rpc:submit_content_report",
    ],
    notes: [
      "Canonical Question/Answer/Reply backend 已部署、完成 authenticated HTTP consumer smoke 并获应用层消费授权；Shared Core QuestionDetail、Answer、Helpful、Reply 和 owner close 已通过 EC-2D 接线，使用 canonical adapter，无 legacy fallback。",
      "Accepted Answer is NOT PART OF CANONICAL FLOW; no bounty, Expert gate, Question Edit UI, or ordinary-client moderation mutation.",
      "list_question_answers_v1 public-read 是最低访问要求，不强制 anonymous：authenticated 请求保留 caller identity，viewerHasMarkedHelpful 只反映 caller 自己的关系；anon=false。",
      "Answer list cache 满足 question-answers + questionId + order + viewerScope（viewerPersonId | anon）的语义要求：实际 prefix 为 canonical-question-answer-v1，纳入 page size 和 offset pageParams；logout/login 取消并移除其他 scope，不可复用上一 viewer 的结果或 placeholder。",
      "Public Answer is free; Helpful is real Answer feedback, never Service Reputation or helpedUserCount. Self-helpful is forbidden; closed Questions still allow Helpful add/remove and authors deleting their existing Answer/Reply.",
      "Reply is one level: Answer -> Reply, no parentReplyId or Conversation side effect. Closed Questions reject new Answers/Replies; deleting or hiding an Answer hides the whole public Reply branch.",
      "Answer CTA 问问TA only navigates to /person/:authorPersonId; no Conversation, Chat, Booking, Service or Payment action, and no scheduling or availability capability.",
      "submit_content_report is generic report intake for the canonical questionId (UUID target_id has no legacy Question FK); submission does not imply a canonical moderation-management workflow.",
      "Shared Core implementation (including iOS React) is complete; real iOS keyboard QA is BLOCKED BY ENVIRONMENT, Android native verification is PENDING, and WeChat canonical flow is NOT IMPLEMENTED.",
      "Real loading/empty/not-found/error states have no fixture fallback; Home/Search/Channel feed cutover and Canonical Topic association remain deferred to EC-3.",
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
