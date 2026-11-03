import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getStore } from "../core/store";
import { preview } from "../utils/serialize";

/**
 * Drop-in replacement for `useState` that records every *committed* change.
 * Because changes are recorded after commit, batched updates and StrictMode
 * double invocations produce one entry per real change.
 *
 * Name the state `"Component.label"` to attribute it to a component in the
 * dashboard; a plain label is also accepted.
 *
 * @example
 * const [count, setCount] = useTrackedState(0, "Counter.count");
 */
export function useTrackedState<T>(
  initialValue: T | (() => T),
  name = "state",
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const last = useRef(value);

  useEffect(() => {
    const prev = last.current;
    if (Object.is(prev, value)) return;
    last.current = value;
    const store = getStore();
    const dot = name.indexOf(".");
    const component = dot > 0 ? name.slice(0, dot) : null;
    if (!store.shouldTrack(component ?? name)) return;
    store.recordState({
      component,
      label: dot > 0 ? name.slice(dot + 1) : name,
      prev,
      next: value,
      at: Date.now(),
    });
    if (store.config.log)
      console.log(`[reactpulse] ${name}: ${preview(prev)} -> ${preview(value)}`);
  }, [value, name]);

  return [value, setValue];
}
