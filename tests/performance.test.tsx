import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PulseProfiler, averageDuration, usePerformanceTracker, useRenderTracker } from "../src";
import { getStore } from "../src/core/store";

let clock = 0;
beforeEach(() => {
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

function Costly({ cost }: { cost: number }) {
  useRenderTracker("Costly", { props: { cost } });
  clock += cost; // simulate render work on the mocked clock
  return null;
}

describe("render duration and slow render detection", () => {
  it("measures render-to-commit span and aggregates avg / max / total", () => {
    const { rerender } = render(<Costly cost={5} />);
    rerender(<Costly cost={30} />);
    rerender(<Costly cost={10} />);
    rerender(<Costly cost={50} />);
    const rec = getStore().components.get("Costly")!;
    expect(rec.events.map((e) => e.duration)).toEqual([5, 30, 10, 50]);
    expect(rec.totalDuration).toBe(95);
    expect(rec.maxDuration).toBe(50);
    expect(rec.lastDuration).toBe(50);
    expect(averageDuration(rec)).toBeCloseTo(23.75);
    expect(rec.slowRenders).toBe(2);
    expect(rec.events.map((e) => e.slow)).toEqual([false, true, false, true]);
  });

  it("records time between renders", () => {
    const { rerender } = render(<Costly cost={1} />);
    clock += 100;
    rerender(<Costly cost={2} />);
    const [first, second] = getStore().components.get("Costly")!.events;
    expect(first!.sinceLast).toBeNull();
    // commit-to-commit: 100 idle + the second render's own 2ms
    expect(second!.sinceLast).toBe(102);
  });

  it("raises warnings and callbacks for slow renders using the configured threshold", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onSlowRender = vi.fn();
    getStore().configure({ threshold: 20, onSlowRender });
    const { rerender } = render(<Costly cost={19} />);
    rerender(<Costly cost={21} />);
    expect(onSlowRender).toHaveBeenCalledOnce();
    const w = getStore().warnings;
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ kind: "slow-render", component: "Costly" });
    expect(w[0]!.message).toContain("21.0ms");
    expect(w[0]!.message).toContain("threshold 20ms");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("supports a per-component threshold and an onSlow callback", () => {
    const onSlow = vi.fn();
    function Tight({ cost }: { cost: number }) {
      useRenderTracker("Tight", { threshold: 1, onSlow });
      clock += cost;
      return null;
    }
    const { rerender } = render(<Tight cost={0.5} />);
    rerender(<Tight cost={2} />);
    expect(onSlow).toHaveBeenCalledOnce();
    expect(getStore().components.get("Tight")!.slowRenders).toBe(1);
  });

  it("can silence console warnings while still collecting them", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getStore().configure({ warnings: false });
    render(<Costly cost={100} />);
    expect(warn).not.toHaveBeenCalled();
    expect(getStore().warnings).toHaveLength(1);
  });

  it("emits User Timing entries when performanceApi is enabled", () => {
    const measure = vi.spyOn(performance, "measure").mockImplementation(() => undefined as never);
    render(<Costly cost={3} />);
    expect(measure).not.toHaveBeenCalled();
    getStore().configure({ performanceApi: true });
    const { rerender } = render(<Costly cost={4} />);
    rerender(<Costly cost={5} />);
    expect(measure).toHaveBeenCalled();
    expect(measure.mock.calls[0]![0]).toBe("⚛ Costly");
    expect(measure.mock.calls[0]![1]).toEqual({
      start: expect.any(Number),
      end: expect.any(Number),
    });
  });

  it("does not throw if the User Timing API rejects the call", () => {
    vi.spyOn(performance, "measure").mockImplementation(() => {
      throw new Error("unsupported");
    });
    getStore().configure({ performanceApi: true });
    expect(() => render(<Costly cost={1} />)).not.toThrow();
  });
});

