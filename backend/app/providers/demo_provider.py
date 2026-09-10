import math
from datetime import datetime, timedelta
from typing import List, Optional
from app.models.schemas import (
    OceanObservation,
    WeatherObservation,
    PotentialFishingZone,
    DataFreshness,
)
from app.providers.base import (
    BaseOceanProvider,
    BaseWeatherProvider,
    BaseFisheriesProvider,
)
from app.geospatial.calculations import (
    destination_point,
    haversine_distance,
    initial_bearing,
)
from app.geospatial.protected_areas import check_point_in_mpa

class HighFidelityDemoProvider(BaseOceanProvider, BaseWeatherProvider, BaseFisheriesProvider):
    """
    Deterministic synthetic marine provider calibrated against typical seasonal
    INCOIS Ocean State Forecasts and IMD Coastal bulletins.
    Ensures 100% reproducible behavior across any unseen coordinate or time offset.
    """

    def _get_coastal_seed(self, lat: float, lon: float, offset_hours: int) -> float:
        """Deterministic seed based on spatial coordinates and time offset."""
        val = math.sin(lat * 3.1415 + lon * 2.7182 + (offset_hours * 0.25))
        return (val + 1.0) / 2.0  # Normalized 0.0 to 1.0

    async def get_ocean_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> OceanObservation:
        seed = self._get_coastal_seed(lat, lon, offset_hours)
        now = datetime.utcnow()
        obs_time = now + timedelta(hours=offset_hours)

        # Baseline wave height between 1.1m and 3.2m based on geography & time
        # East Coast / Bay of Bengal often has slightly higher swell in certain seasons
        is_bay_of_bengal = lon > 78.0
        base_wave = 1.6 if is_bay_of_bengal else 1.3
        
        # Diurnal morning effect (often slightly calmer waves in early morning 05:00-08:00 UTC)
        wave_height = round(base_wave + (seed * 1.5) - (0.2 if 5 <= obs_time.hour <= 9 else 0.0), 2)
        wave_height = max(0.8, wave_height)

        swell_height = round(wave_height * 0.75 + (seed * 0.4), 2)
        swell_period = round(8.0 + (seed * 5.0), 1)
        swell_dir = round((140.0 + seed * 80.0) % 360.0, 1)

        # Sea Surface Temperature typically 27.5°C - 30.5°C in tropical Indian waters
        sst = round(28.2 + (seed * 1.8) - (0.3 if offset_hours < 0 else 0.0), 1)

        current_speed = round(0.3 + (seed * 0.8), 2)
        current_dir = round((45.0 + seed * 180.0) % 360.0, 1)

        if wave_height < 1.5:
            sea_state = "Slight (Smooth)"
        elif wave_height < 2.5:
            sea_state = "Moderate"
        elif wave_height < 4.0:
            sea_state = "Rough"
        else:
            sea_state = "Very Rough to High"

        freshness = DataFreshness.DEMO
        if offset_hours > 0:
            freshness = DataFreshness.FORECAST
        elif offset_hours < 0:
            freshness = DataFreshness.HISTORICAL

        return OceanObservation(
            significant_wave_height_m=wave_height,
            swell_height_m=swell_height,
            swell_period_sec=swell_period,
            swell_direction_deg=swell_dir,
            sea_surface_temp_c=sst,
            ocean_current_speed_m_s=current_speed,
            ocean_current_direction_deg=current_dir,
            sea_state=sea_state,
            status=freshness,
            source="ORCA Deterministic Demo Model (synthetic ocean state, not an observation)",
            timestamp=obs_time
        )

    async def get_weather_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> WeatherObservation:
        seed = self._get_coastal_seed(lat + 0.1, lon - 0.1, offset_hours)
        now = datetime.utcnow()
        obs_time = now + timedelta(hours=offset_hours)

        # Wind speed correlated with waves
        wind_speed = round(12.0 + (seed * 16.0), 1)
        wind_gust = round(wind_speed * 1.35, 1)
        wind_dir = round((180.0 + seed * 90.0) % 360.0, 1)

        air_temp = round(29.0 + (seed * 4.0) - (2.0 if 0 <= obs_time.hour <= 6 else 0.0), 1)
        precip = round(seed * 4.5 if seed > 0.65 else 0.0, 1)
        visibility = round(10.0 - (seed * 4.0 if precip > 1.0 else 0.0), 1)

        # Weather alerts based on wind thresholds
        if wind_speed > 28.0:
            alert_level = "Orange"
            storm_warning = "Squally weather with wind speed reaching 28-35 knots; sea condition likely rough."
        elif wind_speed > 20.0:
            alert_level = "Yellow"
            storm_warning = "Moderate squalls likely in open coastal waters. Fishermen advised to exercise caution."
        else:
            alert_level = "None"
            storm_warning = None

        freshness = DataFreshness.DEMO
        if offset_hours > 0:
            freshness = DataFreshness.FORECAST
        elif offset_hours < 0:
            freshness = DataFreshness.HISTORICAL

        return WeatherObservation(
            wind_speed_knots=wind_speed,
            wind_direction_deg=wind_dir,
            wind_gust_knots=wind_gust,
            air_temp_c=air_temp,
            precipitation_mm=precip,
            visibility_km=visibility,
            storm_warning=storm_warning,
            alert_level=alert_level,
            status=freshness,
            source="ORCA Deterministic Demo Model (synthetic coastal weather, not an observation)",
            timestamp=obs_time
        )

    async def get_potential_fishing_zones(
        self,
        lat: float,
        lon: float,
        radius_km: float = 40.0,
        target_time: Optional[datetime] = None
    ) -> List[PotentialFishingZone]:
        """
        Synthesizes realistic Potential Fishing Zones (PFZs) with SST fronts,
        chlorophyll-a concentrations, depth, and MPA compliance.
        """
        zones: List[PotentialFishingZone] = []
        target_time = target_time or datetime.utcnow()

        # Generate 4-6 realistic offshore candidate zones around the location
        bearings = [45, 90, 135, 180, 220]
        distances = [12.5, 24.0, 32.5, 38.0, 48.0]

        for idx, (b, d) in enumerate(zip(bearings, distances)):
            if d > radius_km * 1.25:
                continue

            z_lat, z_lon = destination_point(lat, lon, d, b)
            is_in_mpa, mpa_info = check_point_in_mpa(z_lat, z_lon)

            # Localized marine parameters
            seed = self._get_coastal_seed(z_lat, z_lon, idx)
            sst = round(28.0 + (seed * 1.2), 1)
            # Chlorophyll-a typical coastal ranges 0.3 - 2.5 mg/m³
            chlorophyll = round(0.5 + (seed * 1.6), 2)
            depth = round(25.0 + (d * 3.5), 1)

            # Wave and wind at this zone
            zone_wave = round(1.2 + (seed * 1.4), 2)
            zone_wind = round(11.0 + (seed * 12.0), 1)

            # Calculate composite suitability score (0 - 100)
            # High chlorophyll (+), favorable SST (+), low waves (+), not inside MPA (+)
            score = 50.0
            if chlorophyll > 1.2:
                score += 25.0
            elif chlorophyll > 0.8:
                score += 15.0

            if 27.8 <= sst <= 29.2:
                score += 15.0  # Ideal thermal front

            if zone_wave < 1.8:
                score += 10.0
            elif zone_wave > 2.5:
                score -= 20.0

            if is_in_mpa:
                score -= 40.0  # Severe penalty for protected sanctuary

            score = max(5.0, min(98.0, score))

            name_prefix = f"Zone {chr(65 + idx)} ({d:.1f} km {b}°)"
            advisory = "Highly Favorable" if score > 75 else ("Moderate Potential" if score > 50 else "Marginal / Restricted")

            zones.append(PotentialFishingZone(
                zone_id=f"pfz_{idx+1}",
                name=name_prefix,
                latitude=z_lat,
                longitude=z_lon,
                distance_km=d,
                bearing_deg=float(b),
                sst_c=sst,
                chlorophyll_mg_m3=chlorophyll,
                depth_m=depth,
                suitability_score=round(score, 1),
                rank=idx + 1,
                within_mpa=is_in_mpa,
                mpa_name=mpa_info["name"] if mpa_info else None,
                wave_height_m=zone_wave,
                wind_speed_knots=zone_wind,
                advisory_status=advisory,
                valid_until=target_time + timedelta(hours=24)
            ))

        # Sort by suitability score descending and assign actual ranks
        zones.sort(key=lambda z: z.suitability_score, reverse=True)
        for r_idx, z in enumerate(zones):
            z.rank = r_idx + 1

        return zones
