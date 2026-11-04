import { useEffect, useRef, useState } from "react";
import { DevSettings, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { PulseWarning } from "../core/types";
import { useStore } from "../devtools/useStore";
import { PulseDashboard } from "./PulseDashboard";
import type { PulseDashboardProps } from "./PulseDashboard";
import { ThemeProvider, useResolvedScheme, useTheme } from "./theme";
import type { ThemeSetting } from "./theme";
import { Badge, Btn } from "./ui";

export interface PulseInsets {
  top: number;
  bottom: number;
}

export interface NativeDevtoolsOptions {
  /** `"system"` follows the device color scheme. Default `"system"`. */
  theme?: ThemeSetting;
  /** Open the panel on first render. Default false (only the launcher is shown). */
  defaultOpen?: boolean;
  /** Where the launcher sits. Default `"bottom-right"`. */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Show toasts for warnings. Default: `config.showNotifications`. */
  notifications?: boolean;
  /**
   * Safe-area insets so the launcher and toasts clear notches and home indicators,
   * for example from `useSafeAreaInsets()`. Default `{ top: 48, bottom: 24 }`.
   */
  insets?: PulseInsets;
  /** Receives the report JSON for "Share report". Default: the system share sheet. */
  onExport?: PulseDashboardProps["onExport"];
}

const TOAST_MS = 5000;

function Toasts({ enabled, top }: { enabled: boolean; top: number }) {
  const { store, version } = useStore();
  const { s } = useTheme();
  const [toasts, setToasts] = useState<PulseWarning[]>([]);
  const lastSeen = useRef(store.warnings.reduce((max, w) => Math.max(max, w.id), 0));

  useEffect(() => {
    const fresh = store.warnings.filter((w) => w.id > lastSeen.current);
    if (!fresh.length) return;
    lastSeen.current = fresh[fresh.length - 1]!.id;
    if (!enabled || store.paused) return;
    setToasts((prev) => [...prev, ...fresh].slice(-2));
    const ids = new Set(fresh.map((w) => w.id));
    const timer = setTimeout(
      () => setToasts((prev) => prev.filter((w) => !ids.has(w.id))),
      TOAST_MS,
    );
    return () => clearTimeout(timer);
  }, [version, store, enabled]);

  if (!toasts.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top }}>
      {toasts.map((w) => (
        <View key={w.id} style={s.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Badge text={w.kind} tone={w.kind === "slow-render" ? "danger" : "warn"} />
          <Text style={[s.mono, { flex: 1 }]}>{w.message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            onPress={() => setToasts((prev) => prev.filter((t) => t.id !== w.id))}
            hitSlop={10}
          >
            <Text style={s.muted}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// React Native's dev menu is global, so the menu item is registered once.
let menuRegistered = false;
let activeToggle: (() => void) | undefined;

function useDevMenu(toggle: () => void) {
  useEffect(() => {
    activeToggle = toggle;
    if (!menuRegistered && typeof DevSettings?.addMenuItem === "function") {
      menuRegistered = true;
      DevSettings.addMenuItem("ReactPulse: toggle panel", () => activeToggle?.());
    }
    return () => {
      if (activeToggle === toggle) activeToggle = undefined;
    };
  }, [toggle]);
}

/**
 * Floating launcher plus a bottom panel with the native dashboard. Render it once,
 * near the root of your app (or use `<ReactPulse>`, which does it for you). The
 * panel covers part of the screen and leaves the rest of the app interactive.
 * Also adds "ReactPulse: toggle panel" to the React Native dev menu.
 */
export function PulseDevtools({
  theme = "system",
  defaultOpen = false,
  position = "bottom-right",
  notifications,
  insets = { top: 48, bottom: 24 },
  onExport,
}: NativeDevtoolsOptions) {
  const { store } = useStore();
  const scheme = useResolvedScheme(theme);
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);

  const [toggle] = useState(() => () => setOpen((o) => !o));
  useDevMenu(toggle);

  const warnings = store.warnings.length;
  const panelHeight = expanded ? height - insets.top : Math.round(height * 0.6);

  return (
    <ThemeProvider scheme={scheme}>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Toasts enabled={notifications ?? store.config.showNotifications} top={insets.top} />
        {!open && (
          <Launcher
            position={position}
            insets={insets}
            count={warnings}
            onPress={() => setOpen(true)}
          />
        )}
        {open && (
          <PanelFrame
            height={panelHeight}
            onClose={() => setOpen(false)}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((e) => !e)}
            onExport={onExport}
            theme={theme}
          />
        )}
      </View>
    </ThemeProvider>
  );
}

function Launcher({
  position,
  insets,
  count,
  onPress,
}: {
  position: NonNullable<NativeDevtoolsOptions["position"]>;
  insets: PulseInsets;
  count: number;
  onPress: () => void;
}) {
  const { s } = useTheme();
  const vertical = position.startsWith("top") ? { top: insets.top } : { bottom: insets.bottom };
  const horizontal = position.endsWith("left") ? { left: 16 } : { right: 16 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open ReactPulse"
      onPress={onPress}
      style={[s.launcher, vertical, horizontal]}
    >
      <Text style={s.btnText}>⚛ Pulse</Text>
      {count > 0 && <Badge text={String(count)} tone="danger" />}
    </Pressable>
  );
}

function PanelFrame({
  height,
  onClose,
  expanded,
  onToggleExpanded,
  onExport,
  theme,
}: {
  height: number;
  onClose: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onExport: NativeDevtoolsOptions["onExport"];
  theme: ThemeSetting;
}) {
  const { s } = useTheme();
  return (
    <View style={[s.panel, { height }]} accessibilityLabel="ReactPulse panel">
      <PulseDashboard
        theme={theme}
        onClose={onClose}
        onExport={onExport}
        actions={
          <Btn
            label={expanded ? "Shrink" : "Expand"}
            accessibilityLabel={expanded ? "Shrink panel" : "Expand panel"}
            onPress={onToggleExpanded}
          />
        }
      />
    </View>
  );
}
