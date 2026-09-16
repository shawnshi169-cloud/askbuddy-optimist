import { HOME_SEARCH_DOMAIN_V1 } from "../../shared-types/src/product-blueprint-v1";
import { PRODUCT_CHANNEL_CATALOG } from "../../shared-types/src/product-channels";
import type {
  DiscoveryScopeV1Target, DiscoveryCityV1Target, DiscoveryPaginationV1Target, DiscoveryPageV1Target,
  QuestionDiscoveryCardV1Target, PersonDiscoveryCardV1Target, SearchAllSectionsV1Target,
  EditorialFeatureSummaryV1Target, EditorialFeatureDetailV1Target, EditorialFeatureIdV1Target,
} from "../../shared-types/src/discovery-v1";

/** Product/architecture freeze, not callable RPC definitions or runtime capability. */
export const DISCOVERY_V1_CONTRACT = {
  contractStatus: "approved-frozen",
  productionDeployed: false,
  clientConsumable: false,
  // Topic foundation has its own LOCAL-only state; these pipelines remain unimplemented.
  implementationScope: "home-search-matching-editorial",
  implementationStarted: false,
  rpcNamesFrozen: false,
  home: {
    structure: ["brand-city-action-bell", "search", "four-channels", "editorial-features", "discovery-mode", "mode-feed", "bottom-navigation"],
    bottomNavigation: ["首页", "发现", "＋", "消息", "我的"],
    centralPublish: ["我有问题", "我有经验 / 技能"],
    searchPlaceholder: "搜问题、找经历过的人",
    cityPrecision: "city",
    preciseLocationRequired: false,
    bell: "priority-actionable-only",
    ordinaryUnreadDestination: "messages",
    modes: { questions: "大家都在问", persons: "找TA问问" },
    firstMode: "questions",
    rememberMode: "last-used-light-preference-not-persona",
    mixedFeedAllowed: false,
  },
  channels: {
    catalog: PRODUCT_CHANNEL_CATALOG,
    scope: "temporary-domain-focus",
    modes: ["questions", "persons"],
    questionFilter: "exact-primary-channel",
    personFilter: "relevant-public-experience-or-contribution",
    exit: "restore-global-home-personalization",
    permanentPersona: false,
  },
  search: {
    tabs: HOME_SEARCH_DOMAIN_V1,
    labels: { all: "综合", person: "人", question: "问题" },
    allSections: ["questions", "persons"],
    sectionLabels: { questions: "相关问题", persons: "相关的人" },
    independentRanking: true,
    allowedEntities: ["question", "person"],
    excludedEntities: ["discover-post", "community", "standalone-experience"],
    generatedAnswerReplacement: false,
    empty: "real-empty-no-fallback",
    emptyCta: "去问一个问题",
    queryToDraft: "idea-only-no-invented-context",
  },
  editorial: {
    label: "问问热榜",
    entity: "editorial-feature-article",
    sameAsTopic: false,
    algorithmicRanking: false,
    administration: "authorized-admin-editorial-operator-only",
    actions: ["create", "edit", "publish", "unpublish", "place"],
    ordinaryPersonPublish: false,
    bodyKinds: ["heading", "paragraph", "image", "quote"],
    rawHtmlAllowed: false,
    relatedEntities: ["canonical-topic", "question", "person"],
    quoteSource: "real-public-answer-or-editorial-emphasis-never-fabricated-testimonial",
    comments: "planned-not-runtime",
    commentCount: "real-facts-only-or-omit",
    share: "published-public-link",
    emptyPublishedModule: "hide",
    fixtureFallback: false,
    presentation: "horizontal-poster-cards",
    visibleCardsIntent: [1.15, 1.3],
    order: ["editorial-sort-order-asc", "feature-id-asc"],
  },
  topics: {
    governance: "platform-maintained-existing-entity-resolution",
    sharedBy: ["question", "experience", "editorial", "search", "matching", "future-community", "future-discover-mapping"],
    questionTargetCardinality: "0..N",
    experienceTargetCardinality: "0..N",
    questionPrimaryChannelRequired: true,
    experienceChannelRequired: false,
    userStringCreatesTopic: false,
    aiCreatesTopic: false,
    unresolvedAssociation: "zero-allowed",
    confirmation: "user-confirmation-or-real-system-mapping-to-existing-topic",
    currentQuestionTopicIds: "empty-only",
    runtimeUnlockPhase: "EC-3B",
    transitionIsTopic: false,
    locationIsTopic: false,
  },
  personalization: {
    inputs: ["current-state", "accumulated-experiences", "current-needs-interests", "recent-behavior"],
    strong: ["own-question", "active-search", "repeated-topic-view", "ask-person", "future-booking", "real-experience-related-action"],
    medium: ["save", "deep-answer-read", "follow-relevant-person", "explicit-interest", "future-community-action"],
    weak: ["incidental-like", "one-off-impression"],
    timeDecayRequired: true,
    needAutomaticallyCreatesExperience: false,
    experienceRequiresExplicitFactConfirmation: true,
    coldStart: ["light-interest-onboarding", "explicit-experience", "real-broadly-useful-content", "exploration"],
    unsupportedPrecisionClaim: false,
  },
  ranking: {
    personPriority: ["experience-relevance", "reputation-trust", "service-fit", "social-activity"],
    personPipeline: ["need-query", "topic-semantic-intent", "experience-transition-public-contribution", "person", "verification-trust", "reputation", "service-fit", "social-activity"],
    personEvidence: ["relevant-public-experience", "fallback-relevant-public-answer"],
    serviceRequiredForDiscovery: false,
    questionSignals: ["semantic-relevance", "topic-relevance", "channel-relevance", "recency", "real-answer-helpful-facts", "viewer-need-behavior"],
    numericWeightsFrozen: false,
    publicNumericMatchScore: false,
    paidPlacementOverride: false,
    fakeHeatViewsUrgency: false,
    helpfulIsReputation: false,
    averageRatingMinimumCount: 3,
    unavailableVerificationReputationService: "omit-until-real-canonical-public-facts",
  },
  pagination: {
    mechanism: "opaque-cursor-stable-snapshot",
    binding: ["viewer-or-anon", "mode-or-section", "query", "channel-scope", "city", "ranking-version", "snapshot"],
    tieBreaker: "canonical-entity-id-asc",
    duplicatePolicy: "no-duplicate-entity-within-section-snapshot",
    expiredOrMismatchedCursor: "explicit-failure-restart-not-silent-reseed",
    safety: "recheck-public-visibility-on-every-page",
  },
  boundaries: {
    personIdentity: "PublicPersonId",
    cta: "问问TA",
    personDestination: "/person/:userId",
    discover: "separate-social-plaza-recommended-following-same-city",
    questionBudget: "deep-exchange-intent-not-bounty-or-answer-payment",
    ec4Actions: false,
    privateEvidenceAllowed: false,
  },
} as const;

