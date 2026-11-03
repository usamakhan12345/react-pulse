import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "../src/devtools";
import { DevtoolsRoot } from "../src/devtools/DevtoolsRoot";
import { changeFrequency, selectComponents, summarize } from "../src/devtools/select";
import { exportReportJSON } from "../src";
import { getStore } from "../src/core/store";
import type { RenderEvent } from "../src/core/types";

let n = 0;
function record(component: string, over: Partial<Omit<RenderEvent, "id">> = {}) {
  n++;
  const count = (getStore().components.get(component)?.renders ?? 0) + 1;
  return getStore().recordRender({
    component,
    instance: 1,
    n: count,
    at: 1_700_000_000_000 + n * 1000,
    sinceLast: count > 1 ? 1000 : null,
    duration: 2,
    durationKind: "span",
    slow: false,
    phase: "update",
    reasons: [{ kind: "props", confidence: "certain", keys: ["count"] }],
    changes: [{ source: "props", key: "count", prev: 1, next: 2 }],
    ...over,
  });
}

function seed() {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  getStore().configure({ uiInterval: 0 });
  for (let i = 0; i < 5; i++) record("Header");
  record("Chart", { duration: 40, slow: true });
  record("Chart", { duration: 20, slow: true });
  record("Footer", { duration: 8 });
  record("Footer", { duration: 9 });
  record("Footer", { duration: 10 });
}

const rows = () =>
  screen.getAllByRole("option", { name: /./ }).filter((el) => el.className.includes("rp-row"));
const names = () => rows().map((r) => r.querySelector(".rp-ellipsis")!.textContent);
const flush = () => act(() => getStore().flush());

describe("selectComponents / summarize / changeFrequency", () => {
  it("searches, filters and sorts deterministically", () => {
    seed();
    const all = [...getStore().components.values()];
    const q = { search: "", filter: "all" as const, sort: "renders" as const };
    expect(selectComponents(all, q).map((c) => c.name)).toEqual(["Header", "Footer", "Chart"]);
    expect(selectComponents(all, { ...q, sort: "max" }).map((c) => c.name)).toEqual([
      "Chart",
      "Footer",
      "Header",
    ]);
    expect(selectComponents(all, { ...q, sort: "avg" }).map((c) => c.name)).toEqual([
      "Chart",
      "Footer",
      "Header",
    ]);
    expect(selectComponents(all, { ...q, sort: "name" }).map((c) => c.name)).toEqual([
      "Chart",
      "Footer",
      "Header",
    ]);
    expect(selectComponents(all, { ...q, filter: "slow" }).map((c) => c.name)).toEqual(["Chart"]);
    expect(selectComponents(all, { ...q, search: " ead" }).map((c) => c.name)).toEqual(["Header"]);
  });

  it("summarizes totals and counts how often keys changed", () => {
    seed();
    const s = summarize(getStore().components.values());
    expect(s).toMatchObject({ components: 3, renders: 10, slow: 2, max: 40, maxName: "Chart" });
    expect(changeFrequency(getStore().components.get("Header")!.events)).toEqual([
      { label: "props.count", count: 5 },
    ]);
  });
});

