---
name: orca-ui-design-direction
description: ORCA frontend design language — calm, premium, map-first marine intelligence workstation
metadata:
  type: feedback
---

For the ORCA frontend (SIH 2026 PS 26176), the user wants a **calm, premium, map-first marine-intelligence workstation** — NOT a generic SaaS/admin dashboard, chatbot, or neon/cyberpunk UI.

**Why:** Judged as an SIH-winning product; "LESS UI, MORE INTELLIGENCE."

**How to apply:**
- Restrained cyan/teal accent; semantic green/amber/red only for states. Minimal gradients, minimal glow, subtle borders.
- Flat sections with dividers/spacing over nested cards — "one level of visual containers maximum"; never card→card→card.
- Dynamic result titles by backend `result_type` (Route Recommendation / Fishing Intelligence / Marine Safety / Spatial What-If / Regional Comparison / Temporal Analysis) — not a repeated "Executive Intelligence Summary".
- Sidebar is a workspace (New Analysis / Workspace / Recent / footer) — NO persona dropdown or fixed analysis-template buttons.
- One-time center intro animation (`isInitialLanding`) only affects the CENTER; left/right panels stay intact.
- NEVER change backend logic (planner, agents, risk/route/PFZ/spatial/temporal calc, APIs, schemas) for UI work — frontend `frontend/` only.
- Both dev servers usually already running: frontend :3000, backend :8000. No venv in repo (Python 3.14 system).
