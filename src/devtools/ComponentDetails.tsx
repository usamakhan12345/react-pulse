import type { Store } from "../core/store";
import type { ComponentRecord, RenderEvent } from "../core/types";
import { averageDuration } from "../core/performance";
import { describeReason } from "../utils/logger";
import { preview } from "../utils/serialize";
import { changeFrequency } from "./select";
import { clock, gap, ms } from "./format";

export interface ComponentDetailsProps {
  record: ComponentRecord;
  store: Store;
  eventId: number | null;
  onSelectEvent(id: number): void;
}

const reasonSummary = (e: RenderEvent) =>
  e.reasons
    .map((r) =>
      r.kind === "mount"
        ? "mount"
        : r.keys?.length
          ? `${r.kind}: ${r.keys.join(", ")}`
          : `${r.kind}${r.confidence === "probable" ? "?" : ""}`,
    )
    .join(" · ");

export function ComponentDetails({ record, store, eventId, onSelectEvent }: ComponentDetailsProps) {
  const { threshold } = store.config;
  const events = record.events;
  const selected = events.find((e) => e.id === eventId) ?? events[events.length - 1];
  const frequent = changeFrequency(events);
  const states = store.stateLog
    .filter((s) => s.component === record.name)
    .slice(-8)
    .reverse();
  const measures = store.measures
    .filter((m) => m.component === record.name)
    .slice(-8)
    .reverse();
  const profiler = record.kind === "profiler";

  return (
    <div className="rp-details">
      <header className="rp-details-head">
        <h2 className="rp-title">{record.name}</h2>
        <span className="rp-muted">
          {record.live} mounted · {record.mounts} mounts · {record.unmounts} unmounts
          {record.lastLifetime !== null && ` · last lifetime ${gap(record.lastLifetime)}`}
        </span>
      </header>

      <dl className="rp-stats">
        <Stat label="Renders" value={String(record.renders)} />
        <Stat label="Re-renders" value={String(record.rerenders)} />
        <Stat
          label="Average"
          value={record.measured ? ms(averageDuration(record)) : "–"}
          warn={averageDuration(record) > threshold}
        />
        <Stat
          label="Max"
          value={record.measured ? ms(record.maxDuration) : "–"}
          warn={record.maxDuration > threshold}
        />
        <Stat
          label="Last"
          value={ms(record.lastDuration)}
          warn={(record.lastDuration ?? 0) > threshold}
        />
        <Stat label="Slow" value={String(record.slowRenders)} warn={record.slowRenders > 0} />
      </dl>
      <p className="rp-note">
        {profiler
          ? "Duration is React's actualDuration from a Profiler: time spent rendering this subtree, excluding browser paint."
          : "Duration is the render-to-commit span from this component's render. It also covers components React rendered after it in the same pass (so large commits such as the first mount overstate it) and DOM updates, but not browser paint. Treat it as an upper bound."}
      </p>

      {frequent.length > 0 && (
        <section aria-label="Most frequent changes">
          <h3 className="rp-h3">Changed most often</h3>
          <ul className="rp-chips">
            {frequent.map((f) => (
              <li key={f.label} className="rp-chip">
                {f.label} <b>×{f.count}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <section aria-label="Why did this render">
          <h3 className="rp-h3">
            Why did render #{selected.n} happen?{" "}
            <span className="rp-muted">
              {clock(selected.at)} · {ms(selected.duration)} · {selected.phase}
            </span>
          </h3>
          <ul className="rp-reasons">
            {selected.reasons.map((r, i) => (
              <li key={i}>
                <span
                  className={`rp-badge ${r.confidence === "certain" ? "rp-badge-ok" : "rp-badge-warn"}`}
                >
                  {r.confidence}
                </span>{" "}
                {describeReason(r)}
              </li>
            ))}
          </ul>
          {selected.changes.length > 0 ? (
            <table className="rp-table" aria-label="Changed values">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Previous</th>
                  <th>Current</th>
                </tr>
              </thead>
              <tbody>
                {selected.changes.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span className="rp-muted">{c.source}.</span>
                      {c.key}
                      {c.referenceOnly && (
                        <span className="rp-badge rp-badge-warn" title="New identity, equal value">
                          identity only
                        </span>
                      )}
                    </td>
                    <td className="rp-mono rp-prev">{preview(c.prev, 160, 3)}</td>
                    <td className="rp-mono rp-next">{preview(c.next, 160, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="rp-muted">No compared values changed in this render.</p>
          )}
        </section>
      )}

      <section aria-label="Render history">
        <h3 className="rp-h3">
          Render history <span className="rp-muted">last {events.length}</span>
        </h3>
        <div className="rp-history" role="listbox" aria-label="Renders">
          {events
            .slice()
            .reverse()
            .map((e) => (
              <button
                key={e.id}
                type="button"
                role="option"
                aria-selected={e.id === selected?.id}
                className="rp-hrow"
                onClick={() => onSelectEvent(e.id)}
              >
                <span className="rp-num">#{e.n}</span>
                <span className="rp-mono rp-muted">{clock(e.at)}</span>
                <span className="rp-num rp-muted" title="Time since previous render">
                  {e.sinceLast === null ? "–" : `+${gap(e.sinceLast)}`}
                </span>
                <span className={`rp-num${e.slow ? " rp-slow" : ""}`}>{ms(e.duration)}</span>
                <span className="rp-ellipsis">{reasonSummary(e)}</span>
              </button>
            ))}
        </div>
      </section>

      {states.length > 0 && (
        <section aria-label="State updates">
          <h3 className="rp-h3">Tracked state</h3>
          <ul className="rp-plain">
            {states.map((s) => (
              <li key={s.id} className="rp-mono">
                <span className="rp-muted">{clock(s.at)}</span> {s.label}: {preview(s.prev)} →{" "}
                {preview(s.next)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {measures.length > 0 && (
        <section aria-label="Measurements">
          <h3 className="rp-h3">Measurements</h3>
          <ul className="rp-plain">
            {measures.map((m) => (
              <li key={m.id} className="rp-mono">
                <span className="rp-muted">{clock(m.at)}</span> {m.label} ({m.kind}){" "}
                <span className={m.slow ? "rp-slow" : undefined}>{ms(m.duration)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rp-stat">
      <dt>{label}</dt>
      <dd className={warn ? "rp-slow" : undefined}>{value}</dd>
    </div>
  );
}
