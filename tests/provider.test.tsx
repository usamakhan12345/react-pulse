import { StrictMode, memo } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReactPulse, useRenderTracker } from "../src";
import { getStore } from "../src/core/store";
import { DevtoolsRoot as StubRoot } from "../src/devtools/stub";

const FakeDevtools = () => <div data-testid="devtools" />;

describe("<ReactPulse>", () => {
  it("applies config before children render for the first time", () => {
    const seen: number[] = [];
    function Child() {
      seen.push(getStore().config.threshold);
      useRenderTracker("Child");
      return null;
    }
    render(
      <ReactPulse config={{ threshold: 99 }} dashboard={false}>
        <Child />
      </ReactPulse>,
    );
    expect(seen).toEqual([99]);
  });

  it("applies include/exclude config to children's very first render", () => {
    function Hidden() {
      useRenderTracker("Hidden");
      return null;
    }
    function Shown() {
      useRenderTracker("Shown");
      return null;
    }
    render(
      <ReactPulse config={{ exclude: ["Hidden"] }} dashboard={false}>
        <Hidden />
        <Shown />
      </ReactPulse>,
    );
    expect([...getStore().components.keys()]).toEqual(["Shown"]);
  });

  it("lazy-loads the dashboard only when it is wanted and enabled", async () => {
    const loader = vi.fn(async () => ({ DevtoolsRoot: FakeDevtools }));
    const { unmount } = render(
      <ReactPulse loadDevtools={loader} dashboard={false}>
        <p>app</p>
      </ReactPulse>,
    );
    unmount();
    getStore().configure({ enabled: false });
    render(
      <ReactPulse loadDevtools={loader}>
        <p>app</p>
      </ReactPulse>,
    );
    expect(loader).not.toHaveBeenCalled();

    getStore().configure({ enabled: true });
    render(
      <ReactPulse loadDevtools={loader}>
        <p>app</p>
      </ReactPulse>,
    );
    expect(await screen.findByTestId("devtools")).toBeTruthy();
    expect(loader).toHaveBeenCalledOnce();
  });

  it("does not re-render children when the dashboard finishes loading", async () => {
    let renders = 0;
    const Child = memo(function Child() {
      renders++;
      return <p>child</p>;
    });
    const tree = (
      <ReactPulse loadDevtools={async () => ({ DevtoolsRoot: FakeDevtools })}>
        <Child />
      </ReactPulse>
    );
    render(tree);
    await screen.findByTestId("devtools");
    expect(renders).toBe(1);
  });

  it("loads the real dashboard through the default loader", async () => {
    render(
      <ReactPulse>
        <p>app</p>
      </ReactPulse>,
    );
    // First import of the real dashboard module graph can be slow on a cold transform cache.
    expect(await screen.findByLabelText("Open ReactPulse", {}, { timeout: 10_000 })).toBeTruthy();
  });

  it("renders nothing extra when the production stub is loaded", async () => {
    const loader = vi.fn(async () => ({ DevtoolsRoot: StubRoot }));
    const { container } = render(
      <ReactPulse loadDevtools={loader}>
        <p>app</p>
      </ReactPulse>,
    );
    await vi.waitFor(() => expect(loader).toHaveBeenCalled());
    expect(container.innerHTML).toBe("<p>app</p>");
  });

  it("warns instead of crashing when the dashboard fails to load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <ReactPulse
        loadDevtools={async () => {
          throw new Error("chunk failed");
        }}
      >
        <p>app</p>
      </ReactPulse>,
    );
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(container.textContent).toBe("app");
  });

  it("works in StrictMode and keeps the app untouched while disabled", async () => {
    const loader = vi.fn(async () => ({ DevtoolsRoot: FakeDevtools }));
    getStore().configure({ enabled: false });
    const { container } = render(
      <StrictMode>
        <ReactPulse loadDevtools={loader}>
          <p>app</p>
        </ReactPulse>
      </StrictMode>,
    );
    expect(container.innerHTML).toBe("<p>app</p>");
    expect(loader).not.toHaveBeenCalled();
  });
});
