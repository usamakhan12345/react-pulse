import { StrictMode, createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useMountTracker,
  usePrevious,
  useRenderTracker,
  useTrackedState,
  useWhyDidYouRender,
} from "../src";
import { getStore } from "../src/core/store";

const flushMicrotasks = () => act(async () => {});

function Profile(props: { name: string; age: number }) {
  useRenderTracker("Profile", { props: { name: props.name, age: props.age } });
  return (
    <div>
      {props.name} {props.age}
    </div>
  );
}

describe("useRenderTracker", () => {
  it("tracks the initial render", () => {
    render(<Profile name="Ada" age={36} />);
    const rec = getStore().components.get("Profile")!;
    expect(rec.renders).toBe(1);
    expect(rec.rerenders).toBe(0);
    expect(rec.live).toBe(1);
    const [first] = rec.events;
    expect(first).toMatchObject({ n: 1, phase: "mount", sinceLast: null, durationKind: "span" });
    expect(first!.reasons).toEqual([{ kind: "mount", confidence: "certain" }]);
    expect(first!.duration).toBeGreaterThanOrEqual(0);
    expect(first!.at).toBeGreaterThan(0);
  });

  it("tracks re-renders with previous and current props", () => {
    const { rerender } = render(<Profile name="Ada" age={36} />);
    rerender(<Profile name="Ada" age={37} />);
    rerender(<Profile name="Grace" age={37} />);
    const rec = getStore().components.get("Profile")!;
    expect(rec.renders).toBe(3);
    expect(rec.rerenders).toBe(2);
    const [, second, third] = rec.events;
    expect(second!.changes).toEqual([{ source: "props", key: "age", prev: 36, next: 37 }]);
    expect(second!.reasons[0]).toMatchObject({
      kind: "props",
      confidence: "certain",
      keys: ["age"],
    });
    expect(third!.changes.map((c) => [c.key, c.prev, c.next])).toEqual([["name", "Ada", "Grace"]]);
    expect(second!.sinceLast).toBeGreaterThanOrEqual(0);
    expect(third!.n).toBe(3);
  });

  it("returns render info for the current render", () => {
    const seen: number[] = [];
    function C({ v }: { v: number }) {
      const info = useRenderTracker("Info", { props: { v } });
      seen.push(info.renderCount);
      return null;
    }
    const { rerender } = render(<C v={1} />);
    rerender(<C v={2} />);
    expect(seen).toEqual([1, 2]);
  });

  it("does not cause extra renders by itself", () => {
    let renders = 0;
    function C() {
      renders++;
      useRenderTracker("Quiet");
      return null;
    }
    render(<C />);
    expect(renders).toBe(1);
    getStore().flush();
    expect(renders).toBe(1);
  });

  it("counts committed renders once in StrictMode even though React double-invokes", () => {
    let invocations = 0;
    function C({ n }: { n: number }) {
      invocations++;
      useRenderTracker("Strict", { props: { n } });
      return null;
    }
    const { rerender } = render(
      <StrictMode>
        <C n={1} />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <C n={2} />
      </StrictMode>,
    );
    const rec = getStore().components.get("Strict")!;
    expect(invocations).toBeGreaterThan(2); // React really did double-render in dev
    expect(rec.renders).toBe(2);
    expect(rec.events.map((e) => e.n)).toEqual([1, 2]);
    expect(rec.events[1]!.changes).toEqual([{ source: "props", key: "n", prev: 1, next: 2 }]);
    expect(rec.mounts).toBe(1);
    expect(rec.live).toBe(1);
  });

  it("ignores configured props and honours per-hook ignoreProps", () => {
    function C(props: { a: number; style: object; children?: ReactNode }) {
      useRenderTracker("Ignore", { props, ignoreProps: ["style"] });
      return null;
    }
    const { rerender } = render(<C a={1} style={{}} />);
    rerender(
      <C a={1} style={{}}>
        hi
      </C>,
    );
    const e = getStore().components.get("Ignore")!.events[1]!;
    expect(e.changes).toEqual([]);
    expect(e.reasons[0]!.kind).toBe("unknown");
  });

  it("flags identity-only changes when compareDepth is set", () => {
    function C({ cfg }: { cfg: object }) {
      useRenderTracker("Deep", { props: { cfg }, compareDepth: 3 });
      return null;
    }
    const { rerender } = render(<C cfg={{ a: { b: 1 } }} />);
    rerender(<C cfg={{ a: { b: 1 } }} />);
    rerender(<C cfg={{ a: { b: 2 } }} />);
    const [, same, different] = getStore().components.get("Deep")!.events;
    expect(same!.changes[0]!.referenceOnly).toBe(true);
    expect(same!.reasons[0]!.detail).toMatch(/avoidable/);
    expect(different!.changes[0]!.referenceOnly).toBeUndefined();
  });

  it("tracks instrumented state, context and hook dependencies", () => {
    const ThemeCtx = createContext("light");
    let setTheme!: (t: string) => void;
    function Host({ children }: { children: ReactNode }) {
      const [theme, set] = useState("light");
      setTheme = set;
      return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
    }
    function Child() {
      const theme = useContext(ThemeCtx);
      const [count, setCount] = useState(0);
      useRenderTracker("Instrumented", { state: { count }, context: { theme }, deps: { theme } });
      return <button onClick={() => setCount((c) => c + 1)}>inc</button>;
    }
    render(
      <Host>
        <Child />
      </Host>,
    );
    fireEvent.click(screen.getByText("inc"));
    act(() => setTheme("dark"));
    const events = getStore().components.get("Instrumented")!.events;
    expect(events).toHaveLength(3);
    expect(events[1]!.reasons).toEqual([
      { kind: "state", confidence: "certain", keys: ["count"], detail: undefined },
    ]);
    expect(events[2]!.reasons.map((r) => r.kind)).toEqual(["context", "hooks"]);
    expect(events[2]!.changes.find((c) => c.source === "context")).toMatchObject({
      key: "theme",
      prev: "light",
      next: "dark",
    });
  });

  it("stays safe on the server: no layout-effect warning, nothing recorded", async () => {
    // A real server has no `window`; the hooks must pick their SSR-safe code path.
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    try {
      const React = await import("react");
      const { renderToString: toString } = await import("react-dom/server");
      const { useRenderTracker: useTracker } = await import("../src/hooks/useRenderTracker");
      const { useWhyDidYouRender: useWhy } = await import("../src/hooks/useWhyDidYouRender");
      const { getStore: store } = await import("../src/core/store");
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      function Ssr(props: { name: string }) {
        useTracker("Ssr", { props });
        useWhy("SsrWhy", props);
        return React.createElement("div", null, props.name);
      }
      const html = toString(React.createElement(Ssr, { name: "Ada" }));
      expect(html).toContain("Ada");
      expect(error).not.toHaveBeenCalled();
      expect(store().components.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does nothing while disabled, and picks up again when re-enabled", () => {
    const store = getStore();
    store.configure({ enabled: false });
    const { rerender } = render(<Profile name="A" age={1} />);
    rerender(<Profile name="A" age={2} />);
    expect(store.components.size).toBe(0);
    expect(store.timeline).toHaveLength(0);
    store.configure({ enabled: true });
    rerender(<Profile name="A" age={3} />);
    const rec = store.components.get("Profile")!;
    expect(rec.renders).toBe(1);
    // The previous values were remembered while disabled, so the diff is right.
    expect(rec.events[0]!.changes).toEqual([{ source: "props", key: "age", prev: 2, next: 3 }]);
  });

  it("does not record while paused but resumes cleanly", () => {
    const store = getStore();
    const { rerender } = render(<Profile name="A" age={1} />);
    store.pause();
    rerender(<Profile name="A" age={2} />);
    expect(store.components.get("Profile")!.renders).toBe(1);
    store.resume();
    rerender(<Profile name="A" age={3} />);
    expect(store.components.get("Profile")!.renders).toBe(2);
  });

  it("respects trackRenders: false", () => {
    getStore().configure({ trackRenders: false });
    render(<Profile name="A" age={1} />);
    expect(getStore().components.get("Profile")?.renders ?? 0).toBe(0);
  });

  it("applies include / exclude filtering", () => {
    getStore().configure({ exclude: ["Profile"] });
    render(<Profile name="A" age={1} />);
    expect(getStore().components.has("Profile")).toBe(false);
  });

  it("logs readable output only when asked to", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    function C({ v }: { v: number }) {
      useRenderTracker("Logged", { props: { v }, log: true });
      return null;
    }
    const { rerender } = render(<C v={1} />);
    rerender(<C v={2} />);
    expect(group).toHaveBeenCalledTimes(2);
    expect(String(group.mock.calls[1]![0])).toContain("Logged");
    expect(table).toHaveBeenCalledOnce();
    expect(table.mock.calls[0]![0]).toEqual({
      "props.v": { previous: "1", current: "2" },
    });
  });

  it("uses a custom logger and per-hook callbacks", () => {
    const logger = { render: vi.fn(), warning: vi.fn() };
    const onRender = vi.fn();
    getStore().configure({ log: true, logger });
    function C() {
      useRenderTracker("Custom", { onRender });
      return null;
    }
    render(<C />);
    expect(logger.render).toHaveBeenCalledOnce();
    expect(onRender).toHaveBeenCalledOnce();
  });
});

describe("useWhyDidYouRender", () => {
  const log = () => {
    const logger = { render: vi.fn(), warning: vi.fn() };
    getStore().configure({ logger });
    return logger;
  };

  it("reports props changes as certain and skips logging the initial mount", () => {
    const logger = log();
    function C(props: { a: number; b: number }) {
      useWhyDidYouRender("Why", props);
      return null;
    }
    const { rerender } = render(<C a={1} b={1} />);
    expect(logger.render).not.toHaveBeenCalled();
    rerender(<C a={2} b={1} />);
    expect(logger.render).toHaveBeenCalledOnce();
    const event = logger.render.mock.calls[0]![0];
    expect(event.reasons[0]).toMatchObject({ kind: "props", confidence: "certain", keys: ["a"] });
    expect(event.changes[0]).toMatchObject({ key: "a", prev: 1, next: 2 });
  });

  it("marks a parent render as probable when props values are unchanged", () => {
    const logger = log();
    function C(props: { a: number }) {
      useWhyDidYouRender("Why", props);
      return null;
    }
    function Parent() {
      const [, force] = useState(0);
      return (
        <>
          <button onClick={() => force((n) => n + 1)}>go</button>
          <C a={1} />
        </>
      );
    }
    render(<Parent />);
    fireEvent.click(screen.getByText("go"));
    expect(logger.render.mock.calls[0]![0].reasons).toEqual([
      expect.objectContaining({ kind: "parent", confidence: "probable" }),
    ]);
  });

  it("marks an internal update as probable when the props object is the same", () => {
    const logger = log();
    function C(props: { a: number }) {
      const [, force] = useState(0);
      useWhyDidYouRender("Why", props);
      return <button onClick={() => force((n) => n + 1)}>go</button>;
    }
    render(<C a={1} />);
    fireEvent.click(screen.getByText("go"));
    expect(logger.render.mock.calls[0]![0].reasons).toEqual([
      expect.objectContaining({ kind: "internal", confidence: "probable" }),
    ]);
  });
});

describe("usePrevious", () => {
  it("returns the value of the previous committed render", () => {
    const seen: Array<number | undefined> = [];
    function C({ v }: { v: number }) {
      seen.push(usePrevious(v));
      return null;
    }
    const { rerender } = render(<C v={1} />);
    rerender(<C v={2} />);
    rerender(<C v={3} />);
    expect(seen).toEqual([undefined, 1, 2]);
  });

  it("is stable under StrictMode double rendering", () => {
    const seen: Array<number | undefined> = [];
    function C({ v }: { v: number }) {
      seen.push(usePrevious(v));
      return null;
    }
    const { rerender } = render(
      <StrictMode>
        <C v={1} />
      </StrictMode>,
    );
    seen.length = 0;
    rerender(
      <StrictMode>
        <C v={2} />
      </StrictMode>,
    );
    expect(new Set(seen)).toEqual(new Set([1]));
  });
});

describe("useMountTracker", () => {
  function C() {
    const isMounted = useMountTracker("Mounty");
    mountedFn = isMounted;
    return null;
  }
  let mountedFn: () => boolean = () => false;

  it("records mount, unmount and lifetime, and exposes isMounted", async () => {
    const { unmount } = render(<C />);
    const store = getStore();
    expect(store.components.get("Mounty")).toMatchObject({ mounts: 1, live: 1, unmounts: 0 });
    expect(mountedFn()).toBe(true);
    unmount();
    await flushMicrotasks();
    expect(mountedFn()).toBe(false);
    const rec = store.components.get("Mounty")!;
    expect(rec).toMatchObject({ mounts: 1, live: 0, unmounts: 1 });
    expect(rec.lastLifetime).toBeGreaterThanOrEqual(0);
  });

  it("ignores StrictMode's simulated unmount/remount but counts the real unmount", async () => {
    const { unmount } = render(
      <StrictMode>
        <C />
      </StrictMode>,
    );
    await flushMicrotasks();
    expect(getStore().components.get("Mounty")).toMatchObject({ mounts: 1, live: 1, unmounts: 0 });
    unmount();
    await flushMicrotasks();
    expect(getStore().components.get("Mounty")).toMatchObject({ mounts: 1, live: 0, unmounts: 1 });
  });

  it("tracks multiple instances separately in one record", async () => {
    const a = render(<C />);
    const b = render(<C />);
    expect(getStore().components.get("Mounty")!.live).toBe(2);
    a.unmount();
    await flushMicrotasks();
    expect(getStore().components.get("Mounty")!.live).toBe(1);
    b.unmount();
  });

  it("can log lifecycle events", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    function L() {
      useMountTracker("Chatty", { log: true });
      return null;
    }
    const { unmount } = render(<L />);
    unmount();
    await flushMicrotasks();
    expect(debug.mock.calls.map((c) => String(c[0]))).toEqual([
      expect.stringContaining("Chatty mounted"),
      expect.stringContaining("Chatty unmounted after"),
    ]);
  });
});

