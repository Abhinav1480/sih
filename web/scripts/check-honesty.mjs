#!/usr/bin/env node
/**
 * The honesty suite for the web app. One entry point, wired into `prebuild`.
 *
 *   No user-visible value may originate from a `||` default or an equivalent
 *   fallback, and no agency name may appear beside a value that agency did
 *   not produce. The browser never bands a value. No component carries
 *   English of its own. The spoken reply is assembled from response fields
 *   in one module, and says nothing about a field that is absent.
 *
 * Run:   npm run check:honesty            (also runs as prebuild)
 *        npm run check:honesty -- --report  list findings, exit 0
 *        npm run check:honesty:proof        prove every rule still fails
 *
 * See docs/HONESTY_RULE.md.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FRONTEND_RULES } from "./honesty-rules.mjs";
import { ALLOWLIST, isAllowed } from "./honesty-allowlist.mjs";
import { STRUCTURAL_CHECKS } from "./honesty-structural.mjs";
import { readViews, walk, relPath, report } from "./honesty-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const REPORT_ONLY = process.argv.includes("--report");

const findings = [];
const sourceLines = new Map();

if (existsSync(join(SRC, "mocks"))) {
  findings.push({ file: "src/mocks/", line: 0, rule: "mock-import", why: "src/mocks/ exists; placeholder data lives only in src/captures/ as verbatim API output" });
}

for (const file of walk(SRC)) {
  const rel = "src/" + relPath(SRC, file);
  if (rel.endsWith(".test.mjs")) continue;
  const views = readViews(file);
  sourceLines.set(rel, views.lines);

  for (const spec of FRONTEND_RULES) {
    if (spec.only && !spec.only.test(rel)) continue;
    const view = views[spec.view].split("\n");
    for (const [i, line] of view.entries()) {
      spec.re.lastIndex = 0;
      if (!spec.re.exec(line)) continue;
      if (spec.unless && spec.unless.test(line)) continue;
      if (isAllowed(rel, spec.rule, views.lines[i] ?? "")) continue;
      findings.push({ file: rel, line: i + 1, rule: spec.rule, why: spec.why });
    }
  }
}

for (const check of STRUCTURAL_CHECKS) findings.push(...check());

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
    "  versus unsafe. Components carry no English of their own.\n\n" +
    "  If this is a genuine exception, add it to scripts/honesty-allowlist.mjs\n" +
    "  with a one-line justification. See docs/HONESTY_RULE.md.\n",
);

if (count) process.exit(1);
console.log(`check-honesty: no fabricated defaults, client-side thresholds, hardcoded agencies, hardcoded English or mock imports; spoken script single-sourced and tested (${ALLOWLIST.length} allowlisted)`);
