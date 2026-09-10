/**
 * The rule, as regexes. See docs/HONESTY_RULE.md for the prose.
 *
 *   No user-visible value may originate from a `||` default or an equivalent
 *   fallback, and no agency name may appear beside a value that agency did
 *   not produce.
 */

/**
 * Field-name fragments that denote a MEASUREMENT, THRESHOLD, VERDICT, SCORE,
 * PROVENANCE field, TIMESTAMP or UNIT -- the things the rule protects.
 *
 * Deliberately absent: "label", "title", "name", "text", "color". A pure
 * display label may have a default, and that is the one narrow exception the
 * rule allows. See docs/HONESTY_RULE.md, "The display-label exception".
 */
const VALUE_WORDS = [
  // measurements
  "wave", "swell", "wind", "gust", "sst", "temp", "chloro", "depth", "tide",
  "current", "visibility", "salinity", "pressure", "humidity", "period",
  "height", "speed", "bearing", "distance", "displacement", "suitability",
  "productivity", "latitude", "longitude",
  // verdicts, scores, bands
  "verdict", "score", "band", "risk", "severity", "alert", "warning", "hazard",
  "confidence", "grade", "category",
  // provenance
  "provider", "source", "tier", "agency", "attribution", "provenance",
  "freshness", "quality",
  // time and units
  "timestamp", "updated", "issued", "unit", "uom",
  // thresholds
  "threshold", "cutoff",
].join("|");

/** Agencies whose name must never be attached to a value they did not produce. */
const AGENCIES = "INCOIS|IMD|ISRO|MoEFCC|Copernicus|NRSC|MOSDAC|Bhoonidhi";

/**
 * Identifier suffixes that are structural, not measured: a count of items, an
 * array index, a string length. `activeAlertsCount > 0` is not a threshold
 * judgement about an alert, it is asking whether a list is empty.
 */
const STRUCTURAL = String.raw`(?:[Cc]ount|[Ii]ndex|[Ii]dx|[Ll]ength|[Ll]en|[Ss]ize|[Kk]ey|[Ii]d)`;

/**
 * An optional object path, then a final segment containing a value word.
 *
 * The value word may BE the whole segment: a variable called plainly `score`
 * or `verdict` is the commonest shape of all, and an earlier draft of this
 * pattern required at least one character before the word, so `score || 0`
 * slipped straight through.
 */
const BARE_IDENT =
  String.raw`(?:[A-Za-z_$][\w$]*\??\.)*[\w$]*(?:${VALUE_WORDS})[\w$]*(?:\s*(?:\?\.)?\[[^\]]*\])?`;

/**
 * The identifier, optionally wrapped in a numeric coercion. `RiskGauge` hid a
 * fabricated score behind exactly this: `Math.round(Number(score) || 0)` fed an
 * ARIA meter, and the bare-identifier form did not see through the call.
 */
const VALUE_IDENT =
  String.raw`(?:(?:Number|parseFloat|parseInt|Math\.round|Math\.abs|Number\.parseFloat)\(\s*)?${BARE_IDENT}(?:\s*\))?`;

/**
 * A literal that could be mistaken for a real measurement.
 *
 * Numbers ALWAYS count: `|| 1.5`, `|| 85`, `?? 0`. A zero risk score reads as
 * "no risk at all", which is the most dangerous fabrication of the set, so
 * there is no exemption for it.
 *
 * Strings count UNLESS they say the value is absent -- "unavailable", "not
 * recorded", "No coastal alert feed connected", an em-dash, the empty string.
 * Falling back to an explicit absence marker IS the fix P0-7 applied; a gate
 * that flagged it would be telling people to undo it.
 */
const ABSENCE_TEXT =
  String.raw`\s*(?:|[-–—.]*|[Nn]/?[Aa]|(?:[^"'\`]*\b(?:unavailable|not available|no data|not recorded|not supplied|not connected|not set|unknown|missing|none|pending|awaiting|no [a-z ]*(?:feed|text|data|value|reading|warning|score|source))\b[^"'\`]*))\s*`;

