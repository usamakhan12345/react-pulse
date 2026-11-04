import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import type { Store } from "../core/store";
import type { ComponentRecord, RenderEvent } from "../core/types";
import { averageDuration } from "../core/performance";
import { describeReason } from "../utils/logger";
import { preview } from "../utils/serialize";
import { exportReportJSON, importReport } from "../utils/exporter";
import { changeFrequency, summarize } from "../devtools/select";
import { clock, gap, ms } from "../devtools/format";
import { useTheme } from "./theme";
import { Badge, Btn, Heading, Stat } from "./ui";

/* ------------------------------ components list ------------------------------ */

export function ComponentsScreen({
  components,
  selected,
  threshold,
  onSelect,
}: {
  components: ComponentRecord[];
  selected: string | null;
  threshold: number;
  onSelect(name: string): void;
}) {
  const { s } = useTheme();
  if (!components.length) {
    return (
      <View style={s.empty}>
        <Text style={s.muted}>
          No components match. Components appear here after they render with a ReactPulse hook.
        </Text>
      </View>
    );
  }
  return (
    <View style={s.scroll}>
      <View
        style={s.listHead}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[s.headText, { flex: 1 }]}>COMPONENT</Text>
        <Text style={[s.headText, s.num]}>RENDERS</Text>
        <Text style={[s.headText, s.num, s.numWide]}>AVG</Text>
        <Text style={[s.headText, s.num, s.numWide]}>MAX</Text>
      </View>
      <FlatList
        data={components}
        keyExtractor={(c: ComponentRecord) => c.name}
        renderItem={({ item: c }: { item: ComponentRecord }) => {
          const avg = averageDuration(c);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${c.renders} renders`}
              accessibilityState={{ selected: c.name === selected }}
              onPress={() => onSelect(c.name)}
              style={[s.row, c.name === selected && s.rowActive]}
            >
              <View style={s.rowName}>
                <Text style={s.name} numberOfLines={1}>
                  {c.name}
                </Text>
                {c.slowRenders > 0 && <Badge text={`${c.slowRenders} slow`} tone="danger" />}
                {c.imported && <Badge text="imported" />}
                {c.kind === "profiler" && <Badge text="profiler" />}
              </View>
              <Text style={s.num}>{c.renders}</Text>
              <Text style={[s.num, s.numWide, avg > threshold && s.slow]}>
                {c.measured ? ms(avg) : "–"}
              </Text>
              <Text style={[s.num, s.numWide, c.maxDuration > threshold && s.slow]}>
                {c.measured ? ms(c.maxDuration) : "–"}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

/* ------------------------------ component details ------------------------------ */

const reasonSummary = (e: RenderEvent) =>
  e.reasons
    .map((r) =>
      r.kind === "mount"
        ? "mount"
        : r.keys?.length
          ? `${r.kind}: ${r.keys.join(", ")}`
          : `${r.kind}${r.confidence === "probable" ? "?" : ""}`,
    )
    .join(" · ");

export function DetailsScreen({
  record,
  store,
  eventId,
  onSelectEvent,
  onBack,
}: {
  record: ComponentRecord;
  store: Store;
  eventId: number | null;
  onSelectEvent(id: number): void;
  onBack(): void;
}) {
  const { s } = useTheme();
  const { threshold } = store.config;
  const events = record.events;
  const selected = events.find((e) => e.id === eventId) ?? events[events.length - 1];
  const frequent = changeFrequency(events);
  const states = store.stateLog
    .filter((x) => x.component === record.name)
    .slice(-6)
    .reverse();
  const measures = store.measures
    .filter((m) => m.component === record.name)
    .slice(-6)
    .reverse();
  const avg = averageDuration(record);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.pad}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Btn label="‹ Back" onPress={onBack} accessibilityLabel="Back to components" />
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={s.title} numberOfLines={1}>
            {record.name}
          </Text>
          <Text style={s.muted}>
            {record.live} mounted · {record.mounts} mounts · {record.unmounts} unmounts
            {record.lastLifetime !== null ? ` · last lifetime ${gap(record.lastLifetime)}` : ""}
          </Text>
        </View>
      </View>

      <View style={s.statGrid}>
        <Stat label="Renders" value={String(record.renders)} />
        <Stat label="Re-renders" value={String(record.rerenders)} />
        <Stat label="Average" value={record.measured ? ms(avg) : "–"} warn={avg > threshold} />
        <Stat
          label="Max"
          value={record.measured ? ms(record.maxDuration) : "–"}
          warn={record.maxDuration > threshold}
        />
        <Stat
          label="Last"
          value={ms(record.lastDuration)}
          warn={(record.lastDuration ?? 0) > threshold}
        />
        <Stat label="Slow" value={String(record.slowRenders)} warn={record.slowRenders > 0} />
      </View>
      <Text style={s.note}>
        {record.kind === "profiler"
          ? "Duration is React's actualDuration from a Profiler: time spent rendering this subtree."
          : "Duration is an upper-bound render-to-commit span. It also covers components React rendered after this one in the same pass (large commits such as the first mount overstate it) and native view updates."}
      </Text>

      {frequent.length > 0 && (
        <View>
          <Heading>Changed most often</Heading>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {frequent.map((f) => (
              <Badge key={f.label} text={`${f.label} ×${f.count}`} />
            ))}
          </View>
        </View>
      )}

      {selected && (
        <View>
          <Heading>{`Why did render #${selected.n} happen?`}</Heading>
          <Text style={s.muted}>
            {clock(selected.at)} · {ms(selected.duration)} · {selected.phase}
          </Text>
          <View style={{ gap: 6, marginTop: 6 }}>
            {selected.reasons.map((r, i) => (
              <View key={i} style={s.reasonRow}>
                <Badge text={r.confidence} tone={r.confidence === "certain" ? "ok" : "warn"} />
                <Text style={[s.mono, { flex: 1 }]}>{describeReason(r)}</Text>
              </View>
            ))}
          </View>
          {selected.changes.length > 0 ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              {selected.changes.map((c, i) => (
                <View key={i} style={s.card}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.mono}>
                      {c.source}.{c.key}
                    </Text>
                    {c.referenceOnly && <Badge text="identity only" tone="warn" />}
                  </View>
                  <View style={s.prev}>
                    <Text style={s.prevText}>{`previous  ${preview(c.prev, 160, 3)}`}</Text>
                  </View>
                  <View style={s.next}>
                    <Text style={s.nextText}>{`current   ${preview(c.next, 160, 3)}`}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[s.muted, { marginTop: 6 }]}>
              No compared values changed in this render.
            </Text>
          )}
        </View>
      )}

      <View>
        <Heading>{`Render history (last ${events.length})`}</Heading>
        <View style={{ borderWidth: 1, borderColor: "transparent" }}>
          {events
            .slice()
            .reverse()
            .map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`Render ${e.n}`}
                accessibilityState={{ selected: e.id === selected?.id }}
                onPress={() => onSelectEvent(e.id)}
                style={[s.row, e.id === selected?.id && s.rowActive]}
              >
                <Text style={[s.mono, { width: 44 }]}>#{e.n}</Text>
                <Text style={[s.mono, { width: 88 }, s.muted]}>{clock(e.at)}</Text>
                <Text style={[s.mono, e.slow && s.slow, { width: 64 }]}>{ms(e.duration)}</Text>
                <Text style={[s.muted, { flex: 1 }]} numberOfLines={1}>
                  {reasonSummary(e)}
                </Text>
              </Pressable>
            ))}
        </View>
      </View>

      {states.length > 0 && (
        <View>
          <Heading>Tracked state</Heading>
          {states.map((x) => (
            <Text key={x.id} style={s.mono}>
              {clock(x.at)} {x.label}: {preview(x.prev)} → {preview(x.next)}
            </Text>
          ))}
        </View>
      )}
      {measures.length > 0 && (
        <View>
          <Heading>Measurements</Heading>
          {measures.map((m) => (
            <Text key={m.id} style={[s.mono, m.slow && s.slow]}>
              {m.label} ({m.kind}) {ms(m.duration)}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ------------------------------ activity feed ------------------------------ */

export function ActivityScreen({
  events,
  onSelect,
}: {
  events: RenderEvent[];
  onSelect(event: RenderEvent): void;
}) {
  const { s } = useTheme();
  if (!events.length) {
    return (
      <View style={s.empty}>
        <Text style={s.muted}>No renders recorded yet.</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={events}
      keyExtractor={(e: RenderEvent) => String(e.id)}
      renderItem={({ item: e }: { item: RenderEvent }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${e.component} render ${e.n}`}
          onPress={() => onSelect(e)}
          style={s.row}
        >
          <View style={{ flex: 1 }}>
            <View style={s.rowName}>
              <Text style={s.name}>{e.component}</Text>
              <Text style={s.muted}>#{e.n}</Text>
              {e.slow && <Badge text="slow" tone="danger" />}
              {e.phase === "mount" && <Badge text="mount" />}
            </View>
            <Text style={s.muted} numberOfLines={1}>
              {clock(e.at)} · {reasonSummary(e)}
            </Text>
          </View>
          <Text style={[s.num, e.slow && s.slow]}>{ms(e.duration)}</Text>
        </Pressable>
      )}
    />
  );
}

/* ------------------------------ performance ------------------------------ */

export function PerformanceScreen({
  store,
  components,
  onSelect,
}: {
  store: Store;
  components: ComponentRecord[];
  onSelect(name: string): void;
}) {
  const { s } = useTheme();
  const { threshold } = store.config;
  const total = summarize(components);
  const slowest = components
    .filter((c) => c.measured > 0)
    .sort((a, b) => b.maxDuration - a.maxDuration)
    .slice(0, 8);
  const scale = Math.max(threshold, ...slowest.map((c) => c.maxDuration), 1);
  const warnings = store.warnings.slice(-30).reverse();
  const measures = store.measures.slice(-12).reverse();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.pad}>
      <View style={s.statGrid}>
        <Stat label="Components" value={String(total.components)} />
        <Stat label="Total renders" value={String(total.renders)} />
        <Stat label="Slow renders" value={String(total.slow)} warn={total.slow > 0} />
        <Stat
          label="Average"
          value={total.renders ? ms(total.avg) : "–"}
          warn={total.avg > threshold}
        />
        <Stat
          label="Max"
          value={total.maxName ? ms(total.max) : "–"}
          warn={total.max > threshold}
        />
        <Stat label="Threshold" value={`${threshold}ms`} />
      </View>

      <View>
        <Heading>Slowest components</Heading>
        {slowest.length ? (
          slowest.map((c) => {
            const avg = averageDuration(c);
            return (
              <Pressable
                key={c.name}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, max ${ms(c.maxDuration)}`}
                onPress={() => onSelect(c.name)}
                style={{ paddingVertical: 6, gap: 4 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.mono}>
                    {ms(avg)} / {ms(c.maxDuration)}
                  </Text>
                </View>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.bar,
                      c.maxDuration > threshold && s.barSlow,
                      { width: `${Math.max(2, (c.maxDuration / scale) * 100)}%` },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={s.muted}>No timed renders yet.</Text>
        )}
        <Text style={s.note}>
          Bars show max duration against the {threshold}ms threshold. Labels show average / max.
        </Text>
      </View>

      <View>
        <Heading>{`Warnings (${store.warnings.length})`}</Heading>
        {warnings.length ? (
          warnings.map((w) => (
            <View key={w.id} style={{ paddingVertical: 4, gap: 2 }}>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <Badge text={w.kind} tone={w.kind === "slow-render" ? "danger" : "warn"} />
                <Text style={s.muted}>{clock(w.at)}</Text>
              </View>
              <Text style={s.mono}>{w.message}</Text>
            </View>
          ))
        ) : (
          <Text style={s.muted}>No warnings.</Text>
        )}
      </View>

      {measures.length > 0 && (
        <View>
          <Heading>Recent measurements</Heading>
          {measures.map((m) => (
            <Text key={m.id} style={[s.mono, m.slow && s.slow]}>
              {m.component} · {m.label} ({m.kind}) {ms(m.duration)}
            </Text>
          ))}
        </View>
      )}

      <View>
        <Heading>What the numbers mean</Heading>
        <Text style={s.note}>
          Render span (hooks): from the hook call during render until commit. It includes children,
          anything React renders after this component in the same pass, and native view updates, so
          large commits overstate it; treat it as an upper bound.{"\n\n"}
          Profiler duration (PulseProfiler): React&apos;s actualDuration for a subtree. Development
          and profiling builds only.
          {"\n\n"}
          Interaction (startInteraction): from your start call until the next JavaScript animation
          frame, an approximation of input-to-render time. It does not include native rendering.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ------------------------------ report (share / import) ------------------------------ */

export function ReportScreen({
  onExport,
  onImported,
}: {
  onExport(json: string): void | Promise<unknown>;
  onImported(): void;
}) {
  const { s, p } = useTheme();
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const share = async () => {
    try {
      await onExport(exportReportJSON(0));
      setNotice({ ok: true, text: "Report ready to share." });
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "Export failed" });
    }
  };
  const load = () => {
    try {
      const report = importReport(text);
      setText("");
      setNotice({
        ok: true,
        text: `Imported ${report.components.length} components. Monitoring is paused.`,
      });
      onImported();
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "Import failed" });
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 8 }}>
        <Heading>Export</Heading>
        <Text style={s.note}>
          Shares the whole session as JSON through the system share sheet (or your onExport
          handler). Very large reports can exceed the platform share limit; lower historyLimit or
          use onExport to write a file.
        </Text>
        <Btn label="Share report" primary onPress={share} />
      </View>
      <View style={{ gap: 8 }}>
        <Heading>Import</Heading>
        <Text style={s.note}>
          Paste a report exported from ReactPulse (web or native). Live monitoring pauses while
          viewing it.
        </Text>
        <TextInput
          accessibilityLabel="Report JSON"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste report JSON here"
          placeholderTextColor={p.muted}
          value={text}
          onChangeText={setText}
          style={[s.input, s.inputMulti]}
        />
        <Btn label="Import report" onPress={load} />
      </View>
      {notice && (
        <Text accessibilityRole="alert" style={[s.mono, { color: notice.ok ? p.ok : p.danger }]}>
          {notice.text}
        </Text>
      )}
    </ScrollView>
  );
}
