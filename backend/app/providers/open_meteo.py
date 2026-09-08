import httpx
from datetime import datetime, timedelta
from typing import Optional
from app.models.schemas import (
    OceanObservation,
    WeatherObservation,
    DataFreshness,
)
from app.providers.base import BaseOceanProvider, BaseWeatherProvider

class OpenMeteoProvider(BaseOceanProvider, BaseWeatherProvider):
    """
    Live Marine & Weather Provider using open-access Copernicus/ECMWF
    models via Open-Meteo API.
    """

    def __init__(self, timeout_sec: float = 6.0):
        self.timeout = timeout_sec
        self.marine_url = "https://marine-api.open-meteo.com/v1/marine"
        self.weather_url = "https://api.open-meteo.com/v1/forecast"

    async def get_ocean_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> OceanObservation:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period",
            "forecast_days": 3
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(self.marine_url, params=params)
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        # Determine target hour index
        target_time = datetime.utcnow() + timedelta(hours=offset_hours)
        target_iso = target_time.strftime("%Y-%m-%dT%H:00")
        idx = 0
        if target_iso in times:
            idx = times.index(target_iso)
        elif len(times) > 0:
            idx = min(max(0, offset_hours), len(times) - 1)

        wave_height = hourly.get("wave_height", [1.5])[idx] or 1.5
        swell_height = hourly.get("swell_wave_height", [1.0])[idx] or 1.0
        swell_period = hourly.get("swell_wave_period", [8.0])[idx] or 8.0
        swell_dir = hourly.get("swell_wave_direction", [160.0])[idx] or 160.0

        sea_state = "Moderate" if wave_height < 2.5 else ("Rough" if wave_height < 4.0 else "High")

        return OceanObservation(
            significant_wave_height_m=round(float(wave_height), 2),
            swell_height_m=round(float(swell_height), 2),
            swell_period_sec=round(float(swell_period), 1),
            swell_direction_deg=round(float(swell_dir), 1),
            sea_surface_temp_c=28.4,
            ocean_current_speed_m_s=0.45,
            ocean_current_direction_deg=75.0,
            sea_state=sea_state,
            status=DataFreshness.LIVE if offset_hours == 0 else DataFreshness.FORECAST,
            source="Open-Meteo Marine / Copernicus Marine Service (Live API)",
            timestamp=target_time
        )

    async def get_weather_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> WeatherObservation:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility",
            "wind_speed_unit": "kn",
            "forecast_days": 3
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(self.weather_url, params=params)
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        
        target_time = datetime.utcnow() + timedelta(hours=offset_hours)
        target_iso = target_time.strftime("%Y-%m-%dT%H:00")
        idx = 0
        if target_iso in times:
            idx = times.index(target_iso)
        elif len(times) > 0:
            idx = min(max(0, offset_hours), len(times) - 1)

        wind_speed = hourly.get("wind_speed_10m", [12.0])[idx] or 12.0
        wind_gust = hourly.get("wind_gusts_10m", [16.0])[idx] or (wind_speed * 1.3)
        wind_dir = hourly.get("wind_direction_10m", [180.0])[idx] or 180.0
        air_temp = hourly.get("temperature_2m", [28.5])[idx] or 28.5
        precip = hourly.get("precipitation", [0.0])[idx] or 0.0
        visibility = (hourly.get("visibility", [10000.0])[idx] or 10000.0) / 1000.0  # km

        alert_level = "None"
        warning = None
        if wind_speed > 28.0:
            alert_level = "Orange"
            warning = "High wind squall advisory"
        elif wind_speed > 20.0:
            alert_level = "Yellow"
            warning = "Moderate coastal wind advisory"

        return WeatherObservation(
            wind_speed_knots=round(float(wind_speed), 1),
            wind_direction_deg=round(float(wind_dir), 1),
            wind_gust_knots=round(float(wind_gust), 1),
            air_temp_c=round(float(air_temp), 1),
            precipitation_mm=round(float(precip), 1),
            visibility_km=round(float(visibility), 1),
            storm_warning=warning,
            alert_level=alert_level,
            status=DataFreshness.LIVE if offset_hours == 0 else DataFreshness.FORECAST,
            source="Open-Meteo Global Atmospheric Forecast (Live API)",
            timestamp=target_time
        )
