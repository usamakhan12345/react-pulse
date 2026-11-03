import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { PulseWarning } from "../core/types";
import type { DevtoolsProps } from "../provider/ReactPulse";
import { Dashboard } from "./Dashboard";
import { CSS } from "./styles";
import { useResolvedTheme } from "./theme";
import type { ThemeSetting } from "./theme";
import { useStore } from "./useStore";

function usePersisted<T extends string | number | boolean>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`reactpulse:${key}`);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(`reactpulse:${key}`, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory */
      }
    },
    [key],
  );
  return [value, set] as const;
}

const TOAST_MS = 6000;

function Toasts({ enabled, left }: { enabled: boolean; left: boolean }) {
  const { store, version } = useStore();
  const [toasts, setToasts] = useState<PulseWarning[]>([]);
  const lastSeen = useRef(store.warnings.reduce((max, w) => Math.max(max, w.id), 0));

  useEffect(() => {
    const fresh = store.warnings.filter((w) => w.id > lastSeen.current);
    if (!fresh.length) return;
    lastSeen.current = fresh[fresh.length - 1]!.id;
    if (!enabled || store.paused) return;
    setToasts((prev) => [...prev, ...fresh].slice(-3));
    const ids = new Set(fresh.map((w) => w.id));
    const timer = setTimeout(
      () => setToasts((prev) => prev.filter((w) => !ids.has(w.id))),
      TOAST_MS,
    );
    return () => clearTimeout(timer);
  }, [version, store, enabled]);

  if (!toasts.length) return null;
  return (
    <div
      className={`rp-toasts${left ? " rp-toasts-left" : ""}`}
      role="log"
      aria-label="ReactPulse notifications"
    >
      {toasts.map((w) => (
        <div key={w.id} className="rp-toast">
          <span
            className={`rp-badge ${w.kind === "slow-render" ? "rp-badge-danger" : "rp-badge-warn"}`}
          >
            {w.kind}
          </span>{" "}
          {w.message}
          <button
            type="button"
            className="rp-toast-close"
            aria-label="Dismiss notification"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== w.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Floating launcher + docked panel used by `<ReactPulse>`. Exported from
 * `reactpulse-devtools/devtools`; the core bundle loads it lazily.
 */
export function DevtoolsRoot({
  theme = "system",
  defaultOpen = false,
  dock: dockProp = "bottom",
  notifications = true,
}: DevtoolsProps) {
  const { store } = useStore();
  const [themePref, setThemePref] = usePersisted<ThemeSetting>("theme", theme);
  const resolved = useResolvedTheme(themePref);
  const [open, setOpen] = usePersisted("open", defaultOpen);
  const [dock, setDock] = usePersisted<"bottom" | "right">("dock", dockProp);
  const [size, setSize] = usePersisted<number>("size", 380);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const max = (dock === "bottom" ? innerHeight : innerWidth) - 80;
      const next = dock === "bottom" ? innerHeight - ev.clientY : innerWidth - ev.clientX;
      setSize(Math.round(Math.min(Math.max(next, 240), max)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const slow = store.warnings.length;
  return (
    <div className="rp-host" data-theme={resolved}>
      <style>{CSS}</style>
      <Toasts enabled={notifications} left={open && dock === "right"} />
      {!open && (
        <button
          type="button"
          className="rp-launcher"
          aria-label="Open ReactPulse"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">⚛</span> Pulse
          {slow > 0 && <span className="rp-count rp-count-warn">{slow}</span>}
        </button>
      )}
      {open && (
        <div
          className={`rp-panel rp-panel-${dock}`}
          style={dock === "bottom" ? { height: size } : { width: size }}
          role="complementary"
          aria-label="ReactPulse"
        >
          <div
            className={`rp-resize rp-resize-${dock}`}
            role="separator"
            aria-orientation={dock === "bottom" ? "horizontal" : "vertical"}
            onPointerDown={startResize}
          />
          <Dashboard
            theme={resolved}
            onThemeChange={setThemePref}
            onClose={() => setOpen(false)}
            actions={
              <button
                type="button"
                className="rp-btn"
                aria-label={`Dock to ${dock === "bottom" ? "right" : "bottom"}`}
                onClick={() => setDock(dock === "bottom" ? "right" : "bottom")}
              >
                {dock === "bottom" ? "Dock right" : "Dock bottom"}
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
