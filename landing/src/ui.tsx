import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { PACKAGE } from "./links";

/* ---------- syntax highlighting (tiny, dependency-free) ---------- */

const TS_RE =
  /(?<comment>\/\/.*|\/\*[\s\S]*?\*\/)|(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?<tag><\/?[A-Z][\w.]*)|\b(?<keyword>import|from|export|const|let|function|return|default|type|interface|async|await|new|true|false|null|undefined|typeof|as)\b|\b(?<number>\d+(?:\.\d+)?)\b/g;
const BASH_RE =
  /(?<comment>#.*)|(?<string>"(?:[^"\\\n]|\\.)*"|'[^'\n]*')|\b(?<keyword>npm|pnpm|yarn|bun|npx|git|node)\b|(?<number>--?[a-z][\w-]*)/g;

export type Lang = "tsx" | "ts" | "bash" | "json" | "text";

function highlight(code: string, lang: Lang): ReactNode[] {
  if (lang === "text" || lang === "json") return [code];
  const re = lang === "bash" ? BASH_RE : TS_RE;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const kind = Object.entries(m.groups ?? {}).find(([, v]) => v !== undefined)?.[0] ?? "plain";
    out.push(
      <span key={at} className={`tok-${kind}`}>
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}

/* ---------- copy button ---------- */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onClick = useCallback(async () => {
    setState((await copyText(text)) ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }, [text]);
  return (
    <button type="button" className="copy-btn" onClick={onClick}>
      {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : label}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}

/* ---------- code block ---------- */

export function CodeBlock({
  code,
  lang = "tsx",
  title,
}: {
  code: string;
  lang?: Lang;
  title?: string;
}) {
  const text = code.replace(/^\n+|\s+$/g, "");
  return (
    <figure className="code">
      <figcaption>
        <span>{title ?? lang}</span>
        <CopyButton text={text} />
      </figcaption>
      <pre tabIndex={0}>
        <code>{highlight(text, lang)}</code>
      </pre>
    </figure>
  );
}

/* ---------- install tabs ---------- */

const MANAGERS = [
  ["npm", `npm install ${PACKAGE}`],
  ["pnpm", `pnpm add ${PACKAGE}`],
  ["yarn", `yarn add ${PACKAGE}`],
  ["bun", `bun add ${PACKAGE}`],
] as const;

export function InstallTabs() {
  const [active, setActive] = useState(0);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : MANAGERS.length - 1)) % MANAGERS.length;
    setActive(next);
    (e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next] ?? null)?.focus();
  };
  const [, command] = MANAGERS[active]!;
  return (
    <div className="install">
      <div className="install-tabs" role="tablist" aria-label="Package manager" onKeyDown={onKey}>
        {MANAGERS.map(([name], i) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`pm-${name}`}
            aria-selected={i === active}
            aria-controls="pm-panel"
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="install-body"
        id="pm-panel"
        role="tabpanel"
        aria-labelledby={`pm-${MANAGERS[active]![0]}`}
      >
        <code>
          <span className="tok-comment">$ </span>
          {command}
        </code>
        <CopyButton text={command} />
      </div>
    </div>
  );
}

/* ---------- layout helpers ---------- */

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  tone?: "soft";
}) {
  return (
    <section
      id={id}
      className={`section${tone === "soft" ? " section-soft" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="container">
        <header className="section-head">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={`${id}-title`}>{title}</h2>
          {lead && <p className="lead">{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function Table({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: ReactNode[][];
  caption?: string;
}) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption ?? "Table"}>
      <table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {c}
                  </th>
                ) : (
                  <td key={j}>{c}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const C = ({ children }: { children: ReactNode }) => (
  <code className="inline">{children}</code>
);
