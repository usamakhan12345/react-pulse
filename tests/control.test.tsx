import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPulse,
  configurePulse,
  disablePulse,
  enablePulse,
  pausePulse,
  resumePulse,
  useRenderTracker,
} from "../src";
import { getStore, resetStore } from "../src/core/store";

function Probe({ v = 0 }: { v?: number }) {
  useRenderTracker("Probe", { props: { v } });
  return null;
}

afterEach(() => vi.unstubAllEnvs());

describe("global control", () => {
  it("configurePulse merges options and ignores undefined values", () => {
    configurePulse({ threshold: 5, historyLimit: 7 });
    configurePulse({ threshold: undefined });
    expect(getStore().config).toMatchObject({ threshold: 5, historyLimit: 7, compareDepth: 0 });
  });

  it("disablePulse / enablePulse switch monitoring globally", () => {
    const { rerender } = render(<Probe />);
    expect(getStore().components.get("Probe")!.renders).toBe(1);
    disablePulse();
    rerender(<Probe v={1} />);
    expect(getStore().components.get("Probe")!.renders).toBe(1);
    enablePulse();
    rerender(<Probe v={2} />);
    expect(getStore().components.get("Probe")!.renders).toBe(2);
  });

  it("pausePulse / resumePulse keep collected data", () => {
    const { rerender } = render(<Probe />);
    pausePulse();
    rerender(<Probe v={1} />);
    expect(getStore().components.get("Probe")!.renders).toBe(1);
    resumePulse();
    rerender(<Probe v={2} />);
    expect(getStore().components.get("Probe")!.renders).toBe(2);
  });

  it("clearPulse removes history", () => {
    render(<Probe />);
    clearPulse();
    expect(getStore().timeline).toHaveLength(0);
    expect(getStore().components.get("Probe")).toMatchObject({ renders: 0, live: 1 });
  });
});

describe("environment based activation", () => {
  it("monitors nothing in a production build unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    resetStore();
    const { rerender } = render(<Probe />);
    rerender(<Probe v={1} />);
    expect(getStore().components.size).toBe(0);
    expect(getStore().timeline).toHaveLength(0);

    enablePulse();
    rerender(<Probe v={2} />);
    expect(getStore().components.get("Probe")!.renders).toBe(1);
  });

  it("is on by default in development and test", () => {
    for (const env of ["development", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      resetStore();
      expect(getStore().isEnabled()).toBe(true);
    }
  });

  it("falls back to enabled when NODE_ENV cannot be read", () => {
    vi.stubGlobal("process", undefined);
    try {
      resetStore();
      expect(getStore().isEnabled()).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
