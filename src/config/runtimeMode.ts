export const RUNTIME_MODES = ["development", "staging", "production"] as const;

export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export type RuntimeCapability =
  | "mockData"
  | "demoFallback"
  | "legacyReadFallback"
  | "legacyWriteFallback"
  | "mockAuthToken"
  | "mockPaymentGateway"
  | "manualPaymentConfirmation";

const MODE_CAPABILITIES: Record<RuntimeMode, ReadonlySet<RuntimeCapability>> = {
  development: new Set([
    "mockData",
    "demoFallback",
    "legacyReadFallback",
    "legacyWriteFallback",
    "mockAuthToken",
    "mockPaymentGateway",
    "manualPaymentConfirmation",
  ]),
  staging: new Set(["legacyReadFallback"]),
  production: new Set(),
};

const configuredMode = import.meta.env.VITE_APP_RUNTIME_MODE;

export const runtimeMode: RuntimeMode = RUNTIME_MODES.includes(
  configuredMode as RuntimeMode,
)
  ? (configuredMode as RuntimeMode)
  : import.meta.env.PROD
    ? "production"
    : "development";

export function isRuntimeCapabilityAllowed(
  capability: RuntimeCapability,
  mode: RuntimeMode = runtimeMode,
): boolean {
  return MODE_CAPABILITIES[mode].has(capability);
}

export function assertRuntimeCapability(
  capability: RuntimeCapability,
  context: string,
): void {
  if (!isRuntimeCapabilityAllowed(capability)) {
    throw new Error(
      `[runtime:${runtimeMode}] ${capability} is disabled for ${context}`,
    );
  }
}
