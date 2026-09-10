import math
from typing import List, Optional, Tuple

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

# Relative weight of each physical factor, in percent of the weighted pool.
WEIGHT_WAVE = 40
WEIGHT_WIND = 30
WEIGHT_SWELL = 15
WEIGHT_WARNING = 15
TOTAL_WEIGHT = WEIGHT_WAVE + WEIGHT_WIND + WEIGHT_SWELL + WEIGHT_WARNING

# Flat regulatory penalty, outside the weighted physical pool: being inside a
# marine sanctuary is a legal fact, not a sea-state measurement.
MPA_PENALTY_POINTS = 20


def evaluate_wave_risk(wave_height_m: float) -> Tuple[int, str]:
    for spec in WAVE_THRESHOLDS.values():
        if wave_height_m <= spec["max"]:
            return spec["points"], spec["label"]
    return 95, "Extreme Phenomenal Waves (>4.0m)"


def evaluate_wind_risk(wind_knots: float) -> Tuple[int, str]:
    for spec in WIND_THRESHOLDS.values():
        if wind_knots <= spec["max"]:
            return spec["points"], spec["label"]
    return 90, "Severe Gale Force Winds (>34 kt)"


def _allocate_points(contributions: List[float], target: int) -> List[int]:
    """Rounds float contributions to integers that sum exactly to `target`.

    Largest-remainder allocation. This is what lets the contract promise that
    `sum(factor.points_added) == risk.score`, which the frontend renders as a
    literal "+n pts" breakdown; if the parts did not add up, the explanation
    would be visibly wrong.
    """
    if not contributions:
        return []
    floors = [int(math.floor(c)) for c in contributions]
    shortfall = target - sum(floors)
    if shortfall > 0:
        order = sorted(
            range(len(contributions)),
            key=lambda i: contributions[i] - floors[i],
            reverse=True,
        )
        for i in order[:shortfall]:
            floors[i] += 1
    elif shortfall < 0:
        order = sorted(
            range(len(contributions)),
            key=lambda i: contributions[i] - floors[i],
        )
        for i in order[:-shortfall]:
            floors[i] -= 1
    return floors


