export const CAPABILITY_AVAILABILITY = ["real", "mock", "unavailable"] as const;
export type CapabilityAvailability = (typeof CAPABILITY_AVAILABILITY)[number];

export interface ProductCapability {
  availability: CapabilityAvailability;
  productionReady: boolean;
  reason: string;
}

export const PAYMENT_CAPABILITIES = {
  wechatPrepay: {
    availability: "mock",
    productionReady: false,
    reason: "wechat-prepay currently returns a mock gateway payload",
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

export const SKILL_OFFER_CAPABILITY = {
  storage: {
    availability: "real",
    productionReady: true,
    reason: "public.skill_offers is the canonical persisted skill offer model",
  },
  publishAction: {
    availability: "unavailable",
    productionReady: false,
    reason: "current Skill Publish UI writes experts instead of skill_offers",
  },
} as const satisfies Record<string, ProductCapability>;
