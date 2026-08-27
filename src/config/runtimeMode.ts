import {
  isPresentationFixtureAllowedForMode,
  isRuntimeCapabilityAllowedForMode,
  resolveRuntimeMode,
} from "./runtimeModeCore";
import type { RuntimeCapability, RuntimeMode } from "./runtimeModeCore";

export {
  RUNTIME_CAPABILITIES,
  RUNTIME_MODES,
  resolveRuntimeMode,
} from "./runtimeModeCore";
export type { RuntimeCapability, RuntimeMode } from "./runtimeModeCore";

// Vite MODE is a build fact. Client-provided VITE_* values cannot downgrade it.
export const runtimeMode: RuntimeMode = resolveRuntimeMode(import.meta.env.MODE);
const presentationFixturesExplicitlyRequested = import.meta.env.VITE_PRESENTATION_FIXTURES === "true";

export function isPresentationFixtureAllowed(
  mode: RuntimeMode = runtimeMode,
): boolean {
  return isPresentationFixtureAllowedForMode(
    mode,
    presentationFixturesExplicitlyRequested,
  );
}

export function isRuntimeCapabilityAllowed(
  capability: RuntimeCapability,
  mode: RuntimeMode = runtimeMode,
): boolean {
  return isRuntimeCapabilityAllowedForMode(capability, mode);
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
