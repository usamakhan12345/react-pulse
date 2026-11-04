import type { Store } from "../core/store";
import type { ComponentRecord } from "../core/types";
import { averageDuration } from "../core/performance";
import { summarize } from "./select";
import { clock, ms } from "./format";

export interface PerformancePanelProps {
  store: Store;
  components: ComponentRecord[];
  onSelect(name: string): void;
}

export function PerformancePanel({ store, components, onSelect }: PerformancePanelProps) {
  const { threshold } = store.config;
  const total = summarize(components);
  const slowest = components
    .filter((c) => c.measured > 0)
    .sort((a, b) => b.maxDuration - a.maxDuration)
    .slice(0, 8);
  const scale = Math.max(threshold, ...slowest.map((c) => c.maxDuration), 1);
  const warnings = store.warnings.slice(-30).reverse();
  const measures = store.measures.slice(-15).reverse();

  return (
    <div className="rp-perf">
      <dl className="rp-tiles">
        <Tile label="Components" value={String(total.components)} />
        <Tile label="Total renders" value={String(total.renders)} />
        <Tile label="Slow renders" value={String(total.slow)} warn={total.slow > 0} />
        <Tile
          label="Average duration"
          value={total.renders ? ms(total.avg) : "–"}
          warn={total.avg > threshold}
        />
        <Tile
          label="Max duration"
          value={total.maxName ? ms(total.max) : "–"}
          hint={total.maxName}
          warn={total.max > threshold}
        />
        <Tile label="Slow threshold" value={`${threshold}ms`} />
      </dl>

      <section aria-label="Slowest components">
        <h3 className="rp-h3">Slowest components</h3>
        {slowest.length ? (
          <ul className="rp-bars">
            {slowest.map((c) => (
              <li key={c.name}>
                <button type="button" className="rp-bar-row" onClick={() => onSelect(c.name)}>
                  <span className="rp-ellipsis">{c.name}</span>
                  <span className="rp-bar-track" aria-hidden="true">
                    <span
                      className={`rp-bar-avg${averageDuration(c) > threshold ? " rp-bar-slow" : ""}`}
                      style={{ width: `${(averageDuration(c) / scale) * 100}%` }}
                    />
                    <span
                      className={`rp-bar-max${c.maxDuration > threshold ? " rp-bar-slow" : ""}`}
                      style={{ width: `${(c.maxDuration / scale) * 100}%` }}
                    />
                    <span
                      className="rp-bar-limit"
                      style={{ left: `${(threshold / scale) * 100}%` }}
                    />
                  </span>
                  <span className="rp-num">
                    {ms(averageDuration(c))} / {ms(c.maxDuration)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rp-muted">No timed renders yet.</p>
        )}
        <p className="rp-note">
          Bars show average (solid) and max (light) duration; the tick marks the threshold.
        </p>
      </section>

      <section aria-label="Warnings">
        <h3 className="rp-h3">
          Warnings <span className="rp-muted">{store.warnings.length}</span>
        </h3>
        {warnings.length ? (
          <ul className="rp-plain">
            {warnings.map((w) => (
              <li key={w.id}>
                <span className="rp-muted rp-mono">{clock(w.at)}</span>{" "}
                <span
                  className={`rp-badge ${w.kind === "slow-render" ? "rp-badge-danger" : "rp-badge-warn"}`}
                >
                  {w.kind}
                </span>{" "}
                {w.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rp-muted">No warnings.</p>
        )}
      </section>

      {measures.length > 0 && (
        <section aria-label="Measurements">
          <h3 className="rp-h3">Recent measurements</h3>
          <ul className="rp-plain">
            {measures.map((m) => (
              <li key={m.id} className="rp-mono">
                <span className="rp-muted">{clock(m.at)}</span> {m.component} · {m.label} ({m.kind}){" "}
                <span className={m.slow ? "rp-slow" : undefined}>{ms(m.duration)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="What is measured" className="rp-note-block">
        <h3 className="rp-h3">What the numbers mean</h3>
        <ul className="rp-plain">
          <li>
            <b>Render span</b> (hooks): from the hook call during render until the commit. Includes
            child components, any component React renders after this one in the same pass, and DOM
            updates; excludes paint. Large commits (like the first mount) overstate it, so treat it
            as an upper bound. With concurrent rendering it can also include time React yielded to
            the browser.
          </li>
          <li>
            <b>Profiler duration</b>: React&apos;s <code>actualDuration</code> from{" "}
            <code>PulseProfiler</code>. Render work only, development and profiling builds of React.
          </li>
          <li>
            <b>Interaction</b>: <code>startInteraction()</code> until the next paint, an
            approximation of input-to-paint time.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rp-tile">
      <dt>{label}</dt>
      <dd className={warn ? "rp-slow" : undefined}>{value}</dd>
      {hint ? <span className="rp-muted rp-ellipsis">{hint}</span> : null}
    </div>
  );
}
