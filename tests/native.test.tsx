import { StrictMode, memo } from "react";
import { Share } from "react-native";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PulseDashboard,
  PulseDevtools,
  ReactPulse,
  exportReportJSON,
  useRenderTracker,
} from "reactpulse-devtools/native";
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

const press = (label: string | RegExp) => fireEvent.click(screen.getByLabelText(label));
const flush = () => act(() => getStore().flush());
/** Component names in the list, in order. Rows are labelled "<name>, <n> renders". */
const names = () =>
  screen
    .queryAllByLabelText(/, \d+ renders$/)
    .map((el) => el.getAttribute("aria-label")!.split(",")[0]);

describe("native entry", () => {
  it("exports the shared hooks, and they work", () => {
    function C() {
      useRenderTracker("Shared");
      return null;
    }
    render(<C />);
    expect(getStore().components.get("Shared")!.renders).toBe(1);
  });
});

describe("PulseDashboard (React Native UI)", () => {
  it("lists components with render counts and slow badges", () => {
    seed();
    render(<PulseDashboard theme="dark" />);
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
    const chart = screen.getByLabelText("Chart, 2 renders");
    expect(chart.textContent).toContain("2 slow");
    expect(chart.textContent).toContain("30.0ms"); // average
    expect(chart.textContent).toContain("40.0ms"); // max
  });

  it("sorts and filters with chips and searches by name", () => {
    seed();
    render(<PulseDashboard />);
    press("Sort: Max duration");
    expect(names()).toEqual(["Chart", "Footer", "Header"]);
    press("Sort: Name");
    expect(names()).toEqual(["Chart", "Footer", "Header"]);
    press("Sort: Render count");
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
    press("Filter: Slow only");
    expect(names()).toEqual(["Chart"]);
    press("Filter: All components");
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "foo" } });
    expect(names()).toEqual(["Footer"]);
    fireEvent.change(screen.getByLabelText("Search components"), { target: { value: "zzz" } });
    expect(screen.getByText(/No components match/)).toBeTruthy();
  });

  it("shows details with reasons and previous/current values, and goes back", () => {
    seed();
    render(<PulseDashboard />);
    press("Chart, 2 renders");
    expect(screen.getByRole("heading", { name: "Chart" })).toBeTruthy();
    expect(screen.getByText("Why did render #2 happen?")).toBeTruthy();
    expect(screen.getByText("certain")).toBeTruthy();
    expect(screen.getByText(/props changed: count/)).toBeTruthy();
    expect(screen.getByText("props.count")).toBeTruthy();
    expect(screen.getByText(/previous\s+1/)).toBeTruthy();
    expect(screen.getByText(/current\s+2/)).toBeTruthy();
    expect(screen.getByText(/upper-bound render-to-commit span/)).toBeTruthy();

    press("Back to components");
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
  });

  it("marks probable reasons, flags identity-only changes and selects older renders", () => {
    getStore().configure({ uiInterval: 0 });
    record("Card", {
      phase: "mount",
      reasons: [{ kind: "mount", confidence: "certain" }],
      changes: [],
    });
    record("Card", {
      reasons: [{ kind: "parent", confidence: "probable", detail: "the props object is new" }],
      changes: [
        { source: "props", key: "style", prev: { a: 1 }, next: { a: 1 }, referenceOnly: true },
      ],
    });
    render(<PulseDashboard />);
    press("Card, 2 renders");
    expect(screen.getByText("probable")).toBeTruthy();
    expect(screen.getByText("identity only")).toBeTruthy();
    press("Render 1");
    expect(screen.getByText(/initial mount/)).toBeTruthy();
    expect(screen.getByText(/No compared values changed/)).toBeTruthy();
  });

  it("pauses, resumes and clears", () => {
    seed();
    render(<PulseDashboard />);
    expect(screen.getByText("Recording")).toBeTruthy();
    press("Pause monitoring");
    expect(getStore().paused).toBe(true);
    expect(screen.getByText("Paused")).toBeTruthy();
    press("Resume monitoring");
    expect(getStore().paused).toBe(false);
    press("Clear history");
    expect(getStore().components.size).toBe(0);
    expect(screen.getByText(/No components match/)).toBeTruthy();
  });

  it("updates live when new renders are recorded", async () => {
    seed();
    render(<PulseDashboard />);
    act(() => {
      record("Brand New");
    });
    await flush();
    expect(names()).toContain("Brand New");
    expect(screen.getByLabelText("Header, 5 renders")).toBeTruthy();
    act(() => {
      record("Header");
    });
    await flush();
    expect(screen.getByLabelText("Header, 6 renders")).toBeTruthy();
  });

  it("shows an activity feed, newest first, and opens a render from it", () => {
    seed();
    render(<PulseDashboard />);
    press("Activity");
    const feed = screen.getAllByLabelText(/ render \d+$/);
    expect(feed[0]!.getAttribute("aria-label")).toBe("Footer render 3");
    press("Chart render 1");
    expect(screen.getByRole("heading", { name: "Chart" })).toBeTruthy();
    expect(screen.getByLabelText("Components").getAttribute("aria-selected")).toBe("true");
  });

  it("shows performance totals, slowest components and warnings", () => {
    seed();
    render(<PulseDashboard />);
    press("Performance");
    expect(screen.getByText("Total renders").nextElementSibling!.textContent).toBe("10");
    expect(screen.getByText("Slow renders").nextElementSibling!.textContent).toBe("2");
    expect(screen.getByText(/Chart took 40.0ms/)).toBeTruthy();
    expect(screen.getByText(/Interaction \(startInteraction\)/)).toBeTruthy();
    expect(screen.getByLabelText("Chart, max 40.0ms")).toBeTruthy();
  });

  it("shares the report through the share sheet by default", async () => {
    seed();
    const share = vi.spyOn(Share, "share");
    render(<PulseDashboard />);
    press("Report");
    press("Share report");
    await vi.waitFor(() => expect(share).toHaveBeenCalledOnce());
    const { message, title } = share.mock.calls[0]![0] as { message: string; title: string };
    expect(title).toBe("ReactPulse report");
    expect(JSON.parse(message).format).toBe("reactpulse-report");
    expect(JSON.parse(message).components).toHaveLength(3);
  });

  it("calls a custom onExport handler and reports its failure", async () => {
    seed();
    const onExport = vi
      .fn()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValue(undefined);
    render(<PulseDashboard onExport={onExport} />);
    press("Report");
    press("Share report");
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("disk full");
    press("Share report");
    await vi.waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Report ready to share."),
    );
    expect(onExport).toHaveBeenCalledTimes(2);
  });

  it("imports a pasted report, pauses live monitoring, and discards it", () => {
    seed();
    const json = exportReportJSON();
    getStore().clear();
    render(<PulseDashboard />);
    press("Report");
    fireEvent.change(screen.getByLabelText("Report JSON"), { target: { value: json } });
    press("Import report");
    expect(screen.getByRole("alert").textContent).toMatch(/Imported 3 components/);
    expect(getStore().paused).toBe(true);
    expect(screen.getByText(/Viewing an imported report/)).toBeTruthy();
    press("Components");
    expect(names()).toEqual(["Header", "Footer", "Chart"]);
    press("Discard imported data");
    expect(getStore().components.size).toBe(0);
    expect(getStore().paused).toBe(false);
  });

  it("explains an invalid import and keeps existing data", () => {
    seed();
    render(<PulseDashboard />);
    press("Report");
    fireEvent.change(screen.getByLabelText("Report JSON"), { target: { value: '{"hello":1}' } });
    press("Import report");
    expect(screen.getByRole("alert").textContent).toMatch(/Invalid ReactPulse report/);
    expect(getStore().components.size).toBe(3);
    expect(getStore().paused).toBe(false);
  });

  it("follows the device color scheme when theme is system", () => {
    (globalThis as { __rnScheme?: string }).__rnScheme = "dark";
    try {
      seed();
      render(<PulseDashboard theme="system" />);
      expect(names()).toHaveLength(3); // renders under either scheme without error
    } finally {
      delete (globalThis as { __rnScheme?: string }).__rnScheme;
    }
  });
});