/** Caller identity comes from future authenticated context, never an arbitrary viewer request ID. */
export interface DiscoveryFeedRequestV1Target {
  scope: DiscoveryScopeV1Target;
  city: DiscoveryCityV1Target | null;
  page: DiscoveryPaginationV1Target;
}
export interface DiscoverySearchRequestV1Target {
  query: string;
  city: DiscoveryCityV1Target | null;
  page: DiscoveryPaginationV1Target;
}
export interface DiscoverySearchAllRequestV1Target extends Omit<DiscoverySearchRequestV1Target, "page"> {
  questions: DiscoveryPaginationV1Target;
  persons: DiscoveryPaginationV1Target;
}

/** Semantic capability map only; Home/Channel use the discriminated scope, not different DTO taxonomies. */
export interface DiscoveryOperationsV1Target {
  questionDiscovery: { request: DiscoveryFeedRequestV1Target; response: DiscoveryPageV1Target<QuestionDiscoveryCardV1Target> };
  personDiscovery: { request: DiscoveryFeedRequestV1Target; response: DiscoveryPageV1Target<PersonDiscoveryCardV1Target> };
  searchAll: { request: DiscoverySearchAllRequestV1Target; response: SearchAllSectionsV1Target };
  searchPeople: { request: DiscoverySearchRequestV1Target; response: DiscoveryPageV1Target<PersonDiscoveryCardV1Target> };
  searchQuestions: { request: DiscoverySearchRequestV1Target; response: DiscoveryPageV1Target<QuestionDiscoveryCardV1Target> };
  editorialList: { request: DiscoveryPaginationV1Target; response: DiscoveryPageV1Target<EditorialFeatureSummaryV1Target> };
  editorialDetail: { request: { featureId: EditorialFeatureIdV1Target }; response: EditorialFeatureDetailV1Target | null };
}
