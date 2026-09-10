#!/usr/bin/env node
/**
 * Build gate: a cached answer must say which question produced it.
 *
 * `api.ts` serves a cached response on ANY network error or 30 s timeout, in
 * any backend mode. When no previous response has been stored, that is the
 * bundled capture in `lib/backend/fallbackResponse.ts`, which answers exactly
 * one question, hardcoded at its `meta.query_text`:
 *
 *     "Is it safe to venture into the sea tomorrow morning near Kakinada?"
 *
 * Someone offline near Chennai asking "Where are the fishing zones off
 * Chennai?" got a confident CAUTION / MODERATE / 30-of-100 header, a location
 * readout saying Kakinada, a time window of "Tomorrow Morning", a map centred
 * on 16.9891/82.2475 -- and a banner telling them only that the result was
 * 11 hours old.
 *
 * The staleness was disclosed. The fact that it answered a different question
 * was not, and on a go/no-go safety tool that is the more important of the two.
 */
import { readFileSync } from "node:fs";

const base = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const failures = [];

const read = (p) => {
  try {
    return readFileSync(base + p, "utf8");
  } catch {
    return null;
  }
};

// 1. StaleWarning must accept and render the question.
const stale = read("src/components/Offline/StaleWarning.tsx");
if (stale === null) {
  failures.push("src/components/Offline/StaleWarning.tsx is missing");
} else {
  if (!/queryText/.test(stale)) {
    failures.push(
      "StaleWarning does not accept a queryText prop, so a cached answer " +
        "cannot say which question it belongs to"
    );
  }
  if (!/\{queryText/.test(stale)) {
    failures.push("StaleWarning accepts queryText but never renders it");
  }
}

// 2. Every place that renders StaleWarning must pass it.
const page = read("src/app/page.tsx");
if (page === null) {
  failures.push("src/app/page.tsx is missing");
} else {
  const uses = page.match(/<StaleWarning[\s\S]*?\/>/g) ?? [];
  if (uses.length === 0) {
    failures.push("page.tsx renders no StaleWarning, so staleness is undisclosed");
  }
  uses.forEach((use, i) => {
    if (!/queryText=/.test(use)) {
      failures.push(
        `page.tsx StaleWarning #${i + 1} does not pass queryText:\n      ` +
          use.replace(/\s+/g, " ").slice(0, 110)
      );
    }
  });
}

// 3. The locale key must exist for every language that has the banner itself.
const offline = read("src/lib/i18n/offline.ts");
if (offline) {
  const banner = (offline.match(/"offline\.cached":/g) ?? []).length;
  const question = (offline.match(/"offline\.cached\.forQuestion":/g) ?? []).length;
  if (question < banner) {
    failures.push(
      `offline.cached.forQuestion is defined for ${question} languages but the ` +
        `banner itself is defined for ${banner}. A reader who gets the banner ` +
        `in their language must get the question label too.`
    );
  }
}

if (failures.length) {
  console.error("\n  BUILD BLOCKED — a cached answer would not say which question it answers\n");
  for (const f of failures) console.error("   • " + f);
  console.error(
    "\n  Serving yesterday's answer to today's question is only honest if the\n" +
      "  reader can see which question it was.\n"
  );
  process.exit(1);
}

console.log("check-cached-shows-question: cached results disclose their question");
