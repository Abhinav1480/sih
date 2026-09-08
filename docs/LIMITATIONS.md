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
