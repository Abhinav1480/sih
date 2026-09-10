# Operational Assumptions, Limitations & Safety Disclaimers
## ORCA Decision Support System: SIH 2026 PS 26176

To uphold absolute technical honesty in front of SIH judges, this document outlines the operational boundaries, scientific assumptions, and limitations of the ORCA platform.

---

### 1. Decision Support vs. Certified Navigation
- **Advisory Only**: ORCA is strictly a decision-support, situational awareness, and risk evaluation platform. It does **not** substitute for certified Electronic Chart Display and Information Systems (ECDIS) or official nautical paper charts published by the Chief Hydrographer to the Government of India (National Hydrographic Office - NHO).
- **Master's Responsibility**: Under the International Regulations for Preventing Collisions at Sea (COLREGs) and the Merchant Shipping Act of India, the Master or skipper of any vessel retains ultimate legal responsibility for the navigation and safety of the vessel and crew.

---

### 2. Oceanographic & Earth Observation Data Constraints
- **Cloud Cover Masking**: Optical and thermal infrared satellite sensors (e.g. MODIS-Aqua, VIIRS, Oceansat-3 Ocean Colour Monitor) cannot penetrate thick cloud cover or monsoon overcast. During prolonged rainy spells, satellite-derived Sea Surface Temperature (SST) and Chlorophyll-a products may experience spatial gaps or temporal latency.
- **Monsoon Fishing Ban Alignment**: The Ministry of Fisheries, Animal Husbandry and Dairying mandates uniform seasonal fishing bans (61 days on East Coast: April 15 – June 14; 61 days on West Coast: June 1 – July 31). While ORCA maps active Potential Fishing Zones year-round for scientific modeling, operational advisories must always respect statutory seasonal moratoriums.
- **Bathymetry & Nearshore Shoaling**: Deep-ocean swell transformations in shallow surf zones (< 5m depth) involve complex nonlinear bathymetric refraction. Nearshore wave heights at the immediate breaker line may differ from offshore significant wave height (SWH) forecasts.

---

### 3. Vessel Traffic & Live AIS Positioning
- **Public AIS Feeds**: Live Automatic Identification System (AIS) Class A/B vessel positions are subject to commercial licensing and Indian Coast Guard security sensitivities in territorial waters. Where public or live authenticated AIS feeds are unavailable, ORCA executes corridor passage and geofence evaluations in deterministic mode, never fabricating live positions.

## Marine protected area geometry is approximate

The six MPA boundaries in `backend/app/geospatial/protected_areas.py` are
hand-drawn 4-vertex quadrilaterals, not gazetted survey geometry. Each has been
scaled to within ~0.1% of its sanctuary's published area, but the *shape* is a
quadrilateral over roughly the right water.

They are sufficient to warn that a position is near a sanctuary. They are not
sufficient to decide whether a specific vessel is legally inside one, and the
response says so in `meta.limitations` on every query.

The published areas used as scaling targets (Gahirmatha 1435, Gulf of Mannar
560, Malvan 29.1, Gulf of Kutch 620.8, Mahatma Gandhi 281.5, Coringa 235.7 km²)
are general reference figures and are not read from any dataset in this
repository.

Before this scaling, Gulf of Kutch was drawn 4.35× its published area and Gulf
of Mannar 2.82×; the Rameswaram and Malvan harbour nodes tested as inside an
MPA, firing a legal-violation penalty on a fisherman in his own home port.
`backend/tests/test_mpa_geometry.py` now asserts no harbour node is inside any
polygon.

Replacing this with real WDPA / Protected Planet geometry remains open.

## No EEZ or IMBL geometry exists

`geospatial/` contains MPA polygons only. There is no Exclusive Economic Zone
boundary and no International Maritime Boundary Line in the backend, despite
both being named in the agent role strings and in `CLAUDE.md`.
