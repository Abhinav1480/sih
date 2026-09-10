import { EvidenceRecord } from "@/lib/types";

/**
 * FE-04 demo/verification fixtures for the Evidence & Provenance experience.
 *
 * These exercise the EvidencePanel in DEMO mode without a backend:
 *  - every DataFreshness status: LIVE, FORECAST, CACHED, HISTORICAL, DEMO
 *  - extended/idealized provenance (provider_tier, source_url, valid_from/to)
 *    which the real contract does NOT include — present here only to prove the
 *    panel renders them exactly IF a backend ever sends them.
 *  - provider tiers: ISRO, NATIONAL, FALLBACK
 *  - edge cases: missing provider, missing tier, missing source URL,
 *    missing reliability note, missing coordinates.
 *
 * Do NOT import this into production components — it is wired only through the
 * demo surface (styleguide) so the real API path stays the single source.
 */

/** Extended shape: core contract + optional idealized fields for demo only. */
export type MockEvidenceRecord = EvidenceRecord & {
  provider_tier?: string;
  source_url?: string;
  valid_from?: string;
  valid_to?: string;
};

export const mockEvidenceRecords: MockEvidenceRecord[] = [
  {
    id: "ev-live-01",
    provider: "INCOIS",
    provider_tier: "NATIONAL",
    dataset: "Ocean State Forecast — wave model",
    variable: "Significant Wave Height",
    value: "3.2",
    unit: "m",
    location: "Offshore Kakinada",
    coordinates: "16.980°N, 82.310°E",
    observation_or_forecast_time: "11 Sep 2026 00:00 UTC",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    valid_from: "11 Sep 2026 00:00 UTC",
    valid_to: "11 Sep 2026 09:00 UTC",
    status: "LIVE",
    reliability_notes: "Validated against Deep Sea AD07 buoy; ±0.2 m nominal error.",
    source_url: "https://incois.gov.in/portal/osf/",
  },
  {
    id: "ev-forecast-01",
    provider: "Open-Meteo",
    provider_tier: "FALLBACK",
    dataset: "Marine Forecast API",
    variable: "Wind Speed",
    value: "21.9",
    unit: "kt",
    location: "Offshore Kakinada",
    coordinates: "16.980°N, 82.310°E",
    observation_or_forecast_time: "11 Sep 2026 03:00 UTC",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    status: "FORECAST",
    reliability_notes: "Open dataset; used as fallback when national feed is unavailable.",
    // no source_url → "View source" must be hidden
  },
  {
    id: "ev-isro-01",
    provider: "ISRO / MOSDAC",
    provider_tier: "ISRO",
    dataset: "OceanSat-3 chlorophyll-a",
    variable: "Chlorophyll-a Concentration",
    value: "1.24",
    unit: "mg/m³",
    location: "PFZ Hotspot 1",
    coordinates: "17.410°N, 83.010°E",
    observation_or_forecast_time: "10 Sep 2026 08:15 UTC",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    status: "CACHED",
    reliability_notes: "Satellite-derived; cached from last cloud-free pass.",
    source_url: "https://mosdac.gov.in/",
  },
  {
    id: "ev-historical-01",
    provider: "IMD",
    provider_tier: "NATIONAL",
    dataset: "Cyclone climatology archive",
    variable: "Sea Surface Temperature",
    value: "28.4",
    unit: "°C",
    location: "Bay of Bengal shelf",
    coordinates: "16.500°N, 82.500°E",
    observation_or_forecast_time: "Sep 2016–2025 mean",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    status: "HISTORICAL",
    reliability_notes: "10-year monthly climatological mean.",
  },
  {
    id: "ev-dataset-01",
    provider: "WII / MoEFCC",
    provider_tier: "NATIONAL",
    dataset: "Protected Areas of India",
    variable: "Marine Protected Area boundary",
    value: "Coringa Wildlife Sanctuary",
    unit: "",
    location: "Godavari estuary",
    coordinates: "16.760°N, 82.350°E",
    observation_or_forecast_time: "Gazette notification 1978",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    status: "DEMO",
    reliability_notes: "Boundary digitised from Wildlife Protection Act schedule.",
    source_url: "https://wii.gov.in/",
  },
  // ── Edge cases ──────────────────────────────────────────────────────────
  {
    id: "ev-missing-provider",
    provider: "", // missing provider → "Source unavailable"
    dataset: "Unattributed buoy relay",
    variable: "Swell Period",
    value: "11",
    unit: "s",
    location: "Unknown station",
    coordinates: "", // missing coordinates → no "View on map"
    observation_or_forecast_time: "11 Sep 2026 00:00 UTC",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    status: "DEMO",
    // no reliability_notes → "Not available"
  },
  {
    id: "ev-missing-tier",
    provider: "Local Harbour Office",
    // no provider_tier → tier row omitted (contract has no tier field)
    dataset: "Manual port log",
    variable: "Visibility",
    value: "8",
    unit: "km",
    location: "Visakhapatnam Port",
    coordinates: "17.686°N, 83.218°E",
    observation_or_forecast_time: "10 Sep 2026 11:30 UTC",
    retrieval_time: "10 Sep 2026 12:04 UTC",
    status: "CACHED",
    reliability_notes: "Manually logged; not independently verified.",
    // no source_url
  },
];
