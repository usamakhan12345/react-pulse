import { useCallback, useEffect, useState } from "react";
import { Demo } from "./Demo";
import { GITHUB, NPM } from "./links";
import { Api } from "./sections/Api";
import { Hero } from "./sections/Hero";
import { Install } from "./sections/Install";
import { Features, Stats, Why } from "./sections/Overview";
import { NextJs, Production } from "./sections/Production";
import { ReactNative } from "./sections/ReactNative";
import { Compatibility, DashboardShots, Faq, Limits, Reasons } from "./sections/Trust";
import { UseCases } from "./sections/UseCases";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const set = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("rp-site-theme", next);
    } catch {
      /* storage unavailable: the choice just is not remembered */
    }
    setTheme(next);
  }, []);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("rp-site-theme");
      } catch {
        /* ignore */
      }
      if (!stored) {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
        setTheme(e.matches ? "dark" : "light");
      }
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return [theme, set];
}

const NAV = [
  ["#why", "Benefits"],
  ["#features", "Features"],
  ["#demo", "Live demo"],
  ["#use-cases", "Use cases"],
  ["#install", "Install"],
  ["#api", "API"],
  ["#nextjs", "Next.js"],
  ["#react-native", "React Native"],
  ["#faq", "FAQ"],
] as const;

export function App() {
  const [theme, setTheme] = useTheme();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="nav">
        <div className="container nav-row">
          <a className="brand" href="#top" aria-label="ReactPulse home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <path
                d="M5 17h5l3-8 5 14 3-6h6"
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ReactPulse
          </a>
          <nav aria-label="Sections" className="nav-links">
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="btn btn-ghost btn-small" href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn btn-ghost btn-small" href={NPM} target="_blank" rel="noreferrer">
              npm
            </a>
            <button
              type="button"
              className="btn btn-small"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <span id="top" />
        <Hero />
        <Stats />
        <Why />
        <Features />
        <Demo theme={theme} onThemeChange={setTheme} />
        <UseCases />
        <Reasons />
        <DashboardShots />
        <Install />
        <Api />
        <NextJs />
        <ReactNative />
        <Production />
        <Limits />
        <Compatibility />
        <Faq />
      </main>

      <footer className="footer">
        <div className="container footer-row">
          <p>
            <b>ReactPulse</b> · published as <code className="inline">reactpulse-devtools</code> ·
            MIT licensed
          </p>
          <p>
            <a href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>{" "}
            ·{" "}
            <a href={NPM} target="_blank" rel="noreferrer">
              npm
            </a>{" "}
            ·{" "}
            <a href={`${GITHUB}/blob/main/README.md`} target="_blank" rel="noreferrer">
              README
            </a>{" "}
            ·{" "}
            <a href={`${GITHUB}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer">
              Changelog
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
