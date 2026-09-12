#!/usr/bin/env node
/**
 * Copy the frozen reference captures from docs/examples/ into src/captures/.
 *
 * The web app is built against the verbatim API output, never against a
 * running backend. The copies are what the bundle imports; this script keeps
 * them byte-identical to the contract's own captures. `--check` (run as part
 * of prebuild) fails if the two have drifted, so a capture cannot be "fixed"
 * by hand on the web side.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..", "docs", "examples");
const DST = join(HERE, "..", "src", "captures");
const CHECK = process.argv.includes("--check");

if (!existsSync(SRC)) {
  console.error(`sync-captures: ${SRC} not found (run from inside the repository)`);
  process.exit(1);
}
mkdirSync(DST, { recursive: true });

let drift = 0;
for (const name of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const want = readFileSync(join(SRC, name), "utf8");
  const dst = join(DST, name);
  const have = existsSync(dst) ? readFileSync(dst, "utf8") : null;
  if (have === want) continue;
  if (CHECK) {
    console.error(`sync-captures: src/captures/${name} differs from docs/examples/${name}`);
    drift++;
  } else {
    writeFileSync(dst, want);
    console.log(`sync-captures: copied ${name}`);
  }
}
if (drift) {
  console.error("\n  Run `npm run sync:captures` to refresh the copies. Never edit src/captures/ by hand.\n");
  process.exit(1);
}
if (CHECK) console.log("sync-captures: src/captures/ matches docs/examples/");
