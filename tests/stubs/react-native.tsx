/**
 * A tiny stand-in for "react-native" used only by the test suite. It renders the
 * primitives the native dashboard uses as DOM elements and maps accessibility
 * props to ARIA, so tests can drive the real native components with Testing Library.
 *
 * It is NOT a React Native runtime: it cannot verify native layout or styling.
 */
import { createElement, forwardRef } from "react";
import type { ReactNode } from "react";

type Props = Record<string, any>;

const ROLES: Record<string, string | undefined> = {
  button: "button",
  tab: "tab",
  tablist: "tablist",
  header: "heading",
  alert: "alert",
  text: undefined,
};

function aria(props: Props) {
  const out: Props = {};
  if (props.accessibilityLabel) out["aria-label"] = props.accessibilityLabel;
  const role = ROLES[props.accessibilityRole as string];
  if (role) out.role = role;
  if (props.accessibilityState && "selected" in props.accessibilityState) {
    out["aria-selected"] = String(!!props.accessibilityState.selected);
  }
  if (props.testID) out["data-testid"] = props.testID;
  return out;
}

const host = (tag: string) =>
  forwardRef<HTMLElement, Props>(function Host(props, ref) {
    const extra: Props = aria(props);
    if (typeof props.onPress === "function") {
      extra.onClick = props.onPress;
      extra.tabIndex = 0;
    }
    return createElement(tag, { ref, ...extra }, props.children as ReactNode);
  });

export const View = host("div");
export const Text = host("span");
export const Pressable = host("div");
export const ScrollView = host("div");

export const TextInput = forwardRef<HTMLElement, Props>(function TextInput(props, ref) {
  return createElement(props.multiline ? "textarea" : "input", {
    ref,
    ...aria(props),
    value: props.value ?? "",
    placeholder: props.placeholder,
    onChange: (e: { target: { value: string } }) => props.onChangeText?.(e.target.value),
  });
});

export function FlatList({
  data,
  renderItem,
  keyExtractor,
}: {
  data: any[];
  renderItem: (info: { item: any; index: number }) => ReactNode;
  keyExtractor: (item: any, index: number) => string;
}) {
  return createElement(
    "div",
    null,
    data.map((item, index) =>
      createElement("div", { key: keyExtractor(item, index) }, renderItem({ item, index })),
    ),
  );
}

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
  absoluteFill: {},
  hairlineWidth: 1,
};

const g = globalThis as {
  __rnScheme?: "light" | "dark" | null;
  __devMenu?: { title: string; handler: () => void };
};
export const useColorScheme = () => g.__rnScheme ?? "light";
export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 3, fontScale: 1 });
export const Platform = { OS: "ios" as const };
export const Share = {
  share: async (_content: { message?: string; title?: string }): Promise<unknown> => ({
    action: "sharedAction",
  }),
};
export const DevSettings = {
  addMenuItem(title: string, handler: () => void) {
    g.__devMenu = { title, handler };
  },
};
