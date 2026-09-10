"""Deterministic Potential Fishing Zone suitability.

One function, used by every producer of a PFZ candidate, so a zone scored on
synthetic chlorophyll and the same zone re-scored on an Oceansat-3 OCM value
are ranked by identical rules. No language model and no agent assigns a score.
"""

from typing import Optional, Tuple


def score_zone(
    chlorophyll_mg_m3: float,
    sst_c: float,
    wave_height_m: Optional[float],
    within_mpa: bool,
) -> Tuple[float, str]:
    """Return (suitability 0-100, advisory label).

    High chlorophyll and an SST inside the 27.8-29.2 C band raise the score;
    rough seas lower it; a position inside a marine protected area is heavily
    penalised because it cannot be fished regardless of productivity.
    """
    score = 50.0
    if chlorophyll_mg_m3 > 1.2:
        score += 25.0
    elif chlorophyll_mg_m3 > 0.8:
        score += 15.0

    if 27.8 <= sst_c <= 29.2:
        score += 15.0

    if wave_height_m is not None:
        if wave_height_m < 1.8:
            score += 10.0
        elif wave_height_m > 2.5:
            score -= 20.0

    if within_mpa:
        score -= 40.0

    score = max(5.0, min(98.0, score))
    advisory = "Highly Favorable" if score > 75 else ("Moderate Potential" if score > 50 else "Marginal / Restricted")
    return round(score, 1), advisory
