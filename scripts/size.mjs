// Measures the built package the way a consumer's bundler would see it:
// each scenario is bundled from dist/ with esbuild (tree-shaking + minify,
// react kept external) and the output is gzipped / brotli-compressed.
// Run `npm run build` first.
import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = (f) => resolve(root, "dist", f);
if (!existsSync(dist("index.js"))) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const scenarios = [
  [
    "Core: useRenderTracker only",
    `export { useRenderTracker } from ${JSON.stringify(dist("index.js"))};`,
  ],
  [
    "Core: useWhyDidYouRender",
    `export { useWhyDidYouRender } from ${JSON.stringify(dist("index.js"))};`,
  ],
  ["Core: usePrevious only", `export { usePrevious } from ${JSON.stringify(dist("index.js"))};`],
  [
    "Core: usePerformanceTracker",
    `export { usePerformanceTracker } from ${JSON.stringify(dist("index.js"))};`,
  ],
  [
    "Core: all six hooks",
    `export { useRenderTracker, useWhyDidYouRender, usePrevious, useMountTracker, usePerformanceTracker, useTrackedState } from ${JSON.stringify(dist("index.js"))};`,
  ],
  [
    "Core: <ReactPulse> provider (dashboard not included)",
    `export { ReactPulse } from ${JSON.stringify(dist("index.js"))};`,
  ],
  [
    "Core: export/import reports",
    `export { exportReport, importReport } from ${JSON.stringify(dist("index.js"))};`,
  ],
  ["Core: everything (import *)", `export * from ${JSON.stringify(dist("index.js"))};`],
  ["Devtools: dashboard chunk (lazy)", `export * from ${JSON.stringify(dist("devtools.js"))};`],
  [
    "React Native: useRenderTracker via /native",
    `export { useRenderTracker } from ${JSON.stringify(dist("native.js"))};`,
  ],
  [
    "React Native: <ReactPulse> + native dashboard",
    `export { ReactPulse } from ${JSON.stringify(dist("native.js"))};`,
  ],
  [
    "Production stub (replaces devtools)",
    `export * from ${JSON.stringify(dist("devtools-stub.js"))};`,
  ],
];

const kb = (n) => `${(n / 1024).toFixed(2)} KB`;
const rows = [];
for (const [name, contents] of scenarios) {
  const { outputFiles } = await build({
    stdin: { contents, resolveDir: root, loader: "js" },
    bundle: true,
    minify: true,
    treeShaking: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-native",
      "reactpulse-devtools/devtools",
    ],
    define: { "process.env.NODE_ENV": '"production"' },
    write: false,
    logLevel: "error",
  });
  const code = Buffer.from(outputFiles[0].contents);
  rows.push({
    scenario: name,
    minified: kb(code.length),
    gzip: kb(gzipSync(code, { level: 9 }).length),
    brotli: kb(brotliCompressSync(code).length),
  });
}

const w = (key) => Math.max(key.length, ...rows.map((r) => r[key].length));
const cols = ["scenario", "minified", "gzip", "brotli"];
const pad = (s, n) => s.padEnd(n);
console.log(cols.map((c) => pad(c, w(c))).join("  "));
console.log(cols.map((c) => "-".repeat(w(c))).join("  "));
for (const r of rows) console.log(cols.map((c) => pad(r[c], w(c))).join("  "));

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
console.log(`\nreactpulse@${pkg.version} (react / react-dom excluded, NODE_ENV=production)`);
