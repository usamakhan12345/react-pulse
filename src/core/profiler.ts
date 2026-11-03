import { createElement, Profiler } from "react";
import type { ProfilerOnRenderCallback, ReactNode } from "react";
import { getStore } from "./store";
import { markPerformance } from "./performance";
import { consoleLogger } from "../utils/logger";

export interface PulseProfilerProps {
  /** Name shown in the dashboard. Use a name no hook-tracked component uses. */
  id: string;
  /** Slow threshold in ms (default `config.threshold`). */
  threshold?: number;
  children?: ReactNode;
}

/**
 * Wraps React's public `<Profiler>` and records its exact `actualDuration`
 * (time React spent rendering the subtree for that commit). Unlike the hooks'
 * render-to-commit span this excludes commit work, but it only reports in
 * development and profiling builds of React. In a plain production build React
 * never calls `onRender`, so nothing is recorded.
 */
export function PulseProfiler({ id, threshold, children }: PulseProfilerProps) {
  const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration, baseDuration, start) => {
    const store = getStore();
    if (!store.config.trackRenders || !store.shouldTrack(id)) return;
    const limit = threshold ?? store.config.threshold;
    const rec = store.components.get(id);
    const at = Date.now();
    const mount = phase === "mount";
    const event = store.recordRender(
      {
        component: id,
        instance: 0,
        n: (rec?.renders ?? 0) + 1,
        at,
        sinceLast: rec && rec.renders ? at - rec.lastAt : null,
        duration: actualDuration,
        durationKind: "profiler",
        slow: actualDuration > limit,
        phase: mount ? "mount" : "update",
        reasons: [
          mount
            ? { kind: "mount", confidence: "certain" }
            : {
                kind: "unknown",
                confidence: "probable",
                detail:
                  phase === "nested-update"
                    ? "update scheduled during commit"
                    : "Profiler does not expose causes; add useRenderTracker inside",
              },
        ],
        changes: [],
        baseDuration,
      },
      limit,
    );
    if (store.config.performanceApi) markPerformance(id, start, start + actualDuration);
    if (store.config.log) (store.config.logger ?? consoleLogger).render(event);
  };
  return createElement(Profiler, { id, onRender }, children);
}
