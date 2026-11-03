import type { ComponentRecord } from "../core/types";
import { averageDuration } from "../core/performance";
import { ms } from "./format";

export interface ComponentListProps {
  components: ComponentRecord[];
  selected: string | null;
  threshold: number;
  onSelect(name: string): void;
}

export function ComponentList({ components, selected, threshold, onSelect }: ComponentListProps) {
  if (!components.length) {
    return (
      <div className="rp-empty" role="status">
        No components match. Components appear here after they render with a ReactPulse hook.
      </div>
    );
  }
  return (
    <div className="rp-list" role="listbox" aria-label="Tracked components">
      <div className="rp-list-head" aria-hidden="true">
        <span>Component</span>
        <span>Renders</span>
        <span>Avg</span>
        <span>Max</span>
      </div>
      {components.map((c) => {
        const avg = averageDuration(c);
        return (
          <button
            key={c.name}
            type="button"
            role="option"
            aria-selected={c.name === selected}
            className="rp-row"
            onClick={() => onSelect(c.name)}
          >
            <span className="rp-row-name">
              <span className="rp-ellipsis">{c.name}</span>
              {c.slowRenders > 0 && (
                <span
                  className="rp-badge rp-badge-danger"
                  title={`${c.slowRenders} renders over ${threshold}ms`}
                >
                  {c.slowRenders} slow
                </span>
              )}
              {c.imported && <span className="rp-badge">imported</span>}
              {c.kind === "profiler" && <span className="rp-badge">profiler</span>}
            </span>
            <span className="rp-num">{c.renders}</span>
            <span className={`rp-num${avg > threshold ? " rp-slow" : ""}`}>
              {c.measured ? ms(avg) : "–"}
            </span>
            <span className={`rp-num${c.maxDuration > threshold ? " rp-slow" : ""}`}>
              {c.measured ? ms(c.maxDuration) : "–"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
