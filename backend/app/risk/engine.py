from typing import Optional, List
from app.models.schemas import (
    RiskCategory,
    DeterministicRiskResult,
    RiskFactor,
    OceanObservation,
    WeatherObservation,
)
from app.risk.thresholds import (
    WAVE_THRESHOLDS,
    WIND_THRESHOLDS,
    SWELL_THRESHOLDS,
    ALERT_LEVEL_POINTS,
)

def evaluate_wave_risk(wave_height_m: float) -> tuple[int, str]:
    for key, spec in WAVE_THRESHOLDS.items():
        if wave_height_m <= spec["max"]:
            return spec["points"], spec["label"]
    return 95, "Extreme Phenomenal Waves (>4.0m)"

def evaluate_wind_risk(wind_knots: float) -> tuple[int, str]:
    for key, spec in WIND_THRESHOLDS.items():
        if wind_knots <= spec["max"]:
            return spec["points"], spec["label"]
    return 90, "Severe Gale Force Winds (>34 kt)"

def calculate_marine_risk(
    ocean: Optional[OceanObservation],
    weather: Optional[WeatherObservation],
    is_inside_mpa: bool = False,
    mpa_name: Optional[str] = None
) -> DeterministicRiskResult:
    """
    Computes a deterministic, mathematically transparent marine risk score (0-100).
    Never relies on subjective LLM guess. Every point is traceable to an authoritative threshold.
    """
    factors: List[RiskFactor] = []
    triggered_rules: List[str] = []
    missing_inputs: List[str] = []
    total_score = 0
    weights_counted = 0

    # 1. Wave Height (Primary factor, up to 40% weight in baseline)
    if ocean and ocean.significant_wave_height_m is not None:
        wh = ocean.significant_wave_height_m
        pts, label = evaluate_wave_risk(wh)
        total_score += pts * 0.40
        weights_counted += 40
        factors.append(RiskFactor(
            name="Significant Wave Height (SWH)",
            value=f"{wh:.1f} m",
            points_added=int(round(pts * 0.40)),
            description=label
        ))
        if wh > 2.0:
            triggered_rules.append(f"INCOIS Safety Alert: Significant wave height {wh:.1f}m exceeds 2.0m small-craft safety limit.")
    else:
        missing_inputs.append("Significant Wave Height")

    # 2. Wind Speed & Gusts (up to 30% weight)
    if weather and weather.wind_speed_knots is not None:
        ws = weather.wind_speed_knots
        pts, label = evaluate_wind_risk(ws)
        total_score += pts * 0.30
        weights_counted += 30
        factors.append(RiskFactor(
            name="Wind Speed",
            value=f"{ws:.1f} kt ({ws * 1.852:.1f} km/h)",
            points_added=int(round(pts * 0.30)),
            description=label
        ))
        if ws > 22.0:
            triggered_rules.append(f"IMD Squally Wind Advisory: Surface winds of {ws:.1f} knots exceed safe offshore operating limits.")
    else:
        missing_inputs.append("Surface Wind Speed")

    # 3. Swell Waves & Surge (up to 15% weight)
    if ocean and ocean.swell_height_m is not None:
        sh = ocean.swell_height_m
        pts = 0
        if sh > 2.2:
            pts = 25
            triggered_rules.append(f"INCOIS Swell Surge Alert: High swell {sh:.1f}m creates hazardous coastal surf breaking.")
        elif sh > 1.5:
            pts = 12
        total_score += pts * 0.15
        weights_counted += 15
        factors.append(RiskFactor(
            name="Swell Height",
            value=f"{sh:.1f} m (Period: {ocean.swell_period_sec:.1f}s)",
            points_added=int(round(pts * 0.15)),
            description=f"Swell wave energy ({sh:.1f}m)"
        ))
    else:
        missing_inputs.append("Swell Wave State")

    # 4. Official Weather Warning / Cyclone Alerts (up to 15% weight or immediate escalation)
    if weather:
        lvl = (weather.alert_level or "none").lower()
        pts = ALERT_LEVEL_POINTS.get(lvl, 0)
        if pts > 0:
            total_score += pts * 0.15
            weights_counted += 15
            factors.append(RiskFactor(
                name=f"IMD Coastal Weather Warning ({lvl.upper()})",
                value=lvl.upper(),
                points_added=int(round(pts * 0.15)),
                description=weather.storm_warning or f"Official IMD {lvl.upper()} alert in effect"
            ))
            triggered_rules.append(f"Official IMD Alert: {lvl.upper()} active coastal warning for this maritime division.")

    # 5. Marine Protected Area / Regulatory restriction
    if is_inside_mpa:
        # Regulatory violation risk
        factors.append(RiskFactor(
            name="Marine Sanctuary Geofence Restriction",
            value="INSIDE MPA",
            points_added=20,
            description=f"Located within protected sanctuary: {mpa_name or 'Sanctuary Zone'}"
        ))
        total_score += 20
        triggered_rules.append(f"MoEFCC Wildlife Protection Act: Operation inside {mpa_name or 'MPA'} constitutes a legal violation.")

    # Normalize total score to 0 - 100
    final_score = int(min(100, max(0, round(total_score))))

    # Categorize
    if final_score < 30:
        category = RiskCategory.LOW
    elif final_score < 55:
        category = RiskCategory.MODERATE
    elif final_score < 75:
        category = RiskCategory.HIGH
    else:
        category = RiskCategory.SEVERE

    # Confidence based on missing variables
    confidence = 95 - (len(missing_inputs) * 15)
    confidence = max(50, confidence)

    return DeterministicRiskResult(
        overall_score=final_score,
        category=category,
        contributing_factors=factors,
        triggered_rules=triggered_rules,
        missing_inputs=missing_inputs,
        confidence_percentage=confidence,
        data_quality_label="Authoritative Observations & Calibrated Forecasts"
    )
