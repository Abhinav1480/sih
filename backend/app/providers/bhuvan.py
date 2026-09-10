"""ISRO / NRSC Bhuvan WMS layers.

The one ISRO source in this chain that needs no credentials and works today.
Bhuvan serves OGC WMS from `bhuvan-vec1.nrsc.gov.in/bhuvan/wms` without
authentication, so these layers reach the map as `kind="wms"` descriptors and
are rendered by the client directly against NRSC — ORCA never proxies the
tiles, and the attribution the user sees is NRSC's own.

Every layer name below was taken from the live GetCapabilities document
(14,477 layers) and verified with a GetMap request returning a real PNG over
the Indian bounding box. They are not guesses:

    moef:coralreefs            200 image/png   17,889 B
    moef:mangroves             200 image/png   29,405 B
    coastal:cps_lulc_mod       200 image/png    7,680 B
    iland:island_ec_190615     200 image/png    9,826 B

`moef:coralreefs` and `moef:mangroves` are the ecologically sensitive zones
that requirement 8 asks for, published by ISRO from MoEFCC source data.

Note the endpoint choice. `bhuvan-vec2` times out and `bhuvan-ras1` returns
403 from here; `bhuvan-vec1` is the host that answers. It is configurable
because a hackathon venue's network may differ from a developer's.
"""

from typing import Dict, List, Optional

import httpx

from app.config import settings
from app.models.envelope import LayerDescriptor
from app.models.schemas import ProviderTier
from app.providers.base import ProviderCapability, ProviderUnavailable, TieredProvider

BHUVAN_ATTRIBUTION = "ISRO / NRSC Bhuvan"


class BhuvanLayerSpec:
    """A Bhuvan WMS layer ORCA knows how to present."""

    def __init__(
        self,
        layer_id: str,
        wms_layer: str,
        name: str,
        legend_title: str,
        color: str,
        visible_by_default: bool = False,
    ):
        self.layer_id = layer_id
        self.wms_layer = wms_layer
        self.name = name
        self.legend_title = legend_title
        self.color = color
        self.visible_by_default = visible_by_default


# Verified against live GetCapabilities + GetMap. Do not add a layer here
# without confirming it renders; a broken layer name is an invisible failure.
BHUVAN_LAYERS: List[BhuvanLayerSpec] = [
    BhuvanLayerSpec(
        layer_id="layer_bhuvan_coralreefs",
        wms_layer="moef:coralreefs",
        name="Coral Reefs (ISRO Bhuvan / MoEFCC)",
        legend_title="Ecologically Sensitive Zone",
        color="#ff6b9d",
        visible_by_default=True,
    ),
    BhuvanLayerSpec(
        layer_id="layer_bhuvan_mangroves",
        wms_layer="moef:mangroves",
        name="Mangroves (ISRO Bhuvan / MoEFCC)",
        legend_title="Ecologically Sensitive Zone",
        color="#2d6a4f",
        visible_by_default=True,
    ),
    BhuvanLayerSpec(
        layer_id="layer_bhuvan_coastal_lulc",
        wms_layer="coastal:cps_lulc_mod",
        name="Coastal Land Use / Land Cover (ISRO Bhuvan)",
        legend_title="Coastal Zone Classification",
        color="#8ecae6",
    ),
    BhuvanLayerSpec(
        layer_id="layer_bhuvan_islands_ec",
        wms_layer="iland:island_ec_190615",
        name="East Coast Islands (ISRO Bhuvan)",
        legend_title="Island Landform",
        color="#ffb703",
    ),
]


class BhuvanWMSProvider(TieredProvider):
    """Publishes Bhuvan layer descriptors and reports honestly when unreachable."""

    provider_name = "ISRO / NRSC Bhuvan WMS"
    provider_tier = ProviderTier.ISRO
    capabilities = {ProviderCapability.MAP_LAYERS}

    def __init__(self, base_url: Optional[str] = None, timeout_sec: float = 8.0):
        self.base_url = base_url or settings.BHUVAN_WMS_URL
        self.timeout = timeout_sec

    def _wms_params(self, spec: BhuvanLayerSpec) -> Dict[str, str]:
        return {
            "service": "WMS",
            "version": "1.1.1",
            "request": "GetMap",
            "layers": spec.wms_layer,
            "styles": "",
            "format": "image/png",
            "transparent": "true",
            "srs": "EPSG:4326",
        }

    def get_layer_descriptors(self) -> List[LayerDescriptor]:
        """Layer descriptors for the frontend. No network call.

        Describing a layer is not the same as fetching it: the client renders
        it against NRSC. If Bhuvan is down the tiles simply do not paint, which
        is why `probe()` exists for the cases where we need to know first.
        """
        return [
            LayerDescriptor(
                id=spec.layer_id,
                name=spec.name,
                kind="wms",
                url=self.base_url,
                wms_params=self._wms_params(spec),
                features=[],
                visible_by_default=spec.visible_by_default,
                color=spec.color,
                legend_title=spec.legend_title,
                attribution=BHUVAN_ATTRIBUTION,
                provider_tier=ProviderTier.ISRO,
            )
            for spec in BHUVAN_LAYERS
        ]

    async def probe(self) -> bool:
        """True when the WMS endpoint answers. Used to label the layers honestly."""
        params = {"service": "WMS", "version": "1.1.1", "request": "GetCapabilities"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
            return response.status_code == 200
        except Exception as exc:
            raise ProviderUnavailable(f"Bhuvan WMS unreachable: {type(exc).__name__}") from exc
