# ORCA API Contract

**Contract version: 1.3.0**
Machine-readable definition: [`backend/app/models/envelope.py`](../backend/app/models/envelope.py)

This document is the agreement between the ORCA backend and the ORCA frontend.
It is owned by the backend track and consumed by the frontend track.

> **Changing this document is a breaking change.**
> Renaming a field, removing a field, or narrowing an enum requires: a comment
> on the open frontend issue, a `CONTRACT_VERSION` bump in `envelope.py`, and a
> changelog entry at the bottom of this file — *before* the change is
> implemented. Adding an optional field with a default is backwards compatible
> and needs none of that.

---

## 1. `POST /api/query`

The single natural-language entry point.

### Request

```json
{
  "query": "Is it safe to venture into the sea tomorrow morning?",
  "conversation_id": "optional-session-uuid",
  "preferred_language": "en",
  "user_location": { "latitude": 17.6868, "longitude": 83.2185 }
}
```

Only `query` is required. An empty or whitespace-only `query` returns `400`.

`conversation_id` carries multi-turn context: when supplied, the planner
inherits the previous turn's resolved location so a follow-up like
*"what about tomorrow?"* resolves against the same place.

`user_location` is the device position. When the query names no place it is
the location the planner resolves against ("my area", "near me", or simply a
query with no place on a fresh conversation). The conversation's last location
still wins for a follow-up. With no place in the text, no conversation and no
`user_location`, the response is a clarification: `intent` is
`needs_clarification`, `answer.headline` is the question to put to the user,
`answer.verdict` is `NOT_APPLICABLE`, `risk` is `null` and `evidence` is `[]`.
Send `user_location` whenever the device has one.

### Response — the envelope

```jsonc
{
  "request_id": "…",          // this analysis
  "session_id": "…",          // the conversation; pass back as conversation_id
  "intent": "marine_safety",
  "language": "en",           // ISO 639-1, auto-detected from the query
  "answer":   { … },          // §2
  "risk":     { … } | null,   // §3
  "cards":    [ … ],          // §4  — the discriminated union
  "layers":   [ … ],          // §5  — map layers
  "evidence": [ … ],          // §6  — provenance
  "alerts":   [ … ],          // §7
  "trace":    [ … ],          // §8  — agent reasoning
  "meta":     { … }           // §9
}
```

Nothing in the envelope is optional-by-omission: every key above is always
present. Absent data is `null` (for `risk`) or `[]` (for the arrays).

### Deprecated aliases (1.3.0, one release only)

Three pre-envelope fields are also emitted at the top level so the frontend
built against the old shape keeps rendering while it migrates:

| Alias | Derived from | Read instead |
| :--- | :--- | :--- |
| `executive_summary` | `answer.narrative` | `answer.narrative` |
| `visualization_plan` | `intent`, `layers[]`, `meta.location` | the cards and layers themselves |
| `agent_activity[]` | `trace[]` without the final `done` event | `trace[]` |

They are **views of the envelope**, computed from it after it is built; they
can never carry a value the envelope does not. They are marked `deprecated` in
the JSON schema and are removed at contract 2.0.0 once the frontend reads the
envelope directly. Nothing else from the old shape is emitted: `recommendation`,
`risk_assessment`, `route_analysis`, `fishing_zones`, `comparison_data`,
`historical_trend`, `spatial_what_if`, `route_comparison`, `map_layers`,
`ocean_conditions` and `weather_conditions` have envelope equivalents
(`cards[]`, `risk`, `layers[]`, `evidence[]`) or no equivalent yet.

---

## 2. `answer`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `headline` | string | One line. Must stand alone in a notification or SMS. |
| `verdict` | enum | `GO` \| `CAUTION` \| `NO_GO` \| `NOT_APPLICABLE` |
| `narrative` | string | Full prose, in `language`. |
| `confidence` | int 0–100 | Mirrors `risk.confidence` when a risk block exists. |

`verdict` is derived **deterministically** from the risk band and the
regulatory state. A language model never authors it:

