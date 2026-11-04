/** Where a changed value came from. */
export type ChangeSource = "props" | "state" | "context" | "hooks";

/**
 * - `certain`: derived from values ReactPulse compared directly.
 * - `probable`: inferred; React's public API does not expose the real cause.
 */
export type Confidence = "certain" | "probable";

export type ReasonKind =
  | "mount"
  | "props"
  | "state"
  | "context"
  | "hooks"
  /** Props are identical by value but the props object is new: the parent rendered. */
  | "parent"
  /** The props object is the same: own state, context, store or hook changed. */
  | "internal"
  /** Nothing instrumented changed and the props object identity is unknown. */
  | "unknown";

export interface RenderReason {
  kind: ReasonKind;
  confidence: Confidence;
  /** Changed keys for `props` / `state` / `context` / `hooks`. */
  keys?: string[];
  /** Human readable explanation, mostly for uncertain reasons. */
  detail?: string;
}

export interface Change {
  source: ChangeSource;
  key: string;
  prev: unknown;
  next: unknown;
  /** The identity changed but the values are deep-equal within `compareDepth`. */
  referenceOnly?: boolean;
}

/**
 * What `duration` measures:
 * - `span`: from the hook call during render until the layout effect after commit.
 *   Includes descendants, every component React renders after this hook call in the same
 *   pass (layout effects only run once the whole tree has rendered) and DOM mutation;
 *   excludes paint. It is an upper bound that is most inflated on large commits.
 * - `profiler`: React `actualDuration` reported by `<PulseProfiler>` (exact React render time).
 */
export type DurationKind = "span" | "profiler";

export interface RenderEvent {
  id: number;
  component: string;
  /** Instance number; unique per mounted component instance. */
  instance: number;
  /** Render number for this instance, starting at 1. */
  n: number;
  /** Epoch milliseconds at commit. */
  at: number;
  /** Milliseconds since the previous render of the same instance. */
  sinceLast: number | null;
  duration: number | null;
  durationKind: DurationKind;
  slow: boolean;
  phase: "mount" | "update";
  reasons: RenderReason[];
  changes: Change[];
  /** Only set for profiler events. */
  baseDuration?: number;
}

export interface ComponentRecord {
  name: string;
  kind: "hook" | "profiler";
  /** Committed renders (including mounts). */
  renders: number;
  /** Renders after the first, i.e. re-renders. */
  rerenders: number;
  mounts: number;
  unmounts: number;
  /** Instances currently mounted. */
  live: number;
  /** Number of renders that have a duration. */
  measured: number;
  totalDuration: number;
  maxDuration: number;
  lastDuration: number | null;
  slowRenders: number;
  firstAt: number;
  lastAt: number;
  lastLifetime: number | null;
  /** Newest last, limited by `historyLimit`. */
  events: RenderEvent[];
  imported?: boolean;
}

export type WarningKind =
  | "slow-render"
  | "leak-timer"
  | "leak-listener"
  | "leak-subscription"
  | "leak-resource"
  | "leak-repeated";

export interface PulseWarning {
  id: number;
  kind: WarningKind;
  component?: string;
  message: string;
  at: number;
}

export interface MeasureEvent {
  id: number;
  component: string;
  label: string;
  /** `measure`: synchronous function. `interaction`: start until next paint (approximate). */
  kind: "measure" | "interaction";
  duration: number;
  slow: boolean;
  at: number;
}

export interface StateChange {
  id: number;
  component: string | null;
  label: string;
  prev: unknown;
  next: unknown;
  at: number;
}

export interface PulseLogger {
  render(event: RenderEvent): void;
  warning(warning: PulseWarning): void;
}

export type NameMatcher = string | RegExp;

export interface PulseConfig {
  /**
   * `"auto"` (default) enables monitoring unless `NODE_ENV === "production"`.
   * Use `true` to monitor in production and `false` to switch everything off.
   */
  enabled: boolean | "auto";
  /** Renders slower than this many milliseconds are flagged as slow. */
  threshold: number;
  /** Record renders from hooks. When false only the dashboard / warnings stay available. */
  trackRenders: boolean;
  /** Show in-page toast notifications for warnings (needs the dashboard). */
  showNotifications: boolean;
  /** Print every tracked render to the console. */
  log: boolean;
  /** Print warnings (slow renders, leaks) with console.warn. */
  warnings: boolean;
  /** Max render events kept per component. */
  historyLimit: number;
  /** Max render events kept in the global timeline. */
  timelineLimit: number;
  /** Max warnings kept. */
  warningLimit: number;
  /**
   * 0 compares by reference only. Higher values deep-compare changed values to
   * that depth, to flag "new identity, same value" renders.
   */
  compareDepth: number;
  /** Prop/state keys that are never compared. */
  ignoreProps: NameMatcher[];
  /** Only track these components when non-empty. */
  include: NameMatcher[];
  /** Never track these components. */
  exclude: NameMatcher[];
  /** Also emit `performance.measure()` entries (User Timing) for tracked renders. */
  performanceApi: boolean;
  /** Enable the leak helpers (`useLeakTracker`, `createLeakScope`). */
  leakDetection: boolean;
  /** Warn when this many live resources share owner, kind and label. */
  leakRepeatThreshold: number;
  /** Minimum ms between dashboard refreshes. */
  uiInterval: number;
  /** Called after every recorded render. */
  onRender?: (event: RenderEvent) => void;
  /** Called after a slow render is recorded. */
  onSlowRender?: (event: RenderEvent) => void;
  /** Called for every warning. */
  onWarning?: (warning: PulseWarning) => void;
  /** Replace the default console output. */
  logger?: PulseLogger;
}

export interface Report {
  format: "reactpulse-report";
  version: 1;
  createdAt: string;
  environment: { userAgent?: string; url?: string; react?: string; reactpulse: string };
  config: Pick<
    PulseConfig,
    "threshold" | "historyLimit" | "timelineLimit" | "compareDepth" | "performanceApi"
  >;
  components: ComponentRecord[];
  warnings: PulseWarning[];
  measures: MeasureEvent[];
  stateLog: StateChange[];
}
