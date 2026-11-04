import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";

export type ThemeSetting = "light" | "dark" | "system";

export interface Palette {
  bg: string;
  surface: string;
  raised: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentBg: string;
  ok: string;
  okBg: string;
  warn: string;
  warnBg: string;
  danger: string;
  dangerBg: string;
}

// Same colors as the web dashboard so both feel like one product.
export const palettes: Record<"light" | "dark", Palette> = {
  light: {
    bg: "#FFFFFF",
    surface: "#F5F6F8",
    raised: "#FFFFFF",
    border: "#E1E4E9",
    text: "#171A21",
    muted: "#677082",
    accent: "#4B57D6",
    accentBg: "#E9EBFF",
    ok: "#12805C",
    okBg: "#DCF5EA",
    warn: "#9A5B00",
    warnBg: "#FFF0D1",
    danger: "#C42B45",
    dangerBg: "#FDE4E8",
  },
  dark: {
    bg: "#0F1115",
    surface: "#161920",
    raised: "#1C2029",
    border: "#2A2F3A",
    text: "#E7E9EE",
    muted: "#8B92A0",
    accent: "#8F9BFF",
    accentBg: "#232844",
    ok: "#45D6A0",
    okBg: "#12332A",
    warn: "#F3B94D",
    warnBg: "#3A2D12",
    danger: "#FF6B86",
    dangerBg: "#401A24",
  },
};

const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

function makeStyles(p: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.bg },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: p.surface,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    fill: { flex: 1 },
    brand: { color: p.text, fontWeight: "700", fontSize: 15 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    btn: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimary: { backgroundColor: p.accent, borderColor: p.accent },
    btnText: { color: p.text, fontWeight: "600", fontSize: 13 },
    btnPrimaryText: { color: p.bg },
    status: {
      fontSize: 11,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      overflow: "hidden",
      marginLeft: 8,
      flexShrink: 0,
    },
    tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: p.border },
    tab: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: p.accent },
    tabText: { color: p.muted, fontSize: 13, fontWeight: "600" },
    tabTextActive: { color: p.text },
    toolbar: { padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: p.border },
    input: {
      minHeight: 40,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      color: p.text,
      backgroundColor: p.bg,
      fontSize: 14,
    },
    inputMulti: {
      minHeight: 110,
      textAlignVertical: "top",
      paddingTop: 8,
      fontFamily: MONO,
      fontSize: 12,
    },
    chips: { flexDirection: "row", gap: 6, paddingRight: 10 },
    chip: {
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.surface,
      justifyContent: "center",
    },
    chipActive: { backgroundColor: p.accentBg, borderColor: p.accent },
    chipText: { color: p.muted, fontSize: 12, fontWeight: "600" },
    chipTextActive: { color: p.text },
    listHead: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: p.surface,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    headText: { color: p.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    rowActive: { backgroundColor: p.accentBg },
    rowName: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    name: { color: p.text, fontWeight: "600", fontSize: 14 },
    num: { width: 58, textAlign: "right", color: p.text, fontFamily: MONO, fontSize: 12 },
    numWide: { width: 70 },
    slow: { color: p.danger },
    muted: { color: p.muted, fontSize: 12 },
    mono: { fontFamily: MONO, fontSize: 12, color: p.text },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    badgeText: { fontSize: 10, fontWeight: "700", color: p.muted },
    scroll: { flex: 1 },
    pad: { padding: 12, gap: 14 },
    title: { color: p.text, fontSize: 18, fontWeight: "700" },
    h3: {
      color: p.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    note: { color: p.muted, fontSize: 12, lineHeight: 17 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    stat: {
      minWidth: 96,
      flexGrow: 1,
      flexBasis: "30%",
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    statLabel: { color: p.muted, fontSize: 11 },
    statValue: { color: p.text, fontFamily: MONO, fontWeight: "700", fontSize: 15, marginTop: 2 },
    card: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      backgroundColor: p.surface,
      padding: 10,
      gap: 6,
    },
    prev: { backgroundColor: p.dangerBg, borderRadius: 6, padding: 6 },
    next: { backgroundColor: p.okBg, borderRadius: 6, padding: 6 },
    prevText: { color: p.danger, fontFamily: MONO, fontSize: 12 },
    nextText: { color: p.ok, fontFamily: MONO, fontSize: 12 },
    reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: p.surface, overflow: "hidden" },
    bar: { height: 8, borderRadius: 4, backgroundColor: p.accent },
    barSlow: { backgroundColor: p.danger },
    toast: {
      marginHorizontal: 12,
      marginBottom: 6,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.raised,
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
    },
    launcher: {
      position: "absolute",
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.raised,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    panel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: p.bg,
      borderTopWidth: 1,
      borderTopColor: p.border,
      elevation: 12,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    empty: { padding: 24, alignItems: "center" },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: p.accentBg,
    },
  });
}

export type Styles = ReturnType<typeof makeStyles>;

interface Theme {
  p: Palette;
  s: Styles;
  scheme: "light" | "dark";
}

const ThemeContext = createContext<Theme | null>(null);

export function useResolvedScheme(setting: ThemeSetting): "light" | "dark" {
  const system = useColorScheme();
  return setting === "system" ? (system === "dark" ? "dark" : "light") : setting;
}

export function ThemeProvider({
  scheme,
  children,
}: {
  scheme: "light" | "dark";
  children: ReactNode;
}) {
  const value = useMemo<Theme>(() => {
    const p = palettes[scheme];
    return { p, s: makeStyles(p), scheme };
  }, [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ReactPulse native UI must be rendered inside ThemeProvider");
  return theme;
}
