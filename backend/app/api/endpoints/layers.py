from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query

from app.geospatial.boundaries import INDIAN_COASTAL_NODES, location_from_coordinates
from app.geospatial.protected_areas import INDIAN_MARINE_PROTECTED_AREAS
from app.models.envelope import LayerDescriptor
from app.models.schemas import MapLayerFeature, ProviderTier
from app.providers.registry import registry

router = APIRouter()


@router.get("/layers")
async def get_bootstrap_layers(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
) -> Dict[str, List[LayerDescriptor]]:
    """Layers the map can show before any query: the real ISRO Bhuvan WMS
    layers (tier ISRO, rendered by the client against NRSC), the marine
    protected area polygons (MoEFCC geometry bundled with ORCA, tier
    FALLBACK because ORCA serves it), and the device position when given.
    Same LayerDescriptor shape as `layers[]` in the query envelope."""
    layers: List[LayerDescriptor] = []

    if lat is not None and lon is not None:
        here = location_from_coordinates(lat, lon, label="Your position")
        layers.append(LayerDescriptor(
            id="layer_locations",
            name="Device position",
            kind="geojson",
            geometry_type="point",
            features=[MapLayerFeature(
                geometry={"type": "Point", "coordinates": [lon, lat]},
                properties={"name": here.name, "title": here.name, "nearest_port": here.nearest_port, "type": "target_center"},
            )],
            color="#38e8d0",
            legend_title="Device position",
            provider_tier=ProviderTier.FALLBACK,
        ))

    layers.append(LayerDescriptor(
        id="layer_mpas",
        name="Marine Protected Areas & Sanctuaries (MoEFCC)",
        kind="geojson",
        geometry_type="polygon",
        features=[
            MapLayerFeature(
                geometry={"type": "Polygon", "coordinates": [mpa["polygon_coords"]]},
                properties={
                    "id": mpa["id"], "name": mpa["name"], "designation": mpa["designation"],
                    "restriction": mpa["restriction_level"], "authority": mpa["authority"],
                    "description": mpa["description"],
                },
            )
            for mpa in INDIAN_MARINE_PROTECTED_AREAS
        ],
        color="#ff5d5d",
        legend_title="Sanctuary / Conservation Zone",
        attribution="MoEFCC protected-area geometry, simplified, bundled with ORCA",
        provider_tier=ProviderTier.FALLBACK,
    ))
    layers.extend(registry.get_isro_layer_descriptors())
    return {"layers": layers}


@router.get("/layers/mpas")
async def get_marine_protected_areas() -> List[Dict[str, Any]]:
    """Returns official Indian Marine Protected Areas (MPAs) with GeoJSON polygons."""
    return INDIAN_MARINE_PROTECTED_AREAS

@router.get("/layers/ports")
async def get_coastal_ports() -> Dict[str, Any]:
    """Returns Indian major coastal ports and harbors catalog."""
    return INDIAN_COASTAL_NODES
