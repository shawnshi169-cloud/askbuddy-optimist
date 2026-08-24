export const CAPABILITY_AVAILABILITY = ["real", "mock", "unavailable"] as const;
export type CapabilityAvailability = (typeof CAPABILITY_AVAILABILITY)[number];

export interface ProductCapability {
  availability: CapabilityAvailability;
  productionReady: boolean;
  reason: string;
}

export const PAYMENT_CAPABILITIES = {
  wechatPrepay: {
    availability: "unavailable",
    productionReady: false,
    reason: "real WeChat payment is not implemented and production must fail closed",
  },
  wechatPrepayDevelopmentMock: {
    availability: "mock",
    productionReady: false,
    reason: "available only when server runtime is development/test and gateway mode is explicitly mock",
  },
  rechargeOrder: {
    availability: "unavailable",
    productionReady: false,
    reason: "current RPC uses pre-Pack06 order vocabulary",
  },
  legacyRecharge: {
    availability: "unavailable",
    productionReady: false,
    reason: "recharge_points is a deprecated compatibility path",
  },
} as const satisfies Record<string, ProductCapability>;

export const CONSULTATION_CAPABILITY = {
  availability: "unavailable",
  productionReady: false,
  reason: "create_consultation_order is incompatible with Pack06 orders and ledger paths",
} as const satisfies ProductCapability;

export const TOPIC_DISCUSSION_CAPABILITY = {
  publishAction: {
    availability: "unavailable",
    productionReady: false,
    reason: "no canonical publish RPC exists with the Pack07 moderation vocabulary",
  },
} as const satisfies Record<string, ProductCapability>;

export const SKILL_OFFER_CAPABILITY = {
  storage: {
    availability: "real",
    productionReady: true,
    reason: "public.skill_offers is the canonical persisted skill offer model",
  },
  publishBackendPath: {
    availability: "real",
    productionReady: true,
    reason: "owner-scoped INSERT/UPDATE RLS supports canonical skill_offers persistence",
  },
  currentClientAction: {
    availability: "real",
    productionReady: true,
    reason: "Skill Publish persists owner-scoped canonical skill_offers rows",
  },
} as const satisfies Record<string, ProductCapability>;
