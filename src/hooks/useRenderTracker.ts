import { useEffect, useRef } from "react";
import type { Analysis, Tracker, TrackOptions } from "../core/tracker";
import { createTracker } from "../core/tracker";
import { useIsoLayoutEffect } from "./shared";

export type RenderTrackerOptions = TrackOptions;

export interface RenderInfo {
  /** This render's number for this component instance (0 when monitoring is off). */
  renderCount: number;
  isInitialRender: boolean;
  reasons: Analysis["reasons"];
  changes: Analysis["changes"];
}

/**
 * Records every committed render of the calling component: count, timing,
 * changed props and likely reasons. Call it unconditionally at the top of the
 * component. It never triggers a render itself.
 *
 * @example
 * useRenderTracker("UserProfile", { props: { name, age }, log: true });
 */
export function useRenderTracker(name: string, options: RenderTrackerOptions = {}): RenderInfo {
  const ref = useRef<Tracker | null>(null);
  const tracker = (ref.current ??= createTracker());
  const analysis = tracker.begin(name, options);

  useIsoLayoutEffect(() => tracker.commit());
  useEffect(() => {
    tracker.mount(options);
    return () => tracker.unmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker]);

  return {
    renderCount: analysis.count,
    isInitialRender: analysis.mount,
    reasons: analysis.reasons,
    changes: analysis.changes,
  };
}
