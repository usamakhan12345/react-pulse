// Provider
export { ReactPulse } from "./provider/ReactPulse";
export type { DevtoolsOptions, DevtoolsProps, ReactPulseProps } from "./provider/ReactPulse";

// Hooks
export { useRenderTracker } from "./hooks/useRenderTracker";
export type { RenderInfo, RenderTrackerOptions } from "./hooks/useRenderTracker";
export { useWhyDidYouRender } from "./hooks/useWhyDidYouRender";
export type { WhyDidYouRenderOptions } from "./hooks/useWhyDidYouRender";
export { usePrevious } from "./hooks/usePrevious";
export { useMountTracker } from "./hooks/useMountTracker";
export type { MountTrackerOptions } from "./hooks/useMountTracker";
export { usePerformanceTracker } from "./hooks/usePerformanceTracker";
export type { PerformanceTracker, PerformanceTrackerOptions } from "./hooks/usePerformanceTracker";
export { useTrackedState } from "./hooks/useTrackedState";
export { useLeakTracker } from "./hooks/useLeakTracker";

// Profiler & leak helpers
export { PulseProfiler } from "./core/profiler";
export type { PulseProfilerProps } from "./core/profiler";
export { createLeakScope } from "./core/leaks";
export type { LeakScope } from "./core/leaks";

// Global control
export { getStore as getPulseStore } from "./core/store";
export type { Store as PulseStore } from "./core/store";
export { averageDuration } from "./core/performance";
export { isEqual as deepEqual } from "./core/comparator";
export {
  configurePulse,
  enablePulse,
  disablePulse,
  pausePulse,
  resumePulse,
  clearPulse,
} from "./core/control";

// Reports
export {
  exportReport,
  exportReportJSON,
  downloadReport,
  importReport,
  parseReport,
  ReportError,
} from "./utils/exporter";
export type { ImportOptions } from "./utils/exporter";
export { preview, toJSONSafe } from "./utils/serialize";
export { VERSION } from "./utils/environment";

export type * from "./core/types";
export type { TrackInput, TrackSettings } from "./core/tracker";
