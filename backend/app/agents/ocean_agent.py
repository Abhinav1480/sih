import time
from typing import Dict, Any
from app.agents.base import BaseSpecialistAgent
from app.providers.registry import registry
from app.models.schemas import OceanObservation

class OceanAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Oceanographic Agent", role="Wave, swell, SST, and ocean current specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        loc = context["location"]
        temporal = context["temporal"]

        provider = registry.get_ocean_provider()
        
        try:
            obs: OceanObservation = await provider.get_ocean_conditions(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours
            )
        except Exception as e:
            # Fallback to demo
            fallback = registry.get_fallback_provider()
            obs = await fallback.get_ocean_conditions(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours
            )
            obs.source += " (Fallback on Network Disconnect)"

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action=f"Retrieved ocean state at ({loc.latitude:.3f}°N, {loc.longitude:.3f}°E)",
            tool="get_ocean_conditions",
            duration_ms=duration_ms,
            details=(
                f"SWH: {obs.significant_wave_height_m}m, Swell: {obs.swell_height_m}m, "
                f"SST: {obs.sea_surface_temp_c if obs.sea_surface_temp_c is not None else 'unavailable'}"
                f"{'°C' if obs.sea_surface_temp_c is not None else ''} ({obs.source})"
            )
        )

        return {
            "ocean_observation": obs,
            "step_log": step
        }