const ABSENCE_STRING = String.raw`(?:"${ABSENCE_TEXT}"|'${ABSENCE_TEXT}'|\`${ABSENCE_TEXT}\`)`;
const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
const ANY_STRING = String.raw`(?:"[^"]*"|'[^']*'|\`[^\`]*\`)`;

/** A literal default that is NOT an honest absence marker. */
const FABRICATED_LITERAL =
  String.raw`(?!${ABSENCE_STRING}\s*[,;)}\]:]|${ABSENCE_STRING}\s*$)(?:${ANY_STRING}|${NUMBER}|true|false)`;

export const FRONTEND_RULES = [
  // ---------------------------------------------------------------- defaults
  {
    rule: "default-supplies-a-value",
    // `ocean.wave_height || 1.5`  /  `r.overall_score ?? 0`
    // Not flagged: `ocean.sea_state || "unavailable"`, `l.legend_unit || ""`.
    re: new RegExp(
      String.raw`\b(?:${VALUE_IDENT})\s*(?:\|\||\?\?)\s*${FABRICATED_LITERAL}`,
      "i"
    ),
    why:
      "a || / ?? default supplying a measurement, verdict, score, provenance " +
      "field, timestamp or unit. Fall back to an explicit absence marker instead",
    view: "codeNoText",
  },
  {
    rule: "default-supplies-a-value",
    // The same fabrication written as a presence ternary:
    //   `props.sst_c ? props.sst_c : 28.4`
    // The identifier must reappear in the consequent, so that a ternary
    // CHOOSING between two things (`sel ? times.indexOf(sel) : 0`) or
    // COMPARING two backend values (`a.wave_m > b.wave_m ? "up" : "down"`) is
    // not swept up.
    re: new RegExp(
      String.raw`\b(${VALUE_IDENT})\s*\?\s*[^:;?]{0,60}\1[^:;?]{0,40}:\s*${FABRICATED_LITERAL}`,
      "i"
    ),
    why: "a presence ternary falling back to a literal value",
    view: "codeNoText",
  },

  // -------------------------------------------------------------- thresholds
  {
    rule: "client-side-threshold",
    // `zone.suitability_score >= 70`, `sst_c >= 27`. A comparison between two
    // backend values has no numeric literal and does not match.
    re: new RegExp(
      String.raw`\b(?!\w*${STRUCTURAL}\b)(?:${VALUE_IDENT})\s*(?:>=|<=|>|<)\s*${NUMBER}`,
      "i"
    ),
    why:
      "the browser is judging a measurement against its own cut point; " +
      "banding a value is the risk engine's job",
    view: "codeNoText",
  },

  // ------------------------------------------------------------------ agency
  {
    rule: "hardcoded-agency",
    re: new RegExp(String.raw`\b(?:${AGENCIES})\b`),
    /**
     * Reading a provenance value the response supplied is not asserting one.
     * `tier === "ISRO"` chooses a badge colour for whatever the backend sent;
     * `type ProviderTier = "ISRO" | ...` mirrors the backend enum. Both are
     * allowed. Rendering the literal is not -- render the variable, so the
     * text on screen is the value that actually arrived.
     */
    unless: new RegExp(
      String.raw`(?:[=!]==?\s*["'\`](?:${AGENCIES})["'\`])` +
        String.raw`|(?:case\s+["'\`](?:${AGENCIES})["'\`])` +
        String.raw`|(?:["'\`](?:${AGENCIES})["'\`]\s*\|)` +
        String.raw`|(?:\|\s*["'\`](?:${AGENCIES})["'\`])`
    ),
    why: "an agency name written into the UI; agency names arrive from the response or not at all",
    view: "code",
  },

  // -------------------------------------------------------------------- mocks
  {
    rule: "mock-import",
    re: /(?:import|require|from)\s*\(?\s*["'][^"']*\bmocks?\/[^"']*["']/,
    why: "an import reaching a mock module",
    view: "code",
  },
  {
    rule: "mock-import",
    re: /\b(getMockAnalysisResponse|getMockSSEEventsForQuery|runMockSSEReplay|mockVerdictScenarios|MOCK_BHUVAN_WMS_LAYER)\b/,
    why: "a reference to a mock symbol",
    view: "code",
  },

  // -------------------------------------------------------------------- legal
  {
    rule: "hardcoded-legal-text",
    re: /\b(?:(?:Wildlife\s+Protection|Fisheries|Maritime\s+Zones|Environment\s+Protection)\s+Act|Act,?\s*(?:19|20)\d{2}|CRZ\s+Notification|Section\s+\d+[A-Z]?\s+of\b|Gazette\s+of\s+India|Schedule\s+[IVX]+\b)/,
    why: "a statutory citation written into the UI; law comes from the response or not at all",
    view: "code",
  },
];

/**
 * Regression guards for the exact defects P0-5 and P0-7 removed. The general
 * rules above catch every one of these, but they are kept named and literal so
 * a reintroduction fails with the history attached rather than as an anonymous
 * pattern hit.
 */
export const REGRESSION_RULES = [
  { file: "src/components/Results/ConditionsGrid.tsx", rule: "P0-7", re: /alert_?[Ll]evel\s*\|\|\s*["']Green["']/, why: 'absent alert level defaulting to "Green"' },
  { file: "src/components/Results/ConditionsGrid.tsx", rule: "P0-7", re: /storm_warning\s*\|\|\s*["']No active warning["']/, why: 'absent warning defaulting to "No active warning"' },
  { file: "src/components/Results/ConditionsGrid.tsx", rule: "P0-7", re: /<span>IMD<\/span>/, why: "hardcoded IMD attribution over data IMD did not produce" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.suitability\s*\|\|\s*\d/, why: "fabricated suitability score" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.chlorophyll\s*\|\|\s*["']/, why: "fabricated chlorophyll value" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.sst_c\s*\|\|\s*["']/, why: "fabricated sea surface temperature" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.depth_m\s*\|\|\s*["']/, why: "fabricated depth" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.sea_state\s*\|\|\s*["']/, why: "fabricated sea state" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.risk_level\s*\|\|\s*["']/, why: "fabricated hazard category" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.designation\s*\|\|\s*["']/, why: "fabricated legal designation" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.restriction\s*\|\|\s*["']/, why: "fabricated legal restriction" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.authority\s*\|\|\s*["']/, why: "fabricated statutory citation" },
  { file: "src/components/MapView.tsx", rule: "P0-7", re: /properties\.risk\s*\|\|\s*["']LOW["']/, why: "absent risk defaulting to LOW" },
  { file: "src/components/Results/RouteAnalysisCard.tsx", rule: "P0-7", re: /scoreMap/, why: "band-to-score table inventing a corridor risk score" },
  { file: "src/components/Results/RouteAnalysisCard.tsx", rule: "P0-7", re: /LOW:\s*18/, why: "hardcoded risk score the engine never produced" },
  { file: "src/components/Results/SummaryTable.tsx", rule: "P0-7", re: /["']Safe for Normal Navigation["']\s*(?!:)/, why: "go/no-go instruction manufactured from a band string" },
  { file: "src/components/Results/SummaryTable.tsx", rule: "P0-7", re: /significant_wave_height_m\s*<=\s*1\.5/, why: "client-side sea state threshold" },
  { file: "src/components/Results/SummaryTable.tsx", rule: "P0-7", re: /sea_surface_temp_c\s*>=\s*27/, why: "client-side SST threshold" },
  { file: "src/components/Results/SummaryTable.tsx", rule: "P0-7", re: /visibility_km\s*>=\s*8/, why: "client-side visibility threshold" },
  { file: "src/lib/stream.ts", rule: "P0-5", re: /mockSSEEvents|runMockSSEReplay/, why: "the SSE mock replay presented as live agent telemetry" },
];
