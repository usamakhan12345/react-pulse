import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";
import type { RenderEvent } from "../core/types";
import { FILTER_LABELS, SORT_LABELS, selectComponents } from "../devtools/select";
import type { FilterKey, SortKey } from "../devtools/select";
import { useStore } from "../devtools/useStore";
import {
  ActivityScreen,
  ComponentsScreen,
  DetailsScreen,
  PerformanceScreen,
  ReportScreen,
} from "./screens";
import { ThemeProvider, useResolvedScheme, useTheme } from "./theme";
import type { ThemeSetting } from "./theme";
import { Btn, Chip, ChipRow } from "./ui";

type Tab = "components" | "activity" | "performance" | "report";
const TABS: [Tab, string][] = [
  ["components", "Components"],
  ["activity", "Activity"],
  ["performance", "Performance"],
  ["report", "Report"],
];

export interface PulseDashboardProps {
  /** `"system"` follows the device color scheme. Default `"system"`. */
  theme?: ThemeSetting;
  /** Shows a close button when provided. */
  onClose?: () => void;
  /** Extra header content, e.g. an expand button. */
  actions?: ReactNode;
  /**
   * Receives the report JSON when "Share report" is pressed. Default: the system
   * share sheet (`Share.share`). Use it to write a file or copy to the clipboard.
   */
  onExport?: (json: string) => void | Promise<unknown>;
}

const defaultExport = (json: string) => Share.share({ message: json, title: "ReactPulse report" });

/** The full dashboard, sized by its parent. Embed it in any screen, or use `<PulseDevtools />`. */
export function PulseDashboard({ theme = "system", ...rest }: PulseDashboardProps) {
  const scheme = useResolvedScheme(theme);
  return (
    <ThemeProvider scheme={scheme}>
      <DashboardBody {...rest} />
    </ThemeProvider>
  );
}

function DashboardBody({
  onClose,
  actions,
  onExport = defaultExport,
}: Omit<PulseDashboardProps, "theme">) {
  const { s, p } = useTheme();
  const { store, version } = useStore();

  const [tab, setTab] = useState<Tab>("components");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("renders");
  const [selected, setSelected] = useState<string | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);

  const records = useMemo(() => [...store.components.values()], [store, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(
    () => selectComponents(records, { search, filter, sort }),
    [records, search, filter, sort],
  );
  const activity = useMemo(() => {
    const names = new Set(list.map((c) => c.name));
    return store.timeline
      .filter((e) => names.has(e.component))
      .slice(-150)
      .reverse();
  }, [store, list, version]); // eslint-disable-line react-hooks/exhaustive-deps

  // User actions should feel instant: skip the throttle that batches background updates.
  const act = (fn: () => void) => {
    fn();
    store.flush();
  };

  const imported = records.some((r) => r.imported);
  const status = !store.isEnabled() ? "Disabled" : store.paused ? "Paused" : "Recording";
  const statusStyle =
    status === "Recording"
      ? { backgroundColor: p.okBg, color: p.ok }
      : status === "Paused"
        ? { backgroundColor: p.warnBg, color: p.warn }
        : { backgroundColor: p.surface, color: p.muted };
  const warnings = store.warnings.length;
  const current = selected ? store.components.get(selected) : undefined;

  const open = (name: string, id: number | null = null) => {
    setSelected(name);
    setEventId(id);
    setTab("components");
  };
  const inspect = (e: RenderEvent) => open(e.component, e.id);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
            <Text style={s.brand} numberOfLines={1}>
              ⚛ ReactPulse
            </Text>
            <Text accessibilityRole="text" numberOfLines={1} style={[s.status, statusStyle]}>
              {status}
            </Text>
          </View>
          <View style={s.headerActions}>
            {actions}
            {onClose && <Btn label="✕" accessibilityLabel="Close ReactPulse" onPress={onClose} />}
          </View>
        </View>
        <View style={s.headerRow}>
          <View style={s.fill}>
            <Btn
              label={store.paused ? "Resume" : "Pause"}
              accessibilityLabel={store.paused ? "Resume monitoring" : "Pause monitoring"}
              onPress={() => act(() => (store.paused ? store.resume() : store.pause()))}
            />
          </View>
          <View style={s.fill}>
            <Btn
              label="Clear"
              accessibilityLabel="Clear history"
              onPress={() => act(() => store.clear())}
            />
          </View>
        </View>
      </View>

      {imported && (
        <View style={s.banner}>
          <Text style={[s.muted, { flex: 1, color: p.text }]}>
            Viewing an imported report. Live monitoring is paused.
          </Text>
          <Btn
            label="Discard"
            accessibilityLabel="Discard imported data"
            onPress={() => {
              act(() => {
                store.clear();
                store.resume();
              });
              setSelected(null);
            }}
          />
        </View>
      )}

      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: tab === id }}
            onPress={() => setTab(id)}
            style={[s.tab, tab === id && s.tabActive]}
          >
            <Text style={[s.tabText, tab === id && s.tabTextActive]}>
              {label}
              {id === "components" ? ` ${list.length}` : ""}
              {id === "performance" && warnings > 0 ? ` ⚠${warnings}` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab !== "report" && !(tab === "components" && current) && (
        <View style={s.toolbar}>
          <TextInput
            accessibilityLabel="Search components"
            placeholder="Search components"
            placeholderTextColor={p.muted}
            autoCapitalize="none"
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
            style={s.input}
          />
          <ChipRow>
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <Chip
                key={key}
                label={FILTER_LABELS[key]}
                accessibilityLabel={`Filter: ${FILTER_LABELS[key]}`}
                selected={filter === key}
                onPress={() => setFilter(key)}
              />
            ))}
          </ChipRow>
          <ChipRow>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <Chip
                key={key}
                label={SORT_LABELS[key]}
                accessibilityLabel={`Sort: ${SORT_LABELS[key]}`}
                selected={sort === key}
                onPress={() => setSort(key)}
              />
            ))}
          </ChipRow>
        </View>
      )}

      <View style={s.scroll}>
        {tab === "components" &&
          (current ? (
            <DetailsScreen
              record={current}
              store={store}
              eventId={eventId}
              onSelectEvent={setEventId}
              onBack={() => setSelected(null)}
            />
          ) : (
            <ComponentsScreen
              components={list}
              selected={selected}
              threshold={store.config.threshold}
              onSelect={(name) => open(name)}
            />
          ))}
        {tab === "activity" && <ActivityScreen events={activity} onSelect={inspect} />}
        {tab === "performance" && (
          <PerformanceScreen store={store} components={list} onSelect={(name) => open(name)} />
        )}
        {tab === "report" && (
          <ReportScreen onExport={onExport} onImported={() => setSelected(null)} />
        )}
      </View>
    </View>
  );
}
