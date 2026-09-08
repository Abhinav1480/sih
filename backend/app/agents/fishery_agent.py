import time
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.providers.registry import registry
from app.models.schemas import PotentialFishingZone, ConstraintModel

class FisheryAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Fisheries & PFZ Agent", role="Potential Fishing Zone and chlorophyll/thermal front specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        loc = context["location"]
        constraints: ConstraintModel = context["constraints"]

        provider = registry.get_fisheries_provider()
        zones: List[PotentialFishingZone] = await provider.get_potential_fishing_zones(
            lat=loc.latitude,
            lon=loc.longitude,
            radius_km=loc.radius_km
        )

        # Apply constraint filters
        filtered_zones: List[PotentialFishingZone] = []
        rejected_reasons = []

        for z in zones:
            if constraints.avoid_protected_areas and z.within_mpa:
                rejected_reasons.append(f"{z.name} rejected: falls within Marine Sanctuary ({z.mpa_name}).")
                continue
            if constraints.max_wave_height_m and z.wave_height_m > constraints.max_wave_height_m:
                rejected_reasons.append(f"{z.name} rejected: wave height {z.wave_height_m}m exceeds {constraints.max_wave_height_m}m limit.")
                continue
            if constraints.min_chlorophyll_mg_m3 and z.chlorophyll_mg_m3 < constraints.min_chlorophyll_mg_m3:
                rejected_reasons.append(f"{z.name} rejected: chlorophyll {z.chlorophyll_mg_m3} mg/m³ below {constraints.min_chlorophyll_mg_m3} threshold.")
                continue
            filtered_zones.append(z)

        # If all candidate zones were filtered out, retain all but flag warnings
        if not filtered_zones and zones:
            filtered_zones = zones
            rejected_reasons.append("Warning: All zones breached strict constraints; showing unfiltered ranking with explicit hazard flags.")

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action=f"Synthesized and ranked {len(filtered_zones)} PFZs within {loc.radius_km} km of {loc.name}",
            tool="get_potential_fishing_zones",
            duration_ms=duration_ms,
            details=f"Top: {filtered_zones[0].name} (Score: {filtered_zones[0].suitability_score}/100, Chl-a: {filtered_zones[0].chlorophyll_mg_m3} mg/m³)" if filtered_zones else "No active PFZs found"
        )

        return {
            "fishing_zones": filtered_zones,
            "filter_reasons": rejected_reasons,
            "step_log": step
        }
