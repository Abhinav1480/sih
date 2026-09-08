import time
from typing import Dict, Any
from app.agents.base import BaseSpecialistAgent
from app.risk.engine import calculate_marine_risk
from app.models.schemas import DeterministicRiskResult

class RiskAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Marine Safety & Risk Engine", role="Deterministic multi-factor risk assessment and rule verification specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        ocean = context.get("ocean_observation")
        weather = context.get("weather_observation")
        is_mpa = context.get("is_inside_mpa", False)
        mpa_info = context.get("mpa_info")
        mpa_name = mpa_info["name"] if mpa_info else None

        risk_res: DeterministicRiskResult = calculate_marine_risk(
            ocean=ocean,
            weather=weather,
            is_inside_mpa=is_mpa,
            mpa_name=mpa_name
        )

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action="Executed deterministic risk algorithm across oceanographic and meteorological inputs",
            tool="calculate_marine_risk",
            duration_ms=duration_ms,
            details=f"Score: {risk_res.overall_score}/100, Category: {risk_res.category}, Factors: {len(risk_res.contributing_factors)}, Triggered Rules: {len(risk_res.triggered_rules)}"
        )

        return {
            "risk_assessment": risk_res,
            "step_log": step
        }
