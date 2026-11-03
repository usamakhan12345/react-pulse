import { useMemo } from "react";
import type { TrackSettings } from "../core/tracker";
import { getStore } from "../core/store";
import { afterNextPaint, now } from "../core/performance";
import { useRenderTracker } from "./useRenderTracker";

export type PerformanceTrackerOptions = Pick<
  TrackSettings,
  "threshold" | "log" | "onRender" | "onSlow"
>;

export interface PerformanceTracker {
  /**
   * Times `fn`. If it returns a promise the measurement ends when the promise
   * settles. Recorded as kind `measure`.
   */
  measure<T>(label: string, fn: () => T): T;
  /**
   * Starts timing a user interaction and returns `end()`. After `end()` is
   * called the duration runs until the browser's next paint (approximated with
   * requestAnimationFrame + a following task). Recorded as kind `interaction`.
   */
  startInteraction(label: string): () => void;
}

/**
 * Tracks render timing for the calling component (render-to-commit span, see
 * the README for what that does and does not include) and exposes helpers for
 * timing your own work. Do not combine with `useRenderTracker` on the same
 * component: both record renders.
 */
export function usePerformanceTracker(
  name: string,
  options: PerformanceTrackerOptions = {},
): PerformanceTracker {
  useRenderTracker(name, options);
  const threshold = options.threshold;

  return useMemo<PerformanceTracker>(() => {
    const record = (label: string, kind: "measure" | "interaction", start: number) => {
      const store = getStore();
      if (!store.shouldTrack(name)) return;
      const duration = now() - start;
      store.recordMeasure({
        component: name,
        label,
        kind,
        duration,
        slow: duration > (threshold ?? store.config.threshold),
        at: Date.now(),
      });
    };
    return {
      measure(label, fn) {
        const start = now();
        let result: ReturnType<typeof fn>;
        try {
          result = fn();
        } catch (error) {
          record(label, "measure", start);
          throw error;
        }
        const then = (result as { then?: unknown } | null)?.then;
        if (typeof then === "function") {
          const done = () => record(label, "measure", start);
          (result as unknown as Promise<unknown>).then(done, done);
        } else {
          record(label, "measure", start);
        }
        return result;
      },
      startInteraction(label) {
        const start = now();
        let ended = false;
        return () => {
          if (ended) return;
          ended = true;
          afterNextPaint(() => record(label, "interaction", start));
        };
      },
    };
  }, [name, threshold]);
}
