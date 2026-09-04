export const BLUEPRINT_RUNTIME_STATUS = [
  "production-ready",
  "partial",
  "legacy-compatibility",
  "not-deployed",
  "contract-proposed",
  "contract-approved",
] as const;
export type BlueprintRuntimeStatus = (typeof BLUEPRINT_RUNTIME_STATUS)[number];

export const BLUEPRINT_NEW_CODE_POLICY = [
  "may-use-deployed-contract",
  "target-contract-only",
  "blocked-until-phase",
] as const;
export type BlueprintNewCodePolicy = (typeof BLUEPRINT_NEW_CODE_POLICY)[number];

export type BlueprintPhase = "EC-1" | "EC-2" | "EC-3" | "EC-4" | "EC-5";

export interface BlueprintDomainContract {
  domain: string;
  target: string;
  currentRuntime: string;
  runtimeStatus: BlueprintRuntimeStatus;
  newCodePolicy: BlueprintNewCodePolicy;
  phase: BlueprintPhase;
}

/**
 * Target Product Contract 与 Current Runtime Truth 的唯一机器可读映射。
 * production-ready 只用于已经部署并验证的 contract；其余目标不能伪装为可调用能力。
 */
export const PRODUCT_BLUEPRINT_V1_DOMAIN_MAP = {
  publicPersonIdentityAndRead: {
    domain: "public-person-identity-and-read",
    target: "PublicPersonId + get_public_person_profile_v1",
    currentRuntime: "safe public projection deployed; /person consumer route is not wired",
    runtimeStatus: "production-ready",
    newCodePolicy: "may-use-deployed-contract",
    phase: "EC-1",
  },
  experience: {
    domain: "experience",
    target: "Person-owned experience records independent from verification and service",
    currentRuntime: "Production storage and 13 Experience RPCs deployed and remote-smoke verified; Shared Core UI is not wired",
    runtimeStatus: "production-ready",
    newCodePolicy: "may-use-deployed-contract",
    phase: "EC-1",
  },
  questionAnswerReply: {
    domain: "question-answer-reply",
    target: "free public answers, helpful feedback, one-level replies, no acceptance",
    currentRuntime: "EC-2A contract approved, not deployed, not client consumable; accepted-answer and point-reward legacy fields/RPCs remain active",
    runtimeStatus: "contract-approved",
    newCodePolicy: "target-contract-only",
    phase: "EC-2",
  },
  homeSearchMatching: {
    domain: "home-search-matching",
    target: "all/person/question search with Experience match reasons",
    currentRuntime: "search_app_content_v2 returns question/expert/skill/post",
    runtimeStatus: "legacy-compatibility",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-3",
  },
  productChannels: {
    domain: "product-channels",
    target: "stable four-channel navigation with Person/Question discovery",
    currentRuntime: "PRODUCT_CHANNEL_CATALOG is stable; current feed still returns experts",
    runtimeStatus: "partial",
    newCodePolicy: "target-contract-only",
    phase: "EC-3",
  },
  canonicalTopic: {
    domain: "canonical-topic",
    target: "cross-module semantic layer distinct from Discover social topics/hashtags",
    currentRuntime: "no canonical cross-module topic storage or API",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-3",
  },
  transition: {
    domain: "transition",
    target: "directed Experience relationship for Person graph and matching",
    currentRuntime: "Production directed Transition storage and owner RPCs deployed and remote-smoke verified",
    runtimeStatus: "production-ready",
    newCodePolicy: "may-use-deployed-contract",
    phase: "EC-1",
  },
  location: {
    domain: "location",
    target: "city-level discovery dimension independent from Topic",
    currentRuntime: "city/city_code exist across legacy relations without one canonical contract",
    runtimeStatus: "partial",
    newCodePolicy: "target-contract-only",
    phase: "EC-3",
  },
  personOnboarding: {
    domain: "person-onboarding",
    target: "lightweight initial Person basics and optional Need/Interest/Experience seeds",
    currentRuntime: "no canonical Blueprint onboarding contract",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-1",
  },
  dynamicNeedInterestSignals: {
    domain: "dynamic-need-interest-signals",
    target: "decaying current Need/Interest signals distinct from accumulated Experience",
    currentRuntime: "no canonical dynamic Person model or signal store",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-3",
  },
  discover: {
    domain: "discover",
    target: "Post + Topic + Person social graph; Community is separate",
    currentRuntime: "posts/topics exist; community contract does not",
    runtimeStatus: "partial",
    newCodePolicy: "target-contract-only",
    phase: "EC-3",
  },
  conversation: {
    domain: "conversation",
    target: "person-to-person conversation entered only by chat or booking",
    currentRuntime: "direct-message compatibility RPC and conversation tables exist",
    runtimeStatus: "legacy-compatibility",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-4",
  },
  service: {
    domain: "service",
    target: "optional Person-owned voice/video capability with one base RMB price when enabled",
    currentRuntime: "expert-gated skill_offers remain compatibility storage",
    runtimeStatus: "legacy-compatibility",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-4",
  },
  bookingPayment: {
    domain: "booking-payment",
    target: "negotiated booking followed by fail-closed RMB payment and settlement",
    currentRuntime: "legacy points/order paths are blocked or compatibility-only",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-4",
  },
  reputationVerification: {
    domain: "reputation-verification",
    target: "service facts/evaluation separated from typed claim verification",
    currentRuntime: "legacy counters and generic verification flags are not canonical",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-5",
  },
  notificationAttention: {
    domain: "notification-attention",
    target: "read history separated from action-required/resolved attention",
    currentRuntime: "unread notification count exists; action queue contract does not",
    runtimeStatus: "partial",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-5",
  },
  community: {
    domain: "community",
    target: "long-running many-to-many Community distinct from Topic and Conversation",
    currentRuntime: "no canonical Community storage or API",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-5",
  },
  recordingLifecycle: {
    domain: "recording-lifecycle",
    target: "paid Voice/Video recording association and explicit informed consent",
    currentRuntime: "call sessions do not provide canonical recording lifecycle",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-4",
  },
} as const satisfies Record<string, BlueprintDomainContract>;

