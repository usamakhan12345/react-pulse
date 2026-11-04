import type {
  ComponentRecord,
  MeasureEvent,
  PulseConfig,
  PulseWarning,
  RenderEvent,
  StateChange,
  WarningKind,
} from "./types";
import { initialConfig, matches, mergeConfig, resolveEnabled } from "./config";
import { consoleLogger } from "../utils/logger";
import { getGlobal } from "../utils/environment";

export interface LeakResource {
  id: number;
  kind: "timer" | "interval" | "listener" | "subscription" | "resource";
  owner: string;
  label: string;
  at: number;
}

export interface Store {
  readonly config: PulseConfig;
  configure(patch: Partial<PulseConfig>): void;
  resetConfig(): void;
  /** Monitoring is enabled and not paused. */
  isActive(): boolean;
  /** Enabled, and the component passes include/exclude filters (ignores pause). */
  isTracked(name: string): boolean;
  /** Active (enabled and not paused) and the component passes the filters. */
  shouldTrack(name: string): boolean;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  readonly paused: boolean;
  pause(): void;
  resume(): void;

  getVersion(): number;
  subscribe(listener: () => void): () => void;
  /** Notify subscribers immediately instead of waiting for `uiInterval`. */
  flush(): void;

  readonly components: Map<string, ComponentRecord>;
  readonly timeline: RenderEvent[];
  readonly warnings: PulseWarning[];
  readonly measures: MeasureEvent[];
  readonly stateLog: StateChange[];
  readonly leaks: { live: Map<number, LeakResource>; warned: Set<string> };

  nextId(): number;
  recordRender(event: Omit<RenderEvent, "id">, threshold?: number): RenderEvent;
  recordMount(name: string, kind?: ComponentRecord["kind"]): void;
  recordUnmount(name: string, lifetime?: number): void;
  recordWarning(kind: WarningKind, message: string, component?: string): PulseWarning;
  recordMeasure(event: Omit<MeasureEvent, "id">): MeasureEvent;
  recordState(change: Omit<StateChange, "id">): void;
  clear(): void;
  /** Bump the version and notify subscribers after mutating the store's collections directly. */
  changed(): void;
}

export function trim<T>(list: T[], limit: number): void {
  if (list.length > limit) list.splice(0, list.length - Math.max(0, limit));
}

function emptyRecord(name: string, kind: ComponentRecord["kind"]): ComponentRecord {
  const t = Date.now();
  return {
    name,
    kind,
    renders: 0,
    rerenders: 0,
    mounts: 0,
    unmounts: 0,
    live: 0,
    measured: 0,
    totalDuration: 0,
    maxDuration: 0,
    lastDuration: null,
    slowRenders: 0,
    firstAt: t,
    lastAt: t,
    lastLifetime: null,
    events: [],
  };
}

