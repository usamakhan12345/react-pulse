import { useCallback, useEffect, useRef } from "react";
import type { Tracker } from "../core/tracker";
import { createTracker } from "../core/tracker";

export interface MountTrackerOptions {
  /** Print mount / unmount (with lifetime) to the console. */
  log?: boolean;
}

/**
 * Records mounts, unmounts and lifetime of the calling component and returns
 * a stable `isMounted()` function (useful to guard async callbacks).
 * StrictMode's simulated unmount/remount is not counted.
 *
 * Use `useRenderTracker` alone if you also want render tracking: it already
 * records mounts, and using both on one component counts each mount twice.
 */
export function useMountTracker(
  name = "Anonymous",
  options: MountTrackerOptions = {},
): () => boolean {
  const ref = useRef<Tracker | null>(null);
  const tracker = (ref.current ??= createTracker());
  tracker.setName(name);
  useEffect(() => {
    tracker.mount({ logLifecycle: options.log });
    return () => tracker.unmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker]);
  return useCallback(() => tracker.mounted, [tracker]);
}
