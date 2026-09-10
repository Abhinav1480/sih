/**
 * The frozen contract captures, bundled into the app.
 *
 * Every file under ./captures/ is a real response ORCA returned at contract
 * 1.4.0, copied from docs/examples/ by tools/bundle_captures.py. They are the
 * data every screen is built against, and one of them is the fallback a fresh
 * install renders with no network -- labelled cached, with its age, never
 * presented as live.
 *
 * Nothing here is hand-written. Placeholder data lives in exactly one place
 * and this is it.
 */

import type { Envelope } from "@/lib/contract/envelope";

import c01 from "./captures/canonical-01-nearest-pfz.json";
import c02 from "./captures/canonical-02-safe-to-venture.json";
import c03 from "./captures/canonical-03-tide-weather-sea.json";
import c04 from "./captures/canonical-04-lightning-cyclone.json";
import c05 from "./captures/canonical-05-chlorophyll-sst.json";
import c06 from "./captures/canonical-06-safest-route.json";
import c07 from "./captures/canonical-07-productivity-decline.json";
import c08 from "./captures/canonical-08-zones-to-avoid.json";

interface CaptureFile {
  _contract_version: string;
  _request: { query: string; user_location: { latitude: number; longitude: number } };
  _status: number;
  response: unknown;
}

export interface BundledCapture {
  file: string;
  query: string;
  response: Envelope;
  /** When the capture was taken. The bundle is a snapshot; this is its age. */
  capturedAt: string;
}

const FILES: Record<string, CaptureFile> = {
  "canonical-01-nearest-pfz.json": c01 as CaptureFile,
  "canonical-02-safe-to-venture.json": c02 as CaptureFile,
  "canonical-03-tide-weather-sea.json": c03 as CaptureFile,
  "canonical-04-lightning-cyclone.json": c04 as CaptureFile,
  "canonical-05-chlorophyll-sst.json": c05 as CaptureFile,
  "canonical-06-safest-route.json": c06 as CaptureFile,
  "canonical-07-productivity-decline.json": c07 as CaptureFile,
  "canonical-08-zones-to-avoid.json": c08 as CaptureFile,
};

function toBundled(file: string, doc: CaptureFile): BundledCapture {
  const response = doc.response as Envelope;
  return {
    file,
    query: doc._request.query,
    response,
    capturedAt: response.meta?.generated_at ?? "",
  };
}

export const BUNDLED_CAPTURES: BundledCapture[] = Object.entries(FILES).map(([f, d]) => toBundled(f, d));

export function bundledCapture(file: string): BundledCapture | null {
  const doc = FILES[file];
  return doc ? toBundled(file, doc) : null;
}

/** The capture whose query best matches, by shared words. Null when nothing overlaps. */
export function bundledCaptureForQuery(query: string): BundledCapture | null {
  const words = new Set(query.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  let best: { overlap: number; capture: BundledCapture } | null = null;
  for (const capture of BUNDLED_CAPTURES) {
    const theirs = capture.query.toLowerCase().split(/\W+/);
    const overlap = theirs.filter((w) => words.has(w)).length;
    if (overlap && (!best || overlap > best.overlap)) best = { overlap, capture };
  }
  return best?.capture ?? null;
}

/** The eight canonical questions, for the suggestion chips. */
export const CANONICAL_QUESTIONS: string[] = BUNDLED_CAPTURES.map((c) => c.query);
