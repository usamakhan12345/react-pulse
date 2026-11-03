// Runs as the npm "version" lifecycle step: copies the freshly bumped
// package.json version into src/utils/environment.ts so `VERSION` never drifts.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const file = resolve(root, "src/utils/environment.ts");
const source = readFileSync(file, "utf8");
if (!/export const VERSION = ".*";/.test(source)) {
  console.error("Could not find the VERSION constant in src/utils/environment.ts");
  process.exit(1);
}
writeFileSync(
  file,
  source.replace(/export const VERSION = ".*";/, `export const VERSION = "${version}";`),
);
console.log(`VERSION synced to ${version}`);
