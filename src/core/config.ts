import type { NameMatcher, PulseConfig } from "./types";
import { isDev, isReactNative } from "../utils/environment";

export const defaultConfig: PulseConfig = {
  enabled: "auto",
  threshold: 16,
  trackRenders: true,
  showNotifications: true,
  log: false,
  warnings: true,
  historyLimit: 100,
  timelineLimit: 500,
  warningLimit: 100,
  compareDepth: 0,
  ignoreProps: ["children"],
  include: [],
  exclude: [],
  performanceApi: false,
  leakDetection: false,
  leakRepeatThreshold: 10,
  uiInterval: 100,
};

/**
 * Starting configuration. Evaluated lazily (not at module load) so that bundlers
 * can drop this code for apps that import only a small hook.
 */
export function initialConfig(): PulseConfig {
  // React Native turns console.warn into on-screen LogBox banners; the dashboard
  // and toasts show warnings there instead.
  return isReactNative() ? { ...defaultConfig, warnings: false } : defaultConfig;
}

export function resolveEnabled(value: PulseConfig["enabled"]): boolean {
  return value === "auto" ? isDev() : value;
}

export function matches(list: NameMatcher[], name: string): boolean {
  for (const m of list) {
    if (typeof m === "string" ? m === name : m.test(name)) return true;
  }
  return false;
}

/** Only copies defined values so `configure({ threshold: undefined })` is a no-op. */
export function mergeConfig(base: PulseConfig, patch: Partial<PulseConfig>): PulseConfig {
  const next = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) next[key] = value;
  }
  return next as unknown as PulseConfig;
}
