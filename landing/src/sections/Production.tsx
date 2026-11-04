import * as snip from "../snippets";
import { C, CodeBlock, Section, Table } from "../ui";

export function NextJs() {
  return (
    <Section
      id="nextjs"
      eyebrow="Frameworks"
      title="Next.js (App Router and Pages Router)"
      lead={
        <>
          The package ships a <C>&quot;use client&quot;</C> directive, so you can use{" "}
          <C>&lt;ReactPulse&gt;</C> directly in a Server Component layout.
        </>
      }
    >
      <div className="two-col">
        <CodeBlock code={snip.nextApp} title="app/layout.tsx" />
        <CodeBlock code={snip.nextClient} title="a client component" />
        <CodeBlock code={snip.nextPages} title="pages/_app.tsx" />
        <div className="callout">
          <h3>Good to know</h3>
          <ul>
            <li>
              Config passed from a Server Component must be serialisable: no functions such as{" "}
              <C>onRender</C>, and no RegExps in <C>include</C>/<C>exclude</C>. Set those in a
              client component or with <C>configurePulse()</C>.
            </li>
            <li>
              Nothing runs on the server. Effects do not run during SSR, so there is nothing to
              record, and there is no useLayoutEffect SSR warning.
            </li>
            <li>The dashboard only loads in the browser.</li>
            <li>
              Verified with Next.js 16.4 (Turbopack): both routers build, prerender and hydrate
              cleanly.
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function Production() {
  return (
    <Section
      id="production"
      eyebrow="Production, size and speed"
      title="Safe in production, small in the bundle"
      lead="All numbers below were measured on the built package, not estimated."
      tone="soft"
    >
      <div className="two-col">
        <div>
          <h3 className="h3">Production behavior</h3>
          <ul className="list">
            <li>
              <C>enabled: &quot;auto&quot;</C> switches monitoring off when{" "}
              <C>NODE_ENV === &quot;production&quot;</C>. Opt in with <C>enabled: true</C>.
            </li>
            <li>
              <C>reactpulse-devtools/devtools</C> has a <C>production</C> export condition that
              resolves to a ~0.1 KB stub. Vite, webpack and Turbopack builds then contain{" "}
              <b>no dashboard code</b>. Verified with a Vite production build: no dashboard strings
              in the output.
            </li>
            <li>
              Ship the dashboard on purpose (for example in staging) with the explicit loader below.
            </li>
            <li>
              Hooks stay in production bundles as thin no-ops while disabled (about 4 to 5 KB gzip
              if you use them all). Remove the calls for a release if you need zero bytes.
            </li>
          </ul>
          <CodeBlock code={snip.prodFull} title="staging build" />
        </div>
        <div>
          <h3 className="h3">Bundle size (gzip)</h3>
          <Table
            caption="Bundle size"
            head={["What you import", "Minified", "Gzip", "Brotli"]}
            rows={[
              ["usePrevious only", "0.72 KB", "0.32 KB", "0.26 KB"],
              ["useRenderTracker", "10.91 KB", <b key="a">4.49 KB</b>, "4.04 KB"],
              ["useWhyDidYouRender", "11.00 KB", <b key="b">4.53 KB</b>, "4.08 KB"],
              ["usePerformanceTracker", "11.52 KB", <b key="c">4.71 KB</b>, "4.25 KB"],
              ["all six hooks", "12.30 KB", <b key="d">4.98 KB</b>, "4.48 KB"],
              ["<ReactPulse> (no dashboard)", "8.49 KB", "3.53 KB", "3.17 KB"],
              ["export / import reports", "12.95 KB", "4.93 KB", "4.40 KB"],
              ["import * (reference only)", "22.24 KB", "8.39 KB", "7.50 KB"],
              ["Dashboard chunk (lazy, dev only)", "44.24 KB", "13.97 KB", "12.49 KB"],
              ["Dashboard in production (stub)", "0.07 KB", "0.08 KB", "0.07 KB"],
              ["React Native: useRenderTracker (/native)", "11.89 KB", "4.76 KB", "4.30 KB"],
              ["React Native: <ReactPulse> + native dashboard", "38.55 KB", "12.96 KB", "11.54 KB"],
            ]}
          />
          <p className="fine">
            esbuild, tree-shaking, minified, React excluded, <C>NODE_ENV=production</C>. Reproduce
            with <C>npm run size</C>. Importing only what you use keeps the cost low (
            <C>sideEffects: false</C>).
          </p>
          <h3 className="h3">Runtime overhead per render</h3>
          <Table
            caption="Overhead"
            head={["Case", "Overhead"]}
            rows={[
              ["useRenderTracker, monitoring disabled", <b key="o1">+0.8 µs</b>],
              ["useRenderTracker, enabled (5-key props diff)", <b key="o2">+8.7 µs</b>],
            ]}
          />
          <p className="fine">
            jsdom, development React, 200 components re-rendered 40 times, median of 9 runs (
            <C>npm run bench</C>). Numbers depend on hardware; compare cases on your machine.
          </p>
        </div>
      </div>
    </Section>
  );
}
