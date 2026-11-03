import type { PulseLogger, PulseWarning, RenderEvent, RenderReason } from "../core/types";
import { isBrowser } from "./environment";
import { preview } from "./serialize";

export function describeReason(r: RenderReason): string {
  const tag = r.confidence === "probable" ? " (probable)" : "";
  switch (r.kind) {
    case "mount":
      return "initial mount";
    case "props":
    case "state":
    case "context":
    case "hooks":
      return `${r.kind} changed${tag}: ${r.keys?.join(", ") ?? ""}${r.detail ? ` - ${r.detail}` : ""}`;
    default:
      return `${r.kind}${tag}${r.detail ? ` - ${r.detail}` : ""}`;
  }
}

const STYLE_NAME = "color:#7c5cff;font-weight:600";
const STYLE_DIM = "color:#8a8f98";
const STYLE_SLOW = "color:#e5484d;font-weight:600";

export const consoleLogger: PulseLogger = {
  render(e: RenderEvent) {
    const time = e.duration === null ? "" : ` ${e.duration.toFixed(2)}ms`;
    if (isBrowser()) {
      console.groupCollapsed(
        `%c⚛ ${e.component}%c #${e.n}%c${time}`,
        STYLE_NAME,
        STYLE_DIM,
        e.slow ? STYLE_SLOW : STYLE_DIM,
      );
    } else {
      console.group(`⚛ ${e.component} #${e.n}${time}`);
    }
    for (const r of e.reasons) console.log(describeReason(r));
    if (e.changes.length) {
      const rows: Record<string, { previous: string; current: string }> = {};
      for (const c of e.changes) {
        rows[`${c.source}.${c.key}${c.referenceOnly ? " (identity only)" : ""}`] = {
          previous: preview(c.prev),
          current: preview(c.next),
        };
      }
      console.table(rows);
    }
    if (e.sinceLast !== null) console.log(`since previous render: ${e.sinceLast.toFixed(0)}ms`);
    console.groupEnd();
  },
  warning(w: PulseWarning) {
    console.warn(`[reactpulse] ${w.message}`);
  },
};