| Condition | Verdict |
| :--- | :--- |
| Position inside a marine protected area | `NO_GO` (overrides the band) |
| Band `LOW` | `GO` |
| Band `MODERATE` | `CAUTION` |
| Band `HIGH` or `SEVERE` | `NO_GO` |
| No risk block | `NOT_APPLICABLE` |

---

## 3. `risk`

`null` when the query needed no safety assessment. Otherwise:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `score` | int 0–100 | |
| `band` | enum | `LOW` (<30) \| `MODERATE` (<55) \| `HIGH` (<75) \| `SEVERE` |
| `factors[]` | RiskFactor | `name`, `value`, `points_added`, `description` |
| `triggered_rules[]` | string | Threshold rules that fired |
| `missing_inputs[]` | string | Feeds that did not answer |
| `confidence` | int 0–100 | Falls with evidence coverage |
| `data_quality` | string | Human-readable coverage statement |

**Guarantee the frontend may rely on:**

```
sum(factors[].points_added) == score
```

Asserted in `test_risk_engine.py` and again per-response in
`test_envelope_contract.py`. Render the factor list as a literal breakdown of
the headline number; it will always add up.

**Missing inputs raise the score, they never lower it.** The score is
renormalised over the weights actually observed, so an absent feed is imputed
at the mean of the observed factors rather than counted as calm water. A
partial response is therefore *less confident*, not *safer*. Show
`missing_inputs` and the reduced `confidence` whenever they are non-empty.

---

## 4. `cards[]`

A discriminated union on `type`. Switch on `card.type`; do not infer the card
from `intent`. Every card carries:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | Stable within a response |
| `type` | enum | The discriminator |
| `title` | string | |
| `evidence_ids[]` | string | Ids into `evidence[]` |

`evidence_ids` may be **empty**, which honestly means *no provenance record
exists for this card yet*. It will never cite an id that is absent from
`evidence[]`. Do not fabricate a source when the array is empty — render the
card without a provenance chip.

| `type` | Additional fields |
| :--- | :--- |
| `risk_summary` | `score`, `band`, `verdict`, `factors[]`, `triggered_rules[]` |
| `pfz_ranking` | `zones[]`, `rejected_reasons[]` |
| `route_plan` | `origin`, `destination`, `total_distance_km`, `estimated_transit_hours`, `waypoints[]`, `crosses_protected_waters`, `protected_areas_intersected[]`, `overall_route_risk`, `recommended_action` |
| `comparison_table` | `location_a`, `location_b`, `metrics[]`, `verdict_text` |
| `timeseries_chart` | `period_description`, `points[]`, `significant_change_detected`, `change_reasons[]` |
| `geofence_warning` | `severity`, `zone_name`, `authority?`, `restriction_level?`, `distance_km?`, `bearing_deg?`, `detail` |
| `advisory_text` | `body` |

A `geofence_warning` is emitted **whenever a restriction is present**,
independent of intent — a fishing-zone query that ranks a zone inside a
sanctuary still surfaces the warning. Never suppress it based on `intent`.

---

## 5. `layers[]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id`, `name` | string | |
| `kind` | enum | `geojson` \| `wms` |
| `geometry_type` | enum? | `point` \| `polygon` \| `linestring` |
| `features[]` | GeoJSON Feature | Populated when `kind="geojson"` |
| `url`, `wms_params` | string?, map | Populated when `kind="wms"` |
| `visible_by_default`, `color`, `legend_title`, `legend_unit` | | Render hints |
| `attribution` | string? | Display verbatim when present |
| `provider_tier` | enum | See §6 |

ORCA's own derived geometries are `kind="geojson"` and tier `FALLBACK`. As of
1.2.0 every response also carries **real ISRO layers** from NRSC Bhuvan as
`kind="wms"`, tier `ISRO`, with `attribution: "ISRO / NRSC Bhuvan"`:

