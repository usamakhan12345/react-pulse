/**
 * Minimal ambient types for the parts of "react-native" this package uses.
 *
 * react-native is an optional peer dependency and is intentionally not installed
 * in this repository (it is large), so these declarations are what the native
 * sources are type-checked against. Props are loose on purpose; consumers get
 * the real types from their own react-native install. The published type
 * declarations of this package never reference these.
 */
declare module "react-native" {
  import type { ComponentType } from "react";

  type Component = ComponentType<any>;

  export const View: Component;
  export const Text: Component;
  export const Pressable: Component;
  export const ScrollView: Component;
  export const TextInput: Component;
  export const FlatList: Component;

  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    absoluteFill: Record<string, any>;
    hairlineWidth: number;
  };

  export function useColorScheme(): "light" | "dark" | null | undefined;
  export function useWindowDimensions(): {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };

  export const Platform: { OS: "ios" | "android" | "web" | (string & {}) };
  export const Share: {
    share(content: { message?: string; title?: string }): Promise<unknown>;
  };
  export const DevSettings: { addMenuItem?(title: string, handler: () => void): void } | undefined;
}
