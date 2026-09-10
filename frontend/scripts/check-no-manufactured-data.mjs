#!/usr/bin/env node
/**
 * Build gate: the UI must not manufacture data the backend did not send.
 *
 * Three classes of defect, all found in the audit and all fixed:
 *
 *   1. An affirmative all-clear built from missing data.
 *      ConditionsGrid printed (alert_level || "Green") and
 *      (storm_warning || "No active warning") under an "IMD" heading, so an
 *      absent alert rendered as a green all-clear from a national agency that
 *      ORCA has no adapter for.
 *
 *   2. Fabricated measurements and law.
 *      MapView filled every missing popup field with a plausible default --
 *      suitability 85/100, chlorophyll 1.2, SST 28.4, depth 35 m -- and two of
 *      them invented law: "Strict No-Take Zone / Transit Prohibited" and
 *      "Authority: Wildlife Protection Act 1972".
 *
 *   3. Threshold judgements computed in the browser.
 *      RouteAnalysisCard mapped a band to a made-up score (LOW->18) and fed it
 *      to an ARIA meter as "score 18 out of 100". SummaryTable classified sea
 *      state, SST and visibility against its own cut points and manufactured a
 *      go/no-go instruction from a band string.
 *
 * Runs as `prebuild`. A grep gate is crude, but these are render-path defects
 * with no unit-test seam, and the patterns are distinctive enough to catch a
 * reintroduction.
 */
import { readFileSync } from "node:fs";

const CHECKS = [
  {
    file: "src/components/Results/ConditionsGrid.tsx",
    forbid: [
      { re: /alert_?[Ll]evel\s*\|\|\s*["']Green["']/, why: 'absent alert level defaulting to "Green"' },
      { re: /storm_warning\s*\|\|\s*["']No active warning["']/, why: 'absent warning defaulting to "No active warning"' },
      { re: /<span>IMD<\/span>/, why: "hardcoded IMD attribution over data IMD did not produce" },
    ],
  },
  {
    file: "src/components/MapView.tsx",
    forbid: [
      { re: /properties\.suitability\s*\|\|\s*\d/, why: "fabricated suitability score" },
      { re: /properties\.chlorophyll\s*\|\|\s*["']/, why: "fabricated chlorophyll value" },
      { re: /properties\.sst_c\s*\|\|\s*["']/, why: "fabricated sea surface temperature" },
      { re: /properties\.depth_m\s*\|\|\s*["']/, why: "fabricated depth" },
      { re: /properties\.sea_state\s*\|\|\s*["']/, why: "fabricated sea state" },
      { re: /properties\.risk_level\s*\|\|\s*["']/, why: "fabricated hazard category" },
      { re: /properties\.designation\s*\|\|\s*["']/, why: "fabricated legal designation" },
      { re: /properties\.restriction\s*\|\|\s*["']/, why: "fabricated legal restriction" },
      { re: /properties\.authority\s*\|\|\s*["']/, why: "fabricated statutory citation" },
      { re: /properties\.risk\s*\|\|\s*["']LOW["']/, why: "absent risk defaulting to LOW" },
      { re: /INCOIS/, why: "hardcoded INCOIS attribution on an ORCA-derived layer" },
    ],
  },
  {
    file: "src/components/Results/RouteAnalysisCard.tsx",
    forbid: [
      { re: /scoreMap/, why: "band-to-score table inventing a corridor risk score" },
      { re: /LOW:\s*18/, why: "hardcoded risk score the engine never produced" },
    ],
  },
  {
    file: "src/components/Results/SummaryTable.tsx",
    forbid: [
      { re: /["']Safe for Normal Navigation["']\s*(?!:)/, why: "go/no-go instruction manufactured from a band string" },
      { re: /significant_wave_height_m\s*<=\s*1\.5/, why: "client-side sea state threshold" },
      { re: /sea_surface_temp_c\s*>=\s*27/, why: "client-side SST threshold" },
      { re: /visibility_km\s*>=\s*8/, why: "client-side visibility threshold" },
    ],
  },
];

const base = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const failures = [];

for (const { file, forbid } of CHECKS) {
  let text;
  try {
    text = readFileSync(base + file, "utf8");
  } catch {
    continue; // file moved or deleted; not this gate's business
  }
  // Comments describe these defects on purpose, so scan code only. Blank the
  // comment bodies but keep every newline, so line numbers stay truthful.
  const blankKeepingLines = (m) => m.replace(/[^\n]/g, " ");
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, blankKeepingLines)
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));

  const codeLines = code.split("\n");
  const rawLines = text.split("\n");
  for (const [i, line] of codeLines.entries()) {
    for (const { re, why } of forbid) {
      if (re.test(line)) {
        failures.push(`${file}:${i + 1}  ${why}\n      ${rawLines[i].trim().slice(0, 110)}`);
      }
    }
  }
}

if (failures.length) {
  console.error("\n  BUILD BLOCKED — the UI is manufacturing data the backend did not send\n");
  for (const f of failures) console.error("   • " + f);
  console.error(
    "\n  A value ORCA did not measure must say so. An agency name must never\n" +
      "  appear beside a value that agency did not produce.\n"
  );
  process.exit(1);
}

console.log("check-no-manufactured-data: no fabricated defaults or client-side thresholds");
