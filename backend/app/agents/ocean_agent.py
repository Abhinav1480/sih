import time
from typing import Any, Dict, List

from app.agents.base import BaseSpecialistAgent
from datetime import datetime

from app.models.schemas import AgentStepRecord, DataFreshness, OceanObservation, TideObservation
from app.providers.chain import ChainResult
from app.providers.registry import registry


class OceanAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Oceanographic Agent", role="Wave, swell, SST, and ocean current specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        loc = context["location"]
        temporal = context["temporal"]

        result: ChainResult[OceanObservation] = await registry.ocean_chain.fetch(
            lambda provider: provider.get_ocean_conditions(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours,
            )
        )

        attempt_steps = self._attempt_steps(result, "get_ocean_conditions")
        obs = result.value

        if obs is None:
            # Every provider in the chain declined. Report the gap rather than
            # substituting a number; the risk engine renormalises around it.
            duration_ms = int((time.time() - start) * 1000)
            return {
                "ocean_observation": None,
                "step_log": self.record_step(
                    action=f"No ocean provider could serve ({loc.latitude:.3f}N, {loc.longitude:.3f}E)",
                    tool="get_ocean_conditions",
                    duration_ms=duration_ms,
                    details="; ".join(a.describe() for a in result.attempts) or "no providers registered",
                    status="UNAVAILABLE",
                ),
                "extra_steps": attempt_steps,
                "provider_attempts": result.attempts,
            }

        tide_result = await registry.tide_chain.fetch(
            lambda provider: provider.get_tide(
                lat=loc.latitude,
                lon=loc.longitude,
                offset_hours=temporal.offset_hours,
            )
        )
        attempt_steps.extend(self._attempt_steps(tide_result, "get_tide"))
        tide = tide_result.value or TideObservation(
            status=DataFreshness.UNAVAILABLE,
            source=tide_result.attempts[0].provider if tide_result.attempts else "No tide provider registered",
            unavailable_reason="; ".join(a.detail for a in tide_result.attempts) or "no tide provider registered",
            timestamp=datetime.utcnow(),
        )

        duration_ms = int((time.time() - start) * 1000)
        sst = obs.sea_surface_temp_c
        step = self.record_step(
            action=f"Retrieved ocean state at ({loc.latitude:.3f}N, {loc.longitude:.3f}E)",
            tool="get_ocean_conditions",
            duration_ms=duration_ms,
            details=(
                f"SWH: {obs.significant_wave_height_m}m, Swell: "
                f"{str(obs.swell_height_m) + 'm' if obs.swell_height_m is not None else 'not carried'}, "
                f"SST: {sst if sst is not None else 'unavailable'}"
                f"{' C' if sst is not None else ''} "
                f"[{result.tier.value}] {obs.source}"
            ),
        )

        return {
            "ocean_observation": obs,
            "tide_observation": tide,
            "step_log": step,
            "extra_steps": attempt_steps,
            "provider_attempts": result.attempts,
        }

    def _attempt_steps(self, result: ChainResult, tool: str) -> List[AgentStepRecord]:
        """One trace step per provider the chain tried.

        This is what makes "why is this Open-Meteo and not ISRO?" answerable on
        screen: the skipped ISRO providers appear with their reason, rather than
        the fallback simply showing up unexplained.
        """
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
