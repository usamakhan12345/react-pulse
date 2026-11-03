import { StrictMode, useEffect } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLeakScope, useLeakTracker } from "../src";
import { getStore } from "../src/core/store";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  getStore().configure({ leakDetection: true, leakRepeatThreshold: 3 });
});

const flush = () => act(async () => {});

describe("createLeakScope", () => {
  it("is a transparent pass-through when leak detection is off", () => {
    getStore().configure({ leakDetection: false });
    vi.useFakeTimers();
    try {
      const scope = createLeakScope("Off");
      const fn = vi.fn();
      scope.setTimeout(fn, 10);
      vi.advanceTimersByTime(10);
      expect(fn).toHaveBeenCalledOnce();
      expect(getStore().leaks.live.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports an interval that is still running at check()", () => {
    vi.useFakeTimers();
    try {
      const scope = createLeakScope("Chat");
      const id = scope.setInterval(() => {}, 1000, "poll");
      expect(scope.check()).toBe(1);
      const [w] = getStore().warnings;
      expect(w).toMatchObject({ kind: "leak-timer", component: "Chat" });
      expect(w!.message).toContain('interval "poll"');
      scope.clearInterval(id);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not report timers that fired, were cleared, or were unsubscribed", () => {
    vi.useFakeTimers();
    try {
      const scope = createLeakScope("Clean");
      const fired = vi.fn();
      scope.setTimeout(fired, 5);
      const cleared = scope.setTimeout(fired, 5000);
      scope.clearTimeout(cleared);
      const interval = scope.setInterval(() => {}, 10);
      scope.clearInterval(interval);
      const target = new EventTarget();
      const off = scope.addEventListener(target, "x", () => {});
      off();
      const unsub = scope.subscribe(() => () => {}, "store");
      unsub();
      vi.advanceTimersByTime(10000);
      expect(fired).toHaveBeenCalledOnce();
      expect(scope.check()).toBe(0);
      expect(getStore().leaks.live.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("actually adds and removes event listeners and runs subscriptions", () => {
    const scope = createLeakScope("Real");
    const target = new EventTarget();
    const handler = vi.fn();
    const off = scope.addEventListener(target, "ping", handler);
    target.dispatchEvent(new Event("ping"));
    off();
    target.dispatchEvent(new Event("ping"));
    expect(handler).toHaveBeenCalledOnce();
    const unsubscribe = vi.fn();
    scope.subscribe(() => unsubscribe, "s")();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("reports listeners, subscriptions and custom resources by kind", () => {
    const scope = createLeakScope("Mixed");
    scope.addEventListener(new EventTarget(), "resize", () => {});
    scope.subscribe(() => () => {}, "redux");
    scope.track("websocket");
    expect(scope.check()).toBe(3);
    expect(
      getStore()
        .warnings.map((w) => w.kind)
        .sort(),
    ).toEqual(["leak-listener", "leak-resource", "leak-subscription"]);
  });

  it("warns once about suspicious repeated registrations", () => {
    const scope = createLeakScope("Spammy");
    const target = new EventTarget();
    for (let i = 0; i < 6; i++) scope.addEventListener(target, "scroll", () => {});
    const repeated = getStore().warnings.filter((w) => w.kind === "leak-repeated");
    expect(repeated).toHaveLength(1);
    expect(repeated[0]!.message).toContain('3 live listener "scroll"');
  });
});

describe("useLeakTracker", () => {
  it("warns when a component unmounts with an uncleared interval", async () => {
    function Leaky() {
      const leaks = useLeakTracker("Leaky");
      useEffect(() => {
        leaks.setInterval(() => {}, 1000, "tick");
        // no cleanup: this is the bug being detected
      }, [leaks]);
      return null;
    }
    const { unmount } = render(<Leaky />);
    expect(getStore().warnings).toHaveLength(0);
    unmount();
    await flush();
    expect(getStore().warnings).toHaveLength(1);
    expect(getStore().warnings[0]).toMatchObject({ kind: "leak-timer", component: "Leaky" });
    for (const r of getStore().leaks.live.values()) clearInterval(r.id as never); // no-op, keep registry tidy
  });

  it("stays quiet for a component that cleans up, including under StrictMode", async () => {
    function Tidy() {
      const leaks = useLeakTracker("Tidy");
      useEffect(() => {
        const id = leaks.setInterval(() => {}, 1000, "tick");
        const off = leaks.addEventListener(window, "resize", () => {});
        return () => {
          leaks.clearInterval(id);
          off();
        };
      }, [leaks]);
      return null;
    }
    const { unmount } = render(
      <StrictMode>
        <Tidy />
      </StrictMode>,
    );
    await flush();
    expect(getStore().warnings).toHaveLength(0);
    unmount();
    await flush();
    expect(getStore().warnings).toHaveLength(0);
    expect(getStore().leaks.live.size).toBe(0);
  });

  it("does not raise a false positive for StrictMode when a leak exists only until real unmount", async () => {
    function Leaky() {
      const leaks = useLeakTracker("StrictLeaky");
      useEffect(() => {
        const id = leaks.setInterval(() => {}, 1000, "tick");
        return () => leaks.clearInterval(id);
      }, [leaks]);
      return null;
    }
    render(
      <StrictMode>
        <Leaky />
      </StrictMode>,
    );
    await flush();
    expect(getStore().warnings).toHaveLength(0);
  });
});