def calculate_marine_risk(
    ocean: Optional[OceanObservation],
    weather: Optional[WeatherObservation],
    is_inside_mpa: bool = False,
    mpa_name: Optional[str] = None
) -> DeterministicRiskResult:
    """Deterministic, mathematically transparent marine risk score (0-100).

    Never relies on a language model. Every point is traceable to an explicit
    threshold in `app/risk/thresholds.py`.

    Missing inputs are handled by renormalising over the weights actually
    observed, not by scoring the absent factor as zero. Scoring an absent
    factor as zero made lost data look like calm water: 3.5 m seas with a
    32 kt gale scored 56/HIGH, and the identical seas with the weather feed
    unavailable scored 32/MODERATE. Renormalisation means an absent factor is
    imputed at the mean of the factors we did observe, which can never be
    lower than treating it as benign. Reduced coverage is surfaced through
    `confidence_percentage` and `missing_inputs` instead.
    """
    factors: List[RiskFactor] = []
    contributions: List[float] = []
    triggered_rules: List[str] = []
    missing_inputs: List[str] = []
    weights_counted = 0

    def add_factor(name: str, value: str, description: str, points: int, weight: int) -> None:
        nonlocal weights_counted
        weights_counted += weight
        contributions.append(points * weight)
        factors.append(RiskFactor(
            name=name,
            value=value,
            points_added=0,  # filled in once the normaliser is known
            description=description,
        ))

    # 1. Significant wave height
    if ocean and ocean.significant_wave_height_m is not None:
        wh = ocean.significant_wave_height_m
        pts, label = evaluate_wave_risk(wh)
        add_factor("Significant Wave Height (SWH)", f"{wh:.1f} m", label, pts, WEIGHT_WAVE)
        if wh > 2.0:
            triggered_rules.append(
                f"Small-craft wave limit: significant wave height {wh:.1f}m exceeds the 2.0m advisory limit."
            )
    else:
        missing_inputs.append("Significant Wave Height")

    # 2. Surface wind
    if weather and weather.wind_speed_knots is not None:
        ws = weather.wind_speed_knots
        pts, label = evaluate_wind_risk(ws)
        add_factor(
            "Wind Speed",
            f"{ws:.1f} kt ({ws * 1.852:.1f} km/h)",
            label,
            pts,
            WEIGHT_WIND,
        )
        if ws > 22.0:
            triggered_rules.append(
                f"Squally wind advisory: surface winds of {ws:.1f} knots exceed safe offshore operating limits."
            )
    else:
        missing_inputs.append("Surface Wind Speed")

    # 3. Swell surge
    if ocean and ocean.swell_height_m is not None:
        sh = ocean.swell_height_m
        pts = next(
            (spec["points"] for spec in SWELL_THRESHOLDS.values() if sh <= spec["max"]),
            25,
        )
        if pts >= SWELL_THRESHOLDS["high_surge"]["points"]:
            triggered_rules.append(
                f"Swell surge alert: high swell {sh:.1f}m creates hazardous coastal surf breaking."
            )
        add_factor(
            "Swell Height",
            f"{sh:.1f} m (Period: {ocean.swell_period_sec:.1f}s)",
            f"Swell wave energy ({sh:.1f}m)",
            pts,
            WEIGHT_SWELL,
        )
    else:
        missing_inputs.append("Swell Wave State")

    # 4. Official coastal weather warning.
    #    The weight counts whenever a weather observation exists, even when the
    #    alert level is "none": an observed absence of warnings is information,
    #    and dropping the weight would inflate the renormalised score.
    if weather:
        lvl = (weather.alert_level or "none").lower()
        pts = ALERT_LEVEL_POINTS.get(lvl, 0)
        add_factor(
            f"Coastal Weather Warning ({lvl.upper()})",
            lvl.upper(),
            weather.storm_warning or f"No active {lvl.upper()} coastal warning",
            pts,
            WEIGHT_WARNING,
        )
        if pts > 0:
            triggered_rules.append(
                f"Active coastal warning: {lvl.upper()} alert in effect for this maritime division."
            )
    else:
        missing_inputs.append("Coastal Weather Warning")

    # Renormalise over observed weights, then allocate integer points.
    weighted_score = (sum(contributions) / weights_counted) if weights_counted else 0.0
    weighted_int = int(min(100, max(0, round(weighted_score))))
    normalised = [c / weights_counted for c in contributions] if weights_counted else []
    allocated = _allocate_points(normalised, weighted_int)
    for factor, points in zip(factors, allocated):
        factor.points_added = points

    # 5. Marine protected area / regulatory restriction, clipped so the factor
    #    breakdown still sums exactly to the reported score.
    mpa_points = 0
    if is_inside_mpa:
        mpa_points = min(MPA_PENALTY_POINTS, 100 - weighted_int)
        factors.append(RiskFactor(
            name="Marine Sanctuary Geofence Restriction",
            value="INSIDE MPA",
            points_added=mpa_points,
            description=f"Located within protected sanctuary: {mpa_name or 'Sanctuary Zone'}",
        ))
        triggered_rules.append(
            f"Wildlife Protection Act: operating inside {mpa_name or 'this MPA'} constitutes a legal violation."
        )

    final_score = weighted_int + mpa_points

    if final_score < 30:
        category = RiskCategory.LOW
    elif final_score < 55:
        category = RiskCategory.MODERATE
    elif final_score < 75:
        category = RiskCategory.HIGH
    else:
        category = RiskCategory.SEVERE

    # Confidence tracks how much of the weighted pool we actually observed.
    confidence = int(round(50 + 45 * (weights_counted / TOTAL_WEIGHT)))
    confidence = max(50, min(95, confidence))

    if missing_inputs:
        quality = (
            f"Partial coverage — {weights_counted}/{TOTAL_WEIGHT} of risk weighting observed; "
            f"absent factors imputed at the observed mean"
        )
    else:
        quality = "Full factor coverage"

    return DeterministicRiskResult(
        overall_score=final_score,
        category=category,
        contributing_factors=factors,
        triggered_rules=triggered_rules,
        missing_inputs=missing_inputs,
        confidence_percentage=confidence,
        data_quality_label=quality,
    )
