import type { Change, ChangeSource, NameMatcher, RenderEvent, RenderReason } from "./types";
import { getStore } from "./store";
import { diffRecords } from "./comparator";
import { markPerformance, now } from "./performance";
import { consoleLogger } from "../utils/logger";

type Rec = Record<string, unknown>;

/** Values the component hands to ReactPulse so they can be compared between renders. */
export interface TrackInput {
  /** Props (or any props-like record). Compared by reference per key. */
  props?: Rec;
  /** Explicitly instrumented state values. */
  state?: Rec;
  /** Explicitly instrumented context values, e.g. `{ Theme: useContext(ThemeContext) }`. */
  context?: Rec;
  /** Values of hook dependencies you want to watch, e.g. `{ userId, filters }`. */
  deps?: Rec;
}

export interface TrackSettings {
  /**
   * Set to true when `props` is React's own props object. Its identity then
   * separates "parent rendered" (new object) from "internal update" (same
   * object). Leave false when passing a derived `{ a, b }` object.
   */
  rawProps?: boolean;
  /** Print this component's renders to the console (default: `config.log`). */
  log?: boolean;
  /** Skip console output for the initial mount. */
  logInitial?: boolean;
  /** Per-component slow render threshold in ms (default: `config.threshold`). */
  threshold?: number;
  /** Per-component deep comparison depth (default: `config.compareDepth`). */
  compareDepth?: number;
  /** Extra keys to ignore for this component, added to `config.ignoreProps`. */
  ignoreProps?: NameMatcher[];
  /** Called after each recorded render of this component. */
  onRender?: (event: RenderEvent) => void;
  /** Called after a slow render of this component. */
  onSlow?: (event: RenderEvent) => void;
  /** Log mount/unmount to the console. */
  logLifecycle?: boolean;
}

export type TrackOptions = TrackInput & TrackSettings;

export interface Analysis {
  mount: boolean;
  count: number;
  reasons: RenderReason[];
  changes: Change[];
}

export const EMPTY_ANALYSIS: Analysis = Object.freeze({
  mount: false,
  count: 0,
  reasons: Object.freeze([]) as unknown as RenderReason[],
  changes: Object.freeze([]) as unknown as Change[],
});

const SOURCES: ChangeSource[] = ["props", "state", "context", "hooks"];
const KEYS: Record<ChangeSource, keyof TrackInput> = {
  props: "props",
  state: "state",
  context: "context",
  hooks: "deps",
};

export function analyze(
  prev: TrackInput | undefined,
  cur: TrackInput,
  depth: number,
  ignore: NameMatcher[],
  rawProps: boolean | undefined,
): Omit<Analysis, "count"> {
  if (!prev)
    return { mount: true, reasons: [{ kind: "mount", confidence: "certain" }], changes: [] };

  const changes: Change[] = [];
  const reasons: RenderReason[] = [];
  for (const source of SOURCES) {
    const key = KEYS[source];
    const before = prev[key];
    const after = cur[key];
    if (!before && !after) continue;
    const found = diffRecords(source, before ?? {}, after ?? {}, { depth, ignore });
    if (!found.length) continue;
    changes.push(...found);
    reasons.push({
      kind: source,
      confidence: "certain",
      keys: found.map((c) => c.key),
      detail: found.every((c) => c.referenceOnly)
        ? "new identity but deep-equal values, this render may be avoidable"
        : undefined,
    });
  }
  if (!reasons.length) {
    if (rawProps && prev.props && cur.props) {
      reasons.push(
        prev.props !== cur.props
          ? {
              kind: "parent",
              confidence: "probable",
              detail: "the props object is new but every compared value is unchanged",
            }
          : {
              kind: "internal",
              confidence: "probable",
              detail:
                "same props object: own state, context, an external store or an uninstrumented hook changed",
            },
      );
    } else {
      reasons.push({
        kind: "unknown",
        confidence: "probable",
        detail: "nothing instrumented changed: parent re-render, or uninstrumented state/context",
      });
    }
  }
  return { mount: false, reasons, changes };
}

