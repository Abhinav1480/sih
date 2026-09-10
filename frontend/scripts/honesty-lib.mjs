/**
 * Shared scanning machinery for the honesty suite. See docs/HONESTY_RULE.md.
 *
 * Two views of every file, both preserving line numbers exactly so a failure
 * can name a real line:
 *
 *   code        comments blanked. Strings intact. Use when the rule is about
 *               what a string SAYS -- an agency name, a statutory citation.
 *   codeNoText  comments blanked AND string contents blanked, delimiters kept.
 *               Use when the rule is about STRUCTURE -- a `||` default, a
 *               threshold comparison. A comment mentioning `||`, or a sentence
 *               inside a string containing the word INCOIS, cannot trip these.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Turn a matched region into spaces, keeping every newline. */
const blank = (m) => m.replace(/[^\n]/g, " ");

export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    // Not a URL (https://): require the two slashes not be preceded by a colon.
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
}

/** Blank the inside of every string / template literal, keep the quotes. */
export function stripStringBodies(code) {
  return code.replace(
    /(["'`])((?:\\.|(?!\1)[^\\])*)\1/gs,
    (m, q, body) => q + blank(body) + q
  );
}

export function readViews(file) {
  const raw = readFileSync(file, "utf8");
  const code = stripComments(raw);
  return { raw, code, codeNoText: stripStringBodies(code), lines: raw.split("\n") };
}

export function walk(dir, exts = /\.(ts|tsx|js|jsx|mjs)$/) {
  const out = [];
  const recurse = (d) => {
    for (const entry of readdirSync(d)) {
      if (entry === "node_modules" || entry === ".next") continue;
      const full = join(d, entry);
      if (statSync(full).isDirectory()) recurse(full);
      else if (exts.test(entry)) out.push(full);
    }
  };
  recurse(dir);
  return out;
}

export const relPath = (root, file) =>
  relative(root, file).replace(/\\/g, "/");

/**
 * Scan one view line by line. `rules` is [{ re, why }]; returns findings with a
 * truthful line number and the raw source line for context.
 */
export function scanLines(view, rel, rules, allow) {
  const findings = [];
  const lines = view.split("\n");
  for (const [i, line] of lines.entries()) {
    for (const { re, why, rule } of rules) {
      re.lastIndex = 0;
      const m = re.exec(line);
      if (!m) continue;
      if (allow && allow(rel, i + 1, m[0], rule)) continue;
      findings.push({ file: rel, line: i + 1, why, rule, match: m[0].trim() });
    }
  }
  return findings;
}

export function report(name, findings, allLines, headline, epilogue) {
  if (!findings.length) return 0;
  console.error(`\n  BUILD BLOCKED \u2014 ${headline}\n`);
  for (const f of findings) {
    const src = (allLines.get(f.file) || [])[f.line - 1] || "";
    console.error(`   \u2022 ${f.file}:${f.line}  [${f.rule}]  ${f.why}`);
    console.error(`       ${src.trim().slice(0, 120)}`);
  }
  if (epilogue) console.error("\n" + epilogue);
  return findings.length;
}
