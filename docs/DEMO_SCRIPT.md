# SIH 2026 Winning Demonstration Script: ORCA
## 3-to-5 Minute Presentation Flow for Evaluators & Ministry Judges

### 1. The Hook & The Problem (0:00 – 0:45)
- **Presenter**: "Respected Jury, today India's 4 million coastal fishermen, merchant vessels, and disaster managers make critical offshore decisions using fragmented information. They check INCOIS for wave heights, open IMD for wind bulletins, search Department of Fisheries PDFs for Potential Fishing Zones, and consult Forest Department maps for Marine Protected Areas. Correlating these mentally in adverse weather leads to tragic maritime accidents and severe ecological violations."
- **Action**: Open ORCA platform (`http://localhost:3000`). Show the professional dark oceanic command interface.
- **Presenter**: "Meet **ORCA — Marine EcOsystem Reasoning with Collaborative Agents**, our generalized, multi-agent decision support platform built for SIH 2026 Problem Statement 26176."

---

### 2. Live Dynamic Intelligence (0:45 – 2:00)
- **Presenter**: "ORCA is NOT a fixed chatbot or a collection of hardcoded FAQ answers. It dynamically plans, retrieves authoritative data, and executes deterministic math on arbitrary natural language questions."
- **Action**: Type an unseen query into the prompt box:
  > *"Find a fishing area near Visakhapatnam within 40 km tomorrow morning that avoids protected areas and has favorable chlorophyll."*
- **Hit Analyze**.
- **Point out to Judges**:
  1. **Dynamic Intent & Spatial Extraction**: ORCA extracted the location (Visakhapatnam), radius (40 km), temporal horizon (tomorrow morning: 05:00-11:00 UTC), and constraints (avoid protected waters, favorable chlorophyll).
  2. **Collaborative Agent Telemetry**: Open the Agent Activity Feed. Point out that `OceanAgent`, `WeatherAgent`, `FisheryAgent`, `GeoAgent`, and `RiskAgent` each executed real asynchronous tools with precise millisecond durations.
  3. **Map-First Visualization**: The map automatically centered on Visakhapatnam, rendered the INCOIS wave hazard envelope, and plotted ranked Potential Fishing Zones with active popup telemetry.
  4. **Transparent Risk Engine**: Point to the **Deterministic Risk Card**. Emphasize: "Notice this score of 13/100 (LOW RISK). Claude did not make up this number. It is mathematically calculated by our deterministic risk engine based on official INCOIS wave thresholds (+10 pts) and IMD wind thresholds (+3 pts)."
  5. **Evidence & Provenance**: Open the Evidence Drawer. "Judges, this answers the question: *'Why should I trust this?'* Every value cites its exact sensor feed, measurement unit, observation time, and quality status."

---

### 3. Contextual Follow-Up & Geospatial Geofencing (2:00 – 3:15)
- **Presenter**: "Now watch multi-turn context retention in action."
- **Action**: Type the follow-up prompt:
  > *"Does the vessel route from Kakinada to Visakhapatnam cross protected waters?"*
- **Hit Analyze**.
- **Point out to Judges**:
  1. **Adaptive UI Transition**: Notice how the interface dynamically shifted from a fishing zones table into a **Vessel Route Corridor Card** with corridor distance (136.2 km), estimated transit hours (7.4h), and segment-by-segment risk sampling.
  2. **Real GIS Mathematics**: Show the Coringa Wildlife Sanctuary polygon on the map. Point out the route waypoint evaluation using exact Shapely point-in-polygon and line intersection geometry, not hallucinated coordinates.

---

### 4. Vernacular Multilingual Demonstration (3:15 – 4:00)
- **Presenter**: "Finally, accessibility for local coastal communities is vital."
- **Action**: Type:
  > *"విశాఖపట్నం దగ్గర రేపు ఉదయం సముద్ర పరిస్థితులు ఎలా ఉన్నాయి? Explain in Telugu"*
- **Hit Analyze**.
- **Point out to Judges**:
  - The system auto-detected Telugu (`te`), orchestrated the real agents, and localized the entire executive summary and safety recommendation into natural Telugu using verified coastal marine terminology (`సముద్ర భద్రతా అంచనా`, `అలల ఎత్తు`, `గాలి వేగం`).
- **Action**: Click **Export Report** -> show the formal printable advisory report ready for port authority distribution.

---

### 5. Closing Summary (4:00 – 4:30)
- **Presenter**: "ORCA demonstrates generalized intelligence, multi-agent collaboration, deterministic safety, real GIS geofencing, and complete evidence provenance. Thank you, and we welcome your questions!"
