import time
from typing import Dict, Any
from app.agents.base import BaseSpecialistAgent
from app.providers.registry import registry
from app.models.schemas import WeatherObservation

class WeatherAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Meteorological Agent", role="IMD wind, precipitation, storm, and squall specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        loc = context["location"]
        temporal = context["temporal"]

        provider = registry.get_weather_provider()

        try:
            obs: WeatherObservation = await provider.get_weather_conditions(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours
            )
        except Exception:
            fallback = registry.get_fallback_provider()
            obs = await fallback.get_weather_conditions(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours
            )
            obs.source += " (Fallback on Network Disconnect)"

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action=f"Retrieved coastal weather at ({loc.latitude:.3f}°N, {loc.longitude:.3f}°E)",
            tool="get_weather_conditions",
            duration_ms=duration_ms,
            details=f"Wind: {obs.wind_speed_knots} kt, Gusts: {obs.wind_gust_knots} kt, Alert: {obs.alert_level.upper()}"
        )

        return {
            "weather_observation": obs,
            "step_log": step
        }
