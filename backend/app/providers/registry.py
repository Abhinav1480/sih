"""Builds the per-capability provider chains.

The chain is the same in DEMO and LIVE; only its membership differs. That is
deliberate — the fallback path is exercised on every demo run rather than being
code that first executes on stage.

Order within a chain is not set here. `TieredChain` sorts by declared tier, so
ISRO is always attempted first regardless of the order these lists are written in.
"""

from typing import List

from app.config import settings
from app.models.schemas import ProviderTier
from app.providers.base import ProviderCapability, TieredProvider
from app.providers.bhuvan import BhuvanWMSProvider
from app.providers.chain import TieredChain
from app.providers.demo_provider import HighFidelityDemoProvider
from app.providers.gaps import UnconfiguredHazardProvider, UnconfiguredTideProvider
from app.providers.isro_fixtures import ISROGranuleProvider
from app.providers.isro_products import (
    BhoonidhiProvider,
    INCOISCachedProvider,
    MOSDACProvider,
)
from app.providers.open_meteo import OpenMeteoProvider


class ProviderRegistry:
    def __init__(self):
        # ISRO tier
        # Real clipped granules committed in this repository. Registered like
        # any other provider and sorted into place by tier, so it is attempted
        # before the token-gated services rather than being a special path.
        self.isro_granules = ISROGranuleProvider()
        self.bhuvan = BhuvanWMSProvider()
        self.mosdac = MOSDACProvider()
        self.bhoonidhi = BhoonidhiProvider()
        # National tier
        self.incois = INCOISCachedProvider()
        # Fallback tier
        self.open_meteo = OpenMeteoProvider()
        self.demo = HighFidelityDemoProvider()

        self._build_chains()

    # -- chain assembly ----------------------------------------------------

    def _tail(self) -> List[TieredProvider]:
        """The fallback end of every observation chain.

        In LIVE mode Open-Meteo is tried before the synthetic model. In DEMO
        mode the synthetic model is the only fallback, which is what makes DEMO
        work with the network physically disconnected.
        """
        if settings.ORCA_MODE == "LIVE":
            return [self.open_meteo, self.demo]
        return [self.demo]

    def _build_chains(self) -> None:
        self.ocean_chain = TieredChain(
            "ocean",
            [self.isro_granules, self.bhoonidhi, self.mosdac, self.incois] + self._tail(),
        )
        self.weather_chain = TieredChain(
            "weather",
            [self.mosdac] + self._tail(),
        )
        self.fisheries_chain = TieredChain(
            "fisheries",
            [self.bhoonidhi, self.incois, self.demo],
        )
        # Tide and hazards have no working provider. The chains exist so the
        # trace names the missing source instead of leaving a silent hole.
        self.tide_chain = TieredChain("tide", [UnconfiguredTideProvider()])
        self.hazard_chain = TieredChain("hazard", [UnconfiguredHazardProvider()])

    def rebuild(self) -> None:
        """Re-read ORCA_MODE and reassemble. Used by tests that switch modes."""
        self._build_chains()

    # -- map layers --------------------------------------------------------

    def get_isro_layer_descriptors(self):
        """Bhuvan WMS descriptors. No network call; the client renders them."""
        return self.bhuvan.get_layer_descriptors()

    # -- legacy single-provider accessors ----------------------------------
    # Retained so callers not yet migrated to the chains keep working.

    def get_ocean_provider(self):
        return self.open_meteo if settings.ORCA_MODE == "LIVE" else self.demo

    def get_weather_provider(self):
        return self.open_meteo if settings.ORCA_MODE == "LIVE" else self.demo

    def get_fisheries_provider(self):
        return self.demo

    def get_fallback_provider(self) -> HighFidelityDemoProvider:
        return self.demo

    def describe(self) -> List[dict]:
        """Every registered provider and its declared tier, for the docs endpoint."""
        providers = [
            self.isro_granules, self.bhuvan, self.bhoonidhi, self.mosdac,
            self.incois, self.open_meteo, self.demo,
        ]
        return [
            {
                "provider": p.provider_name,
                "tier": p.provider_tier.value,
                "configured": p.is_configured(),
                "reason": None if p.is_configured() else p.not_configured_reason(),
                "capabilities": sorted(c.value for c in p.capabilities),
            }
            for p in providers
        ]


registry = ProviderRegistry()
