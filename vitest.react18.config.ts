import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const compat = (p: string) => src(`./compat/react18/node_modules/${p}`);

// Runs the same suite against React 18. Everything React-related is resolved
// from compat/react18 so that react, react-dom and Testing Library all share
// one physical copy (aliasing alone would not reach inside node_modules).
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^reactpulse-devtools\/devtools(\/full)?$/,
        replacement: src("./src/devtools/index.ts"),
      },
      { find: /^reactpulse-devtools$/, replacement: src("./src/index.ts") },
      { find: /^react$/, replacement: compat("react") },
      { find: /^react\/(.*)$/, replacement: compat("react") + "/$1" },
      { find: /^react-dom$/, replacement: compat("react-dom") },
      { find: /^react-dom\/(.*)$/, replacement: compat("react-dom") + "/$1" },
      { find: /^@testing-library\/react$/, replacement: compat("@testing-library/react") },
      {
        find: /^@testing-library\/user-event$/,
        replacement: compat("@testing-library/user-event"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    env: { REACTPULSE_TEST_REACT: "18" },
  },
});
