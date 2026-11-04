import * as snip from "../snippets";
import { C, CodeBlock, Section } from "../ui";

export function UseCases() {
  return (
    <Section
      id="use-cases"
      eyebrow="Use cases"
      title="What you can use it for"
      lead="Concrete situations where ReactPulse saves an afternoon."
    >
      <div className="usecases">
        <article className="usecase">
          <div>
            <h3>1. Remove avoidable re-renders</h3>
            <p>
              A list re-renders every time its parent does, and you suspect the props are &ldquo;new
              but equal&rdquo;. Turn on <C>compareDepth</C> and ReactPulse marks changes where only
              the identity differs, which is a strong hint that <C>useMemo</C> or <C>useCallback</C>{" "}
              in the parent would avoid the render.
            </p>
          </div>
          <CodeBlock code={snip.useCaseList} title="Results.tsx" />
        </article>

        <article className="usecase">
          <div>
            <h3>2. Find the component that makes the page feel slow</h3>
            <p>
              Set a threshold (default 16 ms). Slow renders raise warnings and toasts, and the
              Performance tab ranks components by max and average duration. Time a specific
              computation or a click-to-paint interaction with the helpers on{" "}
              <C>usePerformanceTracker</C>.
            </p>
          </div>
          <CodeBlock code={snip.useCaseMeasure} title="Chart.tsx" />
        </article>

        <article className="usecase">
          <div>
            <h3>3. Understand state, context and store churn</h3>
            <p>
              Pass state, context values and hook dependencies you care about. When one of them
              changes, the render is attributed to it with certainty. Values from external stores
              (Redux, Zustand and similar) can be passed the same way.
            </p>
          </div>
          <CodeBlock code={snip.useCaseStore} title="Header.tsx" />
        </article>

        <article className="usecase">
          <div>
            <h3>4. Catch leaks while you develop</h3>
            <p>
              Create intervals, listeners and subscriptions through <C>useLeakTracker</C>. If a
              component unmounts and one is still alive, or the same resource keeps getting
              registered, you get a warning that names the component and the resource.
            </p>
          </div>
          <CodeBlock code={snip.leaks} title="Chat.tsx" />
        </article>

        <article className="usecase">
          <div>
            <h3>5. Hand a QA or performance report to a teammate</h3>
            <p>
              Export the session as JSON (or click Export in the dashboard) and attach it to a
              ticket. Anyone can import it into their own dashboard and see the same render history,
              reasons and warnings. Imports are validated and cannot overwrite live data unless you
              ask.
            </p>
          </div>
          <CodeBlock code={snip.reports} title="report.ts" />
        </article>

        <article className="usecase">
          <div>
            <h3>6. Measure a whole subtree, or ship the dashboard to staging</h3>
            <p>
              Wrap any subtree in <C>PulseProfiler</C> to record React&apos;s own render time for
              it, even for components you cannot edit. For a staging build, opt in to the full
              dashboard explicitly while production builds keep the stub.
            </p>
          </div>
          <CodeBlock code={snip.prodFull} title="staging.tsx" />
        </article>
      </div>
    </Section>
  );
}
