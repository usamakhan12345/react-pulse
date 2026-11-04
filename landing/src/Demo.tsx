import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  configurePulse,
  useLeakTracker,
  usePerformanceTracker,
  usePrevious,
  useRenderTracker,
  useTrackedState,
  useWhyDidYouRender,
} from "reactpulse-devtools";
import { Dashboard } from "reactpulse-devtools/devtools";
import { Section } from "./ui";

// The page is a production build, so monitoring is switched on explicitly.
configurePulse({
  enabled: true,
  threshold: 16,
  compareDepth: 3,
  historyLimit: 60,
  leakDetection: true,
  warnings: false, // keep visitors' consoles quiet; warnings still appear in the dashboard
  log: false,
});

/** Blocks the main thread for `ms` to simulate an expensive render. */
function burn(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    /* busy wait */
  }
}

function CounterCard() {
  const [count, setCount] = useTrackedState(0, "Counter.count");
  const previous = usePrevious(count);
  useRenderTracker("Counter", { state: { count } });
  return (
    <article className="demo-card">
      <h3>State change</h3>
      <p>
        <code>useTrackedState</code> + <code>usePrevious</code>. The render reason becomes{" "}
        <b>state</b> (certain).
      </p>
      <button type="button" className="btn btn-small" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
      <output className="demo-out">
        count {count}, previous {String(previous)}
      </output>
    </article>
  );
}

function ProfileLine({ name, age, tags }: { name: string; age: number; tags: string[] }) {
  useRenderTracker("UserProfile", { props: { name, age, tags } });
  return (
    <output className="demo-out">
      {name} ({age}) {tags.join(", ")}
    </output>
  );
}

function PropsCard() {
  const [age, setAge] = useState(30);
  const [, force] = useState(0);
  return (
    <article className="demo-card">
      <h3>Props changes</h3>
      <p>
        &ldquo;Rerender parent&rdquo; passes a <i>new but equal</i> array: the dashboard flags it as{" "}
        <b>identity only</b>.
      </p>
      <button type="button" className="btn btn-small" onClick={() => setAge((a) => a + 1)}>
        Birthday
      </button>
      <button type="button" className="btn btn-small" onClick={() => force((n) => n + 1)}>
        Rerender parent
      </button>
      <ProfileLine name="Ada" age={age} tags={["math", "code"]} />
    </article>
  );
}

const MemoChild = memo(function MemoChild({ label }: { label: string }) {
  useWhyDidYouRender("MemoChild", { label });
  return <span>memo</span>;
});

function PlainChild(props: { label: string }) {
  useWhyDidYouRender("PlainChild", props);
  return <span>plain</span>;
}

function ParentCard() {
  const [ticks, setTicks] = useState(0);
  return (
    <article className="demo-card">
      <h3>Why did this render?</h3>
      <p>
        The plain child re-renders with a <b>parent</b> reason (probable); the memoized child does
        not render at all.
      </p>
      <button type="button" className="btn btn-small" onClick={() => setTicks((t) => t + 1)}>
        Rerender parent ({ticks})
      </button>
      <output className="demo-out">
        <PlainChild label="hello" /> · <MemoChild label="hello" />
      </output>
    </article>
  );
}

function SlowBox({ cost }: { cost: number }) {
  const perf = usePerformanceTracker("SlowBox", { threshold: 16 });
  burn(cost);
  return (
    <>
      <button
        type="button"
        className="btn btn-small"
        onClick={() => {
          const end = perf.startInteraction("sort click");
          perf.measure("sort 20k numbers", () => Array.from({ length: 20000 }, Math.random).sort());
          end();
        }}
      >
        Measure work
      </button>
      <output className="demo-out">render cost {cost}ms (threshold 16ms)</output>
    </>
  );
}

function SlowCard() {
  const [cost, setCost] = useState(2);
  return (
    <article className="demo-card">
      <h3>Slow render</h3>
      <p>
        A render over the threshold is flagged and listed under <b>Performance</b> with a warning.
      </p>
      <button type="button" className="btn btn-small" onClick={() => setCost(2)}>
        Fast (2ms)
      </button>
      <button type="button" className="btn btn-small" onClick={() => setCost(40)}>
        Slow (40ms)
      </button>
      <SlowBox cost={cost} />
    </article>
  );
}

function LeakyTicker() {
  const leaks = useLeakTracker("LeakyTicker");
  useEffect(() => {
    leaks.setInterval(() => undefined, 1000, "tick");
    // No clearInterval on purpose: ReactPulse warns when this unmounts.
  }, [leaks]);
  return <span>leaky</span>;
}

function TidyTicker() {
  const leaks = useLeakTracker("TidyTicker");
  useEffect(() => {
    const id = leaks.setInterval(() => undefined, 1000, "tick");
    return () => leaks.clearInterval(id);
  }, [leaks]);
  return <span>tidy</span>;
}

function LeakCard() {
  const [show, setShow] = useState(true);
  return (
    <article className="demo-card">
      <h3>Leak warning</h3>
      <p>
        Unmount the leaky component (it never clears its interval) to get a warning. The tidy one
        stays quiet.
      </p>
      <button type="button" className="btn btn-small" onClick={() => setShow((s) => !s)}>
        {show ? "Unmount" : "Mount"} tickers
      </button>
      <output className="demo-out">
        {show ? (
          <>
            <LeakyTicker /> · <TidyTicker />
          </>
        ) : (
          "unmounted"
        )}
      </output>
    </article>
  );
}

/**
 * Renders its children one commit after the rest of the page. A hook's duration spans
 * everything React renders after it in the same pass, so mounting the demo inside the
 * (large) initial page commit would make these tiny components look slow.
 */
function AfterFirstCommit({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);
  return <>{ready ? children : fallback}</>;
}

export function Demo({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
}) {
  return (
    <Section
      id="demo"
      eyebrow="Live demo"
      title="Try it right here"
      lead={
        <>
          These are real components using the real hooks, and the panel on the right is the real
          dashboard from <code className="inline">reactpulse-devtools/devtools</code>. Click around
          and watch it update.
        </>
      }
      tone="soft"
    >
      <div className="demo">
        <AfterFirstCommit fallback={<div className="demo-controls" aria-busy="true" />}>
          <div className="demo-controls">
            <CounterCard />
            <PropsCard />
            <ParentCard />
            <SlowCard />
            <LeakCard />
          </div>
        </AfterFirstCommit>
        <div className="demo-dash" role="region" aria-label="ReactPulse dashboard, live">
          <Dashboard theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
      <p className="note">
        Tip: open the <b>Timeline</b> and <b>Performance</b> tabs, try <b>Pause</b>, <b>Export</b>{" "}
        and <b>Import</b>, or select a component and click an older render to see what changed.
      </p>
    </Section>
  );
}
