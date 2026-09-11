# ORCA API Contract

**Contract version: 1.5.0** — frozen response shapes; 1.5.0 adds endpoints only
Machine-readable definition: [`backend/app/models/envelope.py`](../backend/app/models/envelope.py)
Reference responses: [`docs/examples/`](examples/) — the real body ORCA returned
for all eight canonical queries, the alerts endpoint and a three-turn
conversation, captured verbatim, not hand-written.

**The response shapes are frozen (since 1.4.0).** `backend/tests/test_api_contract_frozen.py`
re-validates every captured response against the live model *and* compares the
live response field-for-field against the capture, so a field that quietly
leaves the response fails the build even though the old capture would still
validate. Changing the shape is now a deliberate versioned act: edit, re-run
`python backend/scripts/capture_contract_examples.py`, bump `CONTRACT_VERSION`,
and add a changelog entry.

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

The pre-envelope fields the current frontend dereferences are also emitted at
the top level so it keeps rendering while it migrates:

| Alias | Derived from | Read instead |
| :--- | :--- | :--- |
| `executive_summary` | `answer.narrative` | `answer.narrative` |
| `visualization_plan` | `intent`, `layers[]`, `meta.location` | the cards and layers themselves |
| `agent_activity[]` | `trace[]` without the final `done` event | `trace[]` |
| `query_id`, `conversation_id`, `query_text`, `detected_language`, `mode` | `request_id`, `session_id`, `meta.query_text`, `language`, `meta.mode` | those |
| `location`, `temporal`, `limitations[]` | `meta.location`, `meta.temporal`, `meta.limitations` | `meta.*` |
| `recommendation` | `cards[type=advisory_text].body`, else `answer.headline` | the advisory card |
| `needs_clarification`, `clarification_question`, `missing_information` | `intent == "needs_clarification"`, `answer.headline` | `intent`, `answer.headline` |
| `risk_assessment` | `risk` (field-for-field) | `risk` |
| `map_layers[]` | `layers[]` where `kind == "geojson"` (WMS layers are envelope-only) | `layers[]` |
| `fishing_zones[]` | `cards[type=pfz_ranking].zones` | the card |

They are **views of the envelope**, computed from it after it is built; they
can never carry a value the envelope does not. They are marked `deprecated` in
the JSON schema and are removed at contract 2.0.0 once the frontend reads the
envelope directly. Not emitted, because the envelope does not carry them:
`route_analysis`, `route_comparison`, `comparison_data`, `historical_trend`,
`spatial_what_if`, `ocean_conditions`, `weather_conditions`. The UI guards
each of those with a null check, so their cards simply do not render until a
card type carries them.

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

## 11. Known gaps at contract 1.5.0

Declared here so nothing in this document overclaims:

| Gap | Effect | Closing issue |
| :--- | :--- | :--- |
| Wind has no ISRO source | Wave height and SST are `ISRO`/`CACHED` from committed granules. Wind is still `FALLBACK`: the nine OSCAT-3 granules ordered hold zero valid retrievals anywhere in the Indian Ocean because those revolutions cross the Pacific. See `docs/DATA_SOURCES.md` §3. | Re-order the correct revolutions |
| Granules expire | Each product declares its own validity (3 days for a daily scene, 8 for the 8-day composite). Past that the provider declines, the trace says why, and the chain falls to the labelled synthetic model. Set `ORCA_DEMO_NOW` to anchor the demo clock inside the coverage. | Fresh granules |
| Tide has no provider | Reported unavailable, by name, in `meta.limitations` and the trace | Tidal constituent table |
| Lightning and cyclone tracking have no provider | Reported unavailable, by name. The wind-derived alert level is **not** presented as a lightning feed. `alerts[].type` never takes `lightning` or `cyclone` today. | MOSDAC token |
| `alerts[]` is request-scoped | No proactive push | BE-07 |
| IMBL / EEZ geometry absent | Only MPA polygons drive `geofence_warning` | BE-05 |
| Route is geometric, not optimised | `route_plan` is a great-circle corridor whose protected-water crossings are really tested, and whose detour is the smallest offset that actually clears. It is not a least-cost path: no bathymetry, currents, traffic separation or fuel. See `docs/LIMITATIONS.md`. | A* over a cost raster |
| Causal reasoning absent | Canonical query 7 returns a trend, not a cause. Where only one observation covers the window the summary says so rather than reporting "no measurable change". | BE-08 |
| Narrative localisation is templated | `language` is detected and honoured; vocabulary is limited | BE-09 |

---

## 12. Auth (added in 1.5.0)

Identity is a phone number or an email address plus a password. No biometrics:
a face embedding is reversible biometric data under the DPDP Act and is not
something this project can hold safely. Passwords are bcrypt-hashed (cost 12);
access tokens are HS256 JWTs signed with `JWT_SECRET` (the server refuses to
start without one when `DEBUG` is off); refresh tokens are opaque, stored as
SHA-256 hashes, rotated on every use and revocable. **Guest use of every other
endpoint is unchanged** -- nothing in §1-§10 requires a token.

