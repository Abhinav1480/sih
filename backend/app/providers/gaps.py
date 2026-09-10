"""Declared capability gaps: tide, lightning and cyclone.

Canonical queries 3 and 4 ask for tide and for lightning/cyclone alerts, and
ORCA models neither. There are two ways to handle that. One is to answer
anyway from something adjacent — infer "tide" from nothing, or report the
wind-derived alert level as if it were a lightning feed. The other is to say
what is missing and why.

These providers take the second option. They are permanently unconfigured and
exist so the chain can name the specific source that would close each gap,
which is what puts "INSAT-3D lightning: no MOSDAC token" in the trace instead
of leaving a silent hole where a judge expects an answer.

Delete a provider from here the moment a real one replaces it.
"""

from datetime import datetime

from app.models.schemas import DataFreshness, HazardObservation, ProviderTier, TideObservation
from app.providers.base import (
    BaseTideProvider,
    ProviderCapability,
    TieredProvider,
)


class UnconfiguredTideProvider(TieredProvider, BaseTideProvider):
    """Names the source that would provide tide, and reports that it is absent.

    Tidal height at a port is a harmonic sum over constituents (M2, S2, K1, O1
    and friends) whose amplitudes and phases are published per port by the
    Survey of India and INCOIS. The prediction maths is standard and offline;
    the constituent table is the part ORCA does not have. Writing plausible
    amplitudes from memory would produce a curve that looks right and is wrong,
    which is the failure this codebase has already been cleaned of once.
    """

    provider_name = "Survey of India / INCOIS tidal constituents"
    provider_tier = ProviderTier.NATIONAL
    capabilities = {ProviderCapability.TIDE}

    def is_configured(self) -> bool:
        return False

    def not_configured_reason(self) -> str:
        return (
            "no tidal constituent table is bundled. Tide needs published "
            "per-port harmonic constituents (Survey of India / INCOIS tide "
            "tables); it cannot be derived from the wave or wind feeds."
        )

    async def get_tide(self, lat: float, lon: float, offset_hours: int = 0) -> TideObservation:
        return TideObservation(
            status=DataFreshness.UNAVAILABLE,
            source=self.provider_name,
            unavailable_reason=self.not_configured_reason(),
            timestamp=datetime.utcnow(),
        )


class UnconfiguredHazardProvider(TieredProvider):
    """Names INSAT as the lightning and cyclone source, and reports it absent.

    MOSDAC serves INSAT-3D lightning and cyclone products but is token-gated,
    so with no credentials this capability has no provider. The generic
    wind-derived alert level already in the response is NOT a lightning feed
    and must not be presented as one.
    """

    provider_name = "ISRO MOSDAC INSAT-3D lightning / cyclone products"
    provider_tier = ProviderTier.ISRO
    capabilities = {ProviderCapability.HAZARD}

    def is_configured(self) -> bool:
        return False

    def not_configured_reason(self) -> str:
        return (
            "INSAT-3D lightning and cyclone tracking requires a MOSDAC token. "
            "The wind-derived alert level in this response is not a lightning "
            "observation and is not reported as one."
        )

    async def get_hazards(self, lat: float, lon: float, offset_hours: int = 0) -> HazardObservation:
        return HazardObservation(
            status=DataFreshness.UNAVAILABLE,
            source=self.provider_name,
            unavailable_reason=self.not_configured_reason(),
            timestamp=datetime.utcnow(),
        )
