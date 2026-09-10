#!/usr/bin/env node
/**
 * The honesty suite. One entry point, wired into `prebuild` and CI.
 *
 *   No user-visible value may originate from a `||` default or an equivalent
 *   fallback, and no agency name may appear beside a value that agency did
 *   not produce.
 *
 * Phase 0 removed a specific set of fabrications by hand and left three
 * ad-hoc greps behind. This consolidates them and generalises the rule, so
 * the next fabrication fails the build instead of needing to be noticed.
 *
 * Run:   npm run check:honesty          (also runs as prebuild)
 *        npm run check:honesty -- --report    list findings, exit 0
 *
 * Every rule has a proof test in scripts/honesty.proof.mjs that reintroduces
 * the violation and confirms this script fails on it.
 *
 * See docs/HONESTY_RULE.md, including how to request an allowlist entry.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FRONTEND_RULES, REGRESSION_RULES } from "./honesty-rules.mjs";
import { ALLOWLIST, isAllowed } from "./honesty-allowlist.mjs";
import { STRUCTURAL_CHECKS } from "./honesty-structural.mjs";
import { readViews, walk, relPath, report } from "./honesty-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const REPORT_ONLY = process.argv.includes("--report");

const findings = [];
const sourceLines = new Map();

// ---------------------------------------------------------------- 1. mocks/
if (existsSync(join(SRC, "mocks"))) {
  findings.push({
    file: "src/mocks/",
    line: 0,
    rule: "mock-import",
    why:
      "src/mocks/ exists. It held a question-to-answer lookup table labelled " +
      "as authoritative agency telemetry, and a scripted SSE replay presented " +
      "as live agent progress. Neither may return.",
  });
}

// ------------------------------------------------- 2. general + regressions
for (const file of walk(SRC)) {
  const rel = "src/" + relPath(SRC, file);
  const views = readViews(file);
  sourceLines.set(rel, views.lines);

  for (const spec of FRONTEND_RULES) {
    const view = views[spec.view].split("\n");
    for (const [i, line] of view.entries()) {
      spec.re.lastIndex = 0;
      const m = spec.re.exec(line);
      if (!m) continue;
      // A rule may declare a shape that looks like a hit but is not one --
      // reading a provenance value rather than asserting it, say.
      if (spec.unless && spec.unless.test(line)) continue;
      if (isAllowed(rel, spec.rule, views.lines[i] ?? "")) continue;
      findings.push({ file: rel, line: i + 1, rule: spec.rule, why: spec.why });
    }
  }

  for (const spec of REGRESSION_RULES) {
    if (spec.file !== rel) continue;
    const view = views.code.split("\n");
    for (const [i, line] of view.entries()) {
      if (!spec.re.test(line)) continue;
      findings.push({ file: rel, line: i + 1, rule: spec.rule, why: spec.why });
    }
  }
}

// -------------------------------------------------- 3. structural checks
// Rules about how components fit together, which no line regex can see.
for (const check of STRUCTURAL_CHECKS) findings.push(...check());

// ------------------------------------------------------------------ output
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

if (REPORT_ONLY) {
  for (const f of findings) {
    const src = (sourceLines.get(f.file) || [])[f.line - 1] || "";
    console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.why}\n    ${src.trim().slice(0, 130)}`);
  }
  console.log(`\n${findings.length} finding(s), ${ALLOWLIST.length} allowlist entr(ies)`);
  process.exit(0);
}

const count = report(
  "check-honesty",
  findings,
  sourceLines,
  "the UI is originating a value it was not given, or hiding what it is showing",
  "  A value ORCA did not measure must say so. An agency name must never appear\n" +
    "  beside a value that agency did not produce. The browser never decides safe\n" +
    "  versus unsafe.\n\n" +
    "  If this is a genuine exception, add it to scripts/honesty-allowlist.mjs\n" +
    "  with a one-line justification. See docs/HONESTY_RULE.md.\n"
);

if (count) process.exit(1);
console.log(
  `check-honesty: no fabricated defaults, client-side thresholds, hardcoded ` +
    `agencies or mock imports (${ALLOWLIST.length} allowlisted)`
);
