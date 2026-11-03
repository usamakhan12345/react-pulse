import { afterEach, describe, expect, it, vi } from "vitest";
import { getStore, resetStore } from "../src/core/store";
import type { RenderEvent } from "../src/core/types";

const event = (over: Partial<RenderEvent> = {}): Omit<RenderEvent, "id"> => ({
  component: "A",
  instance: 1,
  n: 1,
  at: Date.now(),
  sinceLast: null,
  duration: 1,
  durationKind: "span",
  slow: false,
  phase: "update",
  reasons: [],
  changes: [],
  ...over,
});

afterEach(() => vi.unstubAllEnvs());

describe("store", () => {
  it("is a process-wide singleton shared through globalThis", () => {
    expect(getStore()).toBe(getStore());
    const first = getStore();
    resetStore();
    expect(getStore()).not.toBe(first);
  });

  it("aggregates counts, durations and slow renders", () => {
    const s = getStore();
    s.recordRender(event({ duration: 10, phase: "mount" }));
    s.recordRender(event({ duration: 30, slow: true }), 16);
    s.recordRender(event({ duration: null }));
    const rec = s.components.get("A")!;
    expect(rec.renders).toBe(3);
    expect(rec.rerenders).toBe(2);
    expect(rec.measured).toBe(2);
    expect(rec.totalDuration).toBe(40);
    expect(rec.maxDuration).toBe(30);
    expect(rec.slowRenders).toBe(1);
    expect(s.warnings).toHaveLength(1);
    expect(s.warnings[0]!.kind).toBe("slow-render");
  });

  it("limits per-component history and the global timeline", () => {
    const s = getStore();
    s.configure({ historyLimit: 3, timelineLimit: 5 });
    for (let i = 0; i < 10; i++) s.recordRender(event({ component: "A", n: i + 1 }));
    for (let i = 0; i < 10; i++) s.recordRender(event({ component: "B", n: i + 1 }));
    expect(s.components.get("A")!.events.map((e) => e.n)).toEqual([8, 9, 10]);
    expect(s.components.get("A")!.renders).toBe(10); // aggregates are not limited
    expect(s.timeline).toHaveLength(5);
  });

  it("applies lowered limits to data that is already stored", () => {
    const s = getStore();
    for (let i = 0; i < 10; i++) s.recordRender(event());
    s.configure({ historyLimit: 2 });
    expect(s.components.get("A")!.events).toHaveLength(2);
  });

  it("filters components with include / exclude (strings and regexps)", () => {
    const s = getStore();
    s.configure({ exclude: ["Noisy", /^Internal/] });
    expect(s.shouldTrack("Noisy")).toBe(false);
    expect(s.shouldTrack("InternalThing")).toBe(false);
    expect(s.shouldTrack("Fine")).toBe(true);
    s.configure({ include: ["Fine"] });
    expect(s.shouldTrack("Fine")).toBe(true);
    expect(s.shouldTrack("Other")).toBe(false);
  });

  it("pauses without losing data, and clear() keeps live instance counts", () => {
    const s = getStore();
    s.recordMount("Live");
    s.recordMount("Gone");
    s.recordUnmount("Gone");
    s.recordRender(event({ component: "Live" }));
    s.pause();
    expect(s.isActive()).toBe(false);
    expect(s.shouldTrack("Live")).toBe(false);
    expect(s.components.get("Live")!.renders).toBe(1);
    s.clear();
    expect(s.components.has("Gone")).toBe(false);
    expect(s.components.get("Live")).toMatchObject({ renders: 0, live: 1 });
    expect(s.timeline).toHaveLength(0);
  });

  it("notifies subscribers in batches no faster than uiInterval", () => {
    vi.useFakeTimers();
    try {
      const s = getStore();
      s.configure({ uiInterval: 50 });
      const listener = vi.fn();
      const off = s.subscribe(listener);
      for (let i = 0; i < 100; i++) s.recordRender(event());
      expect(listener).not.toHaveBeenCalled();
      vi.advanceTimersByTime(60);
      expect(listener).toHaveBeenCalledTimes(1);
      const version = s.getVersion();
      off();
      s.recordRender(event());
      vi.advanceTimersByTime(200);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(s.getVersion()).toBeGreaterThan(version);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is disabled automatically in production unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    resetStore();
    const s = getStore();
    expect(s.isEnabled()).toBe(false);
    expect(s.shouldTrack("X")).toBe(false);
    s.configure({ enabled: true });
    expect(s.isEnabled()).toBe(true);
    s.setEnabled(false);
    expect(s.isEnabled()).toBe(false);
  });

  it("calls custom callbacks and replaces console warnings with a custom logger", () => {
    const s = getStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onRender = vi.fn();
    const onSlowRender = vi.fn();
    const onWarning = vi.fn();
    const logger = { render: vi.fn(), warning: vi.fn() };
    s.configure({ onRender, onSlowRender, onWarning, logger });
    s.recordRender(event({ duration: 99, slow: true }));
    expect(onRender).toHaveBeenCalledOnce();
    expect(onSlowRender).toHaveBeenCalledOnce();
    expect(onWarning).toHaveBeenCalledOnce();
    expect(logger.warning).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });
});
