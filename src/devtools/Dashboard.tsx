import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import type { RenderEvent } from "../core/types";
import { downloadReport, importReport } from "../utils/exporter";
import { ComponentDetails } from "./ComponentDetails";
import { ComponentList } from "./ComponentList";
import { PerformancePanel } from "./PerformancePanel";
import { Timeline } from "./Timeline";
import { FILTER_LABELS, SORT_LABELS, selectComponents } from "./select";
import type { FilterKey, SortKey } from "./select";
import { CSS } from "./styles";
import { useResolvedTheme } from "./theme";
import type { ThemeSetting } from "./theme";
import { useStore } from "./useStore";

type Tab = "components" | "timeline" | "performance";

export interface DashboardProps {
  /** Initial theme. The toolbar button switches between light and dark. */
  theme?: ThemeSetting;
  /** Makes `theme` controlled: called when the toolbar theme button is used. */
  onThemeChange?: (theme: "light" | "dark") => void;
  /** Shows a close button when provided. */
  onClose?: () => void;
  /** Extra toolbar content, e.g. a dock toggle. */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The full ReactPulse dashboard. Render it anywhere (it fills its container),
 * or use `<ReactPulse>` to get it as a floating panel.
 */
export function Dashboard({
  theme = "system",
  onThemeChange,
  onClose,
  actions,
  className,
  style,
}: DashboardProps) {
  const { store, version } = useStore();
  const [localTheme, setLocalTheme] = useState<ThemeSetting>(theme);
  const resolved = useResolvedTheme(onThemeChange ? theme : localTheme);

  const [tab, setTab] = useState<Tab>("components");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("renders");
  const [selected, setSelected] = useState<string | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const records = useMemo(() => [...store.components.values()], [store, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(
    () => selectComponents(records, { search, filter, sort }),
    [records, search, filter, sort],
  );
  const timeline = useMemo(() => {
    const names = new Set(list.map((c) => c.name));
    return store.timeline.filter((e) => names.has(e.component));
  }, [store, list, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = (selected && store.components.get(selected)) || list[0];
  const imported = records.some((r) => r.imported);
  const status = !store.isEnabled() ? "Disabled" : store.paused ? "Paused" : "Recording";
  const warnings = store.warnings.length;

  const select = (name: string, id: number | null = null) => {
    setSelected(name);
    setEventId(id);
  };
  const inspect = (e: RenderEvent) => {
    select(e.component, e.id);
    setTab("components");
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const report = importReport(await file.text());
      setSelected(null);
      setNotice({
        ok: true,
        text: `Imported ${report.components.length} components from ${file.name}. Monitoring is paused.`,
      });
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "Import failed" });
    }
  };

  const onExport = () => {
    setNotice(
      downloadReport()
        ? { ok: true, text: "Report downloaded." }
        : { ok: false, text: "Export needs a browser." },
    );
  };

  return (
    <div
      className={`rp-root${className ? ` ${className}` : ""}`}
      data-theme={resolved}
      style={style}
    >
      <style>{CSS}</style>

      <div className="rp-toolbar">
        <div className="rp-brand">
          <span aria-hidden="true">⚛</span> ReactPulse
          <span className={`rp-status rp-status-${status.toLowerCase()}`} role="status">
            {status}
          </span>
        </div>
        <input
          className="rp-input rp-search"
          type="search"
          placeholder="Search components"
          aria-label="Search components"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rp-input"
          aria-label="Filter components"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
        >
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="rp-input"
          aria-label="Sort components"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          {Object.entries(SORT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              Sort: {label}
            </option>
          ))}
        </select>
        <div className="rp-actions">
          <button
            type="button"
            className="rp-btn"
            aria-label={store.paused ? "Resume monitoring" : "Pause monitoring"}
            onClick={() => (store.paused ? store.resume() : store.pause())}
          >
            {store.paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="rp-btn"
            aria-label="Clear history"
            onClick={() => store.clear()}
          >
            Clear
          </button>
          <button type="button" className="rp-btn" aria-label="Export report" onClick={onExport}>
            Export
          </button>
          <button
            type="button"
            className="rp-btn"
            aria-label="Import report"
            onClick={() => fileInput.current?.click()}
          >
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Import report file"
            hidden
            onChange={onImport}
          />
          <button
            type="button"
            className="rp-btn"
            aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
            onClick={() => {
              const next = resolved === "dark" ? "light" : "dark";
              setLocalTheme(next);
              onThemeChange?.(next);
            }}
          >
            {resolved === "dark" ? "Light" : "Dark"}
          </button>
          {actions}
          {onClose && (
            <button
              type="button"
              className="rp-btn"
              aria-label="Close ReactPulse"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {(notice || imported) && (
        <div className={`rp-banner${notice && !notice.ok ? " rp-banner-error" : ""}`} role="status">
          <span>
            {notice ? notice.text : "Viewing an imported report. Live monitoring is paused."}
          </span>
          {imported && (
            <button
              type="button"
              className="rp-btn"
              onClick={() => {
                store.clear();
                store.resume();
                setNotice(null);
              }}
            >
              Discard imported data
            </button>
          )}
          {notice && (
            <button
              type="button"
              className="rp-btn"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="rp-tabs" role="tablist" aria-label="ReactPulse views">
        {(["components", "timeline", "performance"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`rp-tab-${t}`}
            aria-selected={tab === t}
            aria-controls="rp-panel"
            className="rp-tab"
            onClick={() => setTab(t)}
          >
            {t[0]!.toUpperCase() + t.slice(1)}
            {t === "components" && <span className="rp-count">{list.length}</span>}
            {t === "performance" && warnings > 0 && (
              <span className="rp-count rp-count-warn">{warnings}</span>
            )}
          </button>
        ))}
      </div>

      <div className="rp-body" id="rp-panel" role="tabpanel" aria-labelledby={`rp-tab-${tab}`}>
        {tab === "components" && (
          <div className="rp-split">
            <div className="rp-pane">
              <ComponentList
                components={list}
                selected={current?.name ?? null}
                threshold={store.config.threshold}
                onSelect={(name) => select(name)}
              />
            </div>
            <div className="rp-pane">
              {current ? (
                <ComponentDetails
                  record={current}
                  store={store}
                  eventId={eventId}
                  onSelectEvent={setEventId}
                />
              ) : (
                <div className="rp-empty">Select a component to see its render history.</div>
              )}
            </div>
          </div>
        )}
        {tab === "timeline" && (
          <div className="rp-pane rp-pane-full">
            <Timeline events={timeline} threshold={store.config.threshold} onSelect={inspect} />
          </div>
        )}
        {tab === "performance" && (
          <div className="rp-pane rp-pane-full">
            <PerformancePanel
              store={store}
              components={list}
              onSelect={(n) => {
                select(n);
                setTab("components");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
