/**
 * Documented exceptions to the honesty rule. Keep this SHORT.
 *
 * Every entry needs a one-line justification saying why the match is not a
 * fabrication. "It is inconvenient" is not a justification. If you cannot write
 * the line, the code is the problem, not the rule.
 *
 * An entry matches when `rule` matches and either `file` equals the path or
 * `dir` is a prefix of it. Add `contains` to narrow an entry to lines holding a
 * particular substring; prefer that over exempting a whole file.
 *
 * Three of the four entries below are load-bearing on a test. If that test
 * stops passing, the justification stops being true and the entry has to go.
 *
 * See docs/HONESTY_RULE.md, "Requesting an allowlist entry".
 */
export const ALLOWLIST = [
  {
    file: "src/lib/backend/fallbackResponse.ts",
    rule: "hardcoded-agency",
    // A DEMO-mode envelope captured verbatim from the backend on 2026-09-10.
    // The agency names in it are the backend's own provenance and skip-reason
    // strings ("Skipped ISRO MOSDAC", "no MOSDAC token set"), not attributions
    // the UI invented. api.ts stamps meta.cached / __cached on it before it is
    // rendered, and StaleWarning says so on screen, so it can never pass as
    // live. Rewriting the capture would make it stop being a capture.
    why: "captured backend response; the agency names are the backend's, verbatim",
  },
  {
    file: "src/lib/geofence/boundaries.ts",
    rule: "hardcoded-agency",
    contains: "authority:",
    // Bundled so the geofence works offline. Copied from
    // backend/app/geospatial/protected_areas.py, and
    // backend/tests/test_frontend_boundaries_match.py fails the build if the
    // authority strings or the polygons drift from it -- which they had, before
    // P1-2. The exemption is only true while that test passes.
    why: "copied from the backend and pinned to it by test_frontend_boundaries_match.py",
  },
  {
    file: "src/lib/i18n/offline.ts",
    rule: "hardcoded-agency",
    contains: "offline.contact.incois",
    // An emergency-contact label in a phone directory, beside a published
    // helpline number. It attributes no measurement to INCOIS; it tells a
    // fisherman with no signal who to ring.
    why: "an emergency contact label, not an attribution on a value",
  },
  {
    file: "src/lib/design/verdict.ts",
    rule: "hardcoded-agency",
    contains: "ISRO",
    // Two lookups keyed on `evidence[].provider_tier` exactly as the response
    // sent it: one maps the tier to its plain-language label, the other to a
    // badge style. Neither asserts that a value came from ISRO -- they render
    // the tier the backend already decided. An unknown tier returns null and
    // the call site shows "source unavailable"; nothing is defaulted and
    // nothing is upgraded, which verdict.test.mjs asserts.
    why: "keyed on the provider_tier the response sent; renders provenance, never claims it",
  },
  {
    file: "src/lib/i18n/app.ts",
    rule: "hardcoded-agency",
    contains: "ISRO satellite",
    // The localised wording for a provenance tier, from the Claude Design
    // file: ISRO -> "ISRO satellite", NATIONAL -> "Government service",
    // FALLBACK -> "Backup source". A locale string shown only when the
    // response carried that tier, the same shape as offline.contact.incois
    // below. Generated from the design by tools/gen_locale.py, not written by
    // a component.
    why: "locale wording for a tier the response sent, generated from the design file",
  },
  {
    file: "src/components/Evidence/evidenceUtils.ts",
    rule: "client-side-threshold",
    contains: "bestScore",
    // `bestScore >= 1` is a relevance cut-off for matching an evidence record
    // to the card that cited it. It is a search score computed in the browser
    // from the browser's own matching, never displayed, and never a judgement
    // about the sea.
    why: "an internal relevance score for evidence matching; never rendered",
  },
];

export function isAllowed(file, rule, line) {
  return ALLOWLIST.some(
    (e) =>
      e.rule === rule &&
      (e.file === file || (e.dir && file.startsWith(e.dir))) &&
      (!e.contains || line.includes(e.contains))
  );
}
