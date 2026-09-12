/**
 * The recorded reference responses, and the one rule that picks one for a
 * question in capture mode.
 *
 * These are verbatim API captures from docs/examples/ (copied by
 * scripts/sync-captures.mjs, which fails the build if the copies drift).
 * They are the only placeholder data in the app, and they are never
 * presented as a live answer: every capture-mode turn shows the question the
 * recording actually answered, its capture date, and the DEMO / degraded
 * flags the backend itself set inside the envelope.
 */
import type { AlertBulletin, Capture, Envelope, QueryRequest } from "@/lib/types";
import c01 from "@/captures/canonical-01-nearest-pfz.json";
import c02 from "@/captures/canonical-02-safe-to-venture.json";
import c03 from "@/captures/canonical-03-tide-weather-sea.json";
import c04 from "@/captures/canonical-04-lightning-cyclone.json";
import c05 from "@/captures/canonical-05-chlorophyll-sst.json";
import c06 from "@/captures/canonical-06-safest-route.json";
import c07 from "@/captures/canonical-07-productivity-decline.json";
import c08 from "@/captures/canonical-08-zones-to-avoid.json";
import conv from "@/captures/conversation.json";
import alerts from "@/captures/alerts.json";

/** The demo clock the captures were taken under (docs/examples/README.md). */
export const CAPTURE_DATE = "2026-09-09";

type Cap = Capture<Envelope>;

export const CANONICAL: readonly Cap[] = [c01, c02, c03, c04, c05, c06, c07, c08] as unknown as Cap[];
export const CONVERSATION: readonly Cap[] = (conv as { turns: unknown[] }).turns as Cap[];

export interface Picked {
  response: Envelope;
  question: string;
}

const questionOf = (c: Cap) => String((c._request as { query?: string }).query ?? c.response.meta.query_text);

/**
 * Keyword routing over the eight canonical questions plus the three-turn
 * conversation. Deliberately simple and deliberately visible: the UI prints
 * `question` beside the answer so a mismatch is disclosed, not hidden.
 */
export function pickCapture(req: QueryRequest): Picked {
  const q = req.query.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (req.conversation_id) {
    if (has("alternative", "instead", "other route", "different route")) return wrap(CONVERSATION[1]);
    if (has("compare", "comparison", "versus", " vs")) return wrap(CONVERSATION[2]);
  }
  if (has("route", "passage", "way to", "safest", "sail to", "voyage")) return wrap(CANONICAL[5]);
  if (has("avoid", "restricted", "protected", "sanctuary", "no-go zone", "prohibited")) return wrap(CANONICAL[7]);
  if (has("lightning", "cyclone", "storm", "thunder")) return wrap(CANONICAL[3]);
  if (has("chlorophyll", "surface temperature", "sst", "plankton")) return wrap(CANONICAL[4]);
  if (has("decline", "trend", "history", "last week", "last month", "changed", "productivity", "over time")) return wrap(CANONICAL[6]);
  if (has("fishing zone", "pfz", "where to fish", "fish today", "which area", "nearest zone", "fishing ground", "catch")) return wrap(CANONICAL[0]);
  if (has("tide", "conditions", "weather", "sea state", "how is the sea", "how's the sea", "current")) return wrap(CANONICAL[2]);
  return wrap(CANONICAL[1]);
}

function wrap(c: Cap): Picked {
  // A fresh object per turn so React state never aliases the module constant.
  return { response: structuredClone(c.response), question: questionOf(c) };
}

export function captureAlerts(): AlertBulletin[] {
  return structuredClone((alerts as unknown as Capture<AlertBulletin[]>).response);
}

/** The landing page example: the safe-to-venture capture. */
export const LANDING_EXAMPLE: Picked = wrap(CANONICAL[1]);
