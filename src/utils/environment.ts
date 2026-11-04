export const VERSION = "0.2.0";

/** React Native's bundler defines `__DEV__`; other bundlers do not. */
declare const __DEV__: boolean | undefined;

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** True inside React Native (Hermes / JavaScriptCore), where there is no DOM. */
export function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

/** The global object across browsers, Node and React Native / Hermes. */
export function getGlobal(): typeof globalThis {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self as unknown as typeof globalThis;
  if (typeof window !== "undefined") return window as unknown as typeof globalThis;
  return global as unknown as typeof globalThis;
}

/**
 * Bundlers replace `process.env.NODE_ENV` textually. The try/catch keeps this
 * safe in browsers that ship no replacement and no `process` global.
 */
export function nodeEnv(): string | undefined {
  try {
    return process.env.NODE_ENV;
  } catch {
    return undefined;
  }
}

export function isDev(): boolean {
  // React Native sets __DEV__ to false in release bundles.
  if (typeof __DEV__ === "boolean") return __DEV__;
  return nodeEnv() !== "production";
}
