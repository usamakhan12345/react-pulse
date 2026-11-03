# ⚛ ReactPulse

Lightweight React debugging and performance inspection: render tracking, "why did this render?", slow-render detection, leak warnings and a lazy-loaded developer dashboard. TypeScript-first, built only on public React APIs.

```bash
npm install reactpulse
```

- **Small.** Using the hooks costs **~4.3–4.8 KB gzip** (measured, see [Bundle size](#bundle-size)). The dashboard is a separate lazy chunk and is replaced by a 0.08 KB stub in production builds.
- **Honest.** Causes that React does not expose are labelled **probable**, never presented as fact. See [Limitations](#limitations).
- **Safe.** Records after commit (never during render), never reads Fiber internals, works with StrictMode and SSR.
- **Off when you want it off.** Disabled in production by default; a disabled hook costs ≈ 0.8 µs per render.

![ReactPulse dashboard: component details and render reasons](docs/images/dashboard-details-dark.png)

> Screenshots are of the demo app in `examples/demo`.

## Contents

- [Quick start](#quick-start) · [Hooks](#hooks) · [Why did this render?](#why-did-this-render) · [Performance monitoring](#performance-monitoring)
- [Dashboard](#dashboard) · [Memory-leak warnings](#memory-leak-warnings) · [Reports](#export-and-import-reports)
- [Configuration](#configuration) · [Next.js](#nextjs) · [Production](#production-builds)
- [Performance considerations](#performance-considerations) · [Bundle size](#bundle-size) · [Limitations](#limitations) · [Compatibility](#compatibility) · [Contributing](#contributing)

## Quick start

Hooks work on their own, with no provider and no dashboard:

```tsx
import { useRenderTracker } from "reactpulse";

function UserProfile({ name, age }: { name: string; age: number }) {
  useRenderTracker("UserProfile", { props: { name, age }, log: true });
  return <div>{name} - {age}</div>;
}
```

Console output for a re-render (illustrative; in the browser it is a collapsed, styled group, and the table lists previous and current values side by side):

```
⚛ UserProfile #2 0.84ms
props changed: age
┌───────────┬──────────┬─────────┐
│ (index)   │ previous │ current │
├───────────┼──────────┼─────────┤
│ props.age │ 36       │ 37      │
└───────────┴──────────┴─────────┘
since previous render: 1204ms
```

Add the provider to get configuration plus the dashboard (loaded lazily, only when monitoring is enabled):

```tsx
import { ReactPulse } from "reactpulse";

export function Root() {
  return (
    <ReactPulse config={{ threshold: 16, showNotifications: true, trackRenders: true }}>
      <App />
    </ReactPulse>
  );
}
```

`<ReactPulse>` never re-renders `children`. Everything is disabled when `NODE_ENV === "production"` unless you opt in.

## Hooks

| Hook | Purpose |
| --- | --- |
| `useRenderTracker(name, options?)` | Records every committed render: count, duration, time between renders, changed props/state/context/deps and likely reasons. |
| `useWhyDidYouRender(name, props, options?)` | Same engine, tuned for the console: logs each re-render with its reasons and previous/current values. |
| `usePrevious(value)` | Value from the previous committed render. |
| `useMountTracker(name?, { log? })` | Records mount/unmount and lifetime; returns a stable `isMounted()`. |
| `usePerformanceTracker(name, options?)` | Render timing plus `measure()` and `startInteraction()` helpers. |
| `useTrackedState(initial, name?)` | `useState` that records each committed change. |
| `useLeakTracker(owner)` | Timer/listener/subscription helpers that warn about leaks on unmount. |

All hooks are unconditional (Rules of Hooks), never trigger a render themselves and keep the cost of a disabled call to a few ref/effect registrations.

### `useRenderTracker`

```tsx
const info = useRenderTracker("Card", {
  props: { id, title },              // compared by reference, per key
  state: { open },                   // instrumented state
  context: { theme },                // instrumented context: { theme: useContext(Theme) }
  deps: { filters },                 // instrumented hook dependencies
  threshold: 8,                      // per-component slow threshold (ms)
  compareDepth: 3,                   // flag "new identity, equal value" up to 3 levels
  ignoreProps: ["style"],            // added to config.ignoreProps
  log: true,
  onRender: (event) => {},
  onSlow: (event) => {},
});
info.renderCount; info.isInitialRender; info.reasons; info.changes;
```

`name` identifies the component in the dashboard. Several instances with the same name share one record (and are tracked individually by instance number).

### `useTrackedState`

```tsx
const [count, setCount] = useTrackedState(0, "Counter.count"); // "Component.label"
```

Changes are recorded after commit, so batching and StrictMode produce one entry per real change. They appear under the component in the dashboard.

### `usePerformanceTracker`

```tsx
const perf = usePerformanceTracker("Checkout", { threshold: 16 });

const sorted = perf.measure("sort", () => items.sort(compare));        // sync or promise
const done = perf.startInteraction("open-menu");                       // call done() after your state update
```

`startInteraction` measures until the browser's next paint (see [what is measured](#what-is-measured)). Use either `useRenderTracker` or `usePerformanceTracker` on a component, not both: each records renders.

## Why did this render?

ReactPulse reports a reason **only when it can be derived from values it compared**:

| Reason | Confidence | How it is determined |
| --- | --- | --- |
| `mount` | certain | First commit of the instance. |
| `props` | certain | A compared prop changed (`Object.is`, or deep-equal to `compareDepth`). Shows previous and current values. |
| `state` / `context` / `hooks` | certain | A value you passed in `state` / `context` / `deps` changed. Not detected for anything you did not pass. |
| `parent` | **probable** | Nothing compared changed, but the `props` object is a new object. React creates a new props object when a parent re-renders. |
| `internal` | **probable** | Nothing compared changed and the `props` object is the same: own state, context, an external store or an uninstrumented hook. |
| `unknown` | **probable** | Nothing compared changed and the props object identity was not provided. |

For `parent`/`internal`, pass the component's **real** props object:

```tsx
function Card(props: CardProps) {
  useWhyDidYouRender("Card", props, { state: { open }, context: { theme } });
}
```

With `compareDepth > 0`, a changed identity with equal contents is flagged `identity only` – a strong hint that a `useMemo`/`useCallback` would avoid the render.

## Performance monitoring

```tsx
<ReactPulse config={{ threshold: 16, performanceApi: true, onSlowRender: (e) => report(e) }}>
```

Each component record keeps render count, re-render count, average, maximum and last duration, and the number of slow renders. A slow render (duration > `threshold`) creates a warning (console, dashboard toast, `onWarning`).

### What is measured

These are three different things; the dashboard labels which one you are looking at.

| Measure | Source | Includes | Excludes |
| --- | --- | --- | --- |
| **Render span** (hooks) | Time from the hook call during render to the layout effect after commit | The component body, rendering of its children, DOM mutation | Browser paint. With concurrent rendering it can include time React yielded to the browser. |
| **Profiler duration** (`<PulseProfiler>`) | React's own `actualDuration` from the public `<Profiler>` | Render work of the subtree for that commit | Commit work, paint. Only reported by development and profiling builds of React. |
| **Interaction** (`startInteraction`) | Your start call until the next animation frame + following task | Anything between start and the next paint | – (approximation; background tabs do not paint) |

```tsx
import { PulseProfiler } from "reactpulse";
<PulseProfiler id="Feed"><Feed /></PulseProfiler>   // use an id no hook uses
```

With `performanceApi: true`, tracked renders also emit `performance.measure("⚛ Name")` entries so they appear in the browser's Performance panel (User Timing).

## Dashboard

`<ReactPulse>` renders a floating launcher; the panel can dock to the bottom or right and be resized. It shows:

- every registered component with render count, average and max duration, slow badges;
- per-component details: stats, most-changed props, **why each render happened** with previous/current values side by side, render history, tracked state and measurements;
- a timeline (one lane per component, tick height = duration, red = slow);
- a performance tab: totals, slowest components vs. threshold, warnings, and an explanation of the numbers;
- search, filter (all / slow / re-rendered / mounted now), sort (render count, average, max, most recent, name);
- pause/resume, clear history, JSON export/import, light/dark theme, toast notifications.

![Timeline](docs/images/dashboard-timeline-dark.png)
![Performance, light theme](docs/images/dashboard-performance-light.png)

The panel is responsive (it adapts to its own width, so it also works docked right or on phones). Use the dashboard on its own inside any layout:

```tsx
import { Dashboard } from "reactpulse/devtools";
<div style={{ height: 600 }}><Dashboard theme="dark" /></div>
```

Panel state (open, dock, size, theme) is remembered in `localStorage`; it works without it.

## Memory-leak warnings

Opt in with `leakDetection: true`. Resources created **through ReactPulse helpers** are tracked:

```tsx
function Chat() {
  const leaks = useLeakTracker("Chat");
  useEffect(() => {
    const id = leaks.setInterval(poll, 1000, "poll");
    const off = leaks.addEventListener(window, "resize", onResize);
    const unsub = leaks.subscribe(() => store.subscribe(onChange), "store");
    return () => { leaks.clearInterval(id); off(); unsub(); };
  }, [leaks]);
}
```

You are warned when
- the component unmounts while an instrumented timer, interval, listener or subscription is still active;
- the same owner/kind/label has `leakRepeatThreshold` (default 10) live registrations: "suspicious repeated registration".

Outside React use `createLeakScope("Name")` (`check()` runs the unmount check). With `leakDetection` off every helper is a plain pass-through.

**This does not detect every leak.** It cannot see timers, listeners or subscriptions created without the helpers, retained closures, detached DOM nodes or growing caches. Treat a warning as "worth looking at" and no warning as "nothing found among instrumented resources".

## Export and import reports

```ts
import { exportReport, exportReportJSON, downloadReport, importReport } from "reactpulse";

const report = exportReport();      // JSON-safe object (cycles, functions, undefined are made safe)
downloadReport();                   // browser: saves reactpulse-report-<time>.json
importReport(jsonStringOrObject);   // validates, loads into the store/dashboard, pauses live monitoring
```

`importReport(report, { merge: true, pause: false })` adds to existing data. Invalid input throws `ReportError` and leaves the store untouched. Imported data respects your history limits.

## Configuration

Pass to `<ReactPulse config={...}>` or call `configurePulse({...})` anywhere. All fields are optional.

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `"auto"` | `"auto"` = on unless `NODE_ENV === "production"`. `true` forces on, `false` off. |
| `threshold` | `16` | Slow-render threshold in ms. |
| `trackRenders` | `true` | Record renders from hooks. |
| `showNotifications` | `true` | Dashboard toasts for warnings. |
| `log` | `false` | Print every tracked render to the console. |
| `warnings` | `true` | `console.warn` for warnings (slow renders, leaks). |
| `historyLimit` | `100` | Render events kept per component (aggregates are never truncated). |
| `timelineLimit` | `500` | Events kept in the global timeline. |
| `warningLimit` | `100` | Warnings kept. |
| `compareDepth` | `0` | `0` = reference comparison. `n` = also deep-compare changed values to depth `n`. |
| `ignoreProps` | `["children"]` | Keys (strings or RegExps) never compared. |
| `include` / `exclude` | `[]` | Component name filters (strings or RegExps). |
| `performanceApi` | `false` | Emit User Timing measures. |
| `leakDetection` | `false` | Enable leak helpers. |
| `leakRepeatThreshold` | `10` | Live registrations before "repeated registration" warns. |
| `uiInterval` | `100` | Minimum ms between dashboard refreshes. |
| `onRender`, `onSlowRender`, `onWarning` | – | Callbacks. |
| `logger` | console | `{ render(event), warning(warning) }` replaces console output. |

`<ReactPulse>` also takes `dashboard` (default `true` while enabled), `theme` (`"light" | "dark" | "system"`), `defaultOpen`, `dock` and `loadDevtools`.

Global control: `enablePulse()`, `disablePulse()`, `pausePulse()`, `resumePulse()`, `clearPulse()`. Disabling is complete: hooks stop comparing and recording.

## Next.js

The package ships a `"use client"` directive, so it works from Server Component layouts and Pages Router alike:

```tsx
// app/layout.tsx (App Router, a Server Component)
import { ReactPulse } from "reactpulse";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactPulse config={{ threshold: 20 }}>{children}</ReactPulse>
      </body>
    </html>
  );
}
```

```tsx
// any client component
"use client";
import { useRenderTracker } from "reactpulse";
```

```tsx
// pages/_app.tsx (Pages Router)
import type { AppProps } from "next/app";
import { ReactPulse } from "reactpulse";
export default function App({ Component, pageProps }: AppProps) {
  return <ReactPulse><Component {...pageProps} /></ReactPulse>;
}
```

Notes: config passed from a Server Component must be serialisable (no functions such as `onRender`, no RegExps in `include`/`exclude` – set those in a client component or with `configurePulse`). Nothing runs on the server: effects do not run during SSR, so there is nothing to record, and no `useLayoutEffect` SSR warning is emitted. The dashboard only loads in the browser.

## Production builds

- `enabled: "auto"` switches monitoring off when `NODE_ENV === "production"`.
- `reactpulse/devtools` has a `production` export condition that resolves to a ~0.1 KB stub, so Vite, webpack and Turbopack builds contain **no dashboard code**. (Verified with a Vite production build: no dashboard strings in the output.)
- To ship the dashboard on purpose (e.g. a staging build):

```tsx
<ReactPulse
  config={{ enabled: true }}
  loadDevtools={() => import("reactpulse/devtools/full")}
>
```

Hooks remain in production bundles as thin no-ops while disabled (≈ 4–5 KB gzip if you use them all). Remove tracking calls for release if you need zero bytes.

## Performance considerations

- Everything is recorded in effects after commit; render does one cheap comparison pass and writes two refs.
- Measured (jsdom, development React, 200 components re-rendered 40×, median of 9; `npm run bench`):

  | Case | Overhead per render |
  | --- | --- |
  | `useRenderTracker`, monitoring **disabled** | **+0.8 µs** |
  | `useRenderTracker`, monitoring enabled (5-key props diff, ring-limited history) | **+8.7 µs** |

  Numbers depend on hardware and runtime; use `npm run bench` for your machine.
- Deep comparison is off by default (`compareDepth: 0`). Enable it only where you need "identity only" hints; cost grows with depth and size.
- Event history keeps **references** to previous/current values (up to `historyLimit` per component). Lower `historyLimit` for components with very large props, or exclude them.
- Dashboard updates are throttled (`uiInterval`) and use `useSyncExternalStore` on a version counter.
- `console.table` logging (`log: true`) is for debugging; it is slow with many renders.

## Bundle size

Measured on the built `dist/` with `npm run size` (esbuild, tree-shaking, minified, React excluded, `NODE_ENV=production`):

| What you import | Minified | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| `usePrevious` only | 0.72 KB | 0.32 KB | 0.26 KB |
| `useRenderTracker` | 10.23 KB | **4.31 KB** | 3.87 KB |
| `useWhyDidYouRender` | 10.31 KB | **4.35 KB** | 3.91 KB |
| `usePerformanceTracker` | 10.84 KB | **4.53 KB** | 4.07 KB |
| all six hooks | 11.61 KB | **4.80 KB** | 4.32 KB |
| `<ReactPulse>` provider (no dashboard) | 7.77 KB | 3.33 KB | 3.01 KB |
| export/import reports | 12.27 KB | 4.76 KB | 4.25 KB |
| `import *` (everything, for reference) | 21.52 KB | 8.21 KB | 7.34 KB |
| Dashboard chunk (lazy, dev only) | 43.34 KB | 13.70 KB | 12.21 KB |
| Dashboard in production (stub) | 0.07 KB | 0.08 KB | 0.07 KB |

The "core under 5 KB gzip" goal holds for the hooks: any single hook, or all six together, stays below 5 KB gzip. The provider and report helpers are separate imports (they share the same store code, so using them with hooks costs less than the sum). Importing *everything* is 8.2 KB gzip, but bundlers only include what you use (`"sideEffects": false`).

## Limitations

- **No Fiber access.** ReactPulse uses only public React APIs, so it cannot automatically see every state/context/hook change. State, context and hook dependencies are reported only when you instrument them (`state`, `context`, `deps`, `useTrackedState`). Without them the cause is `parent`/`internal`/`unknown`, labelled *probable*.
- **`parent` / `internal` rely on observable React behaviour** (a new props object per parent render), not a documented guarantee, and need the real props object.
- **Render duration is a span, not pure render time.** It includes children and commit work and, with concurrent rendering, any time React yielded. Use `<PulseProfiler>` for React's `actualDuration` (development/profiling builds only). Neither measures browser paint; `startInteraction` approximates it.
- **Leak detection is partial** (see above).
- **Same-name components share a record;** use distinct names. Using `useRenderTracker` and `useMountTracker` (or `usePerformanceTracker`) on the same component double-counts mounts/renders.
- **Memoised/bailed-out renders** (e.g. `React.memo` skipping a render) are, correctly, not recorded because React did not render the component.
- **Only committed renders** are counted: StrictMode's extra invocations and concurrent renders React discards are not.
- Values in history are stored by reference; mutate-in-place objects will show their current contents.
- The dashboard is a client-side overlay; it is not a browser extension and cannot inspect components that do not call a ReactPulse hook (use `<PulseProfiler>` to measure a subtree).

## Compatibility

Verified in this repository:

| Area | Status |
| --- | --- |
| React 18.3.1 and 19.3.1 | Full test suite (124 tests) passes against both: `npm run test:all` |
| StrictMode (dev double render + effect re-run) | Covered by tests on both versions |
| SSR (`renderToString`, no `window`) | Covered by tests; no warnings, nothing recorded |
| Vite 8 | Demo app + a consumer app built from the packed tarball (dev, production, `/full` opt-in) |
| Next.js 16.4 (Turbopack) | Consumer app built from the packed tarball: App Router (Server Component layout) and Pages Router build and prerender; `next dev` hydrates with no console errors and loads the dashboard |
| Node ≥ 18 | ESM + CJS entries load; ESM and CJS builds share one store |

Not verified: webpack-based Next.js versions, Next.js with React 18, React Native, browsers other than Chromium (Edge). The package uses no browser APIs beyond `performance`, `requestAnimationFrame`, `localStorage` (optional) and `matchMedia` (optional).

## Develop

```bash
npm install
npm run setup:compat   # installs the isolated React 18 used by test:react18
npm test               # React 19
npm run test:react18   # same suite on React 18
npm run typecheck && npm run lint
npm run build          # tsup: ESM + CJS + .d.ts for "reactpulse" and "reactpulse/devtools"
npm run smoke          # exercises dist/ (ESM, CJS, exports, "production" condition)
npm run size           # bundle sizes
npm run bench          # per-render overhead
npm run demo           # Vite demo (examples/demo)
```

Project layout: `src/core` (store, tracker, comparator, performance, leaks, profiler), `src/hooks`, `src/provider`, `src/devtools` (separate entry), `src/utils`.

## Contributing

Issues and pull requests are welcome.

1. Open an issue first for new features or API changes.
2. `npm run verify` (typecheck, lint, tests on React 18 and 19, build, smoke test, size report) must pass.
3. Add tests for behaviour changes; hooks must stay StrictMode- and SSR-safe, record only after commit, and never touch React internals.
4. Keep the core small: run `npm run size` and mention changes over ~0.2 KB gzip in your PR.
5. Do not claim a capability React's public API cannot provide; mark uncertain results as *probable*.
6. Follow the existing style (Prettier: `npm run format`).

## License

[MIT](LICENSE)
