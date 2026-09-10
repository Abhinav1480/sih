/**
 * FE-07 — lightweight frontend localization for Fisherman Mode UI chrome.
 *
 * IMPORTANT (honesty): the ACTUAL multilingual intelligence — the analysis
 * response text (executive summary, recommendation, etc.) — is localized by the
 * BACKEND via `preferred_language` and rendered as-is. This module only covers
 * UI-chrome strings that FE-07 adds, so that NO raw English lives inside JSX.
 *
 * Supported language codes mirror the existing Header language selector.
 * Per the brief we DO NOT invent translations: `en` is the authoritative base
 * and any key missing for a language falls back to English. Verified
 * translations can be dropped into the per-language maps below without touching
 * any component.
 */

export const SUPPORTED_LANGS = [
  "en",
  "te",
  "hi",
  "ta",
  "ml",
  "kn",
  "bn",
  "mr",
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number];

type Dict = Record<string, string>;

const en: Dict = {
  // Mode
  "fisherman.enter": "Fisherman Mode",
  "fisherman.exit": "Exit Fisherman Mode",
  "fisherman.title": "Fisherman Mode",

  // Verdict (labels only — the value itself comes from the backend)
  "verdict.section": "Decision",
  "verdict.GO": "GO",
  "verdict.CAUTION": "CAUTION",
  "verdict.NO_GO": "NO-GO",
  "verdict.NOT_APPLICABLE": "NOT APPLICABLE",
  "verdict.unavailable": "Verdict unavailable",
  "verdict.unavailable.desc":
    "ORCA did not return a go / no-go decision for this query.",
  "verdict.na.desc": "A go / no-go decision does not apply to this query.",

  // Risk
  "risk.label": "Marine Risk",

  // Conditions
  "conditions.title": "Key Conditions",
  "cond.wave": "Wave",
  "cond.wind": "Wind",
  "cond.swell": "Swell",
  "cond.visibility": "Visibility",
  "cond.sst": "SST",

  // Fishing
  "fishing.title": "Fishing Opportunity",
  "fishing.bestZone": "Best zone",
  "fishing.suitability": "Suitability",
  "fishing.distance": "Distance",
  "fishing.none": "No fishing zones were returned for this query.",

  // Alerts
  "alerts.title": "Active Marine Warnings",

  // Generic actions
  "action.why": "Why?",
  "details.show": "View details",
  "details.hide": "Hide details",
  "recommendation.label": "Recommendation",

  // Loading
  "loading.analyzing": "Analyzing marine conditions…",

  // Voice input
  "voice.speak": "Speak your question",
  "voice.listening": "Listening…",
  "voice.processing": "Processing…",
  "voice.stopListening": "Stop listening",
  "voice.input.unavailable": "Voice input is unavailable on this browser.",
  "voice.input.denied":
    "Microphone access is unavailable. You can still type your question.",
  "voice.input.error": "Voice input error. You can still type your question.",

  // Voice output
  "voice.listen": "Listen",
  "voice.playing": "Playing",
  "voice.stop": "Stop",
  "voice.output.unavailable": "Voice playback is unavailable on this browser.",
};

// Per-language overrides. Left intentionally sparse — English is the base and
// missing keys fall back to it. Populate with VERIFIED translations only.
const overrides: Partial<Record<LangCode, Dict>> = {
  te: {},
  hi: {},
  ta: {},
  ml: {},
  kn: {},
  bn: {},
  mr: {},
};

/**
 * Translate a UI key for a language, falling back to English.
 * Supports simple `{name}` interpolation via the optional `vars` map.
 * Values (numbers/units) must be passed in via `vars` — never translated.
 */
export function t(
  key: string,
  lang: string = "en",
  vars?: Record<string, string | number>
): string {
  const code = (SUPPORTED_LANGS as readonly string[]).includes(lang)
    ? (lang as LangCode)
    : "en";
  const localized = overrides[code]?.[key];
  let out = localized ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return out;
}
