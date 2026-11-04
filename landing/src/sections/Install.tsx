import * as snip from "../snippets";
import { C, CodeBlock, InstallTabs, Section, Table } from "../ui";

export function Install() {
  return (
    <Section
      id="install"
      eyebrow="Get started"
      title="Install and set up, step by step"
      lead="From an empty install to your first render report in about five minutes. No build plugin, no config file."
      tone="soft"
    >
      <h3 className="h3">Requirements</h3>
      <Table
        caption="Requirements"
        head={["What", "Needed", "Notes"]}
        rows={[
          [
            "React",
            <>
              <C>^18.0.0 || ^19.0.0</C>
            </>,
            "Required peer dependency.",
          ],
          [
            "react-dom",
            <>
              <C>^18.0.0 || ^19.0.0</C>
            </>,
            "Optional peer. Needed for the dashboard in the browser.",
          ],
          [
            "react-native",
            <C>&gt;= 0.72</C>,
            "Optional peer. Only for React Native; see the React Native section.",
          ],
          [
            "Node.js",
            <C>&gt;= 18</C>,
            "For tooling and builds. The hooks themselves run in the browser.",
          ],
          ["TypeScript", "Optional", "Type declarations are included. No @types package needed."],
          [
            "Bundler",
            "Any modern one",
            "Vite, webpack, Turbopack, esbuild, Rollup. Needs to honor package.json exports.",
          ],
          ["Runtime dependencies", "None", "Nothing else is installed with it."],
        ]}
      />

      <ol className="steps">
        <li>
          <h3>Install the package</h3>
          <p>
            The npm package is <C>reactpulse-devtools</C>. (The plain name <C>reactpulse</C> was
            rejected by npm as too similar to an existing package.)
          </p>
          <InstallTabs />
        </li>
        <li>
          <h3>Track one component (no provider needed)</h3>
          <p>
            Hooks work on their own. Call the hook at the top of the component, unconditionally, and
            give the component a name. It never triggers a render by itself.
          </p>
          <CodeBlock code={snip.hookOnly} title="UserProfile.tsx" />
          <p>
            With <C>log: true</C> each re-render prints a collapsed group in the console with the
            reasons and a previous/current table:
          </p>
          <CodeBlock code={snip.consoleOutput} lang="text" title="console (illustrative)" />
        </li>
        <li>
          <h3>Add the provider to get the dashboard</h3>
          <p>
            Wrap your app once. <C>&lt;ReactPulse&gt;</C> applies your configuration before children
            render and loads the dashboard lazily, only when monitoring is enabled. It does not
            re-render your children.
          </p>
          <CodeBlock code={snip.provider} title="Root.tsx" />
          <p>
            Open the app and click the <b>⚛ Pulse</b> button in the bottom-right corner. Press{" "}
            <C>Esc</C> to close the panel. Your choices (open, dock, size, theme) are remembered in{" "}
            <C>localStorage</C>.
          </p>
        </li>
        <li>
          <h3>Make the reasons exact (optional)</h3>
          <p>
            React does not tell libraries why a component rendered. ReactPulse reports props changes
            with certainty, and reports state, context and hook dependencies with certainty{" "}
            <i>when you pass them in</i>. Pass the component&apos;s real props object so it can tell
            a parent render from an internal update (both are labelled probable).
          </p>
          <CodeBlock code={snip.instrumented} title="Card.tsx" />
        </li>
        <li>
          <h3>Tune the configuration</h3>
          <p>
            Everything is optional. Set options on the provider, or call <C>configurePulse()</C>{" "}
            anywhere (for example in an entry file). Full table in the{" "}
            <a href="#api">API reference</a>.
          </p>
          <CodeBlock code={snip.config} title="Root.tsx" />
        </li>
        <li>
          <h3>Use it in your framework</h3>
          <p>
            <b>Vite</b> and other client-side setups: wrap the root as shown above. <b>Next.js</b>:
            see <a href="#nextjs">Next.js</a> below. In every case ReactPulse is automatically off
            when <C>NODE_ENV === &quot;production&quot;</C>.
          </p>
          <CodeBlock code={snip.vite} title="main.tsx" />
        </li>
      </ol>

      <h3 className="h3">Troubleshooting</h3>
      <Table
        caption="Troubleshooting"
        head={["Symptom", "Likely cause and fix"]}
        rows={[
          [
            "Nothing is recorded",
            <>
              Monitoring is off. It defaults to <C>enabled: &quot;auto&quot;</C> (off when{" "}
              <C>NODE_ENV</C> is <C>production</C>). Set <C>enabled: true</C>, check the component
              name is not excluded by <C>include</C>/<C>exclude</C>, and that you did not call{" "}
              <C>disablePulse()</C> or Pause.
            </>,
          ],
          [
            "The dashboard button does not appear",
            <>
              The dashboard loads in the browser only and only when enabled. In a production build
              it resolves to a stub on purpose; use{" "}
              <C>
                loadDevtools=&#123;() =&gt;
                import(&quot;reactpulse-devtools/devtools/full&quot;)&#125;
              </C>{" "}
              to ship it.
            </>,
          ],
          [
            "Render counts look doubled in development",
            "They should not be. Only committed renders are counted. If you use both useRenderTracker and useMountTracker (or usePerformanceTracker) on one component, each records, so use one of them.",
          ],
          [
            "Two components share one record",
            "Records are keyed by the name you pass. Use distinct names.",
          ],
          [
            "PulseProfiler records nothing",
            "React only calls Profiler callbacks in development and profiling builds, not in a normal production build.",
          ],
          [
            "Every reason says probable or unknown",
            <>
              Nothing you passed changed. Instrument state, context and deps, and pass the real
              props object to <C>useWhyDidYouRender</C>.
            </>,
          ],
          [
            "Memory grows in a long session",
            <>
              History keeps references to previous and current values (up to <C>historyLimit</C> per
              component). Lower it, or exclude components with very large props.
            </>,
          ],
        ]}
      />
    </Section>
  );
}
