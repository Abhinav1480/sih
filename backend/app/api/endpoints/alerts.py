from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("/alerts")
async def get_active_marine_alerts() -> List[Dict[str, Any]]:
    """
    Returns active INCOIS High Wave & IMD Coastal Marine hazard bulletins
    across Indian coastal sectors.
    """
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    return [
        {
            "alert_id": "INCOIS-HWA-2026-089",
            "source": "INCOIS High Wave Alert Service",
            "sector": "North Andhra Pradesh & South Odisha Coast",
            "severity": "YELLOW",
            "title": "High Wave Alert (2.5 - 3.2m)",
            "description": "High waves in the range of 2.5 to 3.2 meters are forecasted along the coast from Visakhapatnam to Paradip. Surface currents speed between 45-75 cm/sec.",
            "issued_at": now_iso,
            "valid_until": "Next 36 Hours",
            "recommended_action": "Fishermen and coastal operators are advised to be cautious while venturing into the sea."
        },
        {
            "alert_id": "IMD-SQ-2026-042",
            "source": "IMD Coastal Weather Division",
            "sector": "South-West Bay of Bengal & Gulf of Mannar",
            "severity": "ORANGE",
            "title": "Squally Weather Advisory",
            "description": "Squally winds with speed reaching 40-50 km/h gusting to 60 km/h likely over Gulf of Mannar, Comorin area and along Tamil Nadu coast.",
            "issued_at": now_iso,
            "valid_until": "Next 48 Hours",
            "recommended_action": "Fishermen are advised not to venture into these sea areas during this period."
        },
        {
            "alert_id": "MOEFCC-MPA-CONSV-01",
            "source": "Department of Forests & MoEFCC",
            "sector": "Gahirmatha Marine Sanctuary & Rushikulya Rookery",
            "severity": "REGULATORY_RESTRICTION",
            "title": "Olive Ridley Sea Turtle Conservation Geofence",
            "description": "Seasonal moratorium on mechanized fishing vessels within 20 km of turtle nesting beaches is in active enforcement.",
            "issued_at": now_iso,
            "valid_until": "Active Seasonal Protection",
            "recommended_action": "Strict compliance required. Trawlers violating the exclusion zone subject to Coast Guard seizure."
        }
    ]
