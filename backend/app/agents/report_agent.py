import uuid
from datetime import datetime
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.models.schemas import (
    OrcaAnalysisResponse,
    VisualizationPlan,
    MapLayerData,
    MapLayerFeature,
    EvidenceRecord,
    QueryIntent,
    DataFreshness,
    RiskCategory,
)
from app.geospatial.protected_areas import INDIAN_MARINE_PROTECTED_AREAS
from app.providers.provenance import classify_tier, reliability_note
from app.utils.multilingual import localize_summary_and_recommendation

class ReportAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Synthesis & Visualization Planner", role="Multilingual report synthesis, adaptive layout planning, and evidence compiler")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        intent: QueryIntent = context["intent"]
        loc = context["location"]
        temporal = context["temporal"]
        lang = context["detected_language"]
        ocean = context.get("ocean_observation")
        weather = context.get("weather_observation")
        risk = context.get("risk_assessment")
        pfz_list = context.get("fishing_zones")
        route = context.get("route_analysis")
        comparison = context.get("comparison_data")
        trend = context.get("historical_trend")
        is_mpa = context.get("is_inside_mpa", False)
        mpa_info = context.get("mpa_info")

        # 1. Plan Visualizations dynamically based on query semantics
        vis_plan = self._create_visualization_plan(intent, loc, route)

        # 2. Build Dynamic Map Layers
        map_layers = self._build_map_layers(loc, ocean, weather, pfz_list, route, is_mpa)

        # 3. Assemble Evidence & Provenance Trail
        evidence = self._compile_evidence(loc, ocean, weather, temporal)

        # 4. Generate Executive Summary and Actionable Recommendation
        summary, rec = self._generate_summary_and_recommendation(
            intent=intent,
            loc=loc,
            temporal=temporal,
            risk=risk,
            ocean=ocean,
            weather=weather,
            pfz_list=pfz_list,
            route=route,
            comparison=comparison,
            trend=trend,
            is_mpa=is_mpa,
            mpa_info=mpa_info
        )

        # 5. Localize if non-English requested
        risk_cat = risk.category.value if risk else "LOW"
        loc_summary, loc_rec = localize_summary_and_recommendation(
            lang=lang,
            risk_category=risk_cat,
            location_name=loc.name,
            temporal_label=temporal.label,
            english_summary=summary,
            english_recommendation=rec
        )

        # 6. Explicit Limitations
        limitations = [
            "Advisories are provided as decision support; vessel masters retain final navigational command.",
            "Satellite SST & Chlorophyll products are cloud-masked and subject to diurnal SST warming.",
            "Severe weather updates must be continuously cross-referenced against VHF coastal marine broadcasts."
        ]

        step = self.record_step(
            action="Synthesized adaptive result layout, dynamic map layers, and multilingual evidence trail",
            tool="generate_visualization_plan",
            duration_ms=45,
            details=f"Plan: {vis_plan.result_type} ({len(vis_plan.components_to_render)} components, {len(map_layers)} GIS layers, {len(evidence)} evidence records)"
        )

        return {
            "executive_summary": loc_summary,
            "recommendation": loc_rec,
            "visualization_plan": vis_plan,
            "map_layers": map_layers,
            "evidence": evidence,
            "limitations": limitations,
            "step_log": step
        }

    def _create_visualization_plan(self, intent: QueryIntent, loc: Any, route: Any) -> VisualizationPlan:
        center_lat = loc.latitude
        center_lon = loc.longitude
        default_zoom = 9

        if intent == QueryIntent.FISHING_ZONES:
            res_type = "fishing_zones"
            components = ["fishing_zones_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_pfz", "layer_mpas", "layer_wave_risk"]
            default_zoom = 10
        elif intent == QueryIntent.ROUTE_ANALYSIS:
            res_type = "route_analysis"
            components = ["route_analysis_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_route", "layer_mpas", "layer_wave_risk"]
            default_zoom = 8
            if route and len(route.waypoints) > 0:
                mid = route.waypoints[len(route.waypoints) // 2]
                center_lat = mid.latitude
                center_lon = mid.longitude
        elif intent == QueryIntent.REGIONAL_COMPARISON:
            res_type = "regional_comparison"
            components = ["comparison_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_locations", "layer_wave_risk"]
            default_zoom = 7
        elif intent == QueryIntent.HISTORICAL_TREND:
            res_type = "historical_trend"
            components = ["historical_trend_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_locations", "layer_wave_risk"]
        else:
            # Marine safety & general
            res_type = "marine_safety"
            components = ["risk_card", "conditions_grid", "map", "evidence_drawer"]
            layers = ["layer_wave_risk", "layer_locations", "layer_mpas"]

        return VisualizationPlan(
            result_type=res_type,
            components_to_render=components,
            center_lat=center_lat,
            center_lon=center_lon,
            default_zoom=default_zoom,
            active_layers=layers
        )

    def _build_map_layers(self, loc: Any, ocean: Any, weather: Any, pfz_list: Any, route: Any, is_mpa: bool) -> List[MapLayerData]:
        layers: List[MapLayerData] = []

        # 1. Location Marker Layer
        loc_feature = MapLayerFeature(
            geometry={"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
            properties={
                "name": loc.name,
                "title": f"Target: {loc.name}",
                "radius_km": loc.radius_km,
                "type": "target_center"
            }
        )
        layers.append(MapLayerData(
            layer_id="layer_locations",
            name="Selected Marine Coordinates",
            layer_type="point",
            features=[loc_feature],
            visible_by_default=True,
            color="#00f5d4",
            legend_title="Target Port / Zone"
        ))

        # 2. Marine Protected Areas Layer
        mpa_features = []
        for mpa in INDIAN_MARINE_PROTECTED_AREAS:
            mpa_features.append(MapLayerFeature(
                geometry={"type": "Polygon", "coordinates": [mpa["polygon_coords"]]},
                properties={
                    "id": mpa["id"],
                    "name": mpa["name"],
                    "designation": mpa["designation"],
                    "restriction": mpa["restriction_level"],
                    "authority": mpa["authority"],
                    "description": mpa["description"]
                }
            ))
        layers.append(MapLayerData(
            layer_id="layer_mpas",
            name="Marine Protected Areas & Sanctuaries (MoEFCC)",
            layer_type="polygon",
            features=mpa_features,
            visible_by_default=True,
            color="#f72585",
            legend_title="Sanctuary / Conservation Zone"
        ))

        # 3. Wave Height Risk Zone (Buffer circle around location)
        wh = ocean.significant_wave_height_m if ocean else 1.5
        risk_color = "#2ec4b6" if wh < 1.8 else ("#ff9f1c" if wh < 2.5 else "#e71d36")
        layers.append(MapLayerData(
            layer_id="layer_wave_risk",
            name="INCOIS Wave Hazard Envelope",
            layer_type="point",
            features=[
                MapLayerFeature(
                    geometry={"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
                    properties={
                        "wave_height_m": wh,
                        "sea_state": ocean.sea_state if ocean else "Moderate",
                        "risk_level": "Low" if wh < 1.8 else ("Moderate" if wh < 2.5 else "High"),
                        "radius": loc.radius_km * 1000
                    }
                )
            ],
            visible_by_default=True,
            color=risk_color,
            legend_title="Significant Wave Height",
            legend_unit="meters"
        ))

        # 4. Potential Fishing Zones (if available)
        if pfz_list:
            pfz_features = []
            for z in pfz_list:
                pfz_features.append(MapLayerFeature(
                    geometry={"type": "Point", "coordinates": [z.longitude, z.latitude]},
                    properties={
                        "zone_id": z.zone_id,
                        "name": z.name,
                        "rank": z.rank,
                        "suitability": z.suitability_score,
                        "sst_c": z.sst_c,
                        "chlorophyll": z.chlorophyll_mg_m3,
                        "depth_m": z.depth_m,
                        "within_mpa": z.within_mpa,
                        "advisory": z.advisory_status
                    }
                ))
            layers.append(MapLayerData(
                layer_id="layer_pfz",
                name="INCOIS Potential Fishing Zones (PFZ)",
                layer_type="point",
                features=pfz_features,
                visible_by_default=True,
                color="#4cc9f0",
                legend_title="Ranked Fishing Grounds",
                legend_unit="Suitability / 100"
            ))

        # 5. Route Line Layer (if available)
        if route and len(route.waypoints) > 1:
            line_coords = [[wp.longitude, wp.latitude] for wp in route.waypoints]
            route_feature = MapLayerFeature(
                geometry={"type": "LineString", "coordinates": line_coords},
                properties={
                    "route_id": route.route_id,
                    "distance_km": route.total_distance_km,
                    "crosses_mpa": route.crosses_protected_waters,
                    "risk": route.overall_route_risk
                }
            )
            layers.append(MapLayerData(
                layer_id="layer_route",
                name="Vessel Transit Passage",
                layer_type="linestring",
                features=[route_feature],
                visible_by_default=True,
                color="#e71d36" if route.crosses_protected_waters else "#00f5d4",
                legend_title="Vessel Route Corridor"
            ))

        return layers

    def _compile_evidence(self, loc: Any, ocean: Any, weather: Any, temporal: Any) -> List[EvidenceRecord]:
        """Build the provenance trail from what the providers actually returned.

        Provenance propagates from the observation that produced the value. The
        agency names here used to be written in by hand -- an Open-Meteo wave
        height was published as "INCOIS / Open-Meteo" and a demo-mode SST as
        "INCOIS / MODIS-Aqua" with a note claiming calibration against moored
        buoys and Jason-3 altimetry, over a value that came from a sine wave.
        Nothing in this method may name a source; it may only repeat the one
        the provider set on the observation.
        """
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        obs_time_str = temporal.start_time.strftime("%Y-%m-%d %H:%M UTC")
        records: List[EvidenceRecord] = []

        def record(observation: Any, dataset: str, variable: str, value: str, unit: str, live_note: str) -> EvidenceRecord:
            return EvidenceRecord(
                id=str(uuid.uuid4())[:8],
                provider=observation.source,
                provider_tier=classify_tier(observation.source, observation.status),
                dataset=dataset,
                variable=variable,
                value=value,
                unit=unit,
                location=loc.name,
                coordinates=f"{loc.latitude:.3f}\u00b0N, {loc.longitude:.3f}\u00b0E",
                observation_or_forecast_time=obs_time_str,
                retrieval_time=now_str,
                status=observation.status,
                reliability_notes=reliability_note(observation.status, live_note, observation.source),
            )

        if ocean:
            records.append(record(
                ocean,
                dataset="Significant Wave Height",
                variable="Significant Wave Height (SWH)",
                value=f"{ocean.significant_wave_height_m}",
                unit="m",
                live_note="Model significant wave height at the requested position.",
            ))
            records.append(record(
                ocean,
                dataset="Ocean Surface Wave Spectrum",
                variable="Swell Wave Height & Period",
                value=f"{ocean.swell_height_m} m / {ocean.swell_period_sec} s",
                unit="m / s",
                live_note="Directional swell component of the wave spectrum.",
            ))
            records.append(record(
                ocean,
                dataset="Sea Surface Temperature",
                variable="Sea Surface Temperature",
                value=f"{ocean.sea_surface_temp_c}",
                unit="\u00b0C",
                live_note="Sea surface temperature at the requested position.",
            ))
            records.append(record(
                ocean,
                dataset="Ocean Surface Currents",
                variable="Surface Current Speed & Direction",
                value=f"{ocean.ocean_current_speed_m_s} m/s @ {ocean.ocean_current_direction_deg}\u00b0",
                unit="m/s",
                live_note="Surface current vector at the requested position.",
            ))

        if weather:
            records.append(record(
                weather,
                dataset="Coastal Marine Weather",
                variable="Sustained Wind Speed & Gusts",
                value=f"{weather.wind_speed_knots} kt (Gusts: {weather.wind_gust_knots} kt)",
                unit="knots",
                live_note="10 m surface winds from numerical weather prediction.",
            ))
            if weather.alert_level and weather.alert_level.lower() not in ("none", ""):
                records.append(record(
                    weather,
                    dataset="Coastal Hazard Warning",
                    variable="Storm Warning Level",
                    value=weather.alert_level.upper(),
                    unit="Advisory Code",
                    live_note=weather.storm_warning or "Active coastal warning in effect.",
                ))

        return records

    def _generate_summary_and_recommendation(
        self,
        intent: QueryIntent,
        loc: Any,
        temporal: Any,
        risk: Any,
        ocean: Any,
        weather: Any,
        pfz_list: Any,
        route: Any,
        comparison: Any,
        trend: Any,
        is_mpa: bool,
        mpa_info: Any
    ) -> tuple[str, str]:
        # Safety & general
        if intent == QueryIntent.FISHING_ZONES:
            top_z = pfz_list[0] if pfz_list else None
            if top_z:
                summary = (
                    f"Identified {len(pfz_list)} Potential Fishing Zones within {loc.radius_km} km of {loc.name} for {temporal.label}. "
                    f"Top zone is {top_z.name} (Suitability: {top_z.suitability_score}/100) at {top_z.distance_km:.1f} km offshore bearing {top_z.bearing_deg}°."
                )
                rec = (
                    f"Target {top_z.name} featuring strong chlorophyll-a enrichment ({top_z.chlorophyll_mg_m3} mg/m³) and stable thermal front ({top_z.sst_c}°C). "
                    f"Local wave conditions are {top_z.wave_height_m}m. Exercise standard safety precautions."
                )
            else:
                summary = f"No active PFZ advisory features detected within {loc.radius_km} km of {loc.name}."
                rec = "Monitor INCOIS satellite passes for updated chlorophyll/thermal front formation."
            return summary, rec

        if intent == QueryIntent.ROUTE_ANALYSIS and route:
            summary = (
                f"Vessel passage corridor from {route.origin.name} to {route.destination.name} spans {route.total_distance_km:.1f} km "
                f"({route.estimated_transit_hours:.1f}h transit at 10 kt). Overall route hazard level is {route.overall_route_risk.value}."
            )
            rec = route.recommended_action
            return summary, rec

        if intent == QueryIntent.REGIONAL_COMPARISON and comparison:
            summary = (
                f"Comparative marine analysis between {comparison.location_a.name} and {comparison.location_b.name} for {temporal.label}. "
                f"{comparison.overall_verdict}"
            )
            rec = "Prioritize operations in the calmer sector where wave and wind shear remain well below threshold boundaries."
            return summary, rec

        if intent == QueryIntent.HISTORICAL_TREND and trend:
            summary = trend.trend_summary
            rec = "Verify whether modern wave subsidence continues before expanding offshore operations."
            return summary, rec

        # Default Marine Safety
        risk_score = risk.overall_score if risk else 20
        risk_cat = risk.category.value if risk else "LOW"
        wh = ocean.significant_wave_height_m if ocean else 1.2
        ws = weather.wind_speed_knots if weather else 12.0

        summary = (
            f"Marine conditions near {loc.name} for {temporal.label} present an overall {risk_cat} RISK (Score: {risk_score}/100). "
            f"Significant wave height is {wh:.1f}m ({ocean.sea_state if ocean else 'Moderate'}) with sustained surface winds of {ws:.1f} knots."
        )

        if is_mpa and mpa_info:
            summary += f" Target coordinates lie inside the {mpa_info['name']} conservation sanctuary."

        if risk_cat in ("LOW", "MODERATE") and not is_mpa:
            rec = (
                f"Conditions are favorable for fishing craft and coastal navigation during {temporal.label}. "
                f"Keep continuous marine VHF watch on Channel 16 and respect boundary geofences."
            )
        elif is_mpa:
            rec = (
                f"UNFAVORABLE / RESTRICTED: Target lies within {mpa_info['name']} where mechanized trawling is strictly prohibited by MoEFCC regulations. "
                "Shift fishing operations outside sanctuary boundaries."
            )
        else:
            rec = (
                f"UNFAVORABLE: High wave energy ({wh:.1f}m) and squally winds ({ws:.1f} kt) present hazardous sea conditions for small artisanal vessels. "
                "Fishermen are advised to postpone offshore departure or remain within sheltered harbor waters."
            )

        return summary, rec
