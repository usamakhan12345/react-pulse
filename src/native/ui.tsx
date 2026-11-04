import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "./theme";

export type Tone = "neutral" | "ok" | "warn" | "danger";

export function Badge({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  const { p, s } = useTheme();
  const bg = { neutral: p.surface, ok: p.okBg, warn: p.warnBg, danger: p.dangerBg }[tone];
  const fg = { neutral: p.muted, ok: p.ok, warn: p.warn, danger: p.danger }[tone];
  return (
    <View
      style={[s.badge, { backgroundColor: bg, borderColor: tone === "neutral" ? p.border : bg }]}
    >
      <Text style={[s.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Btn({
  label,
  onPress,
  primary,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  accessibilityLabel?: string;
}) {
  const { s } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[s.btn, primary && s.btnPrimary]}
    >
      <Text style={[s.btnText, primary && s.btnPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { s } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipActive]}
    >
      <Text style={[s.chipText, selected && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** A horizontally scrolling row of chips. */
export function ChipRow({ children }: { children: ReactNode }) {
  const { s } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {children}
    </ScrollView>
  );
}

export function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const { s } = useTheme();
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, warn && s.slow]}>{value}</Text>
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const { s } = useTheme();
  return (
    <Text accessibilityRole="header" style={s.h3}>
      {children}
    </Text>
  );
}