| `id` | WMS layer | What it is |
| :--- | :--- | :--- |
| `layer_bhuvan_coralreefs` | `moef:coralreefs` | Ecologically sensitive zone (req. 8) |
| `layer_bhuvan_mangroves` | `moef:mangroves` | Ecologically sensitive zone (req. 8) |
| `layer_bhuvan_coastal_lulc` | `coastal:cps_lulc_mod` | Coastal land use / cover |
| `layer_bhuvan_islands_ec` | `iland:island_ec_190615` | East coast islands |

Render a `wms` layer with `url` + `wms_params` through the map library's WMS
tile layer; there are no inline `features`. Display `attribution` verbatim.
The tiles come from NRSC, not from ORCA.

---

## 6. `evidence[]` — provenance

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | Referenced by `cards[].evidence_ids` |
| `provider` | string | The source that produced the value |
| `provider_tier` | enum | `ISRO` \| `NATIONAL` \| `FALLBACK` |
| `dataset`, `variable`, `value`, `unit` | string | |
| `location`, `coordinates` | string | |
| `observation_or_forecast_time`, `retrieval_time` | string | |
| `status` | enum | `LIVE` \| `FORECAST` \| `CACHED` \| `HISTORICAL` \| `DEMO` \| `UNAVAILABLE` |
| `reliability_notes` | string? | True for how the value was produced |

### Nullable observation values

`sea_surface_temp_c`, `ocean_current_speed_m_s` and `ocean_current_direction_deg`
are **nullable**, and `TimeSeriesPoint.sst_c` with them. A provider that does
not carry a variable returns `null` for it and **no evidence record is emitted
for that variable at all**.

Render a null as an explicit "unavailable", never as a zero or a dash that
could be mistaken for a reading. A missing value is honest and detectable; the
constant that used to fill this gap was neither.

### The golden rule

**Never label a fallback source as ISRO.** The frontend must display
`provider` and `provider_tier` exactly as received and must never infer,
default, or upgrade a tier.

| Tier | Meaning |
| :--- | :--- |
| `ISRO` | An ISRO / NRSC product: Bhuvan, MOSDAC, Bhoonidhi, INSAT, Oceansat-3, SCATSAT, SARAL-AltiKa |
| `NATIONAL` | Another Indian national authority: INCOIS, IMD, MoEFCC |
| `FALLBACK` | Everything else: foreign models (Open-Meteo, Copernicus) **and** ORCA's own synthetic demo values |

Tier is assigned by `backend/app/providers/provenance.py` on two rules:

1. **The weakest ingredient decides.** A value blended from an ISRO product
   and a European model is `FALLBACK`.
2. **Synthetic is never promoted.** A demo value is `FALLBACK` regardless of
   what it emulates, and its `reliability_notes` say so explicitly.

There is deliberately no `DEMO` tier: syntheticity is carried by `status`, so
tier stays a pure statement about authority.

---

## 7. `alerts[]`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | |
| `type` | enum | `weather` \| `wave` \| `lightning` \| `cyclone` \| `geofence` |
| `severity` | enum | `INFO` \| `CAUTION` \| `WARNING` \| `SEVERE` |
| `title`, `description` | string | |
| `issued_at`, `valid_until` | datetime, datetime? | |
| `recommended_action` | string? | |
| `evidence_ids[]` | string | |
| `source`, `provider_tier` | string, enum | Same rule as §6 |

As of contract 1.1.0 these are **request-scoped**: derived from the observations
of this response. `lightning` and `cyclone` are declared in the enum but not
yet produced — the data is not modelled (see §11). The background monitor that
pushes alerts without a request behind them arrives in BE-07.

---

## 8. `trace[]` — agent reasoning

| Field | Type |
| :--- | :--- |
| `seq` | int, 1-based |
| `stage` | `planner` \| `agent_start` \| `agent_message` \| `agent_result` \| `replan` \| `correlation` \| `risk` \| `synthesis` \| `done` \| `error` |
| `agent`, `action` | string |
| `tool` | string? |
| `duration_ms` | int |
| `detail` | string? |
| `status` | string |
| `timestamp` | datetime |

These are the **exact** event shapes the SSE stream at `/api/query/stream`
will emit in BE-04. Build the trace renderer against this shape once and it
will work for both the batch response and the live stream.

