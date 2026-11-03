import { useEffect, useRef } from "react";
import type { LeakScope } from "../core/leaks";
import { createLeakScope } from "../core/leaks";

/**
 * Returns timer / listener / subscription helpers bound to `owner`. When the
 * component unmounts, anything created through them that is still active is
 * reported as a possible leak (requires `config.leakDetection`). StrictMode's
 * simulated unmount is ignored.
 *
 * @example
 * const leaks = useLeakTracker("Chat");
 * useEffect(() => {
 *   const id = leaks.setInterval(poll, 1000, "poll");
 *   return () => leaks.clearInterval(id);
 * }, []);
 */
export function useLeakTracker(owner: string): LeakScope {
  const ref = useRef<LeakScope | null>(null);
  const scope = (ref.current ??= createLeakScope(owner));
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Wait one microtask so the component's own cleanups (and StrictMode's
      // immediate re-mount) have happened before judging what is left.
      void Promise.resolve().then(() => {
        if (!mounted.current) scope.check();
      });
    };
  }, [scope]);
  return scope;
}
