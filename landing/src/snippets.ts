// Every example here uses the real public API of reactpulse-devtools.

export const hookOnly = `
import { useRenderTracker } from "reactpulse-devtools";

function UserProfile({ name, age }: { name: string; age: number }) {
  useRenderTracker("UserProfile", { props: { name, age }, log: true });
  return <div>{name} - {age}</div>;
}
`;

export const consoleOutput = `
⚛ UserProfile #2 0.84ms
props changed: age
┌───────────┬──────────┬─────────┐
│ (index)   │ previous │ current │
├───────────┼──────────┼─────────┤
│ props.age │ 36       │ 37      │
└───────────┴──────────┴─────────┘
since previous render: 1204ms
`;

export const provider = `
import { ReactPulse } from "reactpulse-devtools";

export function Root() {
  return (
    <ReactPulse config={{ threshold: 16, showNotifications: true, trackRenders: true }}>
      <App />
    </ReactPulse>
  );
}
`;

export const instrumented = `
function Card(props: CardProps) {
  const theme = useContext(ThemeContext);
  const [open, setOpen] = useState(false);

  useWhyDidYouRender("Card", props, {
    state: { open },        // reported as "state" (certain) when it changes
    context: { theme },     // reported as "context" (certain)
    deps: { filters },      // reported as "hooks" (certain)
  });
  // ...
}
`;

export const profiler = `
import { PulseProfiler, usePerformanceTracker } from "reactpulse-devtools";

// React's own actualDuration for a whole subtree (development / profiling builds)
<PulseProfiler id="Feed"><Feed /></PulseProfiler>

// Time your own work, and an interaction until the next paint
const perf = usePerformanceTracker("Checkout", { threshold: 16 });
const sorted = perf.measure("sort", () => items.sort(compare)); // sync or promise
const done = perf.startInteraction("open-menu");                // call done() after your state update
`;

export const leaks = `
import { useLeakTracker } from "reactpulse-devtools";

function Chat() {
  const leaks = useLeakTracker("Chat");
  useEffect(() => {
    const id = leaks.setInterval(poll, 1000, "poll");
    const off = leaks.addEventListener(window, "resize", onResize);
    const unsub = leaks.subscribe(() => store.subscribe(onChange), "store");
    return () => { leaks.clearInterval(id); off(); unsub(); };
  }, [leaks]);
}
`;

export const reports = `
import { exportReport, downloadReport, importReport } from "reactpulse-devtools";

const report = exportReport();      // JSON-safe: cycles, functions and undefined are handled
downloadReport();                   // browser: saves reactpulse-report-<time>.json
importReport(jsonStringOrObject);   // validates, loads into the dashboard, pauses live monitoring
`;

export const config = `
<ReactPulse
  config={{
    enabled: "auto",            // on unless NODE_ENV === "production"
    threshold: 16,              // slow-render threshold (ms)
    compareDepth: 3,            // flag "new identity, equal value" up to 3 levels
    ignoreProps: ["children", /^on[A-Z]/],
    exclude: ["Tooltip"],       // component name filters (strings or RegExps)
    historyLimit: 100,          // render events kept per component
    performanceApi: true,       // also emit performance.measure() entries
    leakDetection: true,
    onSlowRender: (event) => report(event),
  }}
  theme="system"
  dock="bottom"
>
  <App />
</ReactPulse>
`;

export const control = `
import { configurePulse, enablePulse, disablePulse, pausePulse, resumePulse, clearPulse } from "reactpulse-devtools";

configurePulse({ threshold: 8 });   // outside React, e.g. in an entry file
disablePulse();                     // hooks stop comparing and recording completely
`;

export const nextApp = `
// app/layout.tsx  (App Router, a Server Component)
import { ReactPulse } from "reactpulse-devtools";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactPulse config={{ threshold: 20 }}>{children}</ReactPulse>
      </body>
    </html>
  );
}
`;

export const nextClient = `
// any client component
"use client";
import { useRenderTracker } from "reactpulse-devtools";

export function Counter() {
  useRenderTracker("Counter");
  // ...
}
`;

export const nextPages = `
// pages/_app.tsx  (Pages Router)
import type { AppProps } from "next/app";
import { ReactPulse } from "reactpulse-devtools";

export default function App({ Component, pageProps }: AppProps) {
  return <ReactPulse><Component {...pageProps} /></ReactPulse>;
}
`;

export const vite = `
// main.tsx  (Vite)
import { createRoot } from "react-dom/client";
import { ReactPulse } from "reactpulse-devtools";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ReactPulse><App /></ReactPulse>,
);
`;

export const prodFull = `
<ReactPulse
  config={{ enabled: true }}
  loadDevtools={() => import("reactpulse-devtools/devtools/full")}
>
  <App />
</ReactPulse>
`;

export const standalone = `
import { Dashboard } from "reactpulse-devtools/devtools";

<div style={{ height: 600 }}><Dashboard theme="dark" /></div>
`;

export const trackOptions = `
const info = useRenderTracker("Card", {
  props: { id, title },       // compared by reference, per key
  state: { open },            // instrumented state
  context: { theme },         // instrumented context
  deps: { filters },          // instrumented hook dependencies
  threshold: 8,               // per-component slow threshold (ms)
  compareDepth: 3,            // deep-compare changed values to this depth
  ignoreProps: ["style"],     // added to config.ignoreProps
  log: true,
  onRender: (event) => {},
  onSlow: (event) => {},
});
info.renderCount; info.isInitialRender; info.reasons; info.changes;
`;

export const useCaseList = `
function Results({ items, onSelect }: ResultsProps) {
  useRenderTracker("Results", { props: { items, onSelect }, compareDepth: 3 });
  // Dashboard: "props changed: items - new identity but deep-equal values,
  // this render may be avoidable"  ->  memoize items / onSelect in the parent.
}
`;

export const useCaseMeasure = `
const perf = usePerformanceTracker("Chart", { threshold: 16 });
const points = perf.measure("downsample", () => downsample(data));
`;

export const useCaseStore = `
// state from an external store is not visible to React's public API, so
// instrument it and ReactPulse can report it as a certain cause:
const user = useStore((s) => s.user);
useRenderTracker("Header", { deps: { user } });
`;

export const rnProvider = `
// App.tsx
import { ReactPulse } from "reactpulse-devtools/native";

export default function App() {
  return (
    <ReactPulse config={{ threshold: 16, showNotifications: true }}>
      <Navigation />
    </ReactPulse>
  );
}
`;

export const rnHooks = `
import { useRenderTracker, useWhyDidYouRender } from "reactpulse-devtools/native";

function ProfileCard(props: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  useWhyDidYouRender("ProfileCard", props, { state: { expanded } });
  // ...
}
`;

export const rnOptions = `
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Clipboard from "@react-native-clipboard/clipboard"; // your own dependency, not required

function Root() {
  const insets = useSafeAreaInsets();
  return (
    <ReactPulse
      insets={insets}
      position="bottom-right"
      onExport={(json) => Clipboard.setString(json)}
    >
      <Navigation />
    </ReactPulse>
  );
}
`;

export const rnRelease = `
// Only load the panel in development. Hooks stay as thin no-ops in release builds.
const Pulse: typeof import("reactpulse-devtools/native").ReactPulse = __DEV__
  ? require("reactpulse-devtools/native").ReactPulse
  : ({ children }) => <>{children}</>;
`;
