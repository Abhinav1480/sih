/**
 * Checks for the verdict lookup. Run with `npm run check:verdict`.
 *
 * The one that matters is `no wording never falls back to a milder sentence`.
 * Every other test here could pass while the app still told a fisherman the
 * sea was survivable during a NO_GO, and that is the only outcome in this
 * codebase that could get someone killed.
 *
 * Plain node, no framework: this is the frontend and there is no test runner
 * in it, and adding one to assert six things would be more machinery than
 * the thing being asserted.
 */

import assert from "node:assert/strict";

// The module is TypeScript; these mirror its tables exactly and the last test
// asserts they have not drifted from the source file.
import { readFileSync } from "node:fs";

const RAW = readFileSync(new URL("./verdict.ts", import.meta.url), "utf8");

/** Comments describe the defect these checks look for, on purpose. Scan code. */
const SOURCE = RAW
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`  FAIL ${name}\n       ${error.message}`);
  }
}

console.log("\nverdict lookup\n");

check("no wording never falls back to a milder sentence", () => {
  // The design carries wording for GO and CAUTION only, so every other verdict
  // must surface raw. Two things make that true, and both are asserted:
  //   1. the fallback is the API's own verdict string, and
  //   2. the wording lookup returns null for anything it has no entry for.
  assert.ok(
    SOURCE.includes("word: localised ?? verdict"),
    "the raw verdict is not the fallback for missing wording"
  );

  const lookup = SOURCE.slice(
    SOURCE.indexOf("function designVerdictWord"),
    SOURCE.indexOf("export interface VerdictPresentation")
  );
  assert.ok(lookup.length > 0, "the wording lookup could not be located");
  assert.ok(
    /return null;\s*\}\s*$/.test(lookup.trim()),
    "the wording lookup does not end by returning null for an unmatched verdict"
  );
  // Each arm must be guarded by its own verdict, so CAUTION wording is
  // reachable only when the verdict IS CAUTION.
  for (const [verdict, key] of [["GO", "table.go"], ["CAUTION", "table.caution"]]) {
    const arm = lookup
      .split("\n")
      .find((line) => line.includes(key) && line.includes("return"));
    assert.ok(arm, `no return arm for ${verdict}`);
    assert.ok(
      arm.includes(`verdict === "${verdict}"`),
      `${key} is returned without checking the verdict is ${verdict}`
    );
  }
});

check("nothing in the module reads a score or compares a number", () => {
  const code = SOURCE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert.ok(!/risk\.score|\.score\b/.test(code), "the module reads risk.score");
  assert.ok(
    !/[<>]=?\s*\d/.test(code),
    "the module compares a value against a number, which is a threshold judgement"
  );
});

check("every ramp stop pairs a colour with a word and an icon", () => {
  const ramp = SOURCE.slice(SOURCE.indexOf("BAND_RAMP"), SOURCE.indexOf("UNKNOWN_BAND"));
  for (const band of ["LOW", "MODERATE", "HIGH", "SEVERE"]) {
    const line = ramp.split("\n").find((l) => l.trim().startsWith(band + ":"));
    assert.ok(line, `${band} missing from the ramp`);
    assert.ok(/hex:/.test(line) && /word:/.test(line) && /icon:/.test(line),
      `${band} does not pair colour with a word and an icon`);
  }
});

check("an unknown tier is never upgraded or defaulted", () => {
  assert.ok(SOURCE.includes("if (!key) return null"), "an unknown tier does not return null");
  assert.ok(
    !/TIER_STYLE\[[^\]]*\]\s*\|\|/.test(SOURCE),
    "a tier style falls back with ||, which would default an unknown tier"
  );
});

check("an absent verdict renders nothing rather than something reassuring", () => {
  assert.ok(SOURCE.includes("if (!verdict) return null"));
});

check("the four contract verdicts and bands are the ones handled", () => {
  for (const v of ["GO", "CAUTION", "NO_GO", "NOT_APPLICABLE"]) {
    assert.ok(SOURCE.includes(`"${v}"`), `${v} is not named in the module`);
  }
  for (const b of ["LOW", "MODERATE", "HIGH", "SEVERE"]) {
    assert.ok(SOURCE.includes(`${b}:`), `${b} is not in the ramp`);
  }
});

if (failures) {
  console.error(`\n${failures} failure(s)\n`);
  process.exit(1);
}
console.log("\nverdict lookup: all checks passed\n");