describe("useTrackedState", () => {
  it("records each committed change once, with previous and next values", () => {
    function C() {
      const [n, setN] = useTrackedState(0, "Counter.count");
      return <button onClick={() => setN(n + 1)}>{n}</button>;
    }
    render(
      <StrictMode>
        <C />
      </StrictMode>,
    );
    expect(getStore().stateLog).toHaveLength(0);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(getStore().stateLog.map((s) => [s.component, s.label, s.prev, s.next])).toEqual([
      ["Counter", "count", 0, 1],
      ["Counter", "count", 1, 2],
    ]);
  });

  it("works like useState and skips no-op updates; plain names have no component", () => {
    function C() {
      const [v, setV] = useTrackedState(() => "a", "label");
      return (
        <>
          <button onClick={() => setV("a")}>same</button>
          <button onClick={() => setV("b")}>change</button>
          <span>{v}</span>
        </>
      );
    }
    render(<C />);
    fireEvent.click(screen.getByText("same"));
    expect(getStore().stateLog).toHaveLength(0);
    fireEvent.click(screen.getByText("change"));
    expect(screen.getByText("b")).toBeTruthy();
    expect(getStore().stateLog[0]).toMatchObject({
      component: null,
      label: "label",
      prev: "a",
      next: "b",
    });
  });
});
