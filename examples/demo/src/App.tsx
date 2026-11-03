import { memo, useEffect, useState } from "react";
import {
  PulseProfiler,
  useLeakTracker,
  useMountTracker,
  usePerformanceTracker,
  usePrevious,
  useRenderTracker,
  useTrackedState,
  useWhyDidYouRender,
} from "reactpulse-devtools";

/** Blocks the main thread for `ms` to simulate an expensive render. */
function burn(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    /* busy */
  }
}

function Counter() {
  const [count, setCount] = useTrackedState(0, "Counter.count");
  const previous = usePrevious(count);
  useRenderTracker("Counter", { state: { count } });
  return (
    <section className="card">
      <h2>useTrackedState + usePrevious</h2>
      <p>State changes are recorded; the render reason is "state".</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <div>
        count {count}, previous {String(previous)}
      </div>
    </section>
  );
}

function UserProfile({ name, age, tags }: { name: string; age: number; tags: string[] }) {
  useRenderTracker("UserProfile", { props: { name, age, tags }, log: false });
  return (
    <div>
      {name} ({age}) {tags.join(", ")}
    </div>
  );
}

function PropsDemo() {
  const [age, setAge] = useState(30);
  const [, force] = useState(0);
  // A new array every render: with compareDepth the dashboard marks it "identity only".
  return (
    <section className="card">
      <h2>Props changes</h2>
      <p>
        "Rerender parent" creates a new but equal array (identity only). "Birthday" changes a real
        prop.
      </p>
      <button onClick={() => setAge((a) => a + 1)}>Birthday</button>
      <button onClick={() => force((n) => n + 1)}>Rerender parent</button>
      <UserProfile name="Ada" age={age} tags={["math", "code"]} />
    </section>
  );
}

const MemoChild = memo(function MemoChild({ label }: { label: string }) {
  useWhyDidYouRender("MemoChild", { label });
  return <span>memo: {label}</span>;
});

function PlainChild(props: { label: string }) {
  useWhyDidYouRender("PlainChild", props);
  return <span>plain: {props.label}</span>;
}

function WhyDemo() {
  const [tick, setTick] = useState(0);
  return (
    <section className="card">
      <h2>Why did this render?</h2>
      <p>
        Open the browser console. The non-memo child re-renders with a "parent" (probable) reason.
      </p>
      <button onClick={() => setTick((t) => t + 1)}>Rerender parent ({tick})</button>
      <div>
        <PlainChild label="hello" /> · <MemoChild label="hello" />
      </div>
    </section>
  );
}

function SlowList({ cost }: { cost: number }) {
  const perf = usePerformanceTracker("SlowList", { threshold: 16 });
  burn(cost);
  return (
    <section className="card">
      <h2>Slow render detection</h2>
      <p>Simulated render cost: {cost}ms (threshold 16ms).</p>
      <button
        onClick={() => {
          const end = perf.startInteraction("sort click");
          perf.measure("sort 20k numbers", () => Array.from({ length: 20000 }, Math.random).sort());
          end();
        }}
      >
        Measure work + interaction
      </button>
    </section>
  );
}

function PerfDemo() {
  const [cost, setCost] = useState(2);
  return (
    <>
      <div>
        <button onClick={() => setCost(2)}>Fast (2ms)</button>
        <button onClick={() => setCost(40)}>Slow (40ms)</button>
      </div>
      <PulseProfiler id="SlowList (Profiler)">
        <SlowList cost={cost} />
      </PulseProfiler>
    </>
  );
}

function LeakyTicker() {
  const leaks = useLeakTracker("LeakyTicker");
  useMountTracker("LeakyTicker");
  useEffect(() => {
    leaks.setInterval(() => undefined, 1000, "tick");
    // Missing clearInterval: ReactPulse warns when this unmounts.
  }, [leaks]);
  return <em>ticking…</em>;
}

function TidyTicker() {
  const leaks = useLeakTracker("TidyTicker");
  useEffect(() => {
    const id = leaks.setInterval(() => undefined, 1000, "tick");
    return () => leaks.clearInterval(id);
  }, [leaks]);
  return <em>ticking (cleaned up)</em>;
}

function LeakDemo() {
  const [show, setShow] = useState(true);
  return (
    <section className="card">
      <h2>Leak warnings</h2>
      <p>Unmount the leaky component to get a warning; the tidy one stays quiet.</p>
      <button onClick={() => setShow((s) => !s)}>{show ? "Unmount" : "Mount"} tickers</button>
      <div>
        {show && (
          <>
            <LeakyTicker /> <TidyTicker />
          </>
        )}
      </div>
    </section>
  );
}

export function App() {
  return (
    <main>
      <h1>⚛ ReactPulse demo</h1>
      <p className="lead">
        Interact with the cards, then inspect the panel at the bottom of the page.
      </p>
      <div className="grid">
        <Counter />
        <PropsDemo />
        <WhyDemo />
        <section className="card">
          <PerfDemo />
        </section>
        <LeakDemo />
      </div>
    </main>
  );
}
