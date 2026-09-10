from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import List, Optional, Set

from app.models.schemas import (
    OceanObservation,
    PotentialFishingZone,
    ProviderTier,
    TideObservation,
    WeatherObservation,
)


class ProviderCapability(str, Enum):
    """What a provider can answer. Used to build the per-capability chains."""

    OCEAN = "ocean"
    WEATHER = "weather"
    FISHERIES = "fisheries"
    TIDE = "tide"
    HAZARD = "hazard"          # lightning, cyclone tracking
    MAP_LAYERS = "map_layers"


class ProviderUnavailable(Exception):
    """A provider could not serve this request; the chain should fall through.

    Distinct from an unexpected error: this is the provider correctly reporting
    that it has no answer (no coverage, upstream down, rate limited), which is
    normal operation for a tiered chain, not a bug.
    """


class TieredProvider(ABC):
    """A data source that declares who it is and how authoritative it is.

    `provider_tier` is a *registration*: the chain validates every value this
    provider returns against it and refuses anything that does not match, so a
    provider cannot quietly emit a tier it is not registered for.
    """

    provider_name: str = "Unnamed Provider"
    provider_tier: ProviderTier = ProviderTier.FALLBACK
    capabilities: Set[ProviderCapability] = set()

    def is_configured(self) -> bool:
        """False when the provider cannot run at all, e.g. a missing token.

        A provider that is not configured is skipped and recorded as such,
        which is how the trace explains an ISRO source being absent.
        """
        return True

    def not_configured_reason(self) -> str:
        return "not configured"


class BaseOceanProvider(ABC):
    @abstractmethod
    async def get_ocean_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> OceanObservation:
        pass


class BaseWeatherProvider(ABC):
    @abstractmethod
    async def get_weather_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> WeatherObservation:
        pass


class BaseFisheriesProvider(ABC):
    @abstractmethod
    async def get_potential_fishing_zones(
        self,
        lat: float,
        lon: float,
        radius_km: float = 40.0,
        target_time: Optional[datetime] = None
    ) -> List[PotentialFishingZone]:
        pass


class BaseTideProvider(ABC):
    """Tidal state at a coastal position.

    Canonical query 3 asks for tide explicitly and nothing in ORCA modelled it.
    Tide is not derivable from the wave and wind feeds already present; it needs
    harmonic constituents for the port, which is a separate data source.
    """

    @abstractmethod
    async def get_tide(self, lat: float, lon: float, offset_hours: int = 0) -> TideObservation:
        pass
