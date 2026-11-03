import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The demo imports the library straight from source so edits show up instantly.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^reactpulse\/devtools(\/full)?$/, replacement: src("../../src/devtools/index.ts") },
      { find: /^reactpulse$/, replacement: src("../../src/index.ts") },
    ],
  },
});
