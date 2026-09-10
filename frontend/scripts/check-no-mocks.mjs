#!/usr/bin/env node
/**
 * Build gate: nothing under src/mocks may be reachable from a production path.
 *
 * src/mocks/mockAnalysisResponses.ts was a literal question-to-answer lookup
 * table -- five `q.includes(...)` branches over a hardcoded default -- whose
 * fabricated numbers were labelled "Authoritative INCOIS OSF & IMD Calibrated
 * Telemetry" with a current-wall-clock timestamp and status FORECAST. It was
 * gated behind NEXT_PUBLIC_USE_MOCKS, but because the import sat at module top
 * level webpack shipped it in the production bundle regardless: one environment
 * variable from going live.
 *
 * src/mocks/mockSSEEvents.ts was worse. lib/stream.ts fell back to replaying it
 * whenever /api/query/stream was unavailable, which is always, so every query
 * rendered a scripted agent trace with invented durations as live telemetry.
 *
 * Both are deleted. This gate stops them coming back.
 *
 * Runs as `prebuild`, so `npm run build` fails rather than quietly shipping.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const failures = [];

// 1. The directory itself must not exist.
if (existsSync(join(SRC, "mocks"))) {
  failures.push(
    "src/mocks/ exists. It held a question-to-answer lookup table labelled as " +
      "authoritative agency telemetry, and a scripted SSE replay presented as " +
      "live agent progress. Neither may return."
  );
}

// 2. Nothing may import a mock path, wherever it lives.
const IMPORT_MOCK = /(?:import|require|from)\s*\(?\s*["'][^"']*\bmocks?\/[^"']*["']/;
const MOCK_SYMBOL = /\b(getMockAnalysisResponse|getMockSSEEventsForQuery|runMockSSEReplay|mockVerdictScenarios|MOCK_BHUVAN_WMS_LAYER)\b/;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) continue;

    const rel = relative(SRC, full).replace(/\\/g, "/");
    const text = readFileSync(full, "utf8");

    for (const [i, line] of text.split("\n").entries()) {
      if (line.trimStart().startsWith("*") || line.trimStart().startsWith("//")) continue;
      if (IMPORT_MOCK.test(line)) {
        failures.push(`${rel}:${i + 1} imports a mock module: ${line.trim()}`);
      } else if (MOCK_SYMBOL.test(line)) {
        failures.push(`${rel}:${i + 1} references a mock symbol: ${line.trim()}`);
      }
    }
  }
}

walk(SRC);

if (failures.length) {
  console.error("\n  BUILD BLOCKED — mock data is reachable from a production path\n");
  for (const f of failures) console.error("   • " + f);
  console.error(
    "\n  Mock fixtures must not ship. A canned answer served to a real query is " +
      "indistinguishable from a real one to the person reading it.\n"
  );
  process.exit(1);
}

console.log("check-no-mocks: no mock module is reachable from src/");
