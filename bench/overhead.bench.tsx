// Measures what one tracked component costs per re-render in jsdom + React.
// Run with `npm run bench`. Absolute numbers depend on the machine; compare
// the three cases against each other.
import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { useRenderTracker } from "../src";
import { getStore } from "../src/core/store";

const COUNT = 200;
const ROUNDS = 9;
const RERENDERS = 40;

function Plain({ a, b }: { a: number; b: string }) {
  return <i>{a + b}</i>;
}
function Tracked({ a, b }: { a: number; b: string }) {
  useRenderTracker("Tracked", { props: { a, b } });
  return <i>{a + b}</i>;
}
function Tree({ Item, tick }: { Item: typeof Plain; tick: number }) {
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <Item key={i} a={tick} b="x" />
      ))}
    </>
  );
}

/** Median milliseconds for RERENDERS full re-renders of COUNT components. */
function measure(Item: typeof Plain, enabled: boolean): number {
  getStore().configure({ enabled, historyLimit: 20, timelineLimit: 100, warnings: false });
  const view = render(<Tree Item={Item} tick={0} />);
  let tick = 0;
  const once = () => {
    const start = performance.now();
    for (let i = 0; i < RERENDERS; i++) view.rerender(<Tree Item={Item} tick={++tick} />);
    return performance.now() - start;
  };
  once(); // warm up the JIT
  const runs = Array.from({ length: ROUNDS }, once).sort((a, b) => a - b);
  view.unmount();
  return runs[Math.floor(runs.length / 2)]!;
}

it("reports the per-render overhead of useRenderTracker", () => {
  const baseline = measure(Plain, true);
  const disabled = measure(Tracked, false);
  const enabled = measure(Tracked, true);
  const renders = COUNT * RERENDERS;
  const perHook = (ms: number) => (((ms - baseline) / renders) * 1000).toFixed(2);

  console.log(
    [
      `\n${COUNT} components x ${RERENDERS} re-renders = ${renders} renders per run (median of ${ROUNDS})`,
      `baseline (no hook)                      ${baseline.toFixed(1)} ms`,
      `useRenderTracker, monitoring disabled   ${disabled.toFixed(1)} ms   (+${perHook(disabled)} us / render)`,
      `useRenderTracker, monitoring enabled    ${enabled.toFixed(1)} ms   (+${perHook(enabled)} us / render)`,
    ].join("\n"),
  );
  expect(enabled).toBeGreaterThan(0);
});
