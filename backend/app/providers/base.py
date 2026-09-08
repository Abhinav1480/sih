from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from app.models.schemas import (
    OceanObservation,
    WeatherObservation,
    PotentialFishingZone,
)

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
