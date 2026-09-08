# Authoritative Data Sources & Registry: ORCA Marine Intelligence
## SIH 2026 PS 26176 Source Specifications

This document catalogs the authoritative Indian and international Earth Observation, Oceanographic, and Meteorological data services integrated into ORCA.

---

### 1. Authoritative Source Registry

| Data Provider | Dataset / Service Name | Variables Available | Spatial Coverage | Temporal Resolution | Official Access Method & Endpoint | Auth / Key Requirement | Status & Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **INCOIS** (Indian National Centre for Ocean Information Services) | **Ocean State Forecast (OSF)** | Significant Wave Height (SWH), Swell Height, Swell Direction, Swell Period, Wind Speed, Wind Direction, Sea Surface Temperature (SST), Surface Ocean Currents | Indian Ocean Rim, Arabian Sea, Bay of Bengal, 0.25° grid & coastal location bulletins | 3-hourly forecast up to 5 days, updated twice daily (06:00, 18:00 UTC) | REST / OPeNDAP & GeoServer WMS / JSON bulletins via `incois.gov.in/portal/osf` | Publicly accessible bulletins; Token required for bulk OPeNDAP | Production feeds periodically experience maintenance downtime; ORCA utilizes auto-caching and fallback to Open-Meteo Marine |
| **INCOIS** | **Potential Fishing Zone (PFZ) Advisories** | PFZ Coordinates, SST Thermal Fronts, Chlorophyll-a Gradients, Validity Window, Distance & Bearing from Coastal Fish Landing Centres | Coastal India (Gujarat to West Bengal, Lakshadweep, Andaman & Nicobar) | Daily advisories generated using MODIS / VIIRS / Oceansat-3 | WFS / GeoJSON & Text bulletins via `incois.gov.in/portal/pfz` | Public advisory feeds | PFZ advisories suspended during monsoon fishing ban periods (June-July West Coast, April-May East Coast) |
| **INCOIS** | **High Wave Alerts & Tsunami Early Warning (ITEWC)** | High Wave Warning, Swell Surge Alerts, Rough Sea Advisories, Tsunami Bulletins | Indian Coastal Districts & Offshore Islands | Real-time event triggered alerts | RSS / GeoJSON / REST alerts | Public feeds | Critical emergency alerts prioritized at Level 1 in ORCA alert engine |
| **IMD** (India Meteorological Department) | **Marine & Coastal Weather Bulletins** | Wind speed, Wind gust, Sea condition state, Visibility, Rainfall, Squally weather warnings, Depression/Cyclone tracks | Regional Coastal Seas (Area 1: Arabian Sea, Area 2: Bay of Bengal) | 6-hourly updates, specialized cyclone bulletins 3-hourly during storm events | REST / HTML bulletin parser via `mausam.imd.gov.in` | Public bulletins | Semi-structured textual bulletins parsed into structured hazard objects |
| **Open-Meteo** (Copernicus & ECMWF Marine & Atmospheric) | **Marine Weather API & Atmospheric API** | Wave Height, Wave Direction, Wave Period, Wind Wave Height, Swell Wave, Wind Speed at 10m, Gusts, Air Temperature, Precipitation | Global Oceans (0.08° high-resolution bathymetric-coupled grid) | Hourly forecast up to 7 days | REST JSON API `marine-api.open-meteo.com/v1/marine` | Open access, no API key required for non-commercial research | Used as high-reliability live API fallback for authoritative global validation alongside INCOIS |
| **MoEFCC / WII** (Wildlife Institute of India) | **Marine Protected Areas (MPAs) & Sanctuaries** | MPA Boundaries, Gulf of Mannar Biosphere, Marine National Park Jamnagar, Gahirmatha Marine Sanctuary, Malvan Marine Sanctuary, Coral Reef Zones | Indian EEZ & Territorial Waters | Static boundary registry with seasonal conservation restrictions | GeoJSON GIS feature layer | Static authoritative GIS registry | Embedded in ORCA spatial database for automated geofencing |
| **Ministry of Ports, Shipping and Waterways** | **Major Coastal Harbors, Ports & Landing Centers** | Coordinates, harbor channel limits, vessel traffic services (VTS), port authority boundaries | Major & Non-major Indian ports (12 major, 200+ intermediate/minor ports) | Static geospatial registry | Geospatial database | Open GIS dataset | Used for geocoding and nearest harbor evacuation routing |

---

### 2. Dual Operation Architecture: Live vs. Deterministic Demo

To guarantee 100% judge demonstration reliability regardless of conference hall internet connectivity or government API maintenance windows, ORCA provides two rigorously decoupled modes:

1. **LIVE MODE (`ORCA_MODE=LIVE`)**:
   - Queries live network endpoints (Open-Meteo Marine, INCOIS feeds, IMD bulletin feeds).
   - Retains exact response latency, live HTTP headers, and real-time observation timestamps.
   - Falls back gracefully to cached data if an endpoint returns HTTP 5xx/429, marking the evidence badge as `CACHED` with explicit failure transparency.

2. **DETERMINISTIC DEMO MODE (`ORCA_MODE=DEMO`)**:
   - Uses an extensive high-fidelity spatial and temporal fixture engine covering all major Indian coastal sectors (Visakhapatnam, Kakinada, Chennai, Tuticorin, Kochi, Mangalore, Mumbai, Porbandar, Paradip, Port Blair).
   - Dynamically synthesizes consistent physical variables across time offsets (now, tomorrow morning, 24h ago, 7d ago) so queries like "Compare SST today vs 7 days ago" or "What is wave height tomorrow morning" execute real mathematical diffs on realistic data.
   - Clearly stamped with `DEMO DATA — NOT LIVE` badge in both JSON payloads and UI evidence panels.
