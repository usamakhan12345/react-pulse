// Post-build check of the published surface: every entry loads as ESM and as
// CommonJS, exposes what the type declarations promise, keeps the
// "use client" directive, and the dashboard resolves to a stub under the
// "production" export condition. Run after `npm run build`.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = (f) => resolve(root, "dist", f);
const require = createRequire(import.meta.url);

const CORE = [
  "ReactPulse",
  "useRenderTracker",
  "useWhyDidYouRender",
  "usePrevious",
  "useMountTracker",
  "usePerformanceTracker",
  "useTrackedState",
  "useLeakTracker",
  "PulseProfiler",
  "createLeakScope",
  "exportReport",
  "exportReportJSON",
  "downloadReport",
  "importReport",
  "configurePulse",
  "enablePulse",
  "disablePulse",
];

const esm = await import(pathToFileURL(dist("index.js")).href);
const cjs = require(dist("index.cjs"));
for (const name of CORE) {
  assert.equal(typeof esm[name], "function", `ESM export missing: ${name}`);
  assert.equal(typeof cjs[name], "function", `CJS export missing: ${name}`);
}

// ESM and CJS copies must share one store (dual package hazard).
assert.equal(esm.getPulseStore(), cjs.getPulseStore(), "ESM and CJS builds use different stores");

const dev = await import(pathToFileURL(dist("devtools.js")).href);
assert.equal(typeof dev.DevtoolsRoot, "function");
assert.equal(typeof dev.Dashboard, "function");

for (const f of ["index.js", "index.cjs", "devtools.js", "devtools.cjs"]) {
  assert.ok(
    readFileSync(dist(f), "utf8").startsWith('"use client"'),
    `${f} lost its "use client" directive`,
  );
}

// Resolve through package.json "exports" the way a bundler would.
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const probe = (conditions) =>
  execFileSync(
    process.execPath,
    [
      ...conditions.flatMap((c) => ["--conditions", c]),
      "--input-type=module",
      "-e",
      `import * as m from "reactpulse-devtools/devtools"; console.log(Object.keys(m).join(","), m.DevtoolsRoot.toString().length)`,
    ],
    { cwd: root, encoding: "utf8" },
  ).trim();

// Self-reference needs the package name; Node resolves it from the package's own root.
const full = probe([]);
const stub = probe(["production"]);
assert.match(full, /Dashboard/);
const [, fullLen] = full.split(" ");
const [, stubLen] = stub.split(" ");
assert.ok(
  Number(stubLen) < 60 && Number(fullLen) > 60,
  "production condition did not resolve to the stub",
);

// ---- React Native entry --------------------------------------------------
// react-native cannot be imported in plain Node (Flow syntax, native modules), so load the
// CommonJS build against a throwaway stub placed on NODE_PATH. This proves the entry
// resolves, only requires react / react-native, and exposes the native API.
const stubRoot = mkdtempSync(join(tmpdir(), "rp-rn-stub-"));
mkdirSync(join(stubRoot, "react-native"), { recursive: true });
writeFileSync(
  join(stubRoot, "react-native", "index.js"),
  `const C = () => null; module.exports = { View: C, Text: C, Pressable: C, ScrollView: C, TextInput: C, FlatList: C,
    StyleSheet: { create: (s) => s, absoluteFill: {}, hairlineWidth: 1 }, Platform: { OS: "ios" },
    useColorScheme: () => "light", useWindowDimensions: () => ({ width: 390, height: 844 }),
    Share: { share: async () => ({}) }, DevSettings: undefined };`,
);
const NATIVE_API = [...CORE, "PulseDevtools", "PulseDashboard"];
const checkNative = (specifier, conditions = []) =>
  execFileSync(
    process.execPath,
    [
      ...conditions.flatMap((c) => ["--conditions", c]),
      "-e",
      `const m = require(${JSON.stringify(specifier)});
       const missing = ${JSON.stringify(NATIVE_API)}.filter((k) => typeof m[k] !== "function");
       console.log(missing.length ? "MISSING:" + missing.join(",") : "ok");`,
    ],
    { cwd: root, encoding: "utf8", env: { ...process.env, NODE_PATH: stubRoot } },
  ).trim();

assert.equal(checkNative(dist("native.cjs")), "ok", "dist/native.cjs is missing exports");
assert.equal(
  checkNative(`${pkg.name}/native`),
  "ok",
  `${pkg.name}/native does not resolve to the native build`,
);
// Metro resolves the "react-native" condition for the package root: same import, native build.
assert.equal(
  checkNative(pkg.name, ["react-native"]),
  "ok",
  `${pkg.name} with the react-native condition did not resolve to the native build`,
);
const nativeSource = readFileSync(dist("native.js"), "utf8");
assert.ok(!nativeSource.startsWith('"use client"'), "native build must not carry the web banner");
assert.ok(
  !nativeSource.includes(`${pkg.name}/devtools`),
  "native build must not reference the web dashboard",
);
const nativeImports = [...nativeSource.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
for (const spec of new Set(nativeImports)) {
  assert.ok(
    ["react", "react/jsx-runtime", "react-native"].includes(spec),
    `native build imports unexpected module: ${spec}`,
  );
}
rmSync(stubRoot, { recursive: true, force: true });

console.log(
  `${pkg.name}@${pkg.version}: ESM + CJS exports, shared store, "use client", production stub, React Native entry OK`,
);
