#!/usr/bin/env node
/**
 * Proof tests for the web honesty suite. A gate nobody has seen fail is not
 * a gate. Each proof reintroduces a real violation into the real tree, runs
 * the real gate, asserts it fails and names the rule, then restores the tree
 * and asserts the gate passes again. Refuses to run on a dirty tree.
 *
 * Run:  npm run check:honesty:proof
 */
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const CHECK = join(ROOT, "scripts", "check-honesty.mjs");
const PROBE = join(SRC, "components", "__honesty_probe__.tsx");

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
      failures.push(`${name}: gate failed, but did not name rule "${expectRule}".\n        output: ${bad.out.trim().split("\n").slice(0, 4).join(" | ")}`);
      return;
    }
  } finally {
    restore();
  }
  const good = run();
  if (good.code !== 0) {
    failures.push(`${name}: violation removed but the gate STILL FAILS.\n        output: ${good.out.trim().split("\n").slice(0, 6).join(" | ")}`);
    return;
  }
  console.log(`  seen to fail, and to pass again:  ${name}`);
  passed++;
}

function probeCheck(name, expectRule, body) {
  check(name, expectRule, () => writeFileSync(PROBE, body, "utf8"), () => rmSync(PROBE, { force: true }));
}

function editCheck(name, expectRule, relFile, transform) {
  const abs = join(ROOT, relFile);
  let original;
  check(
    name,
    expectRule,
    () => {
      original = readFileSync(abs, "utf8");
      const next = transform(original);
      if (next === original) failures.push(`${name}: the transform changed nothing, so nothing was proven`);
      writeFileSync(abs, next, "utf8");
    },
    () => {
      if (original !== undefined) writeFileSync(abs, original, "utf8");
    },
  );
}

const clean = run();
if (clean.code !== 0) {
  console.error("honesty.proof: the tree is not clean, so the proofs cannot run.\n" + clean.out);
  process.exit(1);
}

console.log("honesty.proof: reintroducing each violation and watching the gate fail\n");

probeCheck("|| default on a measurement", "default-supplies-a-value",
  `export const x = (p: { wave_height_m?: number }) => p.wave_height_m || 1.5;\n`);
probeCheck("?? default on a score", "default-supplies-a-value",
  `export const x = (r: { score?: number }) => r.score ?? 0;\n`);
probeCheck("Math.round(Number(score) || 0)", "default-supplies-a-value",
  `export const x = (score?: number) => Math.round(Number(score) || 0);\n`);
probeCheck("presence ternary to a literal", "default-supplies-a-value",
  `export const x = (p: { sst_c?: number }) => (p.sst_c ? p.sst_c : 28.4);\n`);
probeCheck("string default on provenance", "default-supplies-a-value",
  `export const x = (e: { provider?: string }) => e.provider || "Open-Meteo";\n`);
probeCheck("client-side threshold", "client-side-threshold",
  `export const x = (z: { suitability_score: number }) => z.suitability_score >= 70;\n`);
probeCheck("hardcoded agency", "hardcoded-agency",
  `export const Badge = () => <span>{"ISRO"}</span>;\n`);
probeCheck("statutory citation", "hardcoded-legal-text",
  `export const x = "Wildlife Protection Act 1972";\n`);
probeCheck("mock import", "mock-import",
  `import { fake } from "./mocks/answer";\nexport const x = fake;\n`);
probeCheck("hardcoded English between tags", "hardcoded-english",
  `export const x = () => <p>Waves are calm today</p>;\n`);
probeCheck("hardcoded English attribute", "hardcoded-english",
  `export const x = () => <input placeholder="Ask about the sea" />;\n`);
probeCheck("second SpeechSynthesisUtterance", "spoken-script",
  `export const speak = (s: string) => speechSynthesis.speak(new SpeechSynthesisUtterance(s));\n`);

editCheck("locale missing a key", "locale-complete", "src/lib/i18n/te.ts",
  (s) => s.replace(/^\s*"verdict\.GO":.*\n/m, ""));
editCheck("unsupported card branch removed", "unknown-card", "src/components/answer/Cards.tsx",
  (s) => s.replace(/answer\.cardUnsupported/g, "answer.headline"));
editCheck("spoken script speaks an absent route", "spoken-script", "src/lib/spoken/buildSpokenScript.ts",
  (s) => s.replace(/if \(route\) \{/, "if (route || true) {"));
editCheck("capture drift", "captures-drift", "src/captures/alerts.json",
  (s) => s.replace(/"severity": "INFO"/, '"severity": "SEVERE"'));

/* The inverse: falling back to an explicit absence marker is the fix, and must NOT fail the gate. */
const absence = join(SRC, "components", "__honesty_absence__.tsx");
try {
  writeFileSync(absence, `export const x = (p: { wave_height_m?: string }) => p.wave_height_m || "unavailable";\nexport const y = (p: { provider?: string }) => p.provider ?? "";\n`, "utf8");
  const r = run();
  if (r.code !== 0) failures.push(`absence marker is NOT flagged: the gate failed on an honest absence marker.\n        output: ${r.out.trim().split("\n").slice(0, 4).join(" | ")}`);
  else { console.log("  seen to pass:                     absence marker is NOT flagged"); passed++; }
} finally {
  rmSync(absence, { force: true });
}

console.log("");
if (failures.length) {
  console.error("honesty.proof: FAILED\n");
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`honesty.proof: ${passed} proof(s) passed`);
