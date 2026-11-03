import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ReportError,
  exportReport,
  exportReportJSON,
  importReport,
  parseReport,
  useRenderTracker,
} from "../src";
import { getStore, resetStore } from "../src/core/store";
import { VERSION } from "../src/utils/environment";
import pkg from "../package.json";

function Sample({ value }: { value: unknown }) {
  useRenderTracker("Sample", { props: { value } });
  return null;
}

function seed() {
  const circular: Record<string, unknown> = { id: 1 };
  circular.self = circular;
  const { rerender } = render(<Sample value="a" />);
  rerender(<Sample value={circular} />);
  rerender(<Sample value={function handler() {}} />);
  getStore().recordWarning("slow-render", "manual", "Sample");
  getStore().recordState({ component: "Sample", label: "x", prev: 1, next: undefined, at: 1 });
}

describe("export / import", () => {
  it("keeps the exported package version in sync with package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });

  it("exports a JSON-serialisable report even with cycles, functions and undefined", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    seed();
    const json = exportReportJSON();
    const report = JSON.parse(json);
    expect(report).toMatchObject({ format: "reactpulse-report", version: 1 });
    expect(report.environment.reactpulse).toBe(VERSION);
    expect(report.components).toHaveLength(1);
    const events = report.components[0].events;
    expect(events).toHaveLength(3);
    expect(events[1].changes[0].next).toEqual({ id: 1, self: "[Circular]" });
    expect(events[2].changes[0].next).toBe("[Function handler]");
    expect(report.stateLog[0].next).toBe("[undefined]");
  });

  it("round-trips: importing an export reproduces the data", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    seed();
    const before = exportReport();
    resetStore();
    expect(getStore().components.size).toBe(0);

    importReport(JSON.stringify(before));
    const after = exportReport();
    const [a] = before.components;
    const [b] = after.components;
    expect(b).toMatchObject({
      name: a!.name,
      renders: a!.renders,
      rerenders: a!.rerenders,
      totalDuration: a!.totalDuration,
      maxDuration: a!.maxDuration,
      imported: true,
    });
    expect(b!.events.map((e) => [e.n, e.reasons, e.changes])).toEqual(
      a!.events.map((e) => [e.n, e.reasons, e.changes]),
    );
    expect(after.warnings.map((w) => w.message)).toEqual(before.warnings.map((w) => w.message));
    expect(getStore().timeline).toHaveLength(3);
  });

  it("pauses live monitoring after import unless told otherwise", () => {
    seed();
    const report = exportReport();
    resetStore();
    importReport(report);
    expect(getStore().paused).toBe(true);
    resetStore();
    importReport(report, { pause: false });
    expect(getStore().paused).toBe(false);
  });

  it("replaces by default and merges on request", () => {
    seed();
    const report = exportReport();
    importReport(report, { pause: false });
    expect(getStore().components.get("Sample")!.renders).toBe(3);
    importReport(report, { merge: true, pause: false });
    const rec = getStore().components.get("Sample")!;
    expect(rec.renders).toBe(6);
    expect(rec.events.length).toBe(6);
  });

  it("applies history limits to imported data", () => {
    seed();
    const report = exportReport();
    resetStore();
    getStore().configure({ historyLimit: 2, timelineLimit: 2 });
    importReport(report);
    expect(getStore().components.get("Sample")!.events).toHaveLength(2);
    expect(getStore().timeline).toHaveLength(2);
  });

  it.each([
    ["not json", "{nope", /not valid JSON/],
    ["wrong format", { format: "other", version: 1, components: [] }, /format/],
    ["wrong version", { format: "reactpulse-report", version: 2, components: [] }, /version 2/],
    ["no components", { format: "reactpulse-report", version: 1 }, /components/],
    [
      "nameless component",
      { format: "reactpulse-report", version: 1, components: [{ renders: 1 }] },
      /without a name/,
    ],
    ["null", null, /format/],
  ])("rejects an invalid report: %s", (_label, input, message) => {
    expect(() => parseReport(input)).toThrow(ReportError);
    expect(() => parseReport(input)).toThrow(message);
    expect(() => importReport(input)).toThrow(ReportError);
    expect(getStore().components.size).toBe(0);
  });

  it("sanitises untrusted field types instead of trusting them", () => {
    const report = parseReport({
      format: "reactpulse-report",
      version: 1,
      components: [
        {
          name: "X",
          renders: "lots",
          totalDuration: Infinity,
          events: [
            { duration: "slow", reasons: "nope", changes: [{ key: 5, source: "props" }] },
            7,
          ],
          live: 99,
        },
      ],
    });
    const c = report.components[0]!;
    expect(c.renders).toBe(0);
    expect(c.totalDuration).toBe(0);
    expect(c.live).toBe(0);
    expect(c.events).toHaveLength(2);
    expect(c.events[0]!.duration).toBe(0);
    expect(c.events[0]!.reasons).toEqual([]);
    expect(c.events[0]!.changes[0]!.key).toBe("5");
  });
});
