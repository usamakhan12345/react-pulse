import { GITHUB, NPM, img } from "../links";
import { InstallTabs } from "../ui";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="pill">Open source · MIT · React 18 &amp; 19 · React Native</p>
          <h1 id="hero-title">
            See exactly <span className="grad">why your React components render</span>.
          </h1>
          <p className="hero-lead">
            ReactPulse is a small, honest debugging and performance toolkit: render tracking,
            &ldquo;why did this render?&rdquo;, slow-render detection, leak warnings and a
            lazy-loaded developer dashboard (plus a native one for React Native). Built only on
            public React APIs, so it stays safe with StrictMode, SSR and Next.js.
          </p>
          <InstallTabs />
          <div className="cta-row">
            <a className="btn btn-primary" href="#install">
              Get started
            </a>
            <a className="btn" href="#demo">
              Try the live demo
            </a>
            <a className="btn btn-ghost" href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn btn-ghost" href={NPM} target="_blank" rel="noreferrer">
              npm
            </a>
          </div>
          <ul className="badges" aria-label="Highlights">
            <li>TypeScript-first</li>
            <li>ESM + CJS</li>
            <li>Tree-shakeable</li>
            <li>No runtime dependencies</li>
            <li>Next.js ready</li>
            <li>React Native dashboard</li>
          </ul>
        </div>
        <div className="hero-shot">
          <img
            src={img("dashboard-details-dark.png")}
            alt="The ReactPulse dashboard showing a component's render history and why each render happened"
            width="1254"
            height="807"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
