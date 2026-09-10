import time
from typing import Any, Dict, List

from app.agents.base import BaseSpecialistAgent
from datetime import datetime

from app.models.schemas import AgentStepRecord, DataFreshness, HazardObservation, WeatherObservation
from app.providers.chain import ChainResult
from app.providers.registry import registry


class WeatherAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Meteorological Agent", role="Wind, precipitation, storm, and squall specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        loc = context["location"]
        temporal = context["temporal"]

        result: ChainResult[WeatherObservation] = await registry.weather_chain.fetch(
            lambda provider: provider.get_weather_conditions(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours,
            )
        )

        attempt_steps = self._attempt_steps(result, "get_weather_conditions")
        obs = result.value

        if obs is None:
            duration_ms = int((time.time() - start) * 1000)
            return {
                "weather_observation": None,
                "step_log": self.record_step(
                    action=f"No weather provider could serve ({loc.latitude:.3f}N, {loc.longitude:.3f}E)",
                    tool="get_weather_conditions",
                    duration_ms=duration_ms,
                    details="; ".join(a.describe() for a in result.attempts) or "no providers registered",
                    status="UNAVAILABLE",
                ),
                "extra_steps": attempt_steps,
                "provider_attempts": result.attempts,
            }

        # Lightning and cyclone tracking is a separate capability from the
        # wind-derived alert level. Canonical query 4 asks for it by name, so it
        # is requested explicitly and its absence is recorded rather than being
        # papered over with the alert level.
        hazard_result = await registry.hazard_chain.fetch(
            lambda provider: provider.get_hazards(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours,
            )
        )
        attempt_steps.extend(self._attempt_steps(hazard_result, "get_hazards"))
        hazard = hazard_result.value or HazardObservation(
            status=DataFreshness.UNAVAILABLE,
            source=hazard_result.attempts[0].provider if hazard_result.attempts else "No hazard provider registered",
            unavailable_reason="; ".join(a.detail for a in hazard_result.attempts) or "no hazard provider registered",
            timestamp=datetime.utcnow(),
        )

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action=f"Retrieved coastal weather at ({loc.latitude:.3f}N, {loc.longitude:.3f}E)",
            tool="get_weather_conditions",
            duration_ms=duration_ms,
            details=(
                f"Wind: {obs.wind_speed_knots} kt, Gusts: {obs.wind_gust_knots} kt, "
                f"Alert: {obs.alert_level.upper()} [{result.tier.value}] {obs.source}"
            ),
        )

        return {
            "weather_observation": obs,
            "hazard_observation": hazard,
            "step_log": step,
            "extra_steps": attempt_steps,
            "provider_attempts": result.attempts,
        }

    def _attempt_steps(self, result: ChainResult, tool: str) -> List[AgentStepRecord]:
        steps: List[AgentStepRecord] = []
        for attempt in result.attempts:
            if attempt.outcome == "ok":
                continue
            steps.append(self.record_step(
                action=f"Skipped {attempt.provider}",
                tool=tool,
                duration_ms=attempt.duration_ms,
                details=f"[{attempt.tier.value}] {attempt.outcome}: {attempt.detail}",
                status="SKIPPED",
            ))
        return steps
