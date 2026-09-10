import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
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
    SpatialWhatIfAnalysisData,
)
from app.geospatial.protected_areas import INDIAN_MARINE_PROTECTED_AREAS
from app.providers.provenance import classify_tier, reliability_note
from app.utils.multilingual import advisory_for_band, localize_summary_and_recommendation

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
        spatial_what_if = context.get("spatial_what_if")
        displaced_ocean = context.get("displaced_ocean")
        displaced_weather = context.get("displaced_weather")
        is_mpa = context.get("is_inside_mpa", False)
        mpa_info = context.get("mpa_info")

        # 1. Plan Visualizations dynamically based on query semantics
        vis_plan = self._create_visualization_plan(intent, loc, route, spatial_what_if)

        # 2. Build Dynamic Map Layers
        map_layers = self._build_map_layers(
            loc=loc,
            ocean=ocean,
            weather=weather,
            pfz_list=pfz_list,
            route=route,
            is_mpa=is_mpa,
            spatial_what_if=spatial_what_if,
            displaced_ocean=displaced_ocean
        )

        # 3. Assemble Evidence & Provenance Trail
        evidence = self._compile_evidence(
            loc=loc,
            ocean=ocean,
            weather=weather,
            temporal=temporal,
            spatial_what_if=spatial_what_if,
            displaced_ocean=displaced_ocean,
            displaced_weather=displaced_weather
        )

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
            spatial_what_if=spatial_what_if,
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
            english_recommendation=rec,
            intent=intent,
            route=route,
            pfz_list=pfz_list,
            spatial_what_if=spatial_what_if,
            comparison=comparison,
            ocean=ocean,
            weather=weather,
            query_text=context.get("query_text", "")
        )

        # 6. Explicit Limitations, including any capability the chain could not
        #    serve. A gap the user can see beats a gap they discover on the water.
        limitations = self._capability_gaps(context) + [
            "Advisories are provided as decision support; vessel masters retain final navigational command.",
            "Satellite SST & Chlorophyll products are cloud-masked and subject to diurnal SST warming.",
            "Severe weather updates must be cross-referenced against official coastal marine broadcasts and NavIC advisories."
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

    def _capability_gaps(self, context: Dict[str, Any]) -> List[str]:
        """Name every capability that had no provider, in the user's terms.

        Canonical queries 3 and 4 ask for tide and for lightning/cyclone alerts.
        Neither has a working provider, so each is stated plainly rather than
        answered from something adjacent that happens to be available.
        """
        gaps: List[str] = []

        tide = context.get("tide_observation")
        if tide is not None and tide.status == DataFreshness.UNAVAILABLE:
            gaps.append(
                f"Tide is not available for this position. {tide.unavailable_reason} "
                f"Consult the Survey of India tide tables for the port before departure."
            )

        hazard = context.get("hazard_observation")
        if hazard is not None and hazard.status == DataFreshness.UNAVAILABLE:
            gaps.append(
                f"Lightning and cyclone tracking is not available. {hazard.unavailable_reason} "
                f"Cross-reference IMD cyclone bulletins and VHF coastal broadcasts."
            )

        return gaps

    def _create_visualization_plan(
        self, intent: QueryIntent, loc: Any, route: Any, spatial_what_if: Optional[SpatialWhatIfAnalysisData] = None
    ) -> VisualizationPlan:
        center_lat = loc.latitude
        center_lon = loc.longitude
        default_zoom = 9

        if intent == QueryIntent.FISHING_ZONES:
            res_type = "fishing_zones"
            components = ["fishing_zones_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_locations", "layer_pfz", "layer_mpas", "layer_wave_risk"]
            default_zoom = 10
        elif intent in [QueryIntent.ROUTE_ANALYSIS, QueryIntent.ROUTE_FOLLOW_UP, QueryIntent.ROUTE_COMPARISON]:
            res_type = "route_analysis"
            components = ["route_comparison_card", "route_analysis_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_locations", "layer_route", "layer_route_waypoints", "layer_mpas"]
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
        elif intent == QueryIntent.SPATIAL_WHAT_IF:
            res_type = "spatial_what_if_analysis"
            components = ["spatial_what_if_card", "map", "conditions_grid", "evidence_drawer"]
            layers = ["layer_locations", "layer_displacement", "layer_wave_risk", "layer_mpas"]
            if spatial_what_if:
                center_lat = (spatial_what_if.origin.latitude + spatial_what_if.displaced.latitude) / 2.0
                center_lon = (spatial_what_if.origin.longitude + spatial_what_if.displaced.longitude) / 2.0
                default_zoom = 10 if spatial_what_if.distance_km < 35 else (9 if spatial_what_if.distance_km < 75 else 8)
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

    def _build_map_layers(
        self,
        loc: Any,
        ocean: Any,
        weather: Any,
        pfz_list: Any,
        route: Any,
        is_mpa: bool,
        spatial_what_if: Optional[SpatialWhatIfAnalysisData] = None,
        displaced_ocean: Any = None
    ) -> List[MapLayerData]:
        layers: List[MapLayerData] = []

        # 1. Location Marker Layer (Origin, Destination, Displacement endpoints, or Focal Port)
        loc_features = []
        if spatial_what_if:
            loc_features.append(MapLayerFeature(
                geometry={"type": "Point", "coordinates": [spatial_what_if.origin.longitude, spatial_what_if.origin.latitude]},
                properties={
                    "name": spatial_what_if.origin.name,
                    "title": f"Origin: {spatial_what_if.origin.name}",
                    "role": "Origin",
                    "type": "displacement_origin"
                }
            ))
            loc_features.append(MapLayerFeature(
                geometry={"type": "Point", "coordinates": [spatial_what_if.displaced.longitude, spatial_what_if.displaced.latitude]},
                properties={
                    "name": spatial_what_if.displaced.name,
                    "title": f"Displaced Target: {spatial_what_if.displaced.name}",
                    "role": "Displaced Target",
                    "type": "displacement_target",
                    "distance_km": spatial_what_if.distance_km,
                    "direction": spatial_what_if.direction,
                    "bearing_deg": spatial_what_if.bearing_deg
                }
            ))
        elif route and route.destination and (route.origin.name.lower() != route.destination.name.lower()):
            loc_features.append(MapLayerFeature(
                geometry={"type": "Point", "coordinates": [route.origin.longitude, route.origin.latitude]},
                properties={
                    "name": route.origin.name,
                    "title": f"Departure: {route.origin.name}",
                    "role": "Origin",
                    "type": "port_node"
                }
            ))
            loc_features.append(MapLayerFeature(
                geometry={"type": "Point", "coordinates": [route.destination.longitude, route.destination.latitude]},
                properties={
                    "name": route.destination.name,
                    "title": f"Destination: {route.destination.name}",
                    "role": "Destination",
                    "type": "port_node"
                }
            ))
        else:
            loc_features.append(MapLayerFeature(
                geometry={"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
                properties={
                    "name": loc.name,
                    "title": f"Target: {loc.name}",
                    "radius_km": loc.radius_km,
                    "type": "target_center"
                }
            ))

        layers.append(MapLayerData(
            layer_id="layer_locations",
            name="Selected Marine Coordinates",
            layer_type="point",
            features=loc_features,
            visible_by_default=True,
            color="#00f5d4",
            legend_title="Target Port / Zone"
        ))

        # 2. Displacement Corridor Line (if spatial what-if)
        if spatial_what_if:
            disp_coords = [
                [spatial_what_if.origin.longitude, spatial_what_if.origin.latitude],
                [spatial_what_if.displaced.longitude, spatial_what_if.displaced.latitude]
            ]
            layers.append(MapLayerData(
                layer_id="layer_displacement",
                name=f"Displacement Vector ({spatial_what_if.distance_km:.0f} km {spatial_what_if.direction.capitalize()})",
                layer_type="linestring",
                features=[
                    MapLayerFeature(
                        geometry={"type": "LineString", "coordinates": disp_coords},
                        properties={
                            "name": f"Displacement Vector ({spatial_what_if.distance_km:.0f} km {spatial_what_if.direction.capitalize()})",
                            "distance_km": spatial_what_if.distance_km,
                            "direction": spatial_what_if.direction,
                            "bearing_deg": spatial_what_if.bearing_deg,
                            "type": "displacement_vector",
                            "is_recommended": True
                        }
                    )
                ],
                visible_by_default=True,
                color="#00f5d4",
                legend_title="Displacement Corridor"
            ))

        # 3. Marine Protected Areas Layer
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

        # 4. Wave Height Risk Zone
        wh = ocean.significant_wave_height_m if ocean else 1.5
        risk_color = "#2ec4b6" if wh < 1.8 else ("#ff9f1c" if wh < 2.5 else "#e71d36")
        wave_features = [
            MapLayerFeature(
                geometry={"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
                properties={
                    "title": f"Wave Energy: {loc.name}",
                    "wave_height_m": wh,
                    "sea_state": ocean.sea_state if ocean else "Moderate",
                    "risk_level": "Low" if wh < 1.8 else ("Moderate" if wh < 2.5 else "High"),
                    "radius": loc.radius_km * 1000
                }
            )
        ]
        if spatial_what_if and displaced_ocean:
            wh_b = displaced_ocean.significant_wave_height_m
            wave_features.append(MapLayerFeature(
                geometry={"type": "Point", "coordinates": [spatial_what_if.displaced.longitude, spatial_what_if.displaced.latitude]},
                properties={
                    "title": f"Wave Energy: {spatial_what_if.displaced.name}",
                    "wave_height_m": wh_b,
                    "sea_state": displaced_ocean.sea_state,
                    "risk_level": "Low" if wh_b < 1.8 else ("Moderate" if wh_b < 2.5 else "High"),
                    "radius": spatial_what_if.displaced.radius_km * 1000
                }
            ))

        layers.append(MapLayerData(
            layer_id="layer_wave_risk",
            name="Wave Hazard Envelope (model forecast at the query point)",
            layer_type="point",
            features=wave_features,
            visible_by_default=True,
            color=risk_color,
            legend_title="Significant Wave Height",
            legend_unit="meters"
        ))

        # 5. Potential Fishing Zones (if available)
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

        # 6. Route Line Layer & Waypoint Hazard Sampling
        if route and (route.candidate_routes or len(route.waypoints) > 1):
            route_features = []

            if route.candidate_routes:
                for cand in route.candidate_routes:
                    is_sel = (cand.id == route.selected_route_id) or cand.is_selected
                    coords = cand.coordinates if cand.coordinates else [[wp.longitude, wp.latitude] for wp in cand.waypoints]
                    route_features.append(MapLayerFeature(
                        geometry={"type": "LineString", "coordinates": coords},
                        properties={
                            "route_id": f"{route.route_id}_{cand.id}",
                            "name": cand.name,
                            "distance_km": cand.distance_km,
                            "crosses_mpa": cand.crosses_protected_waters,
                            "is_alternative": not cand.is_recommended,
                            "is_recommended": cand.is_recommended,
                            "is_selected": is_sel,
                            "risk_score": cand.risk_score,
                            "risk_category": cand.marine_risk.value,
                            "wave_exposure_m": cand.wave_exposure_m,
                            "wind_exposure_knots": cand.wind_exposure_knots,
                            "protected_area_exposure": cand.protected_area_exposure,
                            "trade_offs": cand.trade_offs
                        }
                    ))
            else:
                # Direct passage corridor (flagged if crosses sanctuary)
                direct_coords = [[wp.longitude, wp.latitude] for wp in route.waypoints]
                route_features.append(MapLayerFeature(
                    geometry={"type": "LineString", "coordinates": direct_coords},
                    properties={
                        "route_id": f"{route.route_id}_direct",
                        "name": f"Direct Passage ({route.origin.name} to {route.destination.name})",
                        "distance_km": route.total_distance_km,
                        "crosses_mpa": route.crosses_protected_waters,
                        "is_alternative": False,
                        "is_recommended": not route.crosses_protected_waters,
                        "is_selected": True,
                        "risk_score": 75 if route.crosses_protected_waters else 18
                    }
                ))

                if route.crosses_protected_waters or route.alternative_suggested:
                    alt_coords = [
                        [route.origin.longitude, route.origin.latitude],
                        [route.origin.longitude + 0.32, route.origin.latitude + 0.12],
                        [(route.origin.longitude + route.destination.longitude) / 2 + 0.22, (route.origin.latitude + route.destination.latitude) / 2],
                        [route.destination.longitude, route.destination.latitude]
                    ]
                    route_features.append(MapLayerFeature(
                        geometry={"type": "LineString", "coordinates": alt_coords},
                        properties={
                            "route_id": f"{route.route_id}_safe_alt",
                            "name": f"Recommended Passage ({route.origin.name} to {route.destination.name} - Offshore Detour)",
                            "distance_km": round(route.total_distance_km * 1.09, 1),
                            "crosses_mpa": False,
                            "is_alternative": True,
                            "is_recommended": True,
                            "is_selected": False,
                            "risk_score": 14
                        }
                    ))

            layers.append(MapLayerData(
                layer_id="layer_route",
                name="Vessel Transit Passage",
                layer_type="linestring",
                features=route_features,
                visible_by_default=True,
                color="#00f5d4",
                legend_title="Vessel Route Corridor"
            ))

            waypoint_features = []
            for wp in route.waypoints:
                waypoint_features.append(MapLayerFeature(
                    geometry={"type": "Point", "coordinates": [wp.longitude, wp.latitude]},
                    properties={
                        "name": wp.name,
                        "risk": wp.segment_risk.value,
                        "wave_height_m": wp.wave_height_m,
                        "wind_knots": wp.wind_knots,
                        "inside_mpa": wp.inside_restricted_zone,
                        "type": "route_waypoint"
                    }
                ))
            layers.append(MapLayerData(
                layer_id="layer_route_waypoints",
                name="Corridor Risk Sampling Points",
                layer_type="point",
                features=waypoint_features,
                visible_by_default=True,
                color="#ffb703",
                legend_title="Waypoint Hazard Sampling"
            ))

        return layers

    def _compile_evidence(
        self,
        loc: Any,
        ocean: Any,
        weather: Any,
        temporal: Any,
        spatial_what_if: Optional[SpatialWhatIfAnalysisData] = None,
        displaced_ocean: Any = None,
        displaced_weather: Any = None
    ) -> List[EvidenceRecord]:
        """Build the provenance trail from what the providers actually returned.

        Provenance propagates from the observation that produced the value. The
        agency names here used to be written in by hand -- an Open-Meteo wave
        height was published as "INCOIS / Open-Meteo" and a demo-mode SST as
        "INCOIS / MODIS-Aqua" with a note claiming calibration against moored
        buoys and Jason-3 altimetry, over a value that came from a sine wave.
        Nothing in this method may name a data source; it may only repeat the
        one the provider set on the observation. The single exception is a
        value ORCA computed itself, which is labelled as a computation.
        """
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        obs_time_str = temporal.start_time.strftime("%Y-%m-%d %H:%M UTC")
        records: List[EvidenceRecord] = []

        def record(
            observation: Any,
            dataset: str,
            variable: str,
            value: str,
            unit: str,
            live_note: str,
            at: Any = None,
        ) -> EvidenceRecord:
            where = at or loc
            return EvidenceRecord(
                id=str(uuid.uuid4())[:8],
                provider=observation.source,
                provider_tier=classify_tier(observation.source, observation.status),
                dataset=dataset,
                variable=variable,
                value=value,
                unit=unit,
                location=where.name,
                coordinates=f"{where.latitude:.3f}\u00b0N, {where.longitude:.3f}\u00b0E",
                observation_or_forecast_time=obs_time_str,
                retrieval_time=now_str,
                status=observation.status,
                reliability_notes=reliability_note(observation.status, live_note, observation.source),
            )

        if spatial_what_if:
            # A derived geometry, not an observation: say who computed it.
            records.append(EvidenceRecord(
                id=str(uuid.uuid4())[:8],
                provider="ORCA geospatial engine (computed)",
                dataset="Great-circle destination point",
                variable="Spatial Displacement Vector",
                value=f"{spatial_what_if.distance_km:.1f} km {spatial_what_if.direction.capitalize()} (Bearing: {spatial_what_if.bearing_deg:.1f}\u00b0)",
                unit="Distance / Bearing",
                location=f"{spatial_what_if.origin.name} \u2192 {spatial_what_if.displaced.name}",
                coordinates=f"{spatial_what_if.displaced.latitude:.4f}\u00b0N, {spatial_what_if.displaced.longitude:.4f}\u00b0E",
                observation_or_forecast_time=obs_time_str,
                retrieval_time=now_str,
                status=ocean.status if ocean else DataFreshness.DEMO,
                reliability_notes="Computed by ORCA from the origin coordinate, distance and bearing. Not a measurement.",
            ))

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
            # Only cite a variable the provider actually returned. An absent
            # value produces no evidence record rather than a fabricated one.
            if ocean.sea_surface_temp_c is not None:
                records.append(record(
                    ocean,
                    dataset="Sea Surface Temperature",
                    variable="Sea Surface Temperature",
                    value=f"{ocean.sea_surface_temp_c}",
                    unit="\u00b0C",
                    live_note="Sea surface temperature at the requested position.",
                ))
            if ocean.ocean_current_speed_m_s is not None:
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

        if spatial_what_if and displaced_ocean and displaced_weather:
            records.append(record(
                displaced_ocean,
                dataset="Significant Wave Height",
                variable="Significant Wave Height (Target)",
                value=f"{displaced_ocean.significant_wave_height_m}",
                unit="m",
                live_note="Model significant wave height at the displaced position.",
                at=spatial_what_if.displaced,
            ))
            records.append(record(
                displaced_weather,
                dataset="Coastal Marine Weather",
                variable="Sustained Wind Speed (Target)",
                value=f"{displaced_weather.wind_speed_knots} kt",
                unit="knots",
                live_note="10 m surface winds at the displaced position.",
                at=spatial_what_if.displaced,
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
        mpa_info: Any,
        spatial_what_if: Optional[SpatialWhatIfAnalysisData] = None
    ) -> tuple[str, str]:
        # Spatial What-If / Displacement
        if intent == QueryIntent.SPATIAL_WHAT_IF and spatial_what_if:
            computed_fact = spatial_what_if.computed_fact
            data_interpretation = spatial_what_if.data_supported_interpretation
            physical_hypothesis = spatial_what_if.physical_hypothesis

            if computed_fact and data_interpretation and physical_hypothesis:
                summary = f"{computed_fact} {data_interpretation} {physical_hypothesis}"
            else:
                top_change = spatial_what_if.ranked_changes[0]
                summary = top_change.explanation
            rec = spatial_what_if.operational_significance
            return summary, rec

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

        if (intent in [QueryIntent.ROUTE_ANALYSIS, QueryIntent.ROUTE_FOLLOW_UP, QueryIntent.ROUTE_COMPARISON]) and route:
            alt_cand = next((c for c in route.candidate_routes if c.id == "alternative"), None)
            rec_cand = next((c for c in route.candidate_routes if c.id == "recommended"), None)

            # CASE 1: True Two-Route Comparative Analysis
            if intent == QueryIntent.ROUTE_COMPARISON:
                if alt_cand and rec_cand:
                    diff_km = round(alt_cand.distance_km - rec_cand.distance_km, 1)
                    diff_h = round(alt_cand.estimated_transit_hours - rec_cand.estimated_transit_hours, 1)
                    time_desc = f"saving ~{abs(int(diff_h * 60))} mins" if diff_h < 0 else f"+{int(diff_h * 60)} mins"
                    dist_desc = f"{abs(diff_km)} km shorter" if diff_km < 0 else f"+{diff_km} km longer"

                    summary = (
                        f"Route Corridor Comparison ({alt_cand.name} vs {rec_cand.name}): "
                        f"Selected Alternative corridor spans {alt_cand.distance_km} km ({alt_cand.estimated_transit_hours}h transit at 10 kt, "
                        f"Wave: {alt_cand.wave_exposure_m} m, Wind: {alt_cand.wind_exposure_knots} kt) with {alt_cand.marine_risk.value} risk ({alt_cand.protected_area_exposure}). "
                        f"Recommended Safe corridor spans {rec_cand.distance_km} km ({rec_cand.estimated_transit_hours}h transit at 10 kt, "
                        f"Wave: {rec_cand.wave_exposure_m} m, Wind: {rec_cand.wind_exposure_knots} kt) with {rec_cand.marine_risk.value} risk, safely clearing all sanctuary boundaries."
                    )
                    rec = (
                        f"Trade-Off Verdict: The alternative passage is {dist_desc} ({time_desc}), but introduces {alt_cand.marine_risk.value} risk "
                        f"and breaches {alt_cand.protected_area_exposure} (Wildlife Protection Act 1972 violation). "
                        f"Recommended offshore corridor is 100% compliant with zero sanctuary exposure."
                    )
                    return summary, rec

            # CASE 2: Selected Corridor is Alternative (including temporal shift follow-ups)
            if route.selected_route_id == "alternative" and alt_cand:
                summary = (
                    f"Vessel passage corridor (Selected Alternative Corridor: {alt_cand.name}) from {route.origin.name} to {route.destination.name} "
                    f"for {temporal.label} spans {alt_cand.distance_km:.1f} km ({alt_cand.estimated_transit_hours:.1f}h transit at 10 kt). "
                    f"Recomputed environmental conditions: Significant wave height is {alt_cand.wave_exposure_m} m, sustained surface winds {alt_cand.wind_exposure_knots} kt. "
                    f"Overall route hazard level is {alt_cand.marine_risk.value} (Exposure: {alt_cand.protected_area_exposure})."
                )
                rec = (
                    f"Alternative Corridor Advisory: Transit is {alt_cand.distance_km} km. "
                    f"CRITICAL REGULATORY VIOLATION: Route intersects {alt_cand.protected_area_exposure}. "
                    f"Vessel master advised to reconsider or switch to the Recommended Safe Corridor."
                    if alt_cand.crosses_protected_waters else
                    f"Alternative Corridor Advisory: Transit is {alt_cand.distance_km} km with safe environmental clearances."
                )
                return summary, rec

            # CASE 3: Selected Corridor is Recommended Safe Route
            summary = (
                f"Vessel passage corridor from {route.origin.name} to {route.destination.name} for {temporal.label} spans {route.total_distance_km:.1f} km "
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
        risk_score = risk.overall_score if risk else None
        risk_cat = risk.category.value if risk else "UNKNOWN"
        wh = ocean.significant_wave_height_m if ocean else None
        ws = weather.wind_speed_knots if weather else None
        wh_s = f"{wh:.1f}m" if wh is not None else "unavailable"
        ws_s = f"{ws:.1f} knots" if ws is not None else "unavailable"

        summary = (
            f"Marine conditions near {loc.name} for {temporal.label} present an overall {risk_cat} RISK"
            + (f" (Score: {risk_score}/100). " if risk_score is not None else " (score unavailable). ")
            + f"Significant wave height is {wh_s} ({ocean.sea_state if ocean else 'sea state unavailable'}) with sustained surface winds of {ws_s}."
        )

        if is_mpa and mpa_info:
            summary += f" Target coordinates lie inside the {mpa_info['name']} conservation sanctuary."

        # Danger outranks regulation, always. One ordered chain:
        #   1. the safety advisory for the engine's band, never skipped
        #   2. the regulatory notice, appended, never replacing step 1
        #
        # This used to be two separate top-level `if`s, and the second one
        # (`if is_mpa:`) overwrote whatever the band had produced. Its `elif`
        # meant the NO-GO branch could not execute inside a protected area at
        # all, so a fisherman in a sanctuary in severe conditions was told
        # about trawling regulations and advised to "shift fishing operations
        # outside sanctuary boundaries" — that is, to keep fishing.
        #
        # The advisory comes from the same resolver every other language uses,
        # so English and vernacular cannot diverge.
        rec = advisory_for_band("en", risk_cat, wh, ws, temporal.label)

        if is_mpa and mpa_info:
            rec = (
                f"{rec} Additionally, target lies within {mpa_info['name']} where mechanized trawling "
                "is strictly prohibited by MoEFCC regulations."
            )

        return summary, rec
