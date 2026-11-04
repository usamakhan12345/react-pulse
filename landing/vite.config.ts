import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The landing page imports the library straight from source, so the live demo
// on the page is the real dashboard and the real hooks.
export default defineConfig({
  base: "./", // relative assets: works on GitHub Pages project sites and any static host
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^reactpulse-devtools\/devtools(\/full)?$/,
        replacement: src("../src/devtools/index.ts"),
      },
      { find: /^reactpulse-devtools$/, replacement: src("../src/index.ts") },
    ],
  },
  build: { outDir: "dist", emptyOutDir: true },
});
