import { Preferences } from "@capacitor/preferences";
import type { OrcaAnalysisResponse } from "../types";
import type { TripCard } from "./tripCard";
import { t } from "../i18n";

/**
 * Tiny JSON key/value store on top of @capacitor/preferences.
 * Works in the browser too (Preferences falls back to localStorage).
 */
export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) });
  } catch {
    /* storage full or unavailable: caller treats as not cached */
  }
}

export const KEYS = {
  LAST_RESPONSE: "orca.lastResponse",
  TRIP_CARD: "orca.tripCard",
  VESSEL_PROFILE: "orca.vesselProfile",
  BACKEND_MODE: "orca.backendMode",
  BACKEND_LOCAL_URL: "orca.backendLocalUrl",
  BACKEND_DEPLOYED_URL: "orca.backendDeployedUrl",
  UI_MODE: "orca.uiMode",
  LANG: "orca.lang",
} as const;

export interface CachedResponse {
  response: OrcaAnalysisResponse;
  /** ISO timestamp of when this response was received from the backend. */
  savedAt: string;
}

export const saveLastResponse = (response: OrcaAnalysisResponse) =>
  setJSON(KEYS.LAST_RESPONSE, { response, savedAt: new Date().toISOString() } satisfies CachedResponse);

export const loadLastResponse = () => getJSON<CachedResponse>(KEYS.LAST_RESPONSE);

export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
export const isStale = (savedAt: string) => Date.now() - new Date(savedAt).getTime() > STALE_AFTER_MS;

// ── Track D: trip card, vessel profile, age formatting ─────────────────────
export const saveTripCard = (card: TripCard) => setJSON(KEYS.TRIP_CARD, card);
export const loadTripCard = () => getJSON<TripCard>(KEYS.TRIP_CARD);

export interface VesselProfile {
  name?: string;
  type?: string;
  length_m?: number;
  crew?: number;
  registration?: string;
}
export const saveVesselProfile = (profile: VesselProfile) => setJSON(KEYS.VESSEL_PROFILE, profile);
export const loadVesselProfile = () => getJSON<VesselProfile>(KEYS.VESSEL_PROFILE);

/** "just now" / "3 min ago" / "2 h 14 min ago" / "1 d 3 h ago", localized via t(). */
export function formatAge(iso: string, lang: string = "en"): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return t("offline.age.justNow", lang);
  if (mins < 60) return t("offline.age.min", lang, { m: mins });
  const h = Math.floor(mins / 60);
  if (h < 24) return t("offline.age.hm", lang, { h, m: mins % 60 });
  return t("offline.age.dh", lang, { d: Math.floor(h / 24), h: h % 24 });
}