| Endpoint | Body | Returns |
| :--- | :--- | :--- |
| `POST /api/auth/register` | `{ identifier, password, name, preferred_language }` | `201` token response |
| `POST /api/auth/login` | `{ identifier, password }` | token response |
| `POST /api/auth/refresh` | `{ refresh_token }` | token response; the used refresh token is revoked |
| `POST /api/auth/logout` | `{ refresh_token }` | `204`, always |
| `GET /api/auth/me` | `Authorization: Bearer <access_token>` | user |
| `PATCH /api/auth/me` | `{ name?, preferred_language?, profile? }` (bearer) | user; `profile` is merged, not replaced |

Token response:

```json
{
  "user": { "id": "uuid", "identifier": "+919848011223", "name": "Lakshmi",
            "preferred_language": "te", "profile": { "home_harbour": { "name": "Kakinada" } },
            "created_at": "2026-09-11T07:30:00Z" },
  "access_token": "<jwt>", "refresh_token": "<opaque>", "token_type": "bearer", "expires_in": 3600
}
```

`identifier` is normalised: phone numbers lose spaces, dashes and brackets and
must be 10-15 digits with an optional `+`; emails are lower-cased. `password`
is 8-128 characters. `preferred_language` is one of the ten supported codes.
`profile` is free-form onboarding data the user typed (home harbour, vessel);
it is never a measurement and is never used by the risk engine.

Errors are `{ "detail": <code> }` with a stable code the client localises:
`identifier_invalid` (422), `identifier_taken` (409), `credentials_invalid`
(401 -- the same answer whether the identifier is unknown, malformed, or the
password is wrong), `token_missing` / `token_invalid` (401), `refresh_invalid`
(401). Field validation failures are FastAPI's standard 422 list.

Tests: `backend/tests/test_auth.py`.

---

## Changelog

| Version | Change |
| :--- | :--- |
| 1.5.0 | Non-breaking. Adds the `/api/auth/*` endpoints (§12): register, login, refresh, logout, me. No existing response shape changes; the reference captures were re-taken at 1.5.0 and are byte-for-byte the same shapes as 1.4.0. |
| 1.4.0 | Non-breaking, and the version at which the contract is **frozen**. Real ISRO measurements now reach the response: `evidence[]` records may carry `provider_tier: "ISRO"` with `status: "CACHED"`, naming the granule, the satellite and the real acquisition time. Two records in one response may come from different satellites -- wave height from a SARAL/AltiKa pass, sea surface temperature from an INSAT-3DR scene -- so `evidence[].provider` is per record and must not be assumed uniform. `OceanObservation.swell_height_m`, `swell_period_sec` and `swell_direction_deg` are now nullable: an altimeter measures total significant wave height and does not decompose it, so an ISRO-tier observation has no swell and the engine renormalises. `TimeSeriesPoint` gains `offset_hours`, `source` and `status`, because a series can legitimately span an ISRO granule and the synthetic model and the reader must be able to tell which point is which; the number of points is **not** fixed and depends on how many sampled hours a provider could serve. `route_plan.crosses_protected_waters` is now computed from a real Shapely intersection against the MPA polygons rather than asserted, and `protected_areas_intersected` is empty unless the corridor actually enters one. Canonical query 6 returns `intent: "route_analysis"` instead of `needs_clarification`; when no destination is named one is inferred and `meta.limitations` says so. |
| 1.3.0 | Non-breaking. Deprecated top-level aliases `executive_summary`, `visualization_plan` and `agent_activity` are emitted for one release, computed from the envelope (see §1). `intent` may be `needs_clarification`, in which case `answer.headline` is the question and `risk` is `null`; `user_location` on the request is honoured as the spatial fallback. `RouteWaypoint.wave_height_m` and `wind_knots` inside `route_plan` are nullable: a missing feed is `null`, never a stand-in number. |
| 1.2.0 | Non-breaking. `layers[]` now includes `kind="wms"` descriptors for four ISRO Bhuvan layers, tier `ISRO`. `trace[]` gains `status: "SKIPPED"` events naming every provider the chain tried and why it was not used. `meta.limitations` names tide and lightning/cyclone gaps explicitly. |
| 1.1.0 | **Breaking.** `OceanObservation.sea_surface_temp_c`, `ocean_current_speed_m_s`, `ocean_current_direction_deg` and `TimeSeriesPoint.sst_c` are now nullable. They previously held hardcoded constants that were returned identically for every coordinate; a provider without coverage now returns `null` and emits no evidence record for that variable. Consumers must render null as "unavailable". |
| 1.0.0 | Initial contract. `/api/query` returns the envelope; `EvidenceRecord` gains `provider_tier`; `/api/export/report` takes the envelope. |
