import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^reactpulse\/devtools(\/full)?$/, replacement: src("./src/devtools/index.ts") },
      { find: /^reactpulse$/, replacement: src("./src/index.ts") },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["bench/**/*.bench.{ts,tsx}"],
    testTimeout: 120_000,
  },
});
