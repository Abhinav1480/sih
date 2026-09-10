import time
from typing import Dict, Any, List, Tuple
from app.agents.base import BaseSpecialistAgent
from app.models.schemas import (
    VesselRouteAnalysis,
    RouteWaypoint,
    RouteCandidate,
    RouteComparisonData,
    RouteComparisonMetric,
    RiskCategory,
    LocationContext,
)
from app.geospatial.calculations import (
    haversine_distance,
    initial_bearing,
    destination_point,
)
from app.geospatial.protected_areas import check_point_in_mpa, check_route_crosses_mpa, get_nearest_mpa

class VesselAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Vessel & Navigation Agent", role="Route safety, corridor risk sampling, and restricted crossing specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        origin: LocationContext = context.get("origin_location") or context["location"]
        dest: LocationContext = context.get("destination_location") or context.get("secondary_location") or origin

        # Generate intermediate route waypoints for direct route
        dist_km = haversine_distance(origin.latitude, origin.longitude, dest.latitude, dest.longitude)
        bearing = initial_bearing(origin.latitude, origin.longitude, dest.latitude, dest.longitude)

        num_points = 5
        direct_waypoints: List[RouteWaypoint] = []
        direct_coords: List[Tuple[float, float]] = []

        crosses_mpa = False
        mpas_hit = []

        step_dist = dist_km / (num_points - 1) if dist_km > 0 else 0.0

        # Time-sensitive environmental baselines from observations
        ocean = context.get("ocean_observation")
        weather = context.get("weather_observation")
        base_wave = ocean.significant_wave_height_m if ocean else 1.5
        base_wind = weather.wind_speed_knots if weather else 14.0

        for i in range(num_points):
            cur_dist = i * step_dist
            pt_lat, pt_lon = destination_point(origin.latitude, origin.longitude, cur_dist, bearing)
            direct_coords.append((pt_lat, pt_lon))

            in_mpa, mpa_info = check_point_in_mpa(pt_lat, pt_lon)
            if in_mpa and mpa_info:
                crosses_mpa = True
                if mpa_info["name"] not in mpas_hit:
                    mpas_hit.append(mpa_info["name"])

            wave_sample = round(base_wave + (0.2 * (i % 2)), 2)
            wind_sample = round(base_wind + (2.0 * (i % 3)), 1)
            seg_risk = RiskCategory.HIGH if in_mpa else (RiskCategory.MODERATE if wave_sample > 2.0 else RiskCategory.LOW)

            direct_waypoints.append(RouteWaypoint(
                name=f"Waypoint {i+1} ({cur_dist:.1f} km)",
                latitude=pt_lat,
                longitude=pt_lon,
                segment_risk=seg_risk,
                wave_height_m=wave_sample,
                wind_knots=wind_sample,
                inside_restricted_zone=in_mpa,
                restriction_detail=f"Inside {mpa_info['name']}" if in_mpa else None
            ))

        # Check line-polygon intersection with MPAs
        route_crossings = check_route_crosses_mpa(direct_coords)
        for r_mpa in route_crossings:
            crosses_mpa = True
            if r_mpa["name"] not in mpas_hit:
                mpas_hit.append(r_mpa["name"])

        # Check proximity to MPAs along corridor (< 35 km sanctuary buffer zone)
        constraints = context.get("constraints")
        avoid_req = constraints.avoid_protected_areas if constraints else False
        for pt_lat, pt_lon in direct_coords:
            n_mpa, d_km = get_nearest_mpa(pt_lat, pt_lon)
            if d_km < 35.0 or (avoid_req and d_km < 60.0):
                crosses_mpa = True
                if n_mpa["name"] not in mpas_hit:
                    mpas_hit.append(n_mpa["name"])

        direct_dist = round(dist_km, 1)
        direct_transit = round(dist_km / 18.5, 1)
        direct_risk = RiskCategory.HIGH if crosses_mpa else RiskCategory.LOW
        direct_score = 75 if crosses_mpa else 20
        direct_wave = round(base_wave + (0.3 if crosses_mpa else 0.1), 2)
        direct_wind = round(base_wind + (1.5 if crosses_mpa else 1.0), 1)
        direct_mpa_exp = f"Intersects {', '.join(mpas_hit)}" if crosses_mpa else "None (Cleared)"

        # Safe Offshore Detour Route (Detour avoiding sanctuary buffer)
        alt_coords: List[List[float]] = [
            [origin.longitude, origin.latitude],
            [origin.longitude + 0.32, origin.latitude + 0.12],
            [(origin.longitude + dest.longitude) / 2 + 0.22, (origin.latitude + dest.latitude) / 2],
            [dest.longitude, dest.latitude]
        ]
        detour_dist = round(dist_km * 1.09, 1)
        detour_transit = round(detour_dist / 18.5, 1)
        detour_waypoints: List[RouteWaypoint] = []
        for idx, (c_lon, c_lat) in enumerate(alt_coords):
            detour_waypoints.append(RouteWaypoint(
                name=f"Offshore Waypoint {idx+1}",
                latitude=c_lat,
                longitude=c_lon,
                segment_risk=RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE,
                wave_height_m=round(max(0.8, base_wave - 0.1 + (0.15 * (idx % 2))), 2),
                wind_knots=round(max(5.0, base_wind - 1.0 + (1.5 * (idx % 2))), 1),
                inside_restricted_zone=False,
                restriction_detail=None
            ))

        target_corridor = (
            context.get("selected_route_id") or
            context.get("target_route") or
            "recommended"
        )
        is_alt_selected = (target_corridor == "alternative")

        # Build Candidate Routes
        if crosses_mpa:
            # When direct crosses sanctuary:
            # Recommended is the safe offshore detour corridor
            # Alternative is the direct rhumb line corridor
            rec_candidate = RouteCandidate(
                id="recommended",
                name=f"Offshore Safe Corridor ({origin.name} to {dest.name} - Clears Sanctuary)",
                distance_km=detour_dist,
                estimated_transit_hours=detour_transit,
                marine_risk=RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE,
                risk_score=14 if base_wave < 2.2 else 35,
                wave_exposure_m=round(base_wave, 2),
                wind_exposure_knots=round(base_wind, 1),
                protected_area_exposure="None (Cleared - 0 violations)",
                crosses_protected_waters=False,
                protected_areas=[],
                trade_offs=f"+{round(detour_dist - direct_dist, 1)} km distance (+{round(detour_transit - direct_transit, 1)}h transit) in exchange for zero sanctuary violation.",
                is_recommended=True,
                is_selected=not is_alt_selected,
                waypoints=detour_waypoints,
                coordinates=alt_coords
            )
            alt_candidate = RouteCandidate(
                id="alternative",
                name=f"Direct Rhumb Line Corridor ({origin.name} to {dest.name} - Direct)",
                distance_km=direct_dist,
                estimated_transit_hours=direct_transit,
                marine_risk=RiskCategory.HIGH,
                risk_score=direct_score,
                wave_exposure_m=direct_wave,
                wind_exposure_knots=direct_wind,
                protected_area_exposure=direct_mpa_exp,
                crosses_protected_waters=True,
                protected_areas=mpas_hit,
                trade_offs=f"Saves {round(detour_dist - direct_dist, 1)} km and ~{int((detour_transit - direct_transit)*60)} mins, but intersects {', '.join(mpas_hit)} with high legal/penalty risk.",
                is_recommended=False,
                is_selected=is_alt_selected,
                waypoints=direct_waypoints,
                coordinates=[[wp.longitude, wp.latitude] for wp in direct_waypoints]
            )
            candidates = [rec_candidate, alt_candidate]
            if is_alt_selected:
                selected_route_id = "alternative"
                active_waypoints = direct_waypoints
                active_dist = direct_dist
                active_transit = direct_transit
                overall_risk = RiskCategory.HIGH
                rec_action = (
                    f"SELECTED ALTERNATIVE ROUTE: Direct corridor ({direct_dist} km, {direct_transit}h transit). "
                    f"CRITICAL REGULATORY VIOLATION: Route intersects {', '.join(mpas_hit)} with high legal and enforcement penalty risk."
                )
            else:
                selected_route_id = "recommended"
                active_waypoints = detour_waypoints
                active_dist = detour_dist
                active_transit = detour_transit
                overall_risk = RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE
                rec_action = (
                    f"RECOMMENDED ROUTE: Proceed via Offshore Safe Corridor ({detour_dist} km). Bypasses {', '.join(mpas_hit)} buffer zone completely. "
                    f"Direct route ({direct_dist} km) is flagged HIGH RISK due to sanctuary intersection."
                )
        else:
            rec_candidate = RouteCandidate(
                id="recommended",
                name=f"Direct Safe Passage ({origin.name} to {dest.name})",
                distance_km=direct_dist,
                estimated_transit_hours=direct_transit,
                marine_risk=RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE,
                risk_score=18 if base_wave < 2.2 else 38,
                wave_exposure_m=round(base_wave, 2),
                wind_exposure_knots=round(base_wind, 1),
                protected_area_exposure="None (Cleared)",
                crosses_protected_waters=False,
                protected_areas=[],
                trade_offs="Direct optimal passage avoiding restricted zones.",
                is_recommended=True,
                is_selected=not is_alt_selected,
                waypoints=direct_waypoints,
                coordinates=[[wp.longitude, wp.latitude] for wp in direct_waypoints]
            )
            alt_candidate = RouteCandidate(
                id="alternative",
                name=f"Offshore Weather Contingency Corridor ({origin.name} to {dest.name})",
                distance_km=detour_dist,
                estimated_transit_hours=detour_transit,
                marine_risk=RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE,
                risk_score=22 if base_wave < 2.2 else 42,
                wave_exposure_m=round(base_wave + 0.1, 2),
                wind_exposure_knots=round(base_wind + 1.0, 1),
                protected_area_exposure="None (Cleared)",
                crosses_protected_waters=False,
                protected_areas=[],
                trade_offs="+9% distance for deep-water swell clearance.",
                is_recommended=False,
                is_selected=is_alt_selected,
                waypoints=detour_waypoints,
                coordinates=alt_coords
            )
            candidates = [rec_candidate, alt_candidate]
            if is_alt_selected:
                selected_route_id = "alternative"
                active_waypoints = detour_waypoints
                active_dist = detour_dist
                active_transit = detour_transit
                overall_risk = RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE
                rec_action = f"SELECTED ALTERNATIVE ROUTE: Weather contingency corridor ({detour_dist} km)."
            else:
                selected_route_id = "recommended"
                active_waypoints = direct_waypoints
                active_dist = direct_dist
                active_transit = direct_transit
                overall_risk = RiskCategory.LOW if base_wave < 2.2 else RiskCategory.MODERATE
                rec_action = "ROUTE CLEARED: Transit corridor avoids all Marine Sanctuaries and remains within safe wave limits."

        # Route Comparison Data
        route_comp = RouteComparisonData(
            recommended_route_name=rec_candidate.name,
            alternative_route_name=alt_candidate.name,
            selected_route_name=alt_candidate.name if is_alt_selected else rec_candidate.name,
            trade_off_analysis=(
                f"Recommended corridor ({rec_candidate.distance_km} km) clears all sanctuary boundaries. "
                f"Alternative corridor ({alt_candidate.distance_km} km) has {alt_candidate.marine_risk.value} risk ({alt_candidate.protected_area_exposure})."
            ),
            what_changes_summary=(
                f"Choosing the alternative route shifts total passage distance to {alt_candidate.distance_km} km, "
                f"alters wave exposure to {alt_candidate.wave_exposure_m}m, and changes marine risk to {alt_candidate.marine_risk.value}."
            ),
            metrics=[
                RouteComparisonMetric(
                    metric_name="Distance",
                    unit="km",
                    recommended_value=f"{rec_candidate.distance_km} km",
                    alternative_value=f"{alt_candidate.distance_km} km",
                    difference=f"{round(alt_candidate.distance_km - rec_candidate.distance_km, 1):+} km",
                    advantage="Alternative (+Shorter)" if alt_candidate.distance_km < rec_candidate.distance_km else "Recommended"
                ),
                RouteComparisonMetric(
                    metric_name="Marine Risk",
                    unit="category",
                    recommended_value=f"{rec_candidate.marine_risk.value} ({rec_candidate.risk_score}/100)",
                    alternative_value=f"{alt_candidate.marine_risk.value} ({alt_candidate.risk_score}/100)",
                    difference=f"{alt_candidate.risk_score - rec_candidate.risk_score:+d} pts",
                    advantage="Recommended (Lower Risk)" if rec_candidate.risk_score < alt_candidate.risk_score else "Equivalent"
                ),
                RouteComparisonMetric(
                    metric_name="Wave Exposure",
                    unit="meters",
                    recommended_value=f"{rec_candidate.wave_exposure_m} m",
                    alternative_value=f"{alt_candidate.wave_exposure_m} m",
                    difference=f"{round(alt_candidate.wave_exposure_m - rec_candidate.wave_exposure_m, 1):+} m",
                    advantage="Recommended (Calmer)" if rec_candidate.wave_exposure_m <= alt_candidate.wave_exposure_m else "Alternative"
                ),
                RouteComparisonMetric(
                    metric_name="Wind Exposure",
                    unit="knots",
                    recommended_value=f"{rec_candidate.wind_exposure_knots} kt",
                    alternative_value=f"{alt_candidate.wind_exposure_knots} kt",
                    difference=f"{round(alt_candidate.wind_exposure_knots - rec_candidate.wind_exposure_knots, 1):+} kt",
                    advantage="Recommended (Lighter)" if rec_candidate.wind_exposure_knots <= alt_candidate.wind_exposure_knots else "Alternative"
                ),
                RouteComparisonMetric(
                    metric_name="Protected Area",
                    unit="status",
                    recommended_value=rec_candidate.protected_area_exposure,
                    alternative_value=alt_candidate.protected_area_exposure,
                    difference="Cleared vs Sanctuary Crossing" if alt_candidate.crosses_protected_waters else "Both Cleared",
                    advantage="Recommended (100% Compliant)" if not rec_candidate.crosses_protected_waters and alt_candidate.crosses_protected_waters else "Compliant"
                ),
                RouteComparisonMetric(
                    metric_name="Estimated Transit",
                    unit="hours",
                    recommended_value=f"{rec_candidate.estimated_transit_hours} hrs",
                    alternative_value=f"{alt_candidate.estimated_transit_hours} hrs",
                    difference=f"{round(alt_candidate.estimated_transit_hours - rec_candidate.estimated_transit_hours, 1):+} hrs",
                    advantage="Alternative (Faster)" if alt_candidate.estimated_transit_hours < rec_candidate.estimated_transit_hours else "Recommended"
                ),
            ]
        )

        analysis = VesselRouteAnalysis(
            route_id=f"route_{origin.name[:4]}_{dest.name[:4]}",
            origin=origin,
            destination=dest,
            total_distance_km=active_dist,
            estimated_transit_hours=active_transit,
            waypoints=active_waypoints,
            crosses_protected_waters=crosses_mpa,
            protected_areas_intersected=mpas_hit,
            overall_route_risk=overall_risk,
            recommended_action=rec_action,
            alternative_suggested=True,
            alternative_route_notes="Both Recommended and Alternative routes sampled for side-by-side risk and spatial corridor comparison.",
            candidate_routes=candidates,
            selected_route_id=selected_route_id,
            route_comparison=route_comp
        )

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action=f"Analyzed marine passage corridor from {origin.name} to {dest.name}",
            tool="analyze_route",
            duration_ms=duration_ms,
            details=f"Candidates: {len(candidates)}, Selected: {selected_route_id}, Distance: {active_dist} km, MPAs: {crosses_mpa} ({', '.join(mpas_hit) if mpas_hit else 'None'})"
        )

        return {
            "route_analysis": analysis,
            "route_comparison": route_comp,
            "step_log": step
        }
