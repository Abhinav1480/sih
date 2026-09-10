/**
 * Structural honesty checks: rules about how components fit together, which no
 * line-by-line regex can see.
 *
 * These were `scripts/check-cached-shows-question.mjs` (P0-8), folded in here
 * when the suite was consolidated so there is one entry point rather than
 * three. The rule is unchanged.
 */
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const read = (p) => {
  try {
    return readFileSync(ROOT + p, "utf8");
  } catch {
    return null;
  }
};

/**
 * A cached answer must say WHICH QUESTION produced it.
 *
 * `api.ts` serves a cached response on any network error or 30 s timeout, in
 * any backend mode. With no stored response that is the bundled capture in
 * `lib/backend/fallbackResponse.ts`, which answers exactly one hardcoded
 * question: "Is it safe to venture into the sea tomorrow morning near
 * Kakinada?"
 *
 * Someone offline near Chennai asking about fishing zones got a confident
 * CAUTION / MODERATE / 30-of-100 header, a location readout saying Kakinada, a
 * window of "Tomorrow Morning" and a map centred on 16.9891/82.2475 -- told
 * only that the result was 11 hours old. The staleness was disclosed. The fact
 * that it answered a different question was not, and on a go/no-go safety tool
 * that is the more important of the two.
 */
export function cachedResultShowsItsQuestion() {
  const findings = [];
  const add = (file, why) =>
    findings.push({ file, line: 0, rule: "cached-shows-question", why });

  // 1. StaleWarning must accept and render the question.
  const stale = read("src/components/Offline/StaleWarning.tsx");
  if (stale === null) {
    add("src/components/Offline/StaleWarning.tsx", "is missing entirely");
  } else {
    if (!/queryText/.test(stale)) {
      add(
        "src/components/Offline/StaleWarning.tsx",
        "does not accept a queryText prop, so a cached answer cannot say which question it belongs to"
      );
    } else if (!/\{queryText/.test(stale)) {
      add(
        "src/components/Offline/StaleWarning.tsx",
        "accepts queryText but never renders it"
      );
    }
  }

  // 2. Every place that renders StaleWarning must pass it.
  const page = read("src/app/page.tsx");
  if (page === null) {
    add("src/app/page.tsx", "is missing entirely");
  } else {
    const uses = page.match(/<StaleWarning[\s\S]*?\/>/g) ?? [];
    if (uses.length === 0) {
      add("src/app/page.tsx", "renders no StaleWarning, so staleness is undisclosed");
    }
    uses.forEach((use, i) => {
      if (!/queryText=/.test(use)) {
        add(
          "src/app/page.tsx",
          `StaleWarning #${i + 1} does not pass queryText: ${use
            .replace(/\s+/g, " ")
            .slice(0, 100)}`
        );
      }
    });
  }

  // 3. The question label must exist for every language that has the banner.
  const offline = read("src/lib/i18n/offline.ts");
  if (offline) {
    const banner = (offline.match(/"offline\.cached":/g) ?? []).length;
    const question = (offline.match(/"offline\.cached\.forQuestion":/g) ?? []).length;
    if (question < banner) {
      add(
        "src/lib/i18n/offline.ts",
        `offline.cached.forQuestion is defined for ${question} language(s) but the ` +
          `banner itself for ${banner}. A reader who gets the banner in their ` +
          `language must get the question label too.`
      );
    }
  }

  return findings;
}

export const STRUCTURAL_CHECKS = [cachedResultShowsItsQuestion];
