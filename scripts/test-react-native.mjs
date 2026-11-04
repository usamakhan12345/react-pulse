// Checks the React Native entry against the REAL react-native package (not a stub):
//   1. Jest + react-test-renderer: the packed package runs with real View/Text/Pressable/FlatList/TextInput/Share
//   2. Metro: bundles for Android and iOS (release, minified) through both import paths
//      ("reactpulse-devtools" via the "react-native" export condition, and "reactpulse-devtools/native")
//   3. Hermes: the release bundles compile to bytecode
//   4. TypeScript: the native sources type-check against react-native's own type definitions
//
// It installs react-native (~900 packages) into compat/react-native the first time, so it is not part of
// `npm run verify`. Run it with `npm run test:native-real`. It does NOT run on a device or simulator.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compat = join(root, "compat", "react-native");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const out = join(compat, "out");

const run = (command, args, cwd, label) => {
  console.log(`\n$ ${[command, ...args].join(" ")}   (${label})`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label} (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
};

// 0. build + pack the package exactly as it would be published
if (!process.argv.includes("--no-build")) run("npm", ["run", "build"], root, "build the package");
rmSync(join(compat, ".pack"), { recursive: true, force: true });
mkdirSync(join(compat, ".pack"), { recursive: true });
run("npm", ["pack", "--pack-destination", join(compat, ".pack")], root, "pack the package");
const tarball = join(compat, ".pack", `${pkg.name}-${pkg.version}.tgz`);
assert.ok(existsSync(tarball), `tarball not found: ${tarball}`);

// install real react-native + tooling, then the freshly packed tarball
rmSync(join(compat, "node_modules", pkg.name), { recursive: true, force: true });
run(
  "npm",
  ["install", "--no-audit", "--no-fund", "--no-save", `"${tarball}"`],
  compat,
  "install react-native and the packed package",
);

// 1. Jest with real React Native components
run("npx", ["jest", "--silent"], compat, "Jest against real React Native");

// 2. Metro bundles
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const bundles = [
  ["entry-native.js", "android", "native-android.js"],
  ["entry-root.js", "android", "root-android.js"],
  ["entry-root.js", "ios", "root-ios.js"],
];
for (const [entry, platform, file] of bundles) {
  run(
    "node",
    ["bundle.js", entry, platform, "false", join("out", file)],
    compat,
    `Metro release bundle: ${entry} (${platform})`,
  );
}
for (const [, , file] of bundles) {
  const code = readFileSync(join(out, file), "utf8");
  assert.ok(code.includes("ReactPulse: toggle panel"), `${file}: native build was not bundled`);
  assert.ok(
    !code.includes("rp-toolbar"),
    `${file}: web dashboard code leaked into the React Native bundle`,
  );
  assert.ok(
    !code.includes("loadDevtools"),
    `${file}: web provider leaked into the React Native bundle`,
  );
}
console.log("\nMetro bundles contain the native build and no web dashboard code.");

// 3. Hermes bytecode
const hermesBin = {
  win32: ["win64-bin", "hermesc.exe"],
  darwin: ["osx-bin", "hermesc"],
  linux: ["linux64-bin", "hermesc"],
}[process.platform];
const hermesc =
  hermesBin && join(compat, "node_modules", "hermes-compiler", "hermesc", ...hermesBin);
if (hermesc && existsSync(hermesc)) {
  for (const [, , file] of bundles) {
    const log = spawnSync(
      `"${hermesc}"`,
      ["-emit-binary", "-O", "-out", `"${join(out, file + ".hbc")}"`, `"${join(out, file)}"`],
      { shell: true, encoding: "utf8" },
    );
    assert.equal(
      log.status,
      0,
      `Hermes failed to compile ${file}:\n${(log.stdout ?? "").slice(0, 600)}\n${(log.stderr ?? "").slice(0, 600)}`,
    );
    assert.ok(!/: error:/.test(`${log.stdout}${log.stderr}`), `Hermes reported errors for ${file}`);
    console.log(`Hermes compiled ${file}`);
  }
} else {
  console.warn("\nHermes compiler not found for this platform; skipped the Hermes check.");
}

// 4. Types against react-native's real definitions
run("npx", ["tsc", "-p", "tsconfig.json"], compat, "type-check against real react-native types");

console.log(
  `\nAll React Native checks passed for ${pkg.name}@${pkg.version} (react-native 0.88.1). Not run on a device.`,
);
