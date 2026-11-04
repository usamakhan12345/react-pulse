import { afterEach, describe, expect, it, vi } from "vitest";
import { getGlobal, isDev, isReactNative } from "../src/utils/environment";
import { consoleLogger, formatRenderText } from "../src/utils/logger";
import type { RenderEvent } from "../src/core/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const event = (over: Partial<RenderEvent> = {}): RenderEvent => ({
  id: 1,
  component: "Profile",
  instance: 1,
  n: 2,
  at: 0,
  sinceLast: 1204,
  duration: 0.84,
  durationKind: "span",
  slow: false,
  phase: "update",
  reasons: [{ kind: "props", confidence: "certain", keys: ["age"] }],
  changes: [{ source: "props", key: "age", prev: 36, next: 37 }],
  ...over,
});

describe("React Native environment detection", () => {
  it("detects React Native from navigator.product", () => {
    expect(isReactNative()).toBe(false);
    vi.stubGlobal("navigator", { product: "ReactNative" });
    expect(isReactNative()).toBe(true);
  });

  it("uses __DEV__ when the bundler defines it, over NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("__DEV__", true);
    expect(isDev()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("__DEV__", false);
    expect(isDev()).toBe(false);
  });

  it("falls back to NODE_ENV when __DEV__ is not defined (web)", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDev()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(isDev()).toBe(true);
  });

  it("finds the global object", () => {
    expect(getGlobal()).toBe(globalThis);
  });

  it("turns console warnings off by default on React Native only", async () => {
    const { createStore } = await import("../src/core/store");
    expect(createStore().config.warnings).toBe(true);
    vi.stubGlobal("navigator", { product: "ReactNative" });
    const store = createStore();
    expect(store.config.warnings).toBe(false);
    store.configure({ warnings: true });
    store.resetConfig();
    expect(store.config.warnings).toBe(false);
  });
});

describe("React Native console output", () => {
  it("formats a render as plain multi-line text", () => {
    const text = formatRenderText(event());
    expect(text.split("\n")).toEqual([
      "⚛ Profile #2 0.84ms",
      "  props changed: age",
      "  props.age: 36 -> 37",
      "  since previous render: 1204ms",
    ]);
  });

  it("marks identity-only changes and omits missing timing", () => {
    const text = formatRenderText(
      event({
        duration: null,
        sinceLast: null,
        changes: [{ source: "props", key: "tags", prev: [1], next: [1], referenceOnly: true }],
      }),
    );
    expect(text).toContain("props.tags (identity only): [1] -> [1]");
    expect(text.startsWith("⚛ Profile #2\n")).toBe(true);
    expect(text).not.toContain("since previous render");
  });

  it("logs one plain string and never uses CSS groups or console.table", () => {
    vi.stubGlobal("navigator", { product: "ReactNative" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    consoleLogger.render(event());
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0]![0])).toContain("props.age: 36 -> 37");
    expect(group).not.toHaveBeenCalled();
    expect(table).not.toHaveBeenCalled();
  });
});
