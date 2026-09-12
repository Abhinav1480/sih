/**
 * The honesty rule, as regexes, for the web app. Ported from
 * frontend/scripts/honesty-rules.mjs and extended with the rules the
 * conversational interface needs. See docs/HONESTY_RULE.md for the prose.
 *
 *   No user-visible value may originate from a `||` default or an equivalent
 *   fallback, and no agency name may appear beside a value that agency did
 *   not produce. No component carries English of its own.
 */

/** Field-name fragments that denote a value the rule protects. */
const VALUE_WORDS = [
  "wave", "swell", "wind", "gust", "sst", "temp", "chloro", "depth", "tide",
  "current", "visibility", "salinity", "pressure", "humidity", "period",
  "height", "speed", "bearing", "distance", "displacement", "suitability",
  "productivity", "latitude", "longitude", "transit", "hours",
  "verdict", "score", "band", "risk", "severity", "alert", "warning", "hazard",
  "confidence", "grade", "category", "points",
  "provider", "source", "tier", "agency", "attribution", "provenance",
  "freshness", "quality",
  "timestamp", "updated", "issued", "unit", "uom", "valid", "observed", "retrieval", "generated",
  "threshold", "cutoff",
].join("|");

export const AGENCIES = "INCOIS|IMD|ISRO|MoEFCC|Copernicus|NRSC|MOSDAC|Bhoonidhi|SARAL|INSAT|Oceansat|SCATSAT|Bhuvan";

const STRUCTURAL = String.raw`(?:[Cc]ount|[Ii]ndex|[Ii]dx|[Ll]ength|[Ll]en|[Ss]ize|[Kk]ey|[Ii]d|[Ss]eq)`;

const BARE_IDENT =
  String.raw`(?:[A-Za-z_$][\w$]*\??\.)*[\w$]*(?:${VALUE_WORDS})[\w$]*(?:\s*(?:\?\.)?\[[^\]]*\])?`;

const VALUE_IDENT =
  String.raw`(?:(?:Number|parseFloat|parseInt|Math\.round|Math\.abs|Number\.parseFloat)\(\s*)?${BARE_IDENT}(?:\s*\))?`;

const ABSENCE_TEXT =
  String.raw`\s*(?:|[-–—.]*|[Nn]/?[Aa]|(?:[^"'\`]*\b(?:unavailable|not available|no data|not recorded|not supplied|not connected|not set|not stated|unknown|missing|none|pending|awaiting|no [a-z ]*(?:feed|text|data|value|reading|warning|score|source))\b[^"'\`]*))\s*`;

const ABSENCE_STRING = String.raw`(?:"${ABSENCE_TEXT}"|'${ABSENCE_TEXT}'|\`${ABSENCE_TEXT}\`)`;
const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
const ANY_STRING = String.raw`(?:"[^"]*"|'[^']*'|\`[^\`]*\`)`;

const FABRICATED_LITERAL =
  String.raw`(?!${ABSENCE_STRING}\s*[,;)}\]:]|${ABSENCE_STRING}\s*$)(?:${ANY_STRING}|${NUMBER}|true|false)`;

/** Two or more Latin words: the shape of an English sentence fragment. */
const ENGLISH_WORDS = String.raw`[A-Za-z][A-Za-z'’,.!?:-]*(?:\s+[A-Za-z][A-Za-z'’,.!?:-]*)+`;

export const FRONTEND_RULES = [
  {
    rule: "default-supplies-a-value",
    re: new RegExp(String.raw`\b(?:${VALUE_IDENT})\s*(?:\|\||\?\?)\s*${FABRICATED_LITERAL}`, "i"),
    why: "a || / ?? default supplying a measurement, verdict, score, provenance field, timestamp or unit. Fall back to an explicit absence marker instead",
    view: "code",
  },
  {
    rule: "default-supplies-a-value",
    re: new RegExp(String.raw`\b(${VALUE_IDENT})\s*\?\s*[^:;?]{0,60}\1[^:;?]{0,40}:\s*${FABRICATED_LITERAL}`, "i"),
    why: "a presence ternary falling back to a literal value",
    view: "code",
  },
  {
    rule: "client-side-threshold",
    re: new RegExp(String.raw`\b(?!\w*${STRUCTURAL}\b)(?:${VALUE_IDENT})\s*(?:>=|<=|>|<)\s*${NUMBER}`, "i"),
    why: "the browser is judging a measurement against its own cut point; banding a value is the risk engine's job",
    view: "codeNoText",
  },
  {
    rule: "hardcoded-agency",
    re: new RegExp(String.raw`\b(?:${AGENCIES})\b`),
    unless: new RegExp(
      String.raw`(?:[=!]==?\s*["'\`](?:${AGENCIES})["'\`])` +
        String.raw`|(?:case\s+["'\`](?:${AGENCIES})["'\`])` +
        String.raw`|(?:["'\`](?:${AGENCIES})["'\`]\s*\|)` +
        String.raw`|(?:\|\s*["'\`](?:${AGENCIES})["'\`])` +
        String.raw`|(?:tier-(?:${AGENCIES}))` +
        String.raw`|(?:"tier\.(?:${AGENCIES})")`,
    ),
    why: "an agency name written into the UI; agency names arrive from the response or not at all",
    view: "code",
  },
  {
    rule: "mock-import",
    re: /(?:import|require|from)\s*\(?\s*["'][^"']*\bmocks?\/[^"']*["']/,
    why: "an import reaching a mock module",
    view: "code",
  },
  {
    rule: "hardcoded-legal-text",
    re: /\b(?:(?:Wildlife\s+Protection|Fisheries|Maritime\s+Zones|Environment\s+Protection)\s+Act|Act,?\s*(?:19|20)\d{2}|CRZ\s+Notification|Section\s+\d+[A-Z]?\s+of\b|Gazette\s+of\s+India|Schedule\s+[IVX]+\b)/,
    why: "a statutory citation written into the UI; law comes from the response or not at all",
    view: "code",
  },
  {
    // JSX text between tags: `>Wave height<`. Components render locale strings.
    rule: "hardcoded-english",
    re: new RegExp(String.raw`>\s*${ENGLISH_WORDS}\s*<`),
    why: "English written into a component; every user-visible string comes from the locale files",
    view: "code",
    only: /^src\/(components|app)\//,
  },
  {
    // JSX text on its own line inside a block: a capitalised sentence with no code punctuation.
    rule: "hardcoded-english",
    re: new RegExp(String.raw`^\s*[A-Z][a-z]+(?:\s+[a-z][a-z'’]*){2,}[.!?]?\s*$`),
    why: "English written into a component; every user-visible string comes from the locale files",
    view: "code",
    only: /^src\/(components|app)\//,
  },
  {
    // User-visible attributes.
    rule: "hardcoded-english",
    re: new RegExp(String.raw`\b(?:placeholder|title|aria-label|alt|label)=["']${ENGLISH_WORDS}["']`),
    why: "English written into a component attribute; every user-visible string comes from the locale files",
    view: "code",
    only: /^src\/(components|app)\//,
  },
];
