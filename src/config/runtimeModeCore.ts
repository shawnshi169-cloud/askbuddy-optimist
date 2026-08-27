export const RUNTIME_MODES = ["development", "staging", "production"] as const;

export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export const RUNTIME_CAPABILITIES = [
  "mockData",
  "demoFallback",
  "legacyReadFallback",
  "legacyWriteFallback",
  "mockAuthToken",
  "mockPaymentGateway",
  "manualPaymentConfirmation",
] as const;

export type RuntimeCapability = (typeof RUNTIME_CAPABILITIES)[number];

const MODE_CAPABILITIES: Record<RuntimeMode, ReadonlySet<RuntimeCapability>> = {
  development: new Set(RUNTIME_CAPABILITIES),
  staging: new Set(["legacyReadFallback"]),
  production: new Set(),
};

export function resolveRuntimeMode(mode: string | undefined): RuntimeMode {
  if (mode === "development" || mode === "staging" || mode === "production") {
    return mode;
  }

  return "production";
}

export function isRuntimeCapabilityAllowedForMode(
  capability: RuntimeCapability,
  mode: RuntimeMode,
): boolean {
  return MODE_CAPABILITIES[mode].has(capability);
}

export function isPresentationFixtureAllowedForMode(
  mode: RuntimeMode,
  explicitlyRequested: boolean,
): boolean {
  return explicitlyRequested
    && mode === "development"
    && isRuntimeCapabilityAllowedForMode("mockData", mode)
    && isRuntimeCapabilityAllowedForMode("demoFallback", mode);
}
