import type { ReactNode } from "react";
import { C, Section } from "../ui";

export function Stats() {
  const stats = [
    ["4.5 KB", "gzip for useRenderTracker. All six hooks together: 4.98 KB."],
    ["0.8 µs", "added per render while monitoring is disabled (8.7 µs enabled)."],
    ["0", "runtime dependencies. React is the only peer."],
    ["155 × 2", "tests, run on both React 18.3 and React 19.3."],
  ];
  return (
    <section className="stats" aria-label="Key numbers">
      <div className="container">
        <dl className="stat-grid">
          {stats.map(([value, label]) => (
            <div key={value} className="stat">
              <dt>{value}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <p className="fine">
          Measured on the built package and in jsdom with development React; see{" "}
          <a href="#production">bundle size and overhead</a> for how.
        </p>
      </div>
    </section>
  );
}

const BENEFITS = [
  {
    title: "Find the cause, not just the count",
    body: "Every re-render comes with reasons and the previous and current values side by side: which props changed, whether a new object only changed identity, and what you instrumented.",
  },
  {
    title: "Catch slow renders early",
    body: "Set a threshold and get warnings, toasts and per-component average, max and last durations while you build, not after users complain.",
  },
  {
    title: "Small and tree-shakeable",
    body: "Import only the hook you use. A single hook is about 4.5 KB gzip, and the dashboard is a separate lazy chunk that is never loaded unless monitoring is on.",
  },
  {
    title: "Safe by design",
    body: "Renders are recorded after commit, never during render. No Fiber internals, no monkey-patching. StrictMode double renders and discarded concurrent renders are not counted.",
  },
  {
    title: "Zero cost in production",
    body: "Monitoring is off when NODE_ENV is production. A production export condition swaps the dashboard for a 0.08 KB stub, so bundlers ship no dashboard code.",
  },
  {
    title: "Honest about uncertainty",
    body: "When React does not expose the real cause, ReactPulse says probable instead of guessing out loud. You always see which findings are certain.",
  },
  {
    title: "Works where you work",
    body: "Vite, Next.js App Router and Pages Router, and React Native with its own native dashboard. React 18 and 19, TypeScript types included, ESM and CommonJS builds.",
  },
  {
    title: "Share what you found",
    body: "Export a JSON report from one machine and import it in another dashboard. Great for bug reports, QA sessions and performance reviews.",
  },
];

export function Why() {
  return (
    <Section
      id="why"
      eyebrow="Benefits"
      title="Why ReactPulse"
      lead="Most re-render bugs are not hard to fix. They are hard to see. ReactPulse makes the cause visible while keeping your bundle and your production app clean."
    >
      <div className="card-grid">
        {BENEFITS.map((b) => (
          <article key={b.title} className="card">
            <h3>{b.title}</h3>
            <p>{b.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

const FEATURES: { group: string; items: ReactNode[] }[] = [
  {
    group: "Render tracking",
    items: [
      <>
        <C>useRenderTracker</C>: total renders, initial render, re-renders, time between renders and
        render duration.
      </>,
      "Previous props, current props and the exact keys that changed, with timestamps.",
      "Instrumented state, context values and hook dependencies compared on every render.",
      "Per-instance numbering: several instances of one component share a record.",
      "Readable console output: a collapsed group per render with a side-by-side table.",
    ],
  },
  {
    group: "Why did this render?",
    items: [
      <>
        <C>useWhyDidYouRender</C> logs each re-render with its reasons.
      </>,
      "Reasons: mount, props, state, context, hooks (certain) and parent, internal, unknown (probable).",
      "Deep comparison to a configurable depth flags renders where only the identity changed.",
      "Configurable ignored props (strings or RegExps) and per-component extras.",
    ],
  },
  {
    group: "Performance monitoring",
    items: [
      "Render-to-commit duration per component: average, maximum, last, slow count.",
      "Global and per-component slow thresholds, warnings, toasts and callbacks.",
      <>
        <C>PulseProfiler</C> records React&apos;s own <C>actualDuration</C> for a whole subtree.
      </>,
      <>
        <C>usePerformanceTracker</C>: <C>measure()</C> for sync or async work and{" "}
        <C>startInteraction()</C> to the next paint.
      </>,
      <>
        Optional User Timing integration: <C>performance.measure()</C> entries in the browser
        Performance panel.
      </>,
    ],
  },
  {
    group: "Developer dashboard",
    items: [
      "Component list with render counts, average and max duration, slow badges.",
      "Details: stats, most-changed props, why each render happened, full render history.",
      "Timeline with one lane per component, and a performance tab with totals and warnings.",
      "Search, filters, sorting by render count or duration, pause/resume, clear history.",
      "Light and dark themes, responsive layout, dock bottom or right, resizable, toast notifications.",
      <>
        Lazy-loaded and excluded from production builds by default. Also usable standalone:{" "}
        <C>&lt;Dashboard /&gt;</C>.
      </>,
    ],
  },
  {
    group: "Memory-leak warnings (opt-in)",
    items: [
      "Tracked timers, intervals, event listeners and subscriptions through ReactPulse helpers.",
      "Warns when a component unmounts while an instrumented resource is still active.",
      "Warns about suspicious repeated registrations of the same resource.",
      "Pass-through when disabled. Clear limits documented: it cannot see everything.",
    ],
  },
  {
    group: "Debugging hooks",
    items: [
      <>
        <C>usePrevious</C>: the value from the previous committed render.
      </>,
      <>
        <C>useMountTracker</C>: mounts, unmounts, lifetime and a stable <C>isMounted()</C>.
      </>,
      <>
        <C>useTrackedState</C>: <C>useState</C> that records each committed change.
      </>,
      <>
        <C>useLeakTracker</C>: leak-aware timer, listener and subscription helpers.
      </>,
    ],
  },
  {
    group: "Reports and control",
    items: [
      "Export debugging reports as JSON and import them back, with strict validation.",
      "Global enable, disable, pause, resume and clear from code or from the dashboard.",
      "Environment-based activation, include/exclude component filters, configurable history limits.",
      <>
        Custom logging callbacks: <C>onRender</C>, <C>onSlowRender</C>, <C>onWarning</C> and a
        pluggable <C>logger</C>.
      </>,
    ],
  },
  {
    group: "React Native",
    items: [
      "The same hooks, plus a native dashboard built from View, Text, Pressable, FlatList and TextInput.",
      "Components, details with why each render happened, an activity feed, performance and a report tab.",
      "Opens from a floating button or the React Native dev menu; light and dark themes follow the device.",
      "Share a report through the system share sheet (or onExport), or paste one to import it.",
      "No native modules, nothing to link. Checked with real React Native 0.88 tooling (Metro, Hermes compiler, Jest); not yet run on a device.",
    ],
  },
  {
    group: "Platform and tooling",
    items: [
      "React 18 and React 19, StrictMode-safe, SSR-safe (no useLayoutEffect warnings on the server).",
      "Next.js App Router and Pages Router: ships a use client directive.",
      "TypeScript declarations for every export, ESM and CJS builds, sideEffects: false.",
      "One shared store across the core and devtools bundles and across ESM/CJS copies.",
    ],
  },
];

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Everything included"
      title="All the features"
      lead="One small package, from a single hook in the console to a full dashboard."
      tone="soft"
    >
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <article key={f.group} className="card feature">
            <h3>{f.group}</h3>
            <ul>
              {f.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