export interface Tracker {
  readonly instance: number;
  readonly mounted: boolean;
  /** Render phase. Pure apart from writing refs-like fields. Returns what is known so far. */
  begin(name: string, options: TrackOptions): Analysis;
  /** Sets the display name without tracking a render (used by `useMountTracker`). */
  setName(name: string): void;
  /** Commit phase (layout effect on every commit). Idempotent for StrictMode's double effects. */
  commit(): void;
  mount(options?: TrackSettings): void;
  unmount(): void;
}

let instances = 0;

export function createTracker(): Tracker {
  const instance = ++instances;
  let name = "";
  let prev: TrackInput | undefined;
  let cur: TrackInput | undefined;
  let pending: { t0: number; analysis: Analysis; settings: TrackSettings } | null = null;
  let count = 0;
  let lastEnd: number | null = null;
  let mounted = false;
  let counted = false;
  let mountedAt = 0;
  let logLifecycle = false;

  const tracker: Tracker = {
    instance,
    get mounted() {
      return mounted;
    },

    setName(n) {
      name = n;
    },

    begin(n, options) {
      name = n;
      const store = getStore();
      cur = {
        props: options.props,
        state: options.state,
        context: options.context,
        deps: options.deps,
      };
      if (!store.config.trackRenders || !store.shouldTrack(n)) {
        pending = null;
        return EMPTY_ANALYSIS;
      }
      const t0 = now();
      const { config } = store;
      const result = analyze(
        prev,
        cur,
        options.compareDepth ?? config.compareDepth,
        options.ignoreProps ? config.ignoreProps.concat(options.ignoreProps) : config.ignoreProps,
        options.rawProps,
      );
      const analysis: Analysis = { ...result, count: count + 1 };
      pending = { t0, analysis, settings: options };
      return analysis;
    },

    commit() {
      const done = pending;
      pending = null;
      if (cur) prev = cur;
      cur = undefined;
      if (!done) return;
      const store = getStore();
      const { config } = store;
      const end = now();
      const duration = end - done.t0;
      const threshold = done.settings.threshold ?? config.threshold;
      const { analysis, settings } = done;
      const event = store.recordRender(
        {
          component: name,
          instance,
          n: ++count,
          at: Date.now(),
          sinceLast: lastEnd === null ? null : end - lastEnd,
          duration,
          durationKind: "span",
          slow: duration > threshold,
          phase: analysis.mount ? "mount" : "update",
          reasons: analysis.reasons,
          changes: analysis.changes,
        },
        threshold,
      );
      lastEnd = end;
      if (config.performanceApi) markPerformance(name, done.t0, end);
      if ((settings.log ?? config.log) && !(analysis.mount && settings.logInitial === false)) {
        (config.logger ?? consoleLogger).render(event);
      }
      settings.onRender?.(event);
      if (event.slow) settings.onSlow?.(event);
    },

    mount(options) {
      mounted = true;
      if (options?.logLifecycle !== undefined) logLifecycle = options.logLifecycle;
      if (counted) return;
      const store = getStore();
      if (!store.isTracked(name)) return;
      counted = true;
      mountedAt = now();
      store.recordMount(name);
      if (logLifecycle) console.debug(`[reactpulse] ${name} mounted`);
    },

    unmount() {
      mounted = false;
      // StrictMode runs cleanup and setup back to back. Deferring one microtask
      // lets the re-mount cancel what was only a simulated unmount.
      void Promise.resolve().then(() => {
        if (mounted || !counted) return;
        counted = false;
        const lifetime = now() - mountedAt;
        getStore().recordUnmount(name, lifetime);
        if (logLifecycle) {
          console.debug(`[reactpulse] ${name} unmounted after ${lifetime.toFixed(0)}ms`);
        }
      });
    },
  };
  return tracker;
}