describe("PulseProfiler", () => {
  function Inner({ n }: { n: number }) {
    return <span>{n}</span>;
  }

  it("records React's own actualDuration, distinct from the hook span", () => {
    const { rerender } = render(
      <PulseProfiler id="Feed" threshold={-1}>
        <Inner n={1} />
      </PulseProfiler>,
    );
    rerender(
      <PulseProfiler id="Feed" threshold={-1}>
        <Inner n={2} />
      </PulseProfiler>,
    );
    const rec = getStore().components.get("Feed")!;
    expect(rec.kind).toBe("profiler");
    expect(rec.events.map((e) => e.phase)).toEqual(["mount", "update"]);
    expect(rec.events.every((e) => e.durationKind === "profiler")).toBe(true);
    expect(rec.events[0]!.baseDuration).toBeTypeOf("number");
    expect(rec.slowRenders).toBe(2);
  });

  it("respects disabling and component filters", () => {
    getStore().configure({ exclude: ["Feed"] });
    render(
      <PulseProfiler id="Feed">
        <Inner n={1} />
      </PulseProfiler>,
    );
    expect(getStore().components.has("Feed")).toBe(false);
  });
});

describe("usePerformanceTracker", () => {
  let tracker: ReturnType<typeof usePerformanceTracker>;
  function C() {
    tracker = usePerformanceTracker("Perf");
    return <button>go</button>;
  }

  it("tracks the component's renders", () => {
    render(<C />);
    expect(getStore().components.get("Perf")!.renders).toBe(1);
  });

  it("measures synchronous functions, returns their result and flags slow ones", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<C />);
    const result = tracker.measure("sort", () => {
      clock += 40;
      return 7;
    });
    expect(result).toBe(7);
    expect(getStore().measures[0]).toMatchObject({
      component: "Perf",
      label: "sort",
      kind: "measure",
      duration: 40,
      slow: true,
    });
    expect(getStore().warnings[0]!.message).toContain('"sort"');
  });

  it("measures promises until they settle and records failures too", async () => {
    render(<C />);
    await tracker.measure("fetch", async () => {
      clock += 5;
    });
    await expect(
      tracker.measure("boom", async () => {
        clock += 2;
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    expect(getStore().measures.map((m) => [m.label, m.duration])).toEqual([
      ["fetch", 5],
      ["boom", 2],
    ]);
    expect(() =>
      tracker.measure("sync-throw", () => {
        throw new Error("y");
      }),
    ).toThrow("y");
    expect(getStore().measures).toHaveLength(3);
  });

  it("measures an interaction until after the next paint", async () => {
    render(<C />);
    const end = tracker.startInteraction("click");
    clock += 12;
    end();
    end(); // second call is ignored
    expect(getStore().measures).toHaveLength(0);
    await vi.waitFor(() => expect(getStore().measures).toHaveLength(1));
    expect(getStore().measures[0]).toMatchObject({
      label: "click",
      kind: "interaction",
      duration: 12,
    });
  });

  it("returns stable helpers across renders", () => {
    const seen = new Set<unknown>();
    function S() {
      seen.add(usePerformanceTracker("Stable"));
      return null;
    }
    const { rerender } = render(<S />);
    rerender(<S />);
    expect(seen.size).toBe(1);
  });

  it("does not record anything when disabled", () => {
    getStore().configure({ enabled: false });
    render(<C />);
    tracker.measure("x", () => 1);
    expect(getStore().measures).toHaveLength(0);
    expect(getStore().components.size).toBe(0);
  });
});

describe("StrictMode and concurrent safety", () => {
  it("does not loop or over-render when records change while a sibling subscribes", () => {
    let renders = 0;
    function C() {
      renders++;
      useRenderTracker("Loop");
      return <button onClick={() => undefined}>x</button>;
    }
    const unsubscribe = getStore().subscribe(() => {});
    render(
      <StrictMode>
        <C />
      </StrictMode>,
    );
    act(() => {
      getStore().flush();
    });
    fireEvent.click(screen.getByText("x"));
    expect(renders).toBe(2); // StrictMode double render of the single mount, nothing more
    unsubscribe();
  });
});