describe("PulseDevtools (launcher and panel)", () => {
  it("opens from the launcher, closes, and expands", () => {
    render(<PulseDevtools />);
    expect(screen.queryByLabelText("ReactPulse panel")).toBeNull();
    press("Open ReactPulse");
    expect(screen.getByLabelText("ReactPulse panel")).toBeTruthy();
    press("Expand panel");
    expect(screen.getByLabelText("Shrink panel")).toBeTruthy();
    press("Close ReactPulse");
    expect(screen.queryByLabelText("ReactPulse panel")).toBeNull();
    expect(screen.getByLabelText("Open ReactPulse")).toBeTruthy();
  });

  it("can start open", () => {
    render(<PulseDevtools defaultOpen />);
    expect(screen.getByLabelText("ReactPulse panel")).toBeTruthy();
  });

  it("shows a warning count on the launcher", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getStore().configure({ uiInterval: 0 });
    render(<PulseDevtools />);
    act(() => {
      record("Laggy", { duration: 99, slow: true });
    });
    await flush();
    expect(within(screen.getByLabelText("Open ReactPulse")).getByText("1")).toBeTruthy();
  });

  it("toasts new warnings, lets you dismiss them, and ignores old ones", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getStore().configure({ uiInterval: 0 });
    record("Old", { duration: 99, slow: true });
    render(<PulseDevtools />);
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => {
      record("Laggy", { duration: 99, slow: true });
    });
    await flush();
    const toast = screen.getByRole("alert");
    expect(toast.textContent).toContain("Laggy took 99.0ms");
    press("Dismiss notification");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not toast when notifications are off", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getStore().configure({ uiInterval: 0 });
    render(<PulseDevtools notifications={false} />);
    act(() => {
      record("Quiet", { duration: 99, slow: true });
    });
    await flush();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("adds a dev-menu item that toggles the panel", () => {
    render(<PulseDevtools />);
    const menu = (globalThis as { __devMenu?: { title: string; handler: () => void } }).__devMenu;
    expect(menu?.title).toBe("ReactPulse: toggle panel");
    act(() => menu!.handler());
    expect(screen.getByLabelText("ReactPulse panel")).toBeTruthy();
    act(() => menu!.handler());
    expect(screen.queryByLabelText("ReactPulse panel")).toBeNull();
  });
});

