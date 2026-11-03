import type { RenderEvent } from "../core/types";
import { clock, gap, ms } from "./format";

export interface TimelineProps {
  events: RenderEvent[];
  threshold: number;
  onSelect(event: RenderEvent): void;
}

const MAX_TICK = 28;
const MIN_TICK = 6;

/**
 * One lane per component, one tick per render. Tick height follows duration
 * (capped), slow renders are red. Positions are proportional to wall-clock time.
 */
export function Timeline({ events, threshold, onSelect }: TimelineProps) {
  if (!events.length) {
    return (
      <div className="rp-empty" role="status">
        No renders recorded yet.
      </div>
    );
  }
  const start = events[0]!.at;
  const end = events[events.length - 1]!.at;
  const span = Math.max(end - start, 1);

  const lanes = new Map<string, RenderEvent[]>();
  for (const e of events) {
    const lane = lanes.get(e.component);
    if (lane) lane.push(e);
    else lanes.set(e.component, [e]);
  }
  const maxDuration = Math.max(threshold * 2, ...events.map((e) => e.duration ?? 0));

  return (
    <div className="rp-timeline" role="group" aria-label="Render timeline">
      <div className="rp-tl-axis rp-muted rp-mono">
        <span>{clock(start)}</span>
        <span>{gap(span)} window</span>
        <span>{clock(end)}</span>
      </div>
      {[...lanes].map(([name, list]) => (
        <div className="rp-lane" key={name}>
          <span className="rp-lane-name rp-ellipsis" title={name}>
            {name}
          </span>
          <div className="rp-lane-track">
            {list.map((e) => {
              const height = MIN_TICK + ((e.duration ?? 0) / maxDuration) * (MAX_TICK - MIN_TICK);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`rp-tick${e.slow ? " rp-tick-slow" : ""}${e.phase === "mount" ? " rp-tick-mount" : ""}`}
                  style={{ left: `${((e.at - start) / span) * 100}%`, height }}
                  title={`${name} #${e.n} · ${clock(e.at)} · ${ms(e.duration)}${e.slow ? " (slow)" : ""}`}
                  aria-label={`${name} render ${e.n}, ${ms(e.duration)}${e.slow ? ", slow" : ""}`}
                  onClick={() => onSelect(e)}
                />
              );
            })}
          </div>
        </div>
      ))}
      <p className="rp-note">
        Tick height is render duration, red ticks exceed {threshold}ms, outlined ticks are mounts.
        Click a tick to inspect it.
      </p>
    </div>
  );
}
