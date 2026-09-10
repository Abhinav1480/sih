from typing import Dict, Any, List, Optional
from app.models.schemas import (
    RegionalComparisonData,
    ComparisonMetric,
    HistoricalTrendData,
    TimeSeriesPoint,
    OceanObservation,
    WeatherObservation,
    LocationContext,
)

class CorrelationEngine:
    """
    Cross-domain data correlation layer.
    Synthesizes multi-sensor oceanographic, atmospheric, and spatial variables
    into coherent comparisons and time-series anomalies.
    """

    def compare_regions(
        self,
        loc_a: LocationContext,
        ocean_a: OceanObservation,
        weather_a: WeatherObservation,
        loc_b: LocationContext,
        ocean_b: OceanObservation,
        weather_b: WeatherObservation,
    ) -> RegionalComparisonData:
        metrics: List[ComparisonMetric] = []

        # 1. Significant Wave Height
        diff_wave = round(ocean_a.significant_wave_height_m - ocean_b.significant_wave_height_m, 2)
        fav_wave = "Similar"
        if abs(diff_wave) >= 0.2:
            fav_wave = f"{loc_b.name} Favorable (Calmer)" if diff_wave > 0 else f"{loc_a.name} Favorable (Calmer)"
        metrics.append(ComparisonMetric(
            metric_name="Significant Wave Height",
            unit="meters",
            location_a_value=ocean_a.significant_wave_height_m,
            location_b_value=ocean_b.significant_wave_height_m,
            difference=diff_wave,
            favorability=fav_wave
        ))

        # 2. Wind Speed
        diff_wind = round(weather_a.wind_speed_knots - weather_b.wind_speed_knots, 1)
        fav_wind = "Similar"
        if abs(diff_wind) >= 3.0:
            fav_wind = f"{loc_b.name} Favorable (Lighter wind)" if diff_wind > 0 else f"{loc_a.name} Favorable (Lighter wind)"
        metrics.append(ComparisonMetric(
            metric_name="Sustained Wind Speed",
            unit="knots",
            location_a_value=weather_a.wind_speed_knots,
            location_b_value=weather_b.wind_speed_knots,
            difference=diff_wind,
            favorability=fav_wind
        ))

        # 3. Sea Surface Temperature, only when both sides actually have one.
        #    Comparing against a fabricated constant produced a difference of
        #    exactly 0.0 for every pair of locations.
        if ocean_a.sea_surface_temp_c is not None and ocean_b.sea_surface_temp_c is not None:
            diff_sst = round(ocean_a.sea_surface_temp_c - ocean_b.sea_surface_temp_c, 1)
            metrics.append(ComparisonMetric(
                metric_name="Sea Surface Temperature (SST)",
                unit="°C",
                location_a_value=ocean_a.sea_surface_temp_c,
                location_b_value=ocean_b.sea_surface_temp_c,
                difference=diff_sst,
                favorability="Normal Seasonal Fronts"
            ))

        # Verdict
        if ocean_a.significant_wave_height_m < ocean_b.significant_wave_height_m and weather_a.wind_speed_knots < weather_b.wind_speed_knots:
            verdict = f"{loc_a.name} offers significantly calmer sea conditions and lower marine risk than {loc_b.name}."
        elif ocean_b.significant_wave_height_m < ocean_a.significant_wave_height_m and weather_b.wind_speed_knots < weather_a.wind_speed_knots:
            verdict = f"{loc_b.name} exhibits more favorable sea states and lower wind shear compared to {loc_a.name}."
        else:
            verdict = f"Mixed conditions between {loc_a.name} and {loc_b.name}; localized wave energy differs by {abs(diff_wave):.1f}m."

        return RegionalComparisonData(
            location_a=loc_a,
            location_b=loc_b,
            metrics=metrics,
            overall_verdict=verdict
        )

    def generate_historical_trend(
        self,
        location: LocationContext,
        current_ocean: OceanObservation,
        current_weather: WeatherObservation,
        past_ocean: OceanObservation,
        past_weather: WeatherObservation,
        period_label: str = "Last 24 Hours"
    ) -> HistoricalTrendData:
        # Build 5 time-series points simulating the interval progression
        points: List[TimeSeriesPoint] = []
        labels = ["T - 24h", "T - 18h", "T - 12h", "T - 6h", "Current"]
        
        w_start = past_ocean.significant_wave_height_m
        w_end = current_ocean.significant_wave_height_m
        wind_start = past_weather.wind_speed_knots
        wind_end = current_weather.wind_speed_knots

        for i, lbl in enumerate(labels):
            fraction = i / 4.0
            interp_wave = round(w_start + (w_end - w_start) * fraction, 2)
            interp_wind = round(wind_start + (wind_end - wind_start) * fraction, 1)
            if past_ocean.sea_surface_temp_c is None or current_ocean.sea_surface_temp_c is None:
                interp_sst = None
            else:
                interp_sst = round(
                    past_ocean.sea_surface_temp_c
                    + (current_ocean.sea_surface_temp_c - past_ocean.sea_surface_temp_c) * fraction,
                    1,
                )
            score = int(min(100, max(10, interp_wave * 20 + interp_wind * 1.5)))
            points.append(TimeSeriesPoint(
                timestamp=lbl,
                wave_height_m=interp_wave,
                wind_knots=interp_wind,
                sst_c=interp_sst,
                risk_score=score
            ))

        wave_delta = round(w_end - w_start, 2)
        wind_delta = round(wind_end - wind_start, 1)

        change_reasons = []
        if abs(wave_delta) >= 0.4:
            direction = "increased" if wave_delta > 0 else "subsided"
            change_reasons.append(f"Significant wave height {direction} by {abs(wave_delta):.1f}m over the period.")
        if abs(wind_delta) >= 4.0:
            direction = "strengthened" if wind_delta > 0 else "weakened"
            change_reasons.append(f"Coastal surface wind speeds {direction} by {abs(wind_delta):.1f} knots.")

        summary = (
            f"Conditions near {location.name} have {'moderated favorably' if wave_delta < 0 else 'experienced increased wave roughness'} "
            f"over the {period_label.lower()} ({w_start}m → {w_end}m SWH)."
        )

        return HistoricalTrendData(
            location_name=location.name,
            period_description=period_label,
            trend_summary=summary,
            points=points,
            significant_change_detected=len(change_reasons) > 0,
            change_reasons=change_reasons
        )
