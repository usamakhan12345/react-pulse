// Post-build check of the published surface: every entry loads as ESM and as
// CommonJS, exposes what the type declarations promise, keeps the
// "use client" directive, and the dashboard resolves to a stub under the
// "production" export condition. Run after `npm run build`.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
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

console.log(
  `${pkg.name}@${pkg.version}: ESM + CJS exports, shared store, "use client", production stub OK`,
);