describe("Dashboard", () => {
  it("lists components with render counts, durations and slow badges", () => {
    seed();
    render(<Dashboard />);
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
    const chart = rows().find((r) => r.textContent!.startsWith("Chart"))!;
    expect(within(chart).getByText("2 slow")).toBeTruthy();
    expect(chart.textContent).toContain("40.0ms"); // max
    expect(chart.textContent).toContain("30.0ms"); // average of 40 and 20
  });

  it("sorts by render count and by duration", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.selectOptions(screen.getByLabelText("Sort components"), "max");
    expect(names()).toEqual(["Chart", "Footer", "Header"]);
    await user.selectOptions(screen.getByLabelText("Sort components"), "avg");
    expect(names()).toEqual(["Chart", "Footer", "Header"]);
    await user.selectOptions(screen.getByLabelText("Sort components"), "renders");
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
  });

  it("searches and filters", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.type(screen.getByLabelText("Search components"), "foo");
    expect(names()).toEqual(["Footer"]);
    await user.clear(screen.getByLabelText("Search components"));
    await user.selectOptions(screen.getByLabelText("Filter components"), "slow");
    expect(names()).toEqual(["Chart"]);
    await user.type(screen.getByLabelText("Search components"), "zzz");
    expect(screen.getByText(/No components match/)).toBeTruthy();
  });

  it("shows per-component details and the changed values side by side", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(rows().find((r) => r.textContent!.startsWith("Chart"))!);
    expect(screen.getByRole("heading", { name: "Chart" })).toBeTruthy();
    const stats = screen.getByRole("heading", { name: "Chart" }).closest(".rp-details")!;
    expect(stats.textContent).toContain("Re-renders");
    const table = screen.getByRole("table", { name: "Changed values" });
    expect(within(table).getByText("count")).toBeTruthy();
    const cells = within(table).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["props.count", "1", "2"]);
    expect(screen.getByText(/props changed: count/)).toBeTruthy();
    expect(screen.getByText("certain")).toBeTruthy();
  });

  it("shows probable reasons distinctly and lets you pick a render from the history", async () => {
    getStore().configure({ uiInterval: 0 });
    record("Card", {
      phase: "mount",
      reasons: [{ kind: "mount", confidence: "certain" }],
      changes: [],
    });
    record("Card", {
      reasons: [{ kind: "parent", confidence: "probable", detail: "the props object is new" }],
      changes: [],
    });
    const user = userEvent.setup();
    render(<Dashboard />);
    expect(screen.getByText("probable")).toBeTruthy();
    expect(screen.getByText(/No compared values changed/)).toBeTruthy();
    const history = screen.getByRole("listbox", { name: "Renders" });
    await user.click(within(history).getAllByRole("option")[1]!); // older render (#mount)
    expect(screen.getByText(/initial mount/)).toBeTruthy();
  });

  it("flags identity-only changes", () => {
    getStore().configure({ uiInterval: 0 });
    record("Memoish", {
      changes: [
        { source: "props", key: "style", prev: { a: 1 }, next: { a: 1 }, referenceOnly: true },
      ],
      reasons: [
        {
          kind: "props",
          confidence: "certain",
          keys: ["style"],
          detail: "new identity but deep-equal values",
        },
      ],
    });
    render(<Dashboard />);
    expect(screen.getByText("identity only")).toBeTruthy();
  });

  it("pauses and resumes monitoring", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    expect(screen.getByRole("status", { name: "" }).textContent).toBe("Recording");
    await user.click(screen.getByLabelText("Pause monitoring"));
    expect(getStore().paused).toBe(true);
    expect(screen.getByText("Paused")).toBeTruthy();
    await user.click(screen.getByLabelText("Resume monitoring"));
    expect(getStore().paused).toBe(false);
  });

  it("clears the history", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(screen.getByLabelText("Clear history"));
    expect(getStore().components.size).toBe(0);
    expect(screen.getByText(/No components match/)).toBeTruthy();
  });

  it("updates live when new renders are recorded", async () => {
    seed();
    render(<Dashboard />);
    expect(rows().find((r) => r.textContent!.startsWith("Header"))!.textContent).toContain("5");
    act(() => {
      record("Header");
      record("Header");
    });
    await flush();
    expect(rows().find((r) => r.textContent!.startsWith("Header"))!.textContent).toContain("7");
    act(() => {
      record("Brand New");
    });
    await flush();
    expect(names()).toContain("Brand New");
  });

  it("switches between light and dark themes", async () => {
    const user = userEvent.setup();
    const { container } = render(<Dashboard theme="dark" />);
    const root = container.querySelector(".rp-root")!;
    expect(root.getAttribute("data-theme")).toBe("dark");
    await user.click(screen.getByLabelText("Switch to light theme"));
    expect(root.getAttribute("data-theme")).toBe("light");
    await user.click(screen.getByLabelText("Switch to dark theme"));
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("follows the system theme by default", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("dark"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    try {
      const { container } = render(<Dashboard />);
      expect(container.querySelector(".rp-root")!.getAttribute("data-theme")).toBe("dark");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders a timeline and jumps to a render when a tick is clicked", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(screen.getByRole("tab", { name: /Timeline/ }));
    const timeline = screen.getByRole("group", { name: "Render timeline" });
    const ticks = within(timeline).getAllByRole("button");
    expect(ticks).toHaveLength(10);
    const slowTick = within(timeline).getAllByRole("button", {
      name: /Chart render 1, 40\.0ms, slow/,
    });
    await user.click(slowTick[0]!);
    expect(screen.getByRole("tab", { name: /Components/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("heading", { name: "Chart" })).toBeTruthy();
  });

  it("shows performance statistics, warnings and explains what is measured", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(screen.getByRole("tab", { name: /Performance/ }));
    expect(screen.getByText("Total renders").nextElementSibling!.textContent).toBe("10");
    expect(screen.getByText("Slow renders").nextElementSibling!.textContent).toBe("2");
    expect(screen.getByRole("region", { name: "Warnings" }).textContent).toContain(
      "Chart took 40.0ms",
    );
    expect(screen.getByRole("region", { name: "What is measured" }).textContent).toMatch(
      /excludes paint/,
    );
    const slowest = screen.getByRole("region", { name: "Slowest components" });
    expect(within(slowest).getAllByRole("button")[0]!.textContent).toContain("Chart");
  });

  it("exports the current data as a downloadable JSON file", async () => {
    seed();
    const user = userEvent.setup();
    let blob: Blob | undefined;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: (b: Blob) => ((blob = b), "blob:x"),
      revokeObjectURL: () => {},
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      render(<Dashboard />);
      await user.click(screen.getByLabelText("Export report"));
      expect(click).toHaveBeenCalledOnce();
      const report = JSON.parse(await blob!.text());
      expect(report.format).toBe("reactpulse-report");
      expect(report.components.map((c: { name: string }) => c.name).sort()).toEqual([
        "Chart",
        "Footer",
        "Header",
      ]);
      expect(screen.getByText("Report downloaded.")).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("imports a previously exported report, pausing live monitoring", async () => {
    seed();
    const json = exportReportJSON();
    getStore().clear();
    const user = userEvent.setup();
    render(<Dashboard />);
    expect(screen.getByText(/No components match/)).toBeTruthy();
    await user.upload(
      screen.getByLabelText("Import report file"),
      new File([json], "report.json", { type: "application/json" }),
    );
    expect(await screen.findByText(/Imported 3 components from report.json/)).toBeTruthy();
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
    expect(getStore().paused).toBe(true);
    expect(screen.getAllByText("imported").length).toBe(3);

    await user.click(screen.getByText("Discard imported data"));
    expect(getStore().components.size).toBe(0);
    expect(getStore().paused).toBe(false);
  });

  it("reports a clear error for an invalid import without changing data", async () => {
    seed();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.upload(
      screen.getByLabelText("Import report file"),
      new File(['{"hello":1}'], "bad.json", { type: "application/json" }),
    );
    expect(await screen.findByText(/Invalid ReactPulse report/)).toBeTruthy();
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
    expect(getStore().paused).toBe(false);
  });
});

describe("DevtoolsRoot", () => {
  it("opens from the launcher, closes with Escape and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<DevtoolsRoot theme="dark" />);
    expect(screen.queryByRole("complementary")).toBeNull();
    await user.click(screen.getByLabelText("Open ReactPulse"));
    expect(screen.getByRole("complementary", { name: "ReactPulse" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(localStorage.getItem("reactpulse:open")).toBe("false");
  });

  it("starts open when asked and docks right", async () => {
    const user = userEvent.setup();
    render(<DevtoolsRoot defaultOpen />);
    const panel = screen.getByRole("complementary");
    expect(panel.className).toContain("rp-panel-bottom");
    await user.click(screen.getByLabelText("Dock to right"));
    expect(panel.className).toContain("rp-panel-right");
  });

  it("shows a toast for a new warning and lets you dismiss it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getStore().configure({ uiInterval: 0 });
    const user = userEvent.setup();
    render(<DevtoolsRoot />);
    act(() => {
      record("Laggy", { duration: 99, slow: true });
    });
    await flush();
    const toasts = screen.getByRole("log", { name: "ReactPulse notifications" });
    expect(toasts.textContent).toContain("Laggy took 99.0ms");
    await user.click(within(toasts).getByLabelText("Dismiss notification"));
    expect(screen.queryByRole("log")).toBeNull();
  });

  it("does not toast when notifications are off or for warnings that already existed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getStore().configure({ uiInterval: 0 });
    record("Old", { duration: 99, slow: true });
    const { unmount } = render(<DevtoolsRoot />);
    expect(screen.queryByRole("log")).toBeNull();
    unmount();
    render(<DevtoolsRoot notifications={false} />);
    act(() => {
      record("Quiet", { duration: 99, slow: true });
    });
    await flush();
    expect(screen.queryByRole("log")).toBeNull();
  });
});
