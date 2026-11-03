import type { PulseConfig } from "./types";
import { getStore } from "./store";

/** Merge options into the global config (outside React, e.g. in an entry file). */
export function configurePulse(config: Partial<PulseConfig>): void {
  getStore().configure(config);
}

/** Force monitoring on, even in production builds. */
export function enablePulse(): void {
  getStore().setEnabled(true);
}

/** Switch monitoring off completely: hooks do no recording or comparison work. */
export function disablePulse(): void {
  getStore().setEnabled(false);
}

/** Temporarily stop recording but keep collected data. */
export function pausePulse(): void {
  getStore().pause();
}

export function resumePulse(): void {
  getStore().resume();
}

/** Delete recorded history (live instance counts are kept). */
export function clearPulse(): void {
  getStore().clear();
}
