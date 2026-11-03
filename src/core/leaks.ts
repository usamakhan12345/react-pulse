import type { LeakResource } from "./store";
import type { WarningKind } from "./types";
import { getStore } from "./store";

type Kind = LeakResource["kind"];
type Handle = ReturnType<typeof setTimeout>;

const WARNING_KIND: Record<Kind, WarningKind> = {
  timer: "leak-timer",
  interval: "leak-timer",
  listener: "leak-listener",
  subscription: "leak-subscription",
  resource: "leak-resource",
};

export interface LeakScope {
  setTimeout(fn: () => void, ms?: number, label?: string): Handle;
  clearTimeout(handle: Handle | undefined): void;
  setInterval(fn: () => void, ms?: number, label?: string): Handle;
  clearInterval(handle: Handle | undefined): void;
  /** Adds the listener and returns a function that removes it. */
  addEventListener(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
    label?: string,
  ): () => void;
  /** Runs `subscribe()` (which must return its unsubscribe function) and tracks it. */
  subscribe(subscribe: () => () => void, label?: string): () => void;
  /** Tracks any resource. Call the returned function when it is released. */
  track(label: string, kind?: Kind): () => void;
  /** Warns about everything this scope registered that is still active. */
  check(): number;
}

/**
 * Tracks timers, listeners and subscriptions created through its helpers, and
 * warns when they are still active at `check()` or registered suspiciously
 * often. It only knows about resources created through these helpers: it
 * cannot see a leak made with plain `setInterval` or `addEventListener`.
 * Everything is a pass-through when `config.leakDetection` is off.
 */
export function createLeakScope(owner: string): LeakScope {
  const mine = new Map<number, LeakResource>();
  const handles = new Map<Handle, () => void>();

  const register = (kind: Kind, label: string): (() => void) => {
    const store = getStore();
    if (!store.config.leakDetection || !store.isEnabled()) return () => {};
    const id = store.nextId();
    const resource: LeakResource = { id, kind, owner, label, at: Date.now() };
    store.leaks.live.set(id, resource);
    mine.set(id, resource);

    let count = 0;
    for (const r of store.leaks.live.values()) {
      if (r.owner === owner && r.kind === kind && r.label === label) count++;
    }
    const key = `${owner}|${kind}|${label}`;
    if (count >= store.config.leakRepeatThreshold && !store.leaks.warned.has(key)) {
      store.leaks.warned.add(key);
      store.recordWarning(
        "leak-repeated",
        `${owner} has ${count} live ${kind} "${label}" registrations. It is being registered repeatedly without being released.`,
        owner,
      );
    }
    return () => {
      store.leaks.live.delete(id);
      mine.delete(id);
    };
  };

  const timer =
    (kind: "timer" | "interval", start: typeof setTimeout, clear: typeof clearTimeout) =>
    (fn: () => void, ms?: number, label = kind): Handle => {
      const store = getStore();
      if (!store.config.leakDetection || !store.isEnabled()) return start(fn, ms);
      let release = () => {};
      const handle: Handle = start(
        kind === "timer"
          ? () => {
              handles.delete(handle);
              release();
              fn();
            }
          : fn,
        ms,
      );
      release = register(kind, label);
      handles.set(handle, () => {
        release();
        clear(handle);
      });
      return handle;
    };
  const clearer = (handle: Handle | undefined) => {
    if (handle === undefined) return;
    const stop = handles.get(handle);
    if (stop) {
      handles.delete(handle);
      stop();
    } else {
      clearTimeout(handle);
      clearInterval(handle);
    }
  };

  return {
    setTimeout: timer("timer", setTimeout, clearTimeout),
    setInterval: timer(
      "interval",
      setInterval as typeof setTimeout,
      clearInterval as typeof clearTimeout,
    ),
    clearTimeout: clearer,
    clearInterval: clearer,
    addEventListener(target, type, handler, options, label = type) {
      target.addEventListener(type, handler, options);
      const release = register("listener", label);
      return () => {
        target.removeEventListener(type, handler, options);
        release();
      };
    },
    subscribe(subscribe, label = "subscription") {
      const unsubscribe = subscribe();
      const release = register("subscription", label);
      return () => {
        unsubscribe();
        release();
      };
    },
    track: (label, kind = "resource") => register(kind, label),
    check() {
      const store = getStore();
      let reported = 0;
      for (const r of mine.values()) {
        const age = Date.now() - r.at;
        store.recordWarning(
          WARNING_KIND[r.kind],
          `${owner}: ${r.kind} "${r.label}" is still active after the component unmounted (registered ${age}ms earlier). Possible leak: release it in the effect cleanup.`,
          owner,
        );
        reported++;
      }
      mine.clear();
      return reported;
    },
  };
}
