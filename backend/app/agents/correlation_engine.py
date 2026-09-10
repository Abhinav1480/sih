from typing import Dict, Any, List, Optional
from app.models.schemas import (
    RegionalComparisonData,
    ComparisonMetric,
    HistoricalTrendData,
    TimeSeriesPoint,
    OceanObservation,
    WeatherObservation,
    LocationContext,
    RankedConditionChange,
    SpatialWhatIfAnalysisData,
)

class CorrelationEngine:
    """
    Cross-domain data correlation layer.
    Synthesizes multi-sensor oceanographic, atmospheric, and spatial variables
    into coherent comparisons, spatial what-if rankings, and time-series anomalies.
    """

    def analyze_spatial_displacement(
        self,
        loc_a: LocationContext,
        ocean_a: OceanObservation,
        weather_a: WeatherObservation,
        loc_b: LocationContext,
        ocean_b: OceanObservation,
        weather_b: WeatherObservation,
        distance_km: float,
        direction: str,
        bearing_deg: float,
        temporal_label: str
    ) -> SpatialWhatIfAnalysisData:
        """
        Analyzes multi-variable marine conditions between Origin (Location A) and
        Displaced target (Location B) for the identical temporal horizon.
        Computes differences, ranks condition changes by operational importance,
        and provides physically grounded explanations.
        """
        raw_candidates = [
            {
                "name": "Significant Wave Height",
                "unit": "meters",
                "val_a": ocean_a.significant_wave_height_m,
                "val_b": ocean_b.significant_wave_height_m,
                "type": "wave",
            },
            {
                "name": "Sustained Surface Wind",
                "unit": "knots",
                "val_a": weather_a.wind_speed_knots,
                "val_b": weather_b.wind_speed_knots,
                "type": "wind",
            },
            {
                "name": "Swell Wave Height",
                "unit": "meters",
                "val_a": ocean_a.swell_height_m,
                "val_b": ocean_b.swell_height_m,
                "type": "swell",
            },
            {
                "name": "Sea Surface Temperature",
                "unit": "°C",
                "val_a": ocean_a.sea_surface_temp_c,
                "val_b": ocean_b.sea_surface_temp_c,
                "type": "sst",
            },
            {
                "name": "Surface Wind Gusts",
                "unit": "knots",
                "val_a": weather_a.wind_gust_knots,
                "val_b": weather_b.wind_gust_knots,
                "type": "gust",
            },
            {
                "name": "Ocean Current Speed",
                "unit": "m/s",
                "val_a": ocean_a.ocean_current_speed_m_s,
                "val_b": ocean_b.ocean_current_speed_m_s,
                "type": "current",
            },
            {
                "name": "Swell Dominant Period",
                "unit": "seconds",
                "val_a": ocean_a.swell_period_sec,
                "val_b": ocean_b.swell_period_sec,
                "type": "period",
            },
            {
                "name": "Horizontal Visibility",
                "unit": "km",
                "val_a": weather_a.visibility_km,
                "val_b": weather_b.visibility_km,
                "type": "vis",
            },
            {
                "name": "Precipitation Rate",
                "unit": "mm/h",
                "val_a": weather_a.precipitation_mm,
                "val_b": weather_b.precipitation_mm,
                "type": "precip",
            },
        ]

        scored_items = []
        metrics_summary: List[ComparisonMetric] = []

        for item in raw_candidates:
            va = item["val_a"]
            vb = item["val_b"]
            diff = round(vb - va, 2)
            pct = round(((vb - va) / va) * 100.0, 1) if abs(va) > 0.01 else None

            mtype = item["type"]
            dir_str = "Unchanged"
            op_score = 0.0
            explanation = ""

            # Determine unit abbreviation and formatted values
            unit_abbr = "m" if item["unit"] in ("m", "meters") else ("s" if item["unit"] in ("s", "seconds") else item["unit"])
            val_fmt = f"{abs(diff):.2f}" if unit_abbr in ("m", "m/s") else f"{abs(diff):.1f}"
            pct_str = f" ({pct:+.1f}%)" if pct is not None else ""

            # Operational scoring & change direction
            if mtype == "wave":
                op_score = abs(diff) * 120.0 + (abs(diff) / max(0.8, va)) * 80.0
                if diff > 0.05:
                    dir_str = f"Increased (+{diff:.2f}m, rougher sea state)"
                    data_interpretation = "The available forecast data indicates higher wave height at the displaced location."
                elif diff < -0.05:
                    dir_str = f"Subsided ({diff:.2f}m, calmer sea state)"
                    data_interpretation = "The available forecast data indicates lower wave height at the displaced location."
                else:
                    dir_str = "Uniform wave height"
                    data_interpretation = "The available forecast data indicates uniform wave height across both locations."

            elif mtype == "wind":
                op_score = abs(diff) * 10.0 + (abs(diff) / max(10.0, va)) * 50.0
                if diff > 0.5:
                    dir_str = f"Strengthened (+{diff:.1f} kt)"
                    data_interpretation = "The available forecast data indicates higher wind speed at the displaced location."
                elif diff < -0.5:
                    dir_str = f"Slackened ({diff:.1f} kt)"
                    data_interpretation = "The available forecast data indicates lower wind speed at the displaced location."
                else:
                    dir_str = "Steady wind speed"
                    data_interpretation = "The available forecast data indicates consistent wind speed across both locations."

            elif mtype == "swell":
                op_score = abs(diff) * 90.0 + (abs(diff) / max(0.6, va)) * 60.0
                if diff > 0.05:
                    dir_str = f"Higher Swell (+{diff:.2f}m)"
                    data_interpretation = "The available forecast data indicates higher swell wave height at the displaced location."
                elif diff < -0.05:
                    dir_str = f"Attenuated Swell ({diff:.2f}m)"
                    data_interpretation = "The available forecast data indicates lower swell wave height at the displaced location."
                else:
                    dir_str = "Stable swell height"
                    data_interpretation = "The available forecast data indicates uniform swell wave height across both coordinates."

            elif mtype == "sst":
                op_score = abs(diff) * 40.0
                if diff > 0.2:
                    dir_str = f"Warmer (+{diff:.1f}°C)"
                    data_interpretation = "The available forecast data indicates warmer sea surface temperature at the displaced location."
                elif diff < -0.2:
                    dir_str = f"Cooler ({diff:.1f}°C)"
                    data_interpretation = "The available forecast data indicates cooler sea surface temperature at the displaced location."
                else:
                    dir_str = "Thermal equilibrium"
                    data_interpretation = "The available forecast data indicates uniform sea surface temperature across both locations."

            elif mtype == "current":
                op_score = abs(diff) * 80.0 + (abs(diff) / max(0.3, va)) * 30.0
                dir_str = f"Current {diff:+.2f} m/s" if abs(diff) >= 0.05 else "Uniform current"
                data_interpretation = (
                    "The available forecast data indicates differing current velocity at the displaced location."
                    if abs(diff) >= 0.05 else "The available forecast data indicates uniform current velocity across both locations."
                )

            elif mtype == "gust":
                op_score = abs(diff) * 3.0 + (abs(diff) / max(10.0, va)) * 20.0
                dir_str = f"Gusts {diff:+.1f} kt" if abs(diff) >= 1.0 else "Stable gusts"
                data_interpretation = (
                    "The available forecast data indicates varied peak wind gusts at the displaced location."
                    if abs(diff) >= 1.0 else "The available forecast data indicates uniform peak gusts across both locations."
                )

            elif mtype == "period":
                op_score = abs(diff) * 5.0
                dir_str = f"Period {diff:+.1f}s" if abs(diff) >= 0.5 else "Constant period"
                data_interpretation = (
                    "The available forecast data indicates differing swell wave period at the displaced location."
                    if abs(diff) >= 0.5 else "The available forecast data indicates uniform swell period across both locations."
                )

            elif mtype == "vis":
                op_score = abs(diff) * 2.5
                dir_str = f"Visibility {diff:+.1f} km" if abs(diff) >= 1.0 else "Unrestricted visibility"
                data_interpretation = (
                    "The available forecast data indicates localized visibility variance between both locations."
                    if abs(diff) >= 1.0 else "The available forecast data indicates uniform visibility across both locations."
                )

            else:  # precip
                op_score = abs(diff) * 2.0
                dir_str = f"Rain rate {diff:+.1f} mm/h" if abs(diff) >= 0.2 else "No rain differential"
                data_interpretation = (
                    "The available forecast data indicates localized precipitation rate variance between both locations."
                    if abs(diff) >= 0.2 else "The available forecast data indicates uniform precipitation rate across both locations."
                )

            # Scientific causality grounding: ORCA ingests forecast numerical grids (OSF/Open-Meteo/IMD)
            # but does not have localized bathymetry soundings or coastal refraction/shoaling models.
            # State strictly what data supports without hallucinating causality.
            physical_hyp = "The available data does not establish a definitive physical cause for this difference."

            if diff < 0:
                verb_part = f"decreases by {val_fmt} {unit_abbr}"
            elif diff > 0:
                verb_part = f"increases by {val_fmt} {unit_abbr}"
            else:
                verb_part = "remains unchanged"

            metric_computed_fact = (
                f"{item['name']} {verb_part}{pct_str} from {va} {unit_abbr} at {loc_a.name} to {vb} {unit_abbr} at {loc_b.name}."
            )
            explanation = f"{data_interpretation} {physical_hyp}"

            # Categorize operational significance
            if op_score >= 35.0 or (pct is not None and abs(pct) >= 20.0 and abs(diff) >= 0.2):
                impact = "High Operational Impact"
            elif op_score >= 12.0:
                impact = "Moderate Change"
            else:
                impact = "Minimal / Negligible"

            # Favorability for comparison breakdown
            if mtype in ("wave", "swell", "wind", "gust"):
                fav = f"{loc_b.name} Favorable (Calmer)" if diff < 0 else (f"{loc_a.name} Favorable (Calmer)" if diff > 0 else "Similar")
            elif mtype == "vis":
                fav = f"{loc_b.name} Favorable" if diff > 0 else (f"{loc_a.name} Favorable" if diff < 0 else "Similar")
            else:
                fav = "Seasonal Front"

            metrics_summary.append(ComparisonMetric(
                metric_name=item["name"],
                unit=item["unit"],
                location_a_value=va,
                location_b_value=vb,
                difference=diff,
                favorability=fav
            ))

            scored_items.append({
                "metric_name": item["name"],
                "unit": item["unit"],
                "location_a_value": va,
                "location_b_value": vb,
                "absolute_difference": diff,
                "percentage_difference": pct,
                "change_direction": dir_str,
                "operational_impact": impact,
                "explanation": explanation,
                "computed_fact": metric_computed_fact,
                "data_supported_interpretation": data_interpretation,
                "physical_hypothesis": physical_hyp,
                "op_score": op_score
            })

        # Rank changes descending by operational magnitude
        scored_items.sort(key=lambda x: x["op_score"], reverse=True)

        ranked_changes: List[RankedConditionChange] = []
        for rank_idx, s in enumerate(scored_items, 1):
            ranked_changes.append(RankedConditionChange(
                rank=rank_idx,
                metric_name=s["metric_name"],
                unit=s["unit"],
                location_a_value=s["location_a_value"],
                location_b_value=s["location_b_value"],
                absolute_difference=s["absolute_difference"],
                percentage_difference=s["percentage_difference"],
                change_direction=s["change_direction"],
                operational_impact=s["operational_impact"],
                explanation=s["explanation"],
                computed_fact=s["computed_fact"],
                data_supported_interpretation=s["data_supported_interpretation"],
                physical_hypothesis=s["physical_hypothesis"]
            ))

        top_item = ranked_changes[0]
        top_name = top_item.metric_name
        top_pct_str = f" ({top_item.percentage_difference:+.1f}%)" if top_item.percentage_difference is not None else ""
        top_changed = f"{top_name} — {top_item.change_direction}{top_pct_str}"

        # Build 3-tier evidence-aware synthesis for the top condition
        top_unit = "m" if top_item.unit in ("m", "meters") else ("s" if top_item.unit in ("s", "seconds") else top_item.unit)
        top_val_fmt = f"{abs(top_item.absolute_difference):.2f}" if top_unit in ("m", "m/s") else f"{abs(top_item.absolute_difference):.1f}"

        if top_item.absolute_difference < 0:
            top_verb = f"decreasing by {top_val_fmt} {top_unit}"
        elif top_item.absolute_difference > 0:
            top_verb = f"increasing by {top_val_fmt} {top_unit}"
        else:
            top_verb = "showing no change"

        # Format temporal label into natural lower-case phrase
        cleaned_temp = temporal_label.split("(")[0].strip().lower()
        if cleaned_temp.startswith("tomorrow") or cleaned_temp.startswith("today") or cleaned_temp.startswith("tonight"):
            temporal_phrase = f"during {cleaned_temp}"
        elif "hour" in cleaned_temp or "day" in cleaned_temp:
            temporal_phrase = f"over the {cleaned_temp}" if not cleaned_temp.startswith("the") else f"over {cleaned_temp}"
        else:
            temporal_phrase = f"during {cleaned_temp}"

        # Standardize metric name casing for natural prose (e.g., "Significant wave height")
        if top_name.lower().startswith("significant wave"):
            metric_disp = "Significant wave height"
        elif top_name.lower().startswith("sustained surface"):
            metric_disp = "Sustained surface wind"
        elif top_name.lower().startswith("swell wave"):
            metric_disp = "Swell wave height"
        elif top_name.lower().startswith("sea surface"):
            metric_disp = "Sea surface temperature"
        else:
            metric_disp = top_name

        top_computed_fact = (
            f"{metric_disp} shows the largest change, {top_verb}{top_pct_str} "
            f"at the point {distance_km:.0f} km {direction.lower()} of {loc_a.name} {temporal_phrase}."
        )
        top_data_interpretation = top_item.data_supported_interpretation or (
            f"The available forecast data indicates {top_item.change_direction.lower()} at the displaced location."
        )
        top_physical_hypothesis = "The available data does not establish a definitive physical cause for this difference."

        # Physically grounded summary reasoning strictly organized into the 3 tiers
        physical_reasoning = (
            f"1. COMPUTED FACT: {top_computed_fact}\n\n"
            f"2. DATA-SUPPORTED INTERPRETATION: {top_data_interpretation}\n\n"
            f"3. PHYSICAL HYPOTHESIS: {top_physical_hypothesis}"
        )

        diff_wave = round(ocean_b.significant_wave_height_m - ocean_a.significant_wave_height_m, 2)
        diff_wind = round(weather_b.wind_speed_knots - weather_a.wind_speed_knots, 1)

        if diff_wave >= 0.25 or diff_wind >= 3.5:
            operational_significance = (
                f"OPERATIONALLY SIGNIFICANT (INCREASED HAZARD): Moving {distance_km:.0f} km {direction} elevates wave energy "
                f"({ocean_a.significant_wave_height_m}m → {ocean_b.significant_wave_height_m}m SWH) and surface wind roughness "
                f"({weather_a.wind_speed_knots} kt → {weather_b.wind_speed_knots} kt). Small artisanal fishing craft (<12m) "
                f"will encounter increased vessel roll and navigation resistance."
            )
        elif diff_wave <= -0.25 or diff_wind <= -3.5:
            operational_significance = (
                f"OPERATIONALLY FAVORABLE: Moving {distance_km:.0f} km {direction} transitions into calmer sea conditions "
                f"({ocean_a.significant_wave_height_m}m → {ocean_b.significant_wave_height_m}m SWH), offering reduced hull strain, "
                f"lower wave resistance, and enhanced stability for fishing and passage."
            )
        else:
            operational_significance = (
                f"MODERATE / NEGLIGIBLE HAZARD SHIFT: Environmental differences across the {distance_km:.0f} km baseline remain "
                f"within standard operational tolerance envelopes ({ocean_a.significant_wave_height_m}m vs {ocean_b.significant_wave_height_m}m SWH). "
                f"Standard coastal navigational protocols apply."
            )

        return SpatialWhatIfAnalysisData(
            origin=loc_a,
            displaced=loc_b,
            distance_km=distance_km,
            direction=direction,
            bearing_deg=bearing_deg,
            temporal_label=temporal_label,
            ranked_changes=ranked_changes,
            top_changed_condition=top_changed,
            physical_reasoning=physical_reasoning,
            operational_significance=operational_significance,
            metrics_summary=metrics_summary,
            computed_fact=top_computed_fact,
            data_supported_interpretation=top_data_interpretation,
            physical_hypothesis=top_physical_hypothesis
        )

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

        # 3. Sea Surface Temperature
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
            interp_sst = round(past_ocean.sea_surface_temp_c + (current_ocean.sea_surface_temp_c - past_ocean.sea_surface_temp_c) * fraction, 1)
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

correlation_engine = CorrelationEngine()

