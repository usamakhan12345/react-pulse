import { describe, expect, it } from "vitest";
import { preview, toJSONSafe } from "../src/utils/serialize";

describe("preview", () => {
  it("describes primitives and special values", () => {
    expect(preview("hi")).toBe('"hi"');
    expect(preview(42)).toBe("42");
    expect(preview(undefined)).toBe("undefined");
    expect(preview(null)).toBe("null");
    expect(preview(10n)).toBe("10n");
    expect(preview(function named() {})).toBe("ƒ named()");
    expect(preview(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
    expect(preview(new Error("boom"))).toBe("Error: boom");
    expect(preview(new Map([[1, 2]]))).toBe("Map(1)");
  });

  it("describes nested structures compactly and truncates", () => {
    expect(preview({ a: 1, b: [1, 2] })).toBe("{ a: 1, b: [1, 2] }");
    expect(preview("x".repeat(500), 20).length).toBeLessThanOrEqual(20);
    expect(preview({ a: { b: { c: { d: 1 } } } })).toContain("{…}");
  });

  it("survives cycles and throwing getters", () => {
    const o: Record<string, unknown> = { a: 1 };
    o.self = o;
    expect(preview(o)).toContain("[Circular]");
    const bad = {
      get boom() {
        throw new Error("nope");
      },
    };
    expect(() => preview(bad)).not.toThrow();
  });
});

describe("toJSONSafe", () => {
  it("round-trips through JSON.stringify without throwing", () => {
    const cyc: Record<string, unknown> = {
      n: NaN,
      u: undefined,
      f() {},
      big: 5n,
      sym: Symbol("s"),
    };
    cyc.self = cyc;
    const out = toJSONSafe({ cyc, d: new Date(0), m: new Map([["k", 1]]), s: new Set([1]) });
    expect(() => JSON.stringify(out)).not.toThrow();
    const json = JSON.parse(JSON.stringify(out));
    expect(json.cyc.n).toBe("[NaN]");
    expect(json.cyc.u).toBe("[undefined]");
    expect(json.cyc.f).toBe("[Function f]");
    expect(json.cyc.self).toBe("[Circular]");
    expect(json.d).toBe("1970-01-01T00:00:00.000Z");
    expect(json.m).toEqual({ __type: "Map", entries: [["k", 1]] });
  });

  it("limits depth, array length and string length", () => {
    expect(toJSONSafe({ a: { b: { c: 1 } } }, { depth: 2 })).toEqual({ a: { b: "[Object]" } });
    expect(toJSONSafe([1, 2, 3, 4], { maxItems: 2 })).toEqual([1, 2, "[+2 more]"]);
    expect((toJSONSafe("x".repeat(50), { maxString: 10 }) as string).length).toBe(11);
  });
});
