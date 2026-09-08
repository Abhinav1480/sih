"""
Authoritative thresholds based on:
1. INCOIS Ocean State Forecast (OSF) Sea State Guidelines
2. IMD (India Meteorological Department) Marine Warning Matrix
3. WMO (World Meteorological Organization) Sea State Scale (Douglas & Beaufort)
4. Indian Coast Guard Coastal Small-Craft Safety Advisories
"""

from typing import Dict, Any

# Significant Wave Height thresholds (meters)
WAVE_THRESHOLDS = {
    "calm": {"max": 1.0, "points": 0, "label": "Calm (0.0 - 1.0m)"},
    "slight": {"max": 1.5, "points": 10, "label": "Slight (1.0 - 1.5m)"},
    "moderate": {"max": 2.2, "points": 25, "label": "Moderate (1.5 - 2.2m) - Caution for small craft"},
    "rough": {"max": 3.0, "points": 45, "label": "Rough (2.2 - 3.0m) - Unfavorable for artisanal vessels"},
    "very_rough": {"max": 4.0, "points": 70, "label": "Very Rough (3.0 - 4.0m) - Hazardous sea state"},
    "high_phenomenal": {"max": 99.0, "points": 95, "label": "High to Phenomenal (>4.0m) - Extreme Danger"},
}

# Wind Speed thresholds (knots)
WIND_THRESHOLDS = {
    "light": {"max": 10.0, "points": 0, "label": "Light (<10 kt)"},
    "moderate": {"max": 16.0, "points": 10, "label": "Moderate Breeze (10 - 16 kt)"},
    "fresh": {"max": 22.0, "points": 25, "label": "Fresh Breeze (17 - 22 kt)"},
    "strong": {"max": 28.0, "points": 45, "label": "Strong Breeze (23 - 28 kt) - Squally weather"},
    "near_gale": {"max": 34.0, "points": 65, "label": "Near Gale (29 - 34 kt) - Rough coastal seas"},
    "gale_storm": {"max": 999.0, "points": 90, "label": "Gale / Storm (>34 kt) - High hazard"},
}

# Swell Height thresholds (meters)
SWELL_THRESHOLDS = {
    "low": {"max": 1.5, "points": 0},
    "moderate": {"max": 2.2, "points": 12},
    "high_surge": {"max": 99.0, "points": 25},
}

# IMD Warning Alert Levels
ALERT_LEVEL_POINTS = {
    "none": 0,
    "green": 0,
    "yellow": 15,    # Be Aware
    "orange": 35,    # Be Prepared
    "red": 55        # Take Action - Extreme Cyclone / Heavy Squalls
}
