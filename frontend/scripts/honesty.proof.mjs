#!/usr/bin/env node
/**
 * Proof tests for the honesty suite. A gate nobody has seen fail is not a gate.
 *
 * For every check, this reintroduces the violation into the real tree, runs the
 * real `check-honesty.mjs` as a subprocess, and asserts it exits non-zero and
 * names the right rule -- then removes the violation and asserts it exits zero
 * again. Nothing is stubbed: if the scanner stops walking src/, or the rule
 * regexes stop matching, or someone allowlists a whole directory, these fail.
 *
 * Run:  npm run check:honesty:proof
 *
 * Restores the tree in a `finally`, and refuses to run at all if the tree is
 * not already clean, so an interrupted run cannot leave a probe behind.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const CHECK = join(ROOT, "scripts", "check-honesty.mjs");
const PROBE = join(SRC, "__honesty_probe__.tsx");

const run = () => {
  const r = spawnSync(process.execPath, [CHECK], { encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

let passed = 0;
const failures = [];

function check(name, expectRule, mutate, restore) {
  try {
    mutate();
    const bad = run();
    if (bad.code === 0) {
      failures.push(`${name}: violation reintroduced but the gate PASSED`);
      return;
    }
    if (expectRule && !bad.out.includes(expectRule)) {
      failures.push(
        `${name}: gate failed, but did not name rule "${expectRule}".\n` +
          `        output: ${bad.out.trim().split("\n").slice(0, 4).join(" | ")}`
      );
      return;
    }
  } finally {
    restore();
  }

  const good = run();
  if (good.code !== 0) {
    failures.push(
      `${name}: violation removed but the gate STILL FAILS -- it is firing on ` +
        `something else.\n        output: ${good.out.trim().split("\n").slice(0, 6).join(" | ")}`
    );
    return;
  }
  console.log(`  seen to fail, and to pass again:  ${name}`);
  passed++;
}

/** A probe file dropped into src/, which the scanner walks like any other. */
function probeCheck(name, expectRule, body) {
  check(
    name,
    expectRule,
    () => writeFileSync(PROBE, body, "utf8"),
    () => rmSync(PROBE, { force: true })
  );
}

/** Temporarily append a violating line to a real file. */
function fileCheck(name, expectRule, relFile, line) {
  const abs = join(ROOT, relFile);
  let original;
  check(
    name,
    expectRule,
    () => {
      original = readFileSync(abs, "utf8");
      writeFileSync(abs, original + "\n" + line + "\n", "utf8");
    },
    () => {
      if (original !== undefined) writeFileSync(abs, original, "utf8");
    }
  );
}

// ---------------------------------------------------------------------------

const clean = run();
if (clean.code !== 0) {
  console.error(
    "\n  The honesty suite is already failing on an unmodified tree, so these " +
      "proofs would prove nothing. Fix the findings first:\n"
  );
  console.error(clean.out);
  process.exit(1);
}

console.log("\nhonesty proof tests\n");

probeCheck(
  "a || default supplying a measurement",
  "default-supplies-a-value",
  'export const x = (o: any) => o.significant_wave_height_m || 1.5;\n'
);

probeCheck(
  "a ?? default supplying a risk score (the RiskGauge defect)",
  "default-supplies-a-value",
  'export const x = (r: any) => Math.round(Number(r.score) || 0);\n'
);

probeCheck(
  "a presence ternary falling back to a literal",
  "default-supplies-a-value",
  'export const x = (p: any) => (p.sst_c ? p.sst_c : 28.4);\n'
);

probeCheck(
  "a client-side threshold judgement",
  "client-side-threshold",
  'export const x = (o: any) => (o.suitability_score >= 70 ? "good" : "bad");\n'
);

probeCheck(
  "a hardcoded agency name",
  "hardcoded-agency",
  'export const x = () => "INCOIS Wave Energy Envelope";\n'
);

probeCheck(
  "a hardcoded statutory citation",
  "hardcoded-legal-text",
  'export const x = () => "Authority: Wildlife Protection Act 1972";\n'
);

probeCheck(
  "an import reaching a mock module",
  "mock-import",
  'import { getMockAnalysisResponse } from "../mocks/mockAnalysisResponses";\nexport const x = getMockAnalysisResponse;\n'
);

check(
  "src/mocks/ reappearing at all",
  "mock-import",
  () => {
    mkdirSync(join(SRC, "mocks"), { recursive: true });
    writeFileSync(join(SRC, "mocks", "mockThing.ts"), "export const a = 1;\n", "utf8");
  },
  () => rmSync(join(SRC, "mocks"), { recursive: true, force: true })
);

// The named P0 regressions, each restored into the file it was removed from.
fileCheck(
  "P0-7 ConditionsGrid: alert level defaulting to Green",
  "P0-7",
  "src/components/Results/ConditionsGrid.tsx",
  'const _probe = (w: any) => (w.alert_level || "Green");'
);

fileCheck(
  "P0-7 MapView: fabricated chlorophyll in a popup",
  "P0-7",
  "src/components/MapView.tsx",
  'const _probe = (properties: any) => `${properties.chlorophyll || "1.2"}`;'
);

fileCheck(
  "P0-7 MapView: an invented statutory citation",
  "P0-7",
  "src/components/MapView.tsx",
  'const _probe = (properties: any) => `${properties.authority || "Wildlife Protection Act 1972"}`;'
);

fileCheck(
  "P0-7 RouteAnalysisCard: the band-to-score table",
  "P0-7",
  "src/components/Results/RouteAnalysisCard.tsx",
  "const scoreMap = { LOW: 18, MODERATE: 30 };"
);

fileCheck(
  "P0-7 SummaryTable: a client-side sea state cut point",
  "P0-7",
  "src/components/Results/SummaryTable.tsx",
  "const _probe = (o: any) => o.significant_wave_height_m <= 1.5;"
);

fileCheck(
  "P0-5 stream.ts: the SSE mock replay",
  "P0-5",
  "src/lib/stream.ts",
  "const _probe = () => runMockSSEReplay();"
);

// ---------------------------------------------------------------------------

if (existsSync(PROBE)) rmSync(PROBE, { force: true });
rmSync(join(SRC, "mocks"), { recursive: true, force: true });

if (failures.length) {
  console.error(`\n  ${failures.length} PROOF TEST FAILURE(S)\n`);
  for (const f of failures) console.error("   • " + f);
  console.error("");
  process.exit(1);
}

console.log(`\n${passed} checks proven: each was seen to fail on its violation and pass without it.\n`);
