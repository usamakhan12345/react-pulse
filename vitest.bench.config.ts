import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^reactpulse-devtools\/devtools(\/full)?$/,
        replacement: src("./src/devtools/index.ts"),
      },
      { find: /^react-native$/, replacement: src("./tests/stubs/react-native.tsx") },
      { find: /^reactpulse-devtools\/native$/, replacement: src("./src/native/index.ts") },
      { find: /^reactpulse-devtools$/, replacement: src("./src/index.ts") },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["bench/**/*.bench.{ts,tsx}"],
    testTimeout: 120_000,
  },
});
