from fastapi import APIRouter
from typing import List, Dict, Any
from app.geospatial.protected_areas import INDIAN_MARINE_PROTECTED_AREAS
from app.geospatial.boundaries import INDIAN_COASTAL_NODES

router = APIRouter()

@router.get("/layers/mpas")
async def get_marine_protected_areas() -> List[Dict[str, Any]]:
    """Returns official Indian Marine Protected Areas (MPAs) with GeoJSON polygons."""
    return INDIAN_MARINE_PROTECTED_AREAS

@router.get("/layers/ports")
async def get_coastal_ports() -> Dict[str, Any]:
    """Returns Indian major coastal ports and harbors catalog."""
    return INDIAN_COASTAL_NODES