---

## 9. `meta`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `mode` | string | `DEMO` or `LIVE` |
| `query_text` | string | The query, echoed verbatim |
| `contract_version` | string | Compare against your expectation and warn on mismatch |
| `generated_at` | datetime | |
| `location`, `temporal` | object | Resolved spatial and temporal context |
| `limitations[]` | string | Display in the report / drawer |
| `degraded` | bool | **True when any value came from a fallback or synthetic source** |
| `notes[]` | string | Why it is degraded, and what was missing |

`degraded` is `true` for every response in `DEMO` mode. Show an honest banner
when it is set — this is the flag that keeps ORCA from ever *looking* more
authoritative than it is.

---

## 10. Other endpoints

| Endpoint | Body | Returns |
| :--- | :--- | :--- |
| `POST /api/export/report` | The **envelope**, unmodified | `{ report_id, markdown_content }` |
| `GET /api/conversations` | — | Recent sessions |
| `GET /api/conversations/{id}/analyses` | — | Stored envelopes for that session |
| `GET /api/layers` | — | Static base geometry |
| `GET /api/alerts` | — | Alert store |
| `GET /health` | — | Liveness |

`/api/export/report` takes back the same envelope the user was shown, so the
printable report can never disagree with the screen.

---

## 11. Known gaps at contract 1.0.0

Declared here so nothing in this document overclaims:

| Gap | Effect | Closing issue |
| :--- | :--- | :--- |
| Only Bhuvan is reachable without credentials | Map layers are `ISRO`; every *observation* is still `FALLBACK` (Open-Meteo in `LIVE`, synthetic in `DEMO`). MOSDAC and Bhoonidhi adapters exist and are skipped with a stated reason until a token or cached granule is present. | Credentials / granule cache |
| Tide has no provider | Reported unavailable, by name, in `meta.limitations` and the trace | Tidal constituent table |
| Lightning and cyclone tracking have no provider | Reported unavailable, by name. The wind-derived alert level is **not** presented as a lightning feed. `alerts[].type` never takes `lightning` or `cyclone` today. | MOSDAC token |
| `alerts[]` is request-scoped | No proactive push | BE-07 |
| IMBL / EEZ geometry absent | Only MPA polygons drive `geofence_warning` | BE-05 |
| Route is sampled, not optimised | `route_plan` is a corridor, not a least-cost path | BE-06 |
| Causal reasoning absent | Canonical query 7 returns a trend, not a cause | BE-08 |
| Narrative localisation is templated | `language` is detected and honoured; vocabulary is limited | BE-09 |

---

## Changelog

| Version | Change |
| :--- | :--- |
| 1.3.0 | Non-breaking. Deprecated top-level aliases `executive_summary`, `visualization_plan` and `agent_activity` are emitted for one release, computed from the envelope (see §1). `intent` may be `needs_clarification`, in which case `answer.headline` is the question and `risk` is `null`; `user_location` on the request is honoured as the spatial fallback. `RouteWaypoint.wave_height_m` and `wind_knots` inside `route_plan` are nullable: a missing feed is `null`, never a stand-in number. |
| 1.2.0 | Non-breaking. `layers[]` now includes `kind="wms"` descriptors for four ISRO Bhuvan layers, tier `ISRO`. `trace[]` gains `status: "SKIPPED"` events naming every provider the chain tried and why it was not used. `meta.limitations` names tide and lightning/cyclone gaps explicitly. |
| 1.1.0 | **Breaking.** `OceanObservation.sea_surface_temp_c`, `ocean_current_speed_m_s`, `ocean_current_direction_deg` and `TimeSeriesPoint.sst_c` are now nullable. They previously held hardcoded constants that were returned identically for every coordinate; a provider without coverage now returns `null` and emits no evidence record for that variable. Consumers must render null as "unavailable". |
| 1.0.0 | Initial contract. `/api/query` returns the envelope; `EvidenceRecord` gains `provider_tier`; `/api/export/report` takes the envelope. |
