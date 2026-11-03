import type { ComponentRecord, RenderEvent } from "../core/types";
import { averageDuration } from "../core/performance";

export type SortKey = "renders" | "avg" | "max" | "recent" | "name";
export type FilterKey = "all" | "slow" | "rerendered" | "live";

export interface Query {
  search: string;
  filter: FilterKey;
  sort: SortKey;
}

export const SORT_LABELS: Record<SortKey, string> = {
  renders: "Render count",
  avg: "Average duration",
  max: "Max duration",
  recent: "Most recent",
  name: "Name",
};

export const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All components",
  slow: "Slow only",
  rerendered: "Re-rendered",
  live: "Mounted now",
};

const FILTERS: Record<FilterKey, (c: ComponentRecord) => boolean> = {
  all: () => true,
  slow: (c) => c.slowRenders > 0,
  rerendered: (c) => c.rerenders > 0,
  live: (c) => c.live > 0,
};

const SORTS: Record<SortKey, (a: ComponentRecord, b: ComponentRecord) => number> = {
  renders: (a, b) => b.renders - a.renders,
  avg: (a, b) => averageDuration(b) - averageDuration(a),
  max: (a, b) => b.maxDuration - a.maxDuration,
  recent: (a, b) => b.lastAt - a.lastAt,
  name: (a, b) => a.name.localeCompare(b.name),
};

/** Search, filter and sort the component records. Ties fall back to name for a stable order. */
export function selectComponents(
  records: Iterable<ComponentRecord>,
  { search, filter, sort }: Query,
): ComponentRecord[] {
  const needle = search.trim().toLowerCase();
  const out: ComponentRecord[] = [];
  for (const rec of records) {
    if (needle && !rec.name.toLowerCase().includes(needle)) continue;
    if (FILTERS[filter](rec)) out.push(rec);
  }
  return out.sort((a, b) => SORTS[sort](a, b) || a.name.localeCompare(b.name));
}

export interface ChangeFrequency {
  label: string;
  count: number;
}

/** How often each prop/state/context key changed across the stored events. */
export function changeFrequency(events: RenderEvent[], limit = 6): ChangeFrequency[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    for (const c of e.changes) {
      const label = `${c.source}.${c.key}`;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function summarize(records: Iterable<ComponentRecord>) {
  let components = 0;
  let renders = 0;
  let slow = 0;
  let measured = 0;
  let total = 0;
  let max = 0;
  let maxName = "";
  for (const r of records) {
    components++;
    renders += r.renders;
    slow += r.slowRenders;
    measured += r.measured;
    total += r.totalDuration;
    if (r.maxDuration > max) {
      max = r.maxDuration;
      maxName = r.name;
    }
  }
  return { components, renders, slow, avg: measured ? total / measured : 0, max, maxName };
}
