import { version as reactVersion } from "react";
import type { Change, ComponentRecord, RenderEvent, Report } from "../core/types";
import { getStore, trim } from "../core/store";
import type { Store } from "../core/store";
import { isBrowser, VERSION } from "./environment";
import { toJSONSafe } from "./serialize";

export class ReportError extends Error {
  constructor(message: string) {
    super(`Invalid ReactPulse report: ${message}`);
    this.name = "ReportError";
  }
}

const safe = (v: unknown) => toJSONSafe(v, { depth: 4 });

function exportEvent(e: RenderEvent): RenderEvent {
  return {
    ...e,
    changes: e.changes.map((c): Change => ({ ...c, prev: safe(c.prev), next: safe(c.next) })),
  };
}

/** Snapshot of everything currently in the store as a JSON-safe object. */
export function exportReport(): Report {
  const store = getStore();
  const { config } = store;
  return {
    format: "reactpulse-report",
    version: 1,
    createdAt: new Date().toISOString(),
    environment: {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: isBrowser() ? location.href : undefined,
      react: reactVersion,
      reactpulse: VERSION,
    },
    config: {
      threshold: config.threshold,
      historyLimit: config.historyLimit,
      timelineLimit: config.timelineLimit,
      compareDepth: config.compareDepth,
      performanceApi: config.performanceApi,
    },
    components: [...store.components.values()].map((c) => ({
      ...c,
      events: c.events.map(exportEvent),
    })),
    warnings: [...store.warnings],
    measures: [...store.measures],
    stateLog: store.stateLog.map((s) => ({ ...s, prev: safe(s.prev), next: safe(s.next) })),
  };
}

export function exportReportJSON(space = 2): string {
  return JSON.stringify(exportReport(), null, space);
}

