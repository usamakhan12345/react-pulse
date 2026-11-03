const cut = (s: string, max: number) =>
  s.length > max ? s.slice(0, Math.max(0, max - 1)) + "…" : s;

function tag(v: object): string | undefined {
  const t = (v as { $$typeof?: symbol }).$$typeof;
  if (t && typeof (v as { type?: unknown }).type !== "undefined") {
    const type = (v as { type: unknown }).type;
    return `<${typeof type === "string" ? type : ((type as { displayName?: string; name?: string })?.displayName ?? (type as { name?: string })?.name ?? "Component")} />`;
  }
  if (typeof Node !== "undefined" && v instanceof Node) {
    return `<${(v as Element).nodeName?.toLowerCase?.() ?? "node"}>`;
  }
  return undefined;
}

/** Short, single-line, never-throwing description of any value for logs and the dashboard. */
function describe(value: unknown, max = 80, depth = 2, seen?: WeakSet<object>): string {
  switch (typeof value) {
    case "string":
      return cut(JSON.stringify(value), max);
    case "bigint":
      return `${value}n`;
    case "symbol":
      return value.toString();
    case "function":
      return `ƒ ${value.name || "anonymous"}()`;
    case "object":
      break;
    default:
      return String(value);
  }
  if (value === null) return "null";
  const obj = value as object;
  const special = tag(obj);
  if (special) return special;
  if (obj instanceof Date) return isNaN(obj.getTime()) ? "Invalid Date" : obj.toISOString();
  if (obj instanceof Error) return cut(`${obj.name}: ${obj.message}`, max);
  seen ??= new WeakSet();
  if (seen.has(obj)) return "[Circular]";
  if (depth < 0) return Array.isArray(obj) ? `Array(${obj.length})` : "{…}";
  seen.add(obj);
  try {
    let out: string;
    if (Array.isArray(obj)) {
      const items: string[] = [];
      let len = 0;
      for (let i = 0; i < obj.length && len < max; i++) {
        const p = describe(obj[i], max, depth - 1, seen);
        items.push(p);
        len += p.length + 2;
      }
      out = `[${items.join(", ")}${items.length < obj.length ? ", …" : ""}]`;
    } else if (obj instanceof Map || obj instanceof Set) {
      out = `${obj instanceof Map ? "Map" : "Set"}(${obj.size})`;
    } else {
      const keys = Object.keys(obj);
      const items: string[] = [];
      let len = 0;
      for (let i = 0; i < keys.length && len < max; i++) {
        const k = keys[i] as string;
        const p = `${k}: ${describe((obj as Record<string, unknown>)[k], max, depth - 1, seen)}`;
        items.push(p);
        len += p.length + 2;
      }
      out = items.length
        ? `{ ${items.join(", ")}${items.length < keys.length ? ", …" : ""} }`
        : "{}";
    }
    return cut(out, max);
  } finally {
    seen.delete(obj);
  }
}

export function preview(value: unknown, max = 80, depth = 2): string {
  try {
    return describe(value, max, depth);
  } catch {
    return "[unreadable]";
  }
}

export interface SerializeOptions {
  depth?: number;
  maxItems?: number;
  maxString?: number;
}

/**
 * Converts any value into JSON-safe data. Values JSON cannot express
 * (undefined, NaN, functions, bigint, symbols, cycles, class instances beyond
 * their own enumerable keys) become descriptive strings or `{ __type }` objects.
 */
export function toJSONSafe(value: unknown, options: SerializeOptions = {}): unknown {
  const { depth = 4, maxItems = 50, maxString = 500 } = options;
  const stack = new WeakSet<object>();
  const walk = (v: unknown, d: number): unknown => {
    switch (typeof v) {
      case "string":
        return v.length > maxString ? v.slice(0, maxString) + "…" : v;
      case "number":
        return Number.isFinite(v) ? v : `[${String(v)}]`;
      case "boolean":
        return v;
      case "undefined":
        return "[undefined]";
      case "bigint":
        return `[BigInt ${v}]`;
      case "symbol":
        return `[${v.toString()}]`;
      case "function":
        return `[Function ${v.name || "anonymous"}]`;
    }
    if (v === null) return null;
    const obj = v as object;
    const special = tag(obj);
    if (special) return special;
    if (obj instanceof Date) return isNaN(obj.getTime()) ? "[Invalid Date]" : obj.toISOString();
    if (obj instanceof Error) return { __type: obj.name, message: obj.message };
    if (stack.has(obj)) return "[Circular]";
    if (d <= 0) return Array.isArray(obj) ? `[Array(${obj.length})]` : "[Object]";
    stack.add(obj);
    try {
      if (Array.isArray(obj)) {
        const out = obj.slice(0, maxItems).map((x) => walk(x, d - 1));
        if (obj.length > maxItems) out.push(`[+${obj.length - maxItems} more]`);
        return out;
      }
      if (obj instanceof Map) {
        return {
          __type: "Map",
          entries: [...obj].slice(0, maxItems).map(([k, x]) => [walk(k, d - 1), walk(x, d - 1)]),
        };
      }
      if (obj instanceof Set) {
        return { __type: "Set", values: [...obj].slice(0, maxItems).map((x) => walk(x, d - 1)) };
      }
      const out: Record<string, unknown> = {};
      const keys = Object.keys(obj);
      for (const k of keys.slice(0, maxItems))
        out[k] = walk((obj as Record<string, unknown>)[k], d - 1);
      if (keys.length > maxItems) out["[truncated]"] = `+${keys.length - maxItems} keys`;
      return out;
    } finally {
      stack.delete(obj);
    }
  };
  return walk(value, depth);
}