export function createStore(): Store {
  let config: PulseConfig = initialConfig();
  let enabled = resolveEnabled(config.enabled);
  let paused = false;
  let version = 0;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastFlush = 0;
  const listeners = new Set<() => void>();

  const components = new Map<string, ComponentRecord>();
  const timeline: RenderEvent[] = [];
  const warnings: PulseWarning[] = [];
  const measures: MeasureEvent[] = [];
  const stateLog: StateChange[] = [];
  const leaks = { live: new Map<number, LeakResource>(), warned: new Set<string>() };

  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    lastFlush = Date.now();
    listeners.forEach((l) => l());
  };

  const touch = () => {
    version++;
    if (!listeners.size || timer !== undefined) return;
    timer = setTimeout(flush, Math.max(0, config.uiInterval - (Date.now() - lastFlush)));
  };

  const record = (name: string, kind: ComponentRecord["kind"] = "hook") => {
    let rec = components.get(name);
    if (!rec) components.set(name, (rec = emptyRecord(name, kind)));
    return rec;
  };

  const store: Store = {
    get config() {
      return config;
    },
    configure(patch) {
      config = mergeConfig(config, patch);
      enabled = resolveEnabled(config.enabled);
      trim(timeline, config.timelineLimit);
      trim(warnings, config.warningLimit);
      components.forEach((r) => trim(r.events, config.historyLimit));
      touch();
    },
    resetConfig() {
      config = initialConfig();
      enabled = resolveEnabled(config.enabled);
      touch();
    },
    isActive: () => enabled && !paused,
    isEnabled: () => enabled,
    setEnabled(value) {
      config = { ...config, enabled: value };
      enabled = value;
      touch();
    },
    isTracked(name) {
      if (!enabled) return false;
      if (config.exclude.length && matches(config.exclude, name)) return false;
      return !config.include.length || matches(config.include, name);
    },
    shouldTrack(name) {
      return !paused && store.isTracked(name);
    },
    get paused() {
      return paused;
    },
    pause() {
      paused = true;
      touch();
    },
    resume() {
      paused = false;
      touch();
    },

    getVersion: () => version,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    flush,

    components,
    timeline,
    warnings,
    measures,
    stateLog,
    leaks,

    nextId: () => ++seq,

    recordRender(input, threshold = config.threshold) {
      const event: RenderEvent = { ...input, id: ++seq };
      const rec = record(event.component, event.durationKind === "profiler" ? "profiler" : "hook");
      rec.renders++;
      if (event.phase === "update") rec.rerenders++;
      rec.lastAt = event.at;
      if (event.duration !== null) {
        rec.measured++;
        rec.totalDuration += event.duration;
        rec.lastDuration = event.duration;
        if (event.duration > rec.maxDuration) rec.maxDuration = event.duration;
      }
      rec.events.push(event);
      trim(rec.events, config.historyLimit);
      timeline.push(event);
      trim(timeline, config.timelineLimit);
      if (event.slow) {
        rec.slowRenders++;
        store.recordWarning(
          "slow-render",
          `${event.component} took ${event.duration!.toFixed(1)}ms to ${
            event.durationKind === "profiler" ? "render" : "render and commit"
          } (threshold ${threshold}ms)`,
          event.component,
        );
        config.onSlowRender?.(event);
      }
      config.onRender?.(event);
      touch();
      return event;
    },

    recordMount(name, kind) {
      const rec = record(name, kind);
      rec.mounts++;
      rec.live++;
      touch();
    },
    recordUnmount(name, lifetime) {
      const rec = components.get(name);
      if (!rec) return;
      rec.unmounts++;
      rec.live = Math.max(0, rec.live - 1);
      if (lifetime !== undefined) rec.lastLifetime = lifetime;
      touch();
    },

    recordWarning(kind, message, component) {
      const warning: PulseWarning = { id: ++seq, kind, message, component, at: Date.now() };
      warnings.push(warning);
      trim(warnings, config.warningLimit);
      if (config.warnings) (config.logger ?? consoleLogger).warning(warning);
      config.onWarning?.(warning);
      touch();
      return warning;
    },

    recordMeasure(input) {
      const event: MeasureEvent = { ...input, id: ++seq };
      measures.push(event);
      trim(measures, 200);
      if (event.slow) {
        store.recordWarning(
          "slow-render",
          `${event.component} "${event.label}" took ${event.duration.toFixed(1)}ms (${event.kind}, threshold ${config.threshold}ms)`,
          event.component,
        );
      }
      touch();
      return event;
    },

    recordState(input) {
      stateLog.push({ ...input, id: ++seq });
      trim(stateLog, 200);
      touch();
    },

    clear() {
      for (const [name, rec] of components) {
        if (rec.live > 0) {
          const fresh = emptyRecord(name, rec.kind);
          fresh.mounts = fresh.live = rec.live;
          components.set(name, fresh);
        } else {
          components.delete(name);
        }
      }
      timeline.length = warnings.length = measures.length = stateLog.length = 0;
      touch();
    },

    changed: touch,
  };
  return store;
}

const KEY = Symbol.for("reactpulse.store.v1");

/**
 * The process-wide store. It lives on `globalThis` so the core and devtools
 * bundles (and ESM/CJS copies of the package) always share the same data.
 */
export function getStore(): Store {
  const g = getGlobal() as unknown as Record<symbol, Store | undefined>;
  return (g[KEY] ??= createStore());
}

/** Test helper: drop the shared store so the next `getStore()` starts fresh. */
export function resetStore(): void {
  delete (getGlobal() as unknown as Record<symbol, Store | undefined>)[KEY];
}
