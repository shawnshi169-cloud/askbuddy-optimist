export const BLUEPRINT_RUNTIME_STATUS = [
  "production-ready",
  "partial",
  "legacy-compatibility",
  "not-deployed",
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
  person: {
    domain: "person",
    target: "PublicPersonId + get_public_person_profile_v1",
    currentRuntime: "safe public projection deployed; legacy expert routes remain",
    runtimeStatus: "production-ready",
    newCodePolicy: "may-use-deployed-contract",
    phase: "EC-1",
  },
  experience: {
    domain: "experience",
    target: "Person-owned experience records independent from verification and service",
    currentRuntime: "no canonical experience storage or API",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-1",
  },
  questionAnswerReply: {
    domain: "question-answer-reply",
    target: "free public answers, helpful feedback, one-level replies, no acceptance",
    currentRuntime: "accepted-answer and point-reward fields/RPCs remain active",
    runtimeStatus: "legacy-compatibility",
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
    target: "Person-owned voice/video availability with one base RMB price",
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
  communityRecording: {
    domain: "community-recording",
    target: "many-to-many Community plus explicit paid-media recording consent",
    currentRuntime: "neither canonical Community nor recording lifecycle is deployed",
    runtimeStatus: "not-deployed",
    newCodePolicy: "blocked-until-phase",
    phase: "EC-5",
  },
} as const satisfies Record<string, BlueprintDomainContract>;

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