/** Browser only: downloads the report as a `.json` file. Returns false on the server. */
export function downloadReport(filename = `reactpulse-report-${Date.now()}.json`): boolean {
  if (!isBrowser()) return false;
  const url = URL.createObjectURL(new Blob([exportReportJSON()], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

function readEvent(raw: unknown, component: string): RenderEvent {
  const e = obj(raw);
  return {
    id: 0,
    component,
    instance: num(e.instance),
    n: num(e.n),
    at: num(e.at),
    sinceLast: e.sinceLast === null ? null : num(e.sinceLast),
    duration: e.duration === null ? null : num(e.duration),
    durationKind: e.durationKind === "profiler" ? "profiler" : "span",
    slow: e.slow === true,
    phase: e.phase === "mount" ? "mount" : "update",
    reasons: arr(e.reasons).map((r) => {
      const x = obj(r);
      return {
        kind: String(x.kind) as RenderEvent["reasons"][number]["kind"],
        confidence: x.confidence === "certain" ? "certain" : "probable",
        keys: Array.isArray(x.keys) ? x.keys.map(String) : undefined,
        detail: typeof x.detail === "string" ? x.detail : undefined,
      };
    }),
    changes: arr(e.changes).map((c) => {
      const x = obj(c);
      return {
        source: String(x.source) as Change["source"],
        key: String(x.key),
        prev: x.prev,
        next: x.next,
        referenceOnly: x.referenceOnly === true ? true : undefined,
      };
    }),
    baseDuration: typeof e.baseDuration === "number" ? e.baseDuration : undefined,
  };
}

/** Validates and normalises untrusted JSON into a `Report`. Throws `ReportError`. */
export function parseReport(input: string | unknown): Report {
  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new ReportError("not valid JSON");
    }
  }
  const r = obj(data);
  if (r.format !== "reactpulse-report") throw new ReportError('missing format "reactpulse-report"');
  if (r.version !== 1) throw new ReportError(`unsupported version ${String(r.version)}`);
  if (!Array.isArray(r.components)) throw new ReportError("components must be an array");

  const components = r.components.map((raw): ComponentRecord => {
    const c = obj(raw);
    if (typeof c.name !== "string" || !c.name) throw new ReportError("component without a name");
    return {
      name: c.name,
      kind: c.kind === "profiler" ? "profiler" : "hook",
      renders: num(c.renders),
      rerenders: num(c.rerenders),
      mounts: num(c.mounts),
      unmounts: num(c.unmounts),
      live: 0,
      measured: num(c.measured),
      totalDuration: num(c.totalDuration),
      maxDuration: num(c.maxDuration),
      lastDuration: c.lastDuration === null ? null : num(c.lastDuration),
      slowRenders: num(c.slowRenders),
      firstAt: num(c.firstAt),
      lastAt: num(c.lastAt),
      lastLifetime: c.lastLifetime === null ? null : num(c.lastLifetime),
      events: arr(c.events).map((e) => readEvent(e, c.name as string)),
    };
  });
  const env = obj(r.environment);
  const cfg = obj(r.config);
  return {
    format: "reactpulse-report",
    version: 1,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    environment: {
      userAgent: typeof env.userAgent === "string" ? env.userAgent : undefined,
      url: typeof env.url === "string" ? env.url : undefined,
      react: typeof env.react === "string" ? env.react : undefined,
      reactpulse: typeof env.reactpulse === "string" ? env.reactpulse : "unknown",
    },
    config: {
      threshold: num(cfg.threshold, 16),
      historyLimit: num(cfg.historyLimit, 100),
      timelineLimit: num(cfg.timelineLimit, 500),
      compareDepth: num(cfg.compareDepth),
      performanceApi: cfg.performanceApi === true,
    },
    components,
    warnings: arr(r.warnings).map((raw) => {
      const w = obj(raw);
      return {
        id: 0,
        kind: String(w.kind) as Report["warnings"][number]["kind"],
        component: typeof w.component === "string" ? w.component : undefined,
        message: String(w.message ?? ""),
        at: num(w.at),
      };
    }),
    measures: arr(r.measures).map((raw) => {
      const m = obj(raw);
      return {
        id: 0,
        component: String(m.component ?? ""),
        label: String(m.label ?? ""),
        kind: m.kind === "interaction" ? "interaction" : "measure",
        duration: num(m.duration),
        slow: m.slow === true,
        at: num(m.at),
      };
    }),
    stateLog: arr(r.stateLog).map((raw) => {
      const s = obj(raw);
      return {
        id: 0,
        component: typeof s.component === "string" ? s.component : null,
        label: String(s.label ?? ""),
        prev: s.prev,
        next: s.next,
        at: num(s.at),
      };
    }),
  };
}

/** Replaces (or merges into) the store contents with a parsed report. */
function loadReport(store: Store, report: Report, merge: boolean): void {
  const { config, components, timeline, warnings, measures, stateLog } = store;
  if (!merge) {
    components.clear();
    timeline.length = warnings.length = measures.length = stateLog.length = 0;
  }
  const events: RenderEvent[] = [];
  for (const src of report.components) {
    const incoming = { ...src, imported: true, live: 0, events: [] as RenderEvent[] };
    const existing = components.get(incoming.name);
    if (existing) {
      existing.renders += incoming.renders;
      existing.rerenders += incoming.rerenders;
      existing.mounts += incoming.mounts;
      existing.unmounts += incoming.unmounts;
      existing.measured += incoming.measured;
      existing.totalDuration += incoming.totalDuration;
      existing.maxDuration = Math.max(existing.maxDuration, incoming.maxDuration);
      existing.slowRenders += incoming.slowRenders;
      existing.firstAt = Math.min(existing.firstAt, incoming.firstAt);
      existing.lastAt = Math.max(existing.lastAt, incoming.lastAt);
    } else {
      components.set(incoming.name, incoming);
    }
    const target = components.get(incoming.name)!;
    for (const e of src.events) {
      const event = { ...e, id: store.nextId() };
      target.events.push(event);
      events.push(event);
    }
    target.events.sort((a, b) => a.at - b.at || a.id - b.id);
    trim(target.events, config.historyLimit);
  }
  timeline.push(...events);
  timeline.sort((a, b) => a.at - b.at || a.id - b.id);
  trim(timeline, config.timelineLimit);
  for (const w of report.warnings) warnings.push({ ...w, id: store.nextId() });
  for (const m of report.measures) measures.push({ ...m, id: store.nextId() });
  for (const s of report.stateLog) stateLog.push({ ...s, id: store.nextId() });
  trim(warnings, config.warningLimit);
  store.changed();
}

export interface ImportOptions {
  /** Add to the current data instead of replacing it. Default false. */
  merge?: boolean;
  /** Pause live monitoring so imported data is not mixed with new renders. Default true. */
  pause?: boolean;
}

/** Loads a report produced by `exportReport()` into the store (and the dashboard). */
export function importReport(input: string | unknown, options: ImportOptions = {}): Report {
  const report = parseReport(input);
  const store = getStore();
  loadReport(store, report, options.merge === true);
  if (options.pause !== false) store.pause();
  store.flush();
  return report;
}
