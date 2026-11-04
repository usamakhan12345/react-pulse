import type { ReactNode } from "react";
import { C, Section, Table } from "../ui";
import { GITHUB, ISSUES, NPM, img } from "../links";

export function Reasons() {
  return (
    <Section
      id="reasons"
      eyebrow="How it works"
      title="Why did this render? What is certain and what is probable"
      lead="ReactPulse reports a reason only when it can be derived from values it actually compared. Everything else is labelled probable."
    >
      <Table
        caption="Render reasons"
        head={["Reason", "Confidence", "How it is determined"]}
        rows={[
          [
            <C>mount</C>,
            <span className="tag tag-ok">certain</span>,
            "First commit of the instance.",
          ],
          [
            <C>props</C>,
            <span className="tag tag-ok">certain</span>,
            "A compared prop changed (Object.is, or deep-equal to compareDepth). Shows previous and current values.",
          ],
          [
            <>
              <C>state</C> / <C>context</C> / <C>hooks</C>
            </>,
            <span className="tag tag-ok">certain</span>,
            "A value you passed in state, context or deps changed. Changes you did not pass in are not detected.",
          ],
          [
            <C>parent</C>,
            <span className="tag tag-warn">probable</span>,
            "Nothing compared changed, but the props object is new. React creates a new props object when a parent re-renders.",
          ],
          [
            <C>internal</C>,
            <span className="tag tag-warn">probable</span>,
            "Nothing compared changed and the props object is the same: own state, context, an external store or an uninstrumented hook.",
          ],
          [
            <C>unknown</C>,
            <span className="tag tag-warn">probable</span>,
            "Nothing compared changed and the props object identity was not provided.",
          ],
        ]}
      />

      <h3 className="h3">What the durations mean</h3>
      <p className="lead">
        These are three different measurements. The dashboard labels which one you are looking at,
        and none of them is browser paint except the interaction helper.
      </p>
      <Table
        caption="Measurements"
        head={["Measure", "Source", "Includes", "Excludes"]}
        rows={[
          [
            "Render span (hooks)",
            "Hook call during render until the layout effect after commit",
            "The component body, its children, every component React renders after the hook call in the same pass, DOM mutation",
            "Browser paint. Large commits such as the first mount overstate it: treat it as an upper bound. With concurrent rendering it can also include time React yielded.",
          ],
          [
            "Profiler duration (PulseProfiler)",
            "React's public Profiler actualDuration",
            "Render work of the subtree for that commit",
            "Commit work and paint. Only reported by development and profiling builds of React.",
          ],
          [
            "Interaction (startInteraction)",
            "Your start call until the next animation frame and the following task",
            "Everything between start and the next paint",
            "Approximation; background tabs do not paint.",
          ],
        ]}
      />
    </Section>
  );
}

export function DashboardShots() {
  return (
    <Section
      id="dashboard"
      eyebrow="The dashboard"
      title="A developer tool that stays out of the way"
      lead="Dark and light themes, responsive layout, lazy loaded. No animation beyond hover colors."
      tone="soft"
    >
      <div className="shots">
        <figure>
          <img
            src={img("dashboard-details-dark.png")}
            alt="Component details with render history and reasons"
            loading="lazy"
            width="1254"
            height="807"
          />
          <figcaption>
            Components: details, most-changed props and why each render happened.
          </figcaption>
        </figure>
        <figure>
          <img
            src={img("dashboard-timeline-dark.png")}
            alt="Render timeline with one lane per component"
            loading="lazy"
            width="1254"
            height="807"
          />
          <figcaption>
            Timeline: one lane per component, tick height is duration, red is slow.
          </figcaption>
        </figure>
        <figure>
          <img
            src={img("dashboard-performance-light.png")}
            alt="Performance tab in the light theme"
            loading="lazy"
            width="1254"
            height="807"
          />
          <figcaption>
            Performance: totals, slowest components against the threshold, warnings.
          </figcaption>
        </figure>
      </div>
    </Section>
  );
}

export function Limits() {
  return (
    <Section
      id="limits"
      eyebrow="Honest limits"
      title="What ReactPulse does not do"
      lead="A debugging tool you can trust says where it stops."
    >
      <div className="two-col">
        <ul className="list">
          <li>
            <b>No Fiber access.</b> It cannot see every state, context or hook change automatically.
            They are reported only when you instrument them.
          </li>
          <li>
            <b>parent / internal are inferences</b> from observable React behavior (a new props
            object per parent render), not a documented guarantee. They need the real props object
            and are always probable.
          </li>
          <li>
            <b>Duration is an upper-bound span, not pure render time.</b> It also covers components
            React renders after the hook call in the same pass, so the first mount of a big app
            makes early components look slow. Use PulseProfiler for React&apos;s actualDuration
            (development builds). Neither measures paint.
          </li>
          <li>
            <b>Leak detection is partial.</b> It only knows resources created through its helpers.
            It cannot see plain timers, retained closures, detached DOM nodes or growing caches.
          </li>
        </ul>
        <ul className="list">
          <li>
            <b>Names are keys.</b> Components with the same name share one record. Using several
            tracking hooks on one component double-counts.
          </li>
          <li>
            <b>Only committed renders</b> are counted. Bailed-out memoized renders and renders React
            discards are not.
          </li>
          <li>
            <b>History holds references</b> to previous and current values (up to{" "}
            <C>historyLimit</C>). In-place mutations show current contents.
          </li>
          <li>
            <b>React Native is not yet verified on a device</b> (see the React Native section). Only
            JavaScript render time is measured there, not native layout or drawing.
          </li>
          <li>
            <b>Not a replacement for React DevTools.</b> It runs inside your app, is scriptable, and
            exports reports; React DevTools remains the better tool for flame graphs and inspecting
            the whole tree.
          </li>
        </ul>
      </div>
    </Section>
  );
}

