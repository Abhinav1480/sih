# Data Sources & Provenance Tiers

ORCA is built for a problem statement set by the Department of Space, so its
data chain is **ISRO first**. Every source declares a provenance tier and the
chain tries tiers in order: `ISRO` → `NATIONAL` → `FALLBACK`. A value's tier
is validated against the provider that produced it before it is accepted, so
no provider can publish under a tier it is not registered for.

This document describes what is *wired*, what is *reachable from a clean
checkout*, and what is *not*. Nothing below claims a capability the code does
not have.

---

## 1. Source registry

| Tier | Provider | Products | Access | State in this repository |
| :--- | :--- | :--- | :--- | :--- |
| **ISRO** | **NRSC Bhuvan WMS** | Coral reefs, mangroves, coastal LULC, island landforms | OGC WMS, **no authentication** | **Working.** Layers verified against the live `GetCapabilities` (14,477 layers) and confirmed with `GetMap` returning PNG. Served to the map as `kind="wms"` descriptors; the client renders directly against NRSC. |
| **ISRO** | **MOSDAC** | INSAT-3D / 3DR / 3DS: SST, cloud, **lightning**, **cyclone tracking** | Token-gated API download service; returns files, not point queries | **Adapter present, not configured.** Needs `MOSDAC_API_TOKEN` or a cached granule. Skipped with a stated reason. |
| **ISRO** | **NRSC Bhoonidhi** | Oceansat-3 / EOS-06 OCM chlorophyll-a, SCATSAT / OSCAT winds, SARAL-AltiKa wave height | Token-gated, product-download oriented | **Adapter present, not configured.** Needs `BHOONIDHI_API_TOKEN` or a cached granule. Skipped with a stated reason. |
| **NATIONAL** | **INCOIS** | Ocean State Forecast, PFZ advisories | JSP portal, **no public JSON API** | **Cached only, empty by default.** ORCA does not scrape the portal live; advisories are cached out of band. Skipped with a stated reason. |
| **NATIONAL** | Survey of India / INCOIS tide tables | Harmonic tidal constituents per port | Published tables | **Not bundled.** Tide is reported unavailable, by name. See §3. |
| **FALLBACK** | **Open-Meteo** | Wave height, swell, SST, currents, 10 m wind, gusts, precipitation | Open REST, no key | **Working in `LIVE`.** European Copernicus / ECMWF models; labelled as such. Reached only after every higher tier has been tried. |
| **FALLBACK** | **ORCA deterministic demo model** | All of the above, synthetic | In-process | **Working in `DEMO`.** Synthetic, labelled synthetic, tier capped at `FALLBACK` regardless of what it emulates. |
| — | MoEFCC / WII protected areas | Marine Protected Area polygons | Static GeoJSON in `backend/app/geospatial/` | Working. Drives the `geofence_warning` card. |

### What this means on a clean checkout

In `LIVE` mode a sea-state query attempts **Bhoonidhi → MOSDAC → INCOIS →
Open-Meteo → demo** and answers from **Open-Meteo, tier `FALLBACK`**, with the
three skipped providers and their reasons in the trace. Map layers include
**four real ISRO layers from Bhuvan**, tier `ISRO`.

In `DEMO` mode the chain ends at the demo model and no network call is made.
This is verified by a test that fails the request on any outbound HTTP.

---

## 2. How a value gets its tier

`backend/app/providers/provenance.py` classifies a source string on two rules:

1. **The weakest ingredient decides.** A value blended from an ISRO product
   and a European model is `FALLBACK`.
2. **Synthetic is never promoted.** A demo value is `FALLBACK` regardless of
   what it emulates, and its reliability note says so.

`backend/app/providers/chain.py` then checks that the classified tier of every
returned value matches the declaring provider's registration. A mismatch is
recorded as `provenance_violation` and the value is refused.

---

## 3. Known data gaps

Stated here so the matrix and the contract cannot overclaim.

| Gap | Canonical query | What would close it | Current behaviour |
| :--- | :--- | :--- | :--- |
| **Tide** | 3 | Per-port harmonic constituents (Survey of India / INCOIS). The prediction maths is standard and offline; the constituent table is the missing part. | Reported unavailable, by name, in `meta.limitations` and the trace. Not approximated. |
| **Lightning / cyclone** | 4 | MOSDAC INSAT-3D products, token-gated. | Reported unavailable, by name. The wind-derived alert level is **not** presented as a lightning feed. |
| **Chlorophyll-a** | 1, 5, 7 | Bhoonidhi Oceansat-3 OCM, token-gated. | PFZ ranking runs on synthetic chlorophyll in `DEMO`, labelled `FALLBACK`. |
| **Satellite SWH** | 2, 6, 8 | Bhoonidhi SARAL-AltiKa, token-gated. | Open-Meteo model SWH in `LIVE`, labelled `FALLBACK`. |

---

## 4. Granule cache

MOSDAC and Bhoonidhi return files, not JSON for a coordinate. A file-download
service cannot answer inside a request, so both adapters read from
`ISRO_GRANULE_CACHE_DIR` (default `./data/granules/<service>/index.json`).
Granules are fetched out of band with a token, indexed, and served from the
cache at query time — which is also what lets ISRO products work at a venue
with no connectivity.

The cache is empty in this repository. An empty cache is the normal state and
produces a `not_configured` skip, not an error and not a substitute value.

---

## 5. Endpoints and reachability

| Endpoint | Observed from a developer machine |
| :--- | :--- |
| `https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms` | **200**, `application/vnd.ogc.wms_xml`, 8.2 MB capabilities |
| `https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms` | Timeout |
| `https://bhuvan-ras1.nrsc.gov.in/bhuvan/wms` | 403 |
| `https://marine-api.open-meteo.com/v1/marine` | 200 |

`BHUVAN_WMS_URL` is configurable because a venue network may reach a different
mirror.
