import { defineConfig } from "tsup";

const shared = {
  format: ["esm", "cjs"] as ("esm" | "cjs")[],
  target: "es2020",
  sourcemap: true,
  // tsup's rollup "treeshake" pass strips the "use client" banner; esbuild already
  // tree-shakes the bundle and consumers' bundlers do the rest.
  treeshake: false,
  splitting: false,
  external: ["react", "react-dom", "react/jsx-runtime", "reactpulse/devtools"],
  // Hooks and the provider only make sense on the client; this also makes the
  // package importable from Next.js App Router client boundaries.
  banner: { js: '"use client";' },
};

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    dts: true,
    clean: true,
    minify: false,
  },
  {
    ...shared,
    entry: { devtools: "src/devtools/index.ts" },
    dts: true,
    clean: false,
  },
  {
    // Resolved instead of the dashboard under the "production" export condition.
    ...shared,
    entry: { "devtools-stub": "src/devtools/stub.ts" },
    dts: false,
    clean: false,
  },
]);