export function Compatibility() {
  return (
    <Section
      id="compat"
      eyebrow="Compatibility"
      title="What was actually tested"
      lead="Verified in the repository, not assumed."
      tone="soft"
    >
      <Table
        caption="Compatibility"
        head={["Area", "Status"]}
        rows={[
          ["React 18.3.1 and 19.3.1", "Full test suite (155 tests) passes against both."],
          [
            "StrictMode",
            "Dev double render and effect re-run are covered by tests on both versions.",
          ],
          ["SSR", "renderToString without window: no warnings, nothing recorded."],
          [
            "Vite 8",
            "Demo app plus a consumer app built from the packed tarball: development, production and full opt-in.",
          ],
          [
            "Next.js 16.4 (Turbopack)",
            "App Router (Server Component layout) and Pages Router build and prerender; next dev hydrates with no console errors and loads the dashboard.",
          ],
          ["Node 18+", "ESM and CJS entries load, and both builds share one store."],
          [
            "React Native entry",
            "Against real react-native 0.88.1 (npm run test:native-real): 12 Jest tests with real View, Text, Pressable, FlatList, TextInput and Share; Metro release bundles for Android and iOS through both import paths (plain reactpulse-devtools resolves to the native build via the react-native condition, with no web dashboard code); Hermes bytecode compile with no errors; type-checking against React Native's own types. Also 31 unit tests against a stub on React 18 and 19, and the real components rendered through react-native-web at 390 × 844.",
          ],
          [
            <b key="n">Not verified</b>,
            "React Native on a physical device, simulator or emulator (iOS and Android), Expo Go, running inside the Hermes runtime and the New Architecture; webpack-based Next.js versions; Next.js with React 18; browsers other than Chromium (Edge).",
          ],
        ]}
      />
    </Section>
  );
}

const FAQ: [string, ReactNode][] = [
  [
    "Will it slow my app or end up in production?",
    "It is off when NODE_ENV is production. While disabled a tracking hook adds about 0.8 µs per render; enabled it adds about 8.7 µs. The dashboard is replaced by a 0.08 KB stub in production builds.",
  ],
  [
    "Do I need the provider?",
    "No. The hooks work on their own and log to the console. Add <ReactPulse> for configuration and the dashboard.",
  ],
  [
    "Why does it say probable?",
    "React does not publicly expose why a component rendered. ReactPulse reports props and instrumented values with certainty and marks inferences (parent, internal, unknown) as probable instead of guessing out loud.",
  ],
  [
    "Does it work with Redux, Zustand or other stores?",
    "Yes, as instrumented values: pass the selected value in deps or state and a change is reported as a certain cause. Changes you do not pass appear as probable internal renders.",
  ],
  [
    "Is it a replacement for React DevTools?",
    "No, it complements it. ReactPulse lives in your app, can log, warn, notify and export reports; React DevTools is better for flame graphs and inspecting the full component tree.",
  ],
  [
    "Does it work with React Native?",
    "Yes, by design: the same hooks run in React Native and there is a native dashboard (import from reactpulse-devtools/native). It was checked against the real react-native 0.88.1 package (Metro bundling for Android and iOS, the Hermes compiler, Jest with the real components, and its type definitions) and rendered with react-native-web, but it has not yet been run on an iOS or Android device or simulator, so treat it as new. Please report anything that looks wrong on a device.",
  ],
  [
    "Why is the package called reactpulse-devtools?",
    "npm rejected the plain name reactpulse as too similar to an existing package. The project is still called ReactPulse.",
  ],
  [
    "How do I contribute or report a bug?",
    "Open an issue or a pull request on GitHub. npm run verify (typecheck, lint, tests on React 18 and 19, build, smoke test, size report) must pass.",
  ],
];

export function Faq() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions people ask">
      <div className="faq">
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <div className="final-cta">
        <h3>Ready to see your renders?</h3>
        <p>Install it, add one hook, and open the panel.</p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#install">
            Install guide
          </a>
          <a className="btn" href={GITHUB} target="_blank" rel="noreferrer">
            Star on GitHub
          </a>
          <a className="btn" href={NPM} target="_blank" rel="noreferrer">
            View on npm
          </a>
          <a className="btn btn-ghost" href={ISSUES} target="_blank" rel="noreferrer">
            Report an issue
          </a>
        </div>
      </div>
    </Section>
  );
}
