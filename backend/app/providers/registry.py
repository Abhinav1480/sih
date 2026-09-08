from app.config import settings
from app.providers.base import (
    BaseOceanProvider,
    BaseWeatherProvider,
    BaseFisheriesProvider,
)
from app.providers.demo_provider import HighFidelityDemoProvider
from app.providers.open_meteo import OpenMeteoProvider

class ProviderRegistry:
    def __init__(self):
        self._demo_provider = HighFidelityDemoProvider()
        self._live_provider = OpenMeteoProvider()

    def get_ocean_provider(self) -> BaseOceanProvider:
        if settings.ORCA_MODE == "LIVE":
            return self._live_provider
        return self._demo_provider

    def get_weather_provider(self) -> BaseWeatherProvider:
        if settings.ORCA_MODE == "LIVE":
            return self._live_provider
        return self._demo_provider

    def get_fisheries_provider(self) -> BaseFisheriesProvider:
        # INCOIS PFZ integration uses the high-fidelity spatial demo provider
        return self._demo_provider

    def get_fallback_provider(self) -> HighFidelityDemoProvider:
        return self._demo_provider

registry = ProviderRegistry()
