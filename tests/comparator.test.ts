import { describe, expect, it } from "vitest";
import { diffRecords, isEqual } from "../src/core/comparator";

describe("isEqual", () => {
  it("compares by reference at depth 0", () => {
    expect(isEqual(1, 1, 0)).toBe(true);
    expect(isEqual(NaN, NaN, 0)).toBe(true);
    expect(isEqual({ a: 1 }, { a: 1 }, 0)).toBe(false);
  });

  it("compares plain objects and arrays structurally within depth", () => {
    expect(isEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, 3)).toBe(true);
    expect(isEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }, 3)).toBe(false);
    expect(isEqual([1, 2], [1, 2, 3], 2)).toBe(false);
    expect(isEqual([], {}, 2)).toBe(false);
  });

  it("stops at the configured depth and falls back to identity", () => {
    const a = { l1: { l2: { l3: 1 } } };
    const b = { l1: { l2: { l3: 1 } } };
    expect(isEqual(a, b, 3)).toBe(true);
    expect(isEqual(a, b, 2)).toBe(false);
  });

  it("handles Date, Map and Set", () => {
    expect(isEqual(new Date(5), new Date(5), 1)).toBe(true);
    expect(isEqual(new Date(5), new Date(6), 1)).toBe(false);
    expect(isEqual(new Map([[1, { a: 1 }]]), new Map([[1, { a: 1 }]]), 2)).toBe(true);
    expect(isEqual(new Map([[1, 1]]), new Map([[1, 2]]), 2)).toBe(false);
    expect(isEqual(new Set([1, 2]), new Set([2, 1]), 1)).toBe(true);
    expect(isEqual(new Set([1]), new Set([2]), 1)).toBe(false);
  });

  it("never compares functions or class instances structurally", () => {
    expect(
      isEqual(
        () => 1,
        () => 1,
        3,
      ),
    ).toBe(false);
    class P {
      x = 1;
    }
    expect(isEqual(new P(), new P(), 3)).toBe(false);
  });

  it("terminates on cyclic structures because depth is bounded", () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    const b: Record<string, unknown> = {};
    b.self = b;
    expect(isEqual(a, b, 4)).toBe(false);
  });
});

describe("diffRecords", () => {
  const opts = { depth: 0, ignore: [] };

  it("reports changed, added and removed keys", () => {
    const changes = diffRecords("props", { a: 1, b: 2, c: 3 }, { a: 1, b: 5, d: 4 }, opts);
    expect(changes.map((c) => [c.key, c.prev, c.next])).toEqual([
      ["b", 2, 5],
      ["d", undefined, 4],
      ["c", 3, undefined],
    ]);
  });

  it("skips ignored keys (strings and regular expressions)", () => {
    const changes = diffRecords(
      "props",
      { a: 1, children: 1, _x: 1 },
      { a: 2, children: 2, _x: 2 },
      {
        depth: 0,
        ignore: ["children", /^_/],
      },
    );
    expect(changes.map((c) => c.key)).toEqual(["a"]);
  });

  it("flags identity-only changes when depth > 0", () => {
    const changes = diffRecords(
      "props",
      { o: { x: 1 }, p: { x: 1 } },
      { o: { x: 1 }, p: { x: 2 } },
      {
        depth: 2,
        ignore: [],
      },
    );
    expect(changes.find((c) => c.key === "o")?.referenceOnly).toBe(true);
    expect(changes.find((c) => c.key === "p")?.referenceOnly).toBeUndefined();
  });
});
