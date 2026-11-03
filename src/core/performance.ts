import type { ComponentRecord } from "./types";

/** High resolution clock with a Date fallback (very old runtimes / odd test envs). */
export function now(): number {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

export function averageDuration(record: Pick<ComponentRecord, "measured" | "totalDuration">) {
  return record.measured ? record.totalDuration / record.measured : 0;
}

/**
 * Emits a User Timing entry so renders show up in the browser's Performance
 * panel. Never throws: older browsers lack the options form of `measure`.
 */
export function markPerformance(name: string, start: number, end: number): void {
  try {
    performance.measure(`⚛ ${name}`, { start, end });
  } catch {
    /* unsupported: ignore */
  }
}

/**
 * Calls `cb` after the browser has (very likely) painted the next frame. This
 * is an approximation built on public APIs: requestAnimationFrame fires before
 * paint, the following task runs after it. Background tabs do not paint and
 * therefore delay the callback.
 */
export function afterNextPaint(cb: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => setTimeout(cb, 0));
  } else {
    setTimeout(cb, 0);
  }
}
