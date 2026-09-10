"""MOSDAC and Bhoonidhi: ISRO product services that need credentials.

Both are real, both are authentication-gated, and both are product-download
services rather than point-query APIs: you request a granule (an INSAT-3D
half-hourly scene, an Oceansat-3 OCM chlorophyll product) and get a file back,
not a JSON value for a coordinate.

That shape matters for the demo. A file-download service cannot answer "what is
the wave height here right now" inside a request, so these adapters read from a
**cached granule store** on disk. Granules are fetched out of band, indexed, and
served from the cache at query time — which is also what makes them work at a
venue with no connectivity.

Neither adapter has credentials in this repository and neither invents data.
With no token and no cached granule they report themselves unconfigured, the
chain falls through, and the trace says so in as many words. That is the honest
outcome and it is what a judge sees: an ISRO source attempted first and skipped
for a stated reason, not an ISRO badge on a European model's number.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings
from app.models.schemas import ProviderTier
from app.providers.base import ProviderCapability, ProviderUnavailable, TieredProvider


class GranuleCache:
    """On-disk store of pre-fetched ISRO product granules.

    Layout:  <root>/<service>/index.json  plus the granule files beside it.
    The index maps a product key to a granule descriptor. An absent or empty
    index is the normal state in this repository and is not an error.
    """

    def __init__(self, root: Path, service: str):
        self.root = Path(root) / service
        self.service = service

    @property
    def index_path(self) -> Path:
        return self.root / "index.json"

    def is_populated(self) -> bool:
        return self.index_path.is_file() and bool(self.load_index())

    def load_index(self) -> Dict[str, Any]:
        try:
            with open(self.index_path, "r", encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, json.JSONDecodeError):
            return {}

    def lookup(self, product: str, lat: float, lon: float, when: datetime) -> Optional[Dict[str, Any]]:
        """Nearest cached granule for a product, or None.

        ponytail: exact product-key match only. Spatial/temporal nearest-granule
        selection lands when there are real granules to select between.
        """
        index = self.load_index()
        entry = index.get(product)
        if not entry:
            return None
        return entry


class _TokenGatedISROProvider(TieredProvider):
    """Shared behaviour: a token from the environment plus a granule cache."""

    provider_tier = ProviderTier.ISRO
    service_key = "generic"
    docs_url = ""

    def __init__(self, token: str, cache_root: Optional[Path] = None):
        self.token = (token or "").strip()
        root = Path(cache_root or settings.ISRO_GRANULE_CACHE_DIR)
        self.cache = GranuleCache(root, self.service_key)

    def is_configured(self) -> bool:
        # Usable with a token (can fetch) or with a populated cache (offline demo).
        return bool(self.token) or self.cache.is_populated()

    def not_configured_reason(self) -> str:
        return (
            f"no {self.service_key.upper()} token set and no cached granules in "
            f"{self.cache.root}; register at {self.docs_url} and set the token in .env"
        )

    def _require_granule(self, product: str, lat: float, lon: float, when: datetime) -> Dict[str, Any]:
        granule = self.cache.lookup(product, lat, lon, when)
        if granule is None:
            raise ProviderUnavailable(
                f"{self.provider_name}: no cached granule for product {product!r}. "
                f"This service returns files, not point queries; granules must be "
                f"fetched out of band into {self.cache.root}."
            )
        return granule


class MOSDACProvider(_TokenGatedISROProvider):
    """INSAT-3D / 3DR / 3DS products: SST, cloud, lightning, cyclone tracking."""

    provider_name = "ISRO MOSDAC (INSAT-3D/3DR/3DS)"
    service_key = "mosdac"
    docs_url = "https://mosdac.gov.in"
    capabilities = {
        ProviderCapability.OCEAN,
        ProviderCapability.WEATHER,
        ProviderCapability.HAZARD,
    }

    def __init__(self, cache_root: Optional[Path] = None):
        super().__init__(settings.MOSDAC_API_TOKEN, cache_root)

    async def get_lightning_and_cyclone(self, lat: float, lon: float, when: datetime) -> Dict[str, Any]:
        """INSAT lightning strikes and cyclone tracks near a position.

        This is the source that would close canonical query 4. Without a token
        or a cached granule it raises, and the hazard chain records the gap
        rather than answering from the generic wind-derived alert level.
        """
        return self._require_granule("insat_lightning_cyclone", lat, lon, when)


class BhoonidhiProvider(_TokenGatedISROProvider):
    """NRSC Bhoonidhi: Oceansat-3 / EOS-06 OCM, SCATSAT winds, SARAL-AltiKa."""

    provider_name = "ISRO NRSC Bhoonidhi (Oceansat-3 / SCATSAT / SARAL)"
    service_key = "bhoonidhi"
    docs_url = "https://bhoonidhi.nrsc.gov.in"
    capabilities = {ProviderCapability.OCEAN, ProviderCapability.FISHERIES}

    def __init__(self, cache_root: Optional[Path] = None):
        super().__init__(settings.BHOONIDHI_API_TOKEN, cache_root)

    async def get_chlorophyll(self, lat: float, lon: float, when: datetime) -> Dict[str, Any]:
        """Oceansat-3 OCM chlorophyll-a, the real basis for PFZ ranking."""
        return self._require_granule("oceansat3_ocm_chlorophyll", lat, lon, when)

    async def get_altimetry_wave_height(self, lat: float, lon: float, when: datetime) -> Dict[str, Any]:
        """SARAL-AltiKa significant wave height."""
        return self._require_granule("saral_altika_swh", lat, lon, when)


class INCOISCachedProvider(TieredProvider):
    """INCOIS Ocean State Forecast and PFZ advisories, from cache only.

    INCOIS publishes OSF and PFZ through a JSP portal with no clean public JSON
    API. Scraping it live would be fragile and would break on stage, so this
    provider reads a cache and never promises live retrieval. With no cache it
    reports unconfigured; it does not fabricate an advisory.
    """

    provider_name = "INCOIS Ocean State Forecast / PFZ (cached)"
    provider_tier = ProviderTier.NATIONAL
    service_key = "incois"
    capabilities = {ProviderCapability.OCEAN, ProviderCapability.FISHERIES}

    def __init__(self, cache_root: Optional[Path] = None):
        root = Path(cache_root or settings.ISRO_GRANULE_CACHE_DIR)
        self.cache = GranuleCache(root, self.service_key)

    def is_configured(self) -> bool:
        return self.cache.is_populated()

    def not_configured_reason(self) -> str:
        return (
            f"no cached INCOIS advisories in {self.cache.root}. The INCOIS portal "
            f"is JSP with no public JSON API, so advisories are cached out of "
            f"band rather than fetched live."
        )