export const PRODUCT_SEMANTIC_BOUNDARIES_V1 = {
  channel: {
    role: "product-navigation-and-coarse-organization",
    isPersonIdentity: false,
    isMatchingCoreProfile: false,
    questionHasOnePrimaryChannel: true,
    experienceRequiresOneChannel: false,
  },
  canonicalTopic: {
    role: "cross-module-semantic-layer",
    sameAsDiscoverSocialTopic: false,
  },
  transition: {
    role: "directed-experience-relationship",
    sameAsCanonicalTopic: false,
    reducibleToStringTag: false,
  },
  location: {
    role: "geographic-context",
    sameAsCanonicalTopic: false,
    v1Precision: "city",
  },
} as const;

export const DYNAMIC_PERSON_MODEL_V1 = {
  permanentUserTypeAllowed: false,
  accumulatedExperience: "durable-history",
  currentNeed: "dynamic-decaying-signal",
  currentInterest: "dynamic-decaying-signal",
  onboarding: {
    role: "initial-snapshot",
    requiresExpertChoice: false,
    requiresProviderChoice: false,
    requiresCompleteResume: false,
    requiresExperience: false,
    requiresVerification: false,
    requiresServiceEnabled: false,
  },
} as const;

export const BOOKING_PAYMENT_INVARIANTS_V1 = {
  bookingRequestChargesPayment: false,
  bookingConfirmedRequiresPaymentSuccess: true,
  paymentTiming: "full-payment-before-exchange",
  settlementTiming: "after-service-completion-and-finite-dispute-window",
  platformHoldsFundsBeforeSettlement: true,
  independentFacts: ["payment", "service-completion", "settlement", "rating"],
  policyValuesDeferred: [
    "payment-timeout",
    "cancellation-threshold",
    "dispute-window",
    "commission-rate",
  ],
} as const;

export type BlueprintRpcUse = "canonical-blueprint" | "legacy-compatibility";

export interface BlueprintRpcPolicy {
  use: BlueprintRpcUse;
  newBlueprintCodeMayDepend: boolean;
  replacement: string;
}

export const PRODUCT_BLUEPRINT_V1_RPC_POLICY = {
  get_public_person_profile_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none",
  },
  get_public_person_experiences_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and remote-smoke verified",
  },
  get_my_person_experiences_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and remote-smoke verified",
  },
  create_person_experience_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and owner-smoke verified",
  },
  update_person_experience_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and owner-smoke verified",
  },
  set_person_experience_visibility_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and public/private RLS-smoke verified",
  },
  reorder_person_experiences_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and full-set reorder-smoke verified",
  },
  delete_person_experience_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and soft-delete projection-smoke verified",
  },
  create_experience_transition_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and owner-smoke verified",
  },
  update_experience_transition_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and owner-smoke verified",
  },
  delete_experience_transition_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: true,
    replacement: "none; Production deployed and owner-smoke verified",
  },
  create_experience_claim_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: false,
    replacement: "Production-deployed owner-only Claim infrastructure; client consumption remains gated until the Verification/Claim workflow is explicitly enabled",
  },
  update_experience_claim_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: false,
    replacement: "Production-deployed owner-only Claim infrastructure; client consumption remains gated until the Verification/Claim workflow is explicitly enabled",
  },
  delete_experience_claim_v1: {
    use: "canonical-blueprint",
    newBlueprintCodeMayDepend: false,
    replacement: "Production-deployed owner-only Claim infrastructure; client consumption remains gated until the Verification/Claim workflow is explicitly enabled",
  },
  accept_answer_v2: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-2 helpful and reply actions without answer acceptance",
  },
  accept_answer_and_transfer_points: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "none; retire after accepted-answer consumer cutover",
  },
  create_question_secure: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-2 question publish contract with optional deep-exchange budget",
  },
  create_answer_secure: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-2A create_answer_v1 proposal; ordinary consumer remains gated until deployment and review",
  },
  search_app_content_v2: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-3 all/person/question search contract",
  },
  get_search_suggestions_v2: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-3 all/person/question suggestion contract",
  },
  get_channel_feed: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-3 channel question/person discovery contract",
  },
  get_nearby_experts: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-3 Person discovery contract",
  },
  send_direct_message: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-4 conversation entry/action contract",
  },
  create_consultation_order: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "EC-4 Person booking and RMB transaction contracts",
  },
  recharge_points: {
    use: "legacy-compatibility",
    newBlueprintCodeMayDepend: false,
    replacement: "none; points are not Blueprint v1 service currency",
  },
} as const satisfies Record<string, BlueprintRpcPolicy>;

export const LEGACY_CONTRACT_DEPENDENCY_POLICY = {
  expertIdentity: false,
  skillOfferAsService: false,
  acceptedAnswer: false,
  questionRewardPoints: false,
  pointServiceTransaction: false,
  genericVerification: false,
} as const;
