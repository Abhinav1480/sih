import { EvidenceRecord } from "@/lib/types";

/**
 * FE-04 — Evidence & Provenance helpers.
 *
 * CONTRACT NOTE: the authoritative EvidenceRecord (backend/app/models/schemas.py
 * and frontend/src/lib/types.ts) carries exactly:
 *   id, provider, dataset, variable, value, unit, location, coordinates?,
 *   observation_or_forecast_time, retrieval_time, status, reliability_notes?
 *
 * The FE-04 brief references additional idealized fields (provider_tier,
 * source_url, valid_from, valid_to). Those are NOT part of the real contract,
 * so we NEVER fabricate them. Instead we read them DEFENSIVELY: if a future
 * backend ever includes them, they render exactly as received; if absent, the
 * corresponding row is simply omitted (not shown as a misleading placeholder).
 */

/** Copy for fields the contract always defines but that may be empty. */
export const FIELD_MISSING = "Not available";
/** Copy for a missing provider / provider tier, per the brief. */
export const SOURCE_UNAVAILABLE = "Source unavailable";

/** Dedupe evidence records by id; records may arrive out of order / repeated. */
export function dedupeById(records: EvidenceRecord[] | undefined): EvidenceRecord[] {
  if (!records || records.length === 0) return [];
  const seen = new Set<string>();
  const out: EvidenceRecord[] = [];
  for (const r of records) {
    const key = r?.id ?? JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Read an optional extended provenance field that is not in the core contract.
 * Returns the trimmed string only if the backend actually sent a non-empty
 * value — otherwise undefined (so the UI omits the row rather than inventing it).
 */
export function extendedField(
  rec: EvidenceRecord,
  key: "provider_tier" | "source_url" | "valid_from" | "valid_to" | "observed_at"
): string | undefined {
  const v = (rec as unknown as Record<string, unknown>)[key];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

function normalize(s: string | undefined): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Associate a displayed value with its evidence record using ONLY the backend's
 * own `variable` label (no provenance inference). Returns the best match, or
 * null when there is no confident association (caller then shows the full
 * registry rather than pointing at the wrong source).
 */
export function matchRecord(
  records: EvidenceRecord[],
  hint: string | undefined
): EvidenceRecord | null {
  const h = normalize(hint);
  if (!h || records.length === 0) return null;

  const hintTokens = new Set(h.split(" ").filter((t) => t.length > 2));
  let best: EvidenceRecord | null = null;
  let bestScore = 0;

  for (const r of records) {
    const v = normalize(r.variable);
    if (!v) continue;
    if (v === h) return r; // exact label match

    let score = 0;
    for (const t of v.split(" ")) if (hintTokens.has(t)) score += 1;
    if (v.includes(h) || h.includes(v)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 1 ? best : null;
}

export interface ParsedCoordinate {
  lat: number;
  lon: number;
}

/**
 * Parse lat/lon from a record's `coordinates` (preferred) or `location` string.
 * Supports "16.98°N, 82.31°E", "16.98N 82.31E", and plain "16.98, 82.31".
 * Returns null when no valid pair is present (caller then hides "View on map").
 */
export function parseCoordinates(rec: EvidenceRecord): ParsedCoordinate | null {
  const src = `${rec.coordinates || ""} ${rec.location || ""}`.trim();
  if (!src) return null;

  const dir = src.match(
    /(-?\d+(?:\.\d+)?)\s*°?\s*([NS])[,\s]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])/i
  );
  if (dir) {
    let lat = parseFloat(dir[1]);
    let lon = parseFloat(dir[3]);
    if (/s/i.test(dir[2])) lat = -lat;
    if (/w/i.test(dir[4])) lon = -lon;
    if (isValid(lat, lon)) return { lat, lon };
  }

  const plain = src.match(/(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)/);
  if (plain) {
    const lat = parseFloat(plain[1]);
    const lon = parseFloat(plain[2]);
    if (isValid(lat, lon)) return { lat, lon };
  }
  return null;
}

function isValid(lat: number, lon: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  );
}
