from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.config import settings

router = APIRouter()

# This endpoint used to return three hand-written dictionaries carrying real
# agency identities and authentic-looking bulletin numbers:
#
#     INCOIS-HWA-2026-089  "INCOIS High Wave Alert Service"
#     IMD-SQ-2026-042      "IMD Coastal Weather Division"
#     MOEFCC-MPA-CONSV-01  "Department of Forests & MoEFCC"
#
# with invented wave heights and wind speeds, stamped with datetime.now() so
# they always looked freshly issued, and carrying no DEMO marker of any kind.
# No agency ever issued them. They were served in production.
#
# ORCA has no alert provider wired: there is no IMD adapter anywhere in the
# codebase, and the INCOIS provider is cache-only and ships empty. The honest
# answer to "what alerts are active" is therefore "we do not know", said out
# loud, with a pointer to the authorities that do know.


def _no_provider_notice() -> Dict[str, Any]:
    """Why this list is empty, in the same shape the client already renders.

    An empty array would render as a blank panel, which on a safety product
    reads as "no alerts active" -- the opposite of the truth, which is "no feed
    is connected". So the reason is delivered in band, as a notice that is
    unmistakably ORCA's own and names no agency as its author.
    """
    return {
        "alert_id": "orca-no-alert-provider",
        "source": "ORCA — no marine hazard feed connected",
        "sector": "All Indian coastal sectors",
        "severity": "INFO",
        "title": "No live hazard bulletins available",
        "description": (
            "ORCA is not connected to a marine hazard bulletin feed. It holds no "
            "INCOIS high-wave alerts, no IMD squall or cyclone advisories and no "
            "MoEFCC conservation notices, and it does not generate substitutes for "
            "them. The absence of alerts here does not mean no alert is in force."
        ),
        "issued_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "valid_until": None,
        "recommended_action": (
            "Check IMD cyclone bulletins, INCOIS ocean state forecasts and VHF "
            "coastal broadcasts directly before departure."
        ),
        "status": "DEMO" if settings.ORCA_MODE == "DEMO" else "UNAVAILABLE",
        "provider_tier": "FALLBACK",
        "is_agency_bulletin": False,
    }


@router.get("/alerts")
async def get_active_marine_alerts() -> List[Dict[str, Any]]:
    """
    Active marine hazard bulletins, when a bulletin provider is connected.

    None is connected. This returns a single ORCA-authored notice saying so.
    It never returns a bulletin attributed to INCOIS, IMD or MoEFCC, because
    ORCA has no feed from any of them and must not invent one.
    """
    return [_no_provider_notice()]
