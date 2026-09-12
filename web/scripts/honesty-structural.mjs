/**
 * Structural honesty checks for the web app: rules about how modules fit
 * together, which no line regex can see.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { walk, relPath } from "./honesty-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

const read = (p) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return null;
  }
};

/**
 * The spoken reply is assembled in exactly one module, from response fields
 * only, and that module's test (which feeds it a response with fields missing
 * and asserts nothing is claimed about them) passes.
 *
 * Also: SpeechSynthesisUtterance is constructed in exactly one file, the TTS
 * adapter, so no component can hand the synthesiser free text.
 */
export function spokenScriptSingleSource() {
  const findings = [];
  const add = (file, why) => findings.push({ file, line: 0, rule: "spoken-script", why });

  const mod = "src/lib/spoken/buildSpokenScript.ts";
  const test = "src/lib/spoken/buildSpokenScript.test.mjs";
  const src = read(mod);
  if (src === null) add(mod, "is missing: the spoken reply has no single source");
  else if (!/export function buildSpokenScript\(/.test(src)) add(mod, "does not export buildSpokenScript");
  if (!existsSync(join(ROOT, test))) add(test, "is missing: the spoken script has no missing-fields test");
  else if (findings.length === 0) {
    const r = spawnSync(process.execPath, [join(ROOT, test)], { encoding: "utf8" });
    if (r.status !== 0) add(test, `fails: ${(r.stdout + r.stderr).trim().split("\n").slice(-3).join(" | ")}`);
  }

  const constructors = [];
  for (const file of walk(SRC)) {
    const rel = "src/" + relPath(SRC, file);
    if (rel.endsWith(".test.mjs") || rel.endsWith(".test.ts")) continue;
    const text = readFileSync(file, "utf8");
    const n = (text.match(/new\s+SpeechSynthesisUtterance\b/g) ?? []).length;
    if (n) constructors.push(rel);
  }
  const allowed = "src/lib/voice/tts.ts";
  for (const f of constructors) {
    if (f !== allowed) add(f, `constructs SpeechSynthesisUtterance; only ${allowed} may, and only with text from buildSpokenScript`);
  }
  return findings;
}

/** An unknown card type must render an explicit unsupported state, never a blank. */
export function unknownCardIsExplicit() {
  const file = "src/components/answer/Cards.tsx";
  const src = read(file);
  if (src === null) return [{ file, line: 0, rule: "unknown-card", why: "is missing" }];
  if (!/answer\.cardUnsupported/.test(src)) {
    return [{ file, line: 0, rule: "unknown-card", why: "has no unsupported-card branch (answer.cardUnsupported is never rendered)" }];
  }
  return [];
}

/** Every locale carries every key. A reader who switches language gets no English gaps. */
export function localesComplete() {
  const findings = [];
  const keysOf = (text) => new Set([...text.matchAll(/^\s*"([\w.]+)":/gm)].map((m) => m[1]));
  const master = read("src/lib/i18n/en.ts");
  if (master === null) return [{ file: "src/lib/i18n/en.ts", line: 0, rule: "locale-complete", why: "is missing" }];
  const enKeys = keysOf(master);
  for (const lang of ["te", "ta", "hi"]) {
    const file = `src/lib/i18n/${lang}.ts`;
    const text = read(file);
    if (text === null) {
      findings.push({ file, line: 0, rule: "locale-complete", why: "is missing" });
      continue;
    }
    const keys = keysOf(text);
    const missing = [...enKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !enKeys.has(k));
    if (missing.length) findings.push({ file, line: 0, rule: "locale-complete", why: `missing ${missing.length} key(s): ${missing.slice(0, 5).join(", ")}` });
    if (extra.length) findings.push({ file, line: 0, rule: "locale-complete", why: `has ${extra.length} key(s) not in en: ${extra.slice(0, 5).join(", ")}` });
  }
  return findings;
}

/** src/captures/ must be byte-identical to docs/examples/. */
export function capturesMatchContract() {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", "sync-captures.mjs"), "--check"], { encoding: "utf8" });
  if (r.status === 0) return [];
  return [{ file: "src/captures/", line: 0, rule: "captures-drift", why: (r.stderr || r.stdout).trim().split("\n")[0] }];
}

export const STRUCTURAL_CHECKS = [spokenScriptSingleSource, unknownCardIsExplicit, localesComplete, capturesMatchContract];
