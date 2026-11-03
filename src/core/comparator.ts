import type { Change, ChangeSource, NameMatcher } from "./types";
import { matches } from "./config";

type Rec = Record<string, unknown>;

/**
 * Structural equality limited to `depth` levels. At depth 0 (or past the limit)
 * values are compared with `Object.is`. Functions are always compared by
 * reference, as are class instances other than Date/Map/Set.
 */
export function isEqual(a: unknown, b: unknown, depth: number): boolean {
  if (Object.is(a, b)) return true;
  if (depth <= 0 || typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!isEqual(a[i], b[i], depth - 1)) return false;
    return true;
  }
  if (Array.isArray(b)) return false;
  if (a instanceof Date) return b instanceof Date && a.getTime() === b.getTime();
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !isEqual(v, b.get(k), depth - 1)) return false;
    return true;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  const pa = Object.getPrototypeOf(a);
  if ((pa !== Object.prototype && pa !== null) || Object.getPrototypeOf(b) !== pa) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!isEqual((a as Rec)[k], (b as Rec)[k], depth - 1)) return false;
  }
  return true;
}

export interface DiffOptions {
  depth: number;
  ignore: NameMatcher[];
}

/**
 * Keys whose value identity changed between two records. With `depth > 0`
 * changes whose values are deep-equal are flagged `referenceOnly`.
 */
export function diffRecords(
  source: ChangeSource,
  prev: Rec,
  next: Rec,
  { depth, ignore }: DiffOptions,
): Change[] {
  const out: Change[] = [];
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    if (ignore.length && matches(ignore, key)) return;
    const p = prev[key];
    const n = next[key];
    if (Object.is(p, n)) return;
    const change: Change = { source, key, prev: p, next: n };
    if (depth > 0 && isEqual(p, n, depth)) change.referenceOnly = true;
    out.push(change);
  };
  for (const key of Object.keys(next)) visit(key);
  for (const key of Object.keys(prev)) visit(key);
  return out;
}
