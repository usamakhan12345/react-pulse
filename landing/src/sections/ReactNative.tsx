import * as snip from "../snippets";
import { img } from "../links";
import { C, CodeBlock, InstallTabs, Section, Table } from "../ui";

const SHOTS: [string, string, string][] = [
  [
    "native-components-dark.png",
    "The native dashboard listing tracked components with render counts and slow badges, dark theme",
    "Components: counts, durations, slow badges, search, filters and sorting.",
  ],
  [
    "native-details-light.png",
    "Component details on a phone with stats and the reason for a render, light theme",
    "Details: why each render happened, with previous and current values.",
  ],
  [
    "native-performance-dark.png",
    "The native Performance tab with totals and the slowest components",
    "Performance: totals, slowest components, warnings.",
  ],
  [
    "native-report-dark.png",
    "The native Report tab with Share report and Import report",
    "Report: share the session as JSON, or paste one to import.",
  ],
];

export function ReactNative() {
  return (
    <Section
      id="react-native"
      eyebrow="React Native"
      title="The same hooks, with a native dashboard"
      lead={
        <>
          React Native has no DOM, so it gets its own dashboard built from <C>View</C>, <C>Text</C>,{" "}
          <C>Pressable</C>, <C>FlatList</C> and <C>TextInput</C>. No native modules, nothing to
          link, no pods. The hooks are the same ones you use on the web.
        </>
      }
    >
      <div className="phones">
        {SHOTS.map(([file, alt, caption]) => (
          <figure key={file} className="phone">
            <img src={img(file)} alt={alt} width="780" height="1688" loading="lazy" />
            <figcaption>{caption}</figcaption>
          </figure>
        ))}
      </div>
      <p className="fine">
        These are the real native components rendered with react-native-web at 390 × 844, not a
        mock-up. They are checked against real React Native tooling but have not yet been run on a
        physical device or simulator; see the notes below.
      </p>

      <h3 className="h3">Requirements</h3>
      <Table
        caption="React Native requirements"
        head={["What", "Needed", "Notes"]}
        rows={[
          ["React", <C key="r">^18.0.0 || ^19.0.0</C>, "Required peer dependency."],
          [
            "React Native",
            <C key="rn">&gt;= 0.72</C>,
            "Declared minimum: the UI uses gap in styles, Pressable and Share. Optional peer dependency.",
          ],
          [
            "Expo",
            "SDK with React Native 0.72+",
            "Only React Native core components are used, so there is no config plugin.",
          ],
          ["Extra packages", "None", "Safe-area and clipboard packages are optional and yours."],
        ]}
      />

      <ol className="steps">
        <li>
          <h3>Install</h3>
          <InstallTabs />
        </li>
        <li>
          <h3>Wrap your app once</h3>
          <p>
            Put <C>&lt;ReactPulse&gt;</C> at the root, around your navigator. It applies your config
            and shows a small <b>⚛ Pulse</b> button; tap it to open the panel.
          </p>
          <CodeBlock code={snip.rnProvider} title="App.tsx" />
        </li>
        <li>
          <h3>Track components with the same hooks</h3>
          <CodeBlock code={snip.rnHooks} title="ProfileCard.tsx" />
          <p>
            You can also open the panel from the React Native <b>dev menu</b>: ReactPulse adds
            &ldquo;ReactPulse: toggle panel&rdquo;.
          </p>
        </li>
        <li>
          <h3>Fit your device and share reports (optional)</h3>
          <p>
            Pass safe-area insets so the button and toasts clear notches, and use <C>onExport</C> to
            copy or save a report instead of the system share sheet.
          </p>
          <CodeBlock code={snip.rnOptions} title="Root.tsx" />
        </li>
        <li>
          <h3>Keep it out of release bundles (optional)</h3>
          <p>
            Monitoring is off when <C>__DEV__</C> is false. Metro does not tree-shake, so require
            the panel only in development to keep its ~13 KB gzip out of release builds.
          </p>
          <CodeBlock code={snip.rnRelease} title="App.tsx" />
        </li>
      </ol>

      <div className="two-col">
        <div className="callout">
          <h3>Which import path?</h3>
          <ul>
            <li>
              <C>reactpulse-devtools/native</C>: explicit, with the correct types for the native
              provider. Use this in React Native code.
            </li>
            <li>
              <C>reactpulse-devtools</C> also resolves to the native build in Metro through the{" "}
              <C>react-native</C> export condition (default in React Native 0.79+; older versions
              need <C>unstable_enablePackageExports</C>). Handy for code shared with a web app.
            </li>
            <li>
              Older Metro and TypeScript <C>node10</C> resolution use the <C>native/</C> folder
              shipped in the package.
            </li>
          </ul>
        </div>
        <div className="callout">
          <h3>Panel options</h3>
          <ul>
            <li>
              <C>theme</C> (<C>&quot;system&quot;</C> follows the device), <C>defaultOpen</C>,{" "}
              <C>position</C> of the button, <C>notifications</C>, <C>insets</C>, <C>onExport</C>.
            </li>
            <li>
              Use the pieces on their own: <C>&lt;PulseDevtools /&gt;</C> (button + panel) or{" "}
              <C>&lt;PulseDashboard /&gt;</C> (a full-screen dashboard for a hidden Debug route).
            </li>
            <li>The panel covers part of the screen and leaves the rest of the app interactive.</li>
          </ul>
        </div>
      </div>

      <h3 className="h3">How it differs from the web version</h3>
      <Table
        caption="Web versus React Native"
        head={["", "Web", "React Native"]}
        rows={[
          [
            "Dashboard",
            "DOM, lazy-loaded chunk",
            "Native views, bundled (Metro has no code splitting by default)",
          ],
          [
            "Console output",
            "Styled groups and console.table",
            "Plain multi-line text in Metro / React Native DevTools",
          ],
          [
            "console.warn for warnings",
            "On by default",
            "Off by default (it becomes a LogBox banner); the panel shows warnings instead",
          ],
          ["Timeline", "Lane chart", "Activity feed"],
          [
            "Export / import",
            "JSON file download / file picker",
            "Share sheet or onExport / paste JSON",
          ],
          ["Panel state", "Remembered in localStorage", "Not persisted"],
          [
            "startInteraction",
            "Until the next paint",
            "Until the next JavaScript animation frame; native rendering is not included",
          ],
        ]}
      />

      <div className="callout callout-warn">
        <h3>Honest status: checked with real tooling, not yet run on a device</h3>
        <ul>
          <li>
            <b>Checked against the real react-native 0.88.1 package</b> (run{" "}
            <C>npm run test:native-real</C>): 12 Jest tests with real <C>View</C>, <C>Pressable</C>,{" "}
            <C>FlatList</C>, <C>TextInput</C> and <C>Share</C>; Metro release bundles for Android
            and iOS through both import paths (plain <C>reactpulse-devtools</C> resolves to the
            native build, with no web dashboard code); the Hermes compiler turning the bundles into
            bytecode with no errors; and React Native&apos;s own type definitions. Also 31 unit
            tests on React 18 and 19, and the components rendered through react-native-web.
          </li>
          <li>
            <b>Not verified:</b> iOS and Android devices or simulators, Expo Go, running inside the
            Hermes runtime (compiling is not running), and the New Architecture. Jest mocks React
            Native&apos;s native modules. If something looks wrong on a device, please open an
            issue.
          </li>
          <li>
            Only JavaScript render time is measured, not native layout or drawing. Large reports can
            exceed the platform share limit (Android in particular): lower <C>historyLimit</C> or
            use <C>onExport</C>.
          </li>
        </ul>
      </div>
    </Section>
  );
}
