import * as snip from "../snippets";
import { C, CodeBlock, Section, Table } from "../ui";

const HOOKS: [string, string, string][] = [
  [
    "useRenderTracker(name, options?)",
    "Records every committed render: count, duration, time between renders, changed props/state/context/deps and likely reasons. Returns renderCount, isInitialRender, reasons and changes for the current render.",
    "Call at the top of a component.",
  ],
  [
    "useWhyDidYouRender(name, props, options?)",
    "Same engine, tuned for the console: logs each re-render (not the mount) with reasons and previous/current values. Pass the real props object.",
    "Accepts state, context and deps to instrument.",
  ],
  [
    "usePrevious(value)",
    "The value from the previous committed render, undefined on the first. Safe in StrictMode.",
    "Only about 0.3 KB gzip.",
  ],
  [
    "useMountTracker(name?, { log? })",
    "Records mounts, unmounts and lifetime. Returns a stable isMounted() function. StrictMode's simulated unmount is not counted.",
    "Do not combine with useRenderTracker on one component.",
  ],
  [
    "usePerformanceTracker(name, options?)",
    "Render timing plus measure(label, fn) for sync or async work and startInteraction(label) for click-to-next-paint timing.",
    "Do not combine with useRenderTracker on one component.",
  ],
  [
    "useTrackedState(initial, name?)",
    'Drop-in useState that records each committed change. Name it "Component.label" to attribute it to a component.',
    "Batching and StrictMode give one entry per real change.",
  ],
  [
    "useLeakTracker(owner)",
    "Returns setTimeout, setInterval, addEventListener and subscribe helpers; reports what is still active when the component unmounts.",
    "Needs config.leakDetection.",
  ],
];

const CONFIG: [string, string, string][] = [
  ["enabled", '"auto"', '"auto" is on unless NODE_ENV is production. true forces on, false off.'],
  ["threshold", "16", "Slow-render threshold in milliseconds."],
  ["trackRenders", "true", "Record renders from hooks."],
  ["showNotifications", "true", "Dashboard toasts for warnings."],
  ["log", "false", "Print every tracked render to the console."],
  ["warnings", "true", "console.warn for slow renders and leaks."],
  ["historyLimit", "100", "Render events kept per component (aggregates are never truncated)."],
  ["timelineLimit", "500", "Events kept in the global timeline."],
  ["warningLimit", "100", "Warnings kept."],
  [
    "compareDepth",
    "0",
    "0 = reference comparison. n = also deep-compare changed values to depth n.",
  ],
  ["ignoreProps", '["children"]', "Keys (strings or RegExps) that are never compared."],
  ["include / exclude", "[]", "Component name filters (strings or RegExps)."],
  ["performanceApi", "false", "Emit performance.measure() User Timing entries."],
  ["leakDetection", "false", "Enable the leak helpers."],
  ["leakRepeatThreshold", "10", "Live registrations before a repeated-registration warning."],
  ["uiInterval", "100", "Minimum milliseconds between dashboard refreshes."],
  ["onRender, onSlowRender, onWarning", "none", "Callbacks."],
  ["logger", "console", "{ render(event), warning(warning) } replaces console output."],
];

export function Api() {
  return (
    <Section
      id="api"
      eyebrow="Reference"
      title="API reference"
      lead="Everything is exported from reactpulse-devtools. The dashboard lives in reactpulse-devtools/devtools."
    >
      <h3 className="h3">Hooks</h3>
      <div className="api-list">
        {HOOKS.map(([sig, body, note]) => (
          <article key={sig} className="api-item">
            <h4>
              <code>{sig}</code>
            </h4>
            <p>{body}</p>
            <p className="muted">{note}</p>
          </article>
        ))}
      </div>

      <h3 className="h3">useRenderTracker options</h3>
      <CodeBlock code={snip.trackOptions} title="options" />

      <h3 className="h3">Provider: &lt;ReactPulse&gt;</h3>
      <Table
        caption="ReactPulse props"
        head={["Prop", "Description"]}
        rows={[
          [<C>config</C>, "Partial configuration (table below)."],
          [
            <C>dashboard</C>,
            "Mount the dashboard overlay. Default true while monitoring is enabled.",
          ],
          [<C>theme</C>, '"light", "dark" or "system" (default).'],
          [<C>defaultOpen</C>, "Open the panel on first render. Default false."],
          [<C>dock</C>, '"bottom" (default) or "right".'],
          [
            <C>loadDevtools</C>,
            "Custom dashboard loader, for example to ship the full dashboard in a staging build.",
          ],
        ]}
      />

      <h3 className="h3">Configuration</h3>
      <Table
        caption="Configuration options"
        head={["Option", "Default", "Description"]}
        rows={CONFIG.map(([a, b, c]) => [<C>{a}</C>, <C>{b}</C>, c])}
      />

      <h3 className="h3">Other exports</h3>
      <Table
        caption="Other exports"
        head={["Export", "Purpose"]}
        rows={[
          [
            <C>PulseProfiler</C>,
            "Wraps React's public Profiler and records the exact actualDuration for a subtree.",
          ],
          [
            <C>createLeakScope(owner)</C>,
            "The leak helpers outside React; check() runs the unmount check.",
          ],
          [
            <C>configurePulse, enablePulse, disablePulse, pausePulse, resumePulse, clearPulse</C>,
            "Global control from code.",
          ],
          [
            <C>exportReport, exportReportJSON, downloadReport, importReport, parseReport</C>,
            "JSON reports. Invalid input throws ReportError and leaves data untouched.",
          ],
          [
            <C>getPulseStore, averageDuration, deepEqual, preview, toJSONSafe, VERSION</C>,
            "Utilities and direct store access.",
          ],
          [
            <C>Dashboard, DevtoolsRoot</C>,
            "From reactpulse-devtools/devtools: the standalone dashboard and the floating panel.",
          ],
        ]}
      />
      <CodeBlock code={snip.control} title="control.ts" />
      <CodeBlock code={snip.standalone} title="standalone dashboard" />
    </Section>
  );
}