describe("<ReactPulse> (native provider)", () => {
  it("applies config before children render the first time", () => {
    const seen: number[] = [];
    function Child() {
      seen.push(getStore().config.threshold);
      return null;
    }
    render(
      <ReactPulse config={{ threshold: 99 }} dashboard={false}>
        <Child />
      </ReactPulse>,
    );
    expect(seen).toEqual([99]);
  });

  it("renders the launcher while enabled and nothing extra when disabled", () => {
    const { unmount } = render(
      <ReactPulse>
        <span>app</span>
      </ReactPulse>,
    );
    expect(screen.getByLabelText("Open ReactPulse")).toBeTruthy();
    unmount();
    getStore().configure({ enabled: false });
    const { container } = render(
      <ReactPulse>
        <span>app</span>
      </ReactPulse>,
    );
    expect(container.innerHTML).toBe("<span>app</span>");
  });

  it("honors dashboard={false} and does not re-render children", () => {
    let renders = 0;
    const Child = memo(function Child() {
      renders++;
      return <span>child</span>;
    });
    const { container } = render(
      <StrictMode>
        <ReactPulse dashboard={false}>
          <Child />
        </ReactPulse>
      </StrictMode>,
    );
    expect(container.innerHTML).toBe("<span>child</span>");
    expect(renders).toBe(2); // StrictMode double render of the mount only
  });
});
