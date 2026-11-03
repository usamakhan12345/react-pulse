export const VERSION = "0.1.0";

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
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
  return nodeEnv() !== "production";
}
