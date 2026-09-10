import type { OrcaAnalysisResponse, RiskFactor } from "../types";

export interface TripCard {
  savedAt: string;
  queryText: string;
  verdict?: string;
  band?: string;
  score?: number;
  location?: { name: string; latitude: number; longitude: number };
  temporal?: { label: string; start_time?: string; end_time?: string };
  conditions: { wave_m?: number; wind_kt?: number; swell_m?: number; visibility_km?: number };
  forecastNote?: string;
  boundaries: { name: string; distance_km?: number; restriction?: string }[];
  emergencyContacts: { name: string; number: string }[];
  decisionExplanation: string;
  factors: { name: string; value: string; points_added: number }[];
  provider?: string;
  provider_tier?: string;
  degraded?: boolean;
}

/** Constants. `name` is an i18n key (offline.contact.*); `number` is rendered verbatim. */
export const EMERGENCY_CONTACTS: TripCard["emergencyContacts"] = [
  { name: "offline.contact.icg", number: "1554" },
  { name: "offline.contact.fishermen", number: "1800-425-1554" },
  { name: "offline.contact.port", number: "" }, // no public number: UI shows "see harbour board"
  { name: "offline.contact.incois", number: "040-23886047" },
];

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const d = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * d) / 2) ** 2 +
    Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin(((lon2 - lon1) * d) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const firstNumber = (s: unknown): number | undefined => {
  const m = String(s ?? "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : undefined;
};

/** Build the offline trip card from backend fields only; no prose is invented here. */
export function buildTripCard(analysis: OrcaAnalysisResponse): TripCard {
  const a = analysis as OrcaAnalysisResponse & Record<string, any>;
  const risk = a.risk ?? null;
  const riskCard = (a.cards ?? []).find((c: any) => c?.type === "risk_summary") as any;
  const loc = a.meta?.location ?? a.location;
  const tmp = a.meta?.temporal ?? a.temporal;
  const evidence: any[] = a.evidence ?? [];
  const ev = (re: RegExp) => evidence.find((e) => re.test(String(e?.variable ?? e?.dataset ?? "")));

  const conditions: TripCard["conditions"] = {
    wave_m: a.ocean_conditions?.significant_wave_height_m ?? firstNumber(ev(/wave height/i)?.value),
    swell_m: a.ocean_conditions?.swell_height_m ?? firstNumber(ev(/swell/i)?.value),
    wind_kt: a.weather_conditions?.wind_speed_knots ?? firstNumber(ev(/wind/i)?.value),
    visibility_km: a.weather_conditions?.visibility_km ?? firstNumber(ev(/visib/i)?.value),
  };

  const boundaries: TripCard["boundaries"] = [];
  for (const layer of a.layers ?? []) {
    if (layer?.kind !== "geojson") continue;
    for (const f of layer.features ?? []) {
      const p = f?.properties ?? {};
      const gtype: string = f?.geometry?.type ?? "";
      if (!/polygon/i.test(gtype) || !p.restriction) continue;
      const ring: number[][] | undefined =
        gtype === "MultiPolygon" ? f.geometry?.coordinates?.[0]?.[0] : f.geometry?.coordinates?.[0];
      let distance_km: number | undefined;
      if (loc && Array.isArray(ring) && ring.length) {
        // ponytail: distance to ring centroid, not nearest edge; upgrade to point-to-polygon if it matters
        const [cx, cy] = ring
          .reduce(([x, y], [px, py]) => [x + px, y + py], [0, 0])
          .map((v) => v / ring.length);
        distance_km = Math.round(haversineKm(loc.latitude, loc.longitude, cy, cx));
      }
      boundaries.push({ name: String(p.name ?? layer.name), restriction: String(p.restriction), distance_km });
    }
  }

  const factors: RiskFactor[] =
    risk?.factors ?? riskCard?.factors ?? a.risk_assessment?.contributing_factors ?? [];
  const rules: string[] = risk?.triggered_rules ?? riskCard?.triggered_rules ?? [];
  const first = evidence[0];

  return {
    savedAt: new Date().toISOString(),
    queryText: a.meta?.query_text ?? a.query_text ?? "",
    verdict: a.answer?.verdict ?? riskCard?.verdict,
    band: risk?.band ?? riskCard?.band ?? a.risk_assessment?.category,
    score: risk?.score ?? riskCard?.score ?? a.risk_assessment?.overall_score,
    location: loc ? { name: loc.name, latitude: loc.latitude, longitude: loc.longitude } : undefined,
    temporal: tmp ? { label: tmp.label, start_time: tmp.start_time, end_time: tmp.end_time } : undefined,
    conditions,
    forecastNote: [risk?.data_quality, ...(a.meta?.notes ?? [])].filter(Boolean).join(" · ") || undefined,
    boundaries,
    emergencyContacts: EMERGENCY_CONTACTS,
    decisionExplanation: rules.length ? rules.join(" ") : a.recommendation ?? "",
    factors: factors.map((f) => ({ name: f.name, value: f.value, points_added: f.points_added })),
    provider: first?.provider,
    provider_tier: a.provider_tier ?? first?.provider_tier,
    degraded: a.meta?.degraded,
  };
}
