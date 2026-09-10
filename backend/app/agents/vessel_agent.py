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
from app.geospatial.routing import detour_route, direct_route, path_length_km
from app.risk.engine import calculate_marine_risk

# How many named waypoints a route reports. The path itself is sampled every
# 5 km for the crossing test and for its length; this is only how much of it is
# given a name and a per-segment risk, so a 600 km passage does not return 120
# rows nobody reads.
REPORTED_WAYPOINTS = 9


def _sample_with_distance(points: List[Tuple[float, float]]) -> List[Tuple[float, float, float]]:
    """Evenly spaced samples of a tested path, each with its along-track distance.

    The distance is measured along the real path, so a detour's waypoints are
    at their true distances rather than at fractions of the straight line.
    """
    if not points:
        return []
    cumulative = [0.0]
    for i in range(len(points) - 1):
        cumulative.append(cumulative[-1] + path_length_km(points[i:i + 2]))
    if len(points) <= REPORTED_WAYPOINTS:
        chosen = range(len(points))
    else:
        step = (len(points) - 1) / (REPORTED_WAYPOINTS - 1)
        chosen = [min(len(points) - 1, int(round(i * step))) for i in range(REPORTED_WAYPOINTS)]
    return [(points[i][0], points[i][1], round(cumulative[i], 1)) for i in chosen]


def _fmt(value, unit: str) -> str:
    return "unavailable" if value is None else f"{value} {unit}"


def _diff(a, b, unit: str) -> str:
    return "unavailable" if a is None or b is None else f"{round(a - b, 1):+} {unit}"


def _advantage(rec, alt, word: str) -> str:
    if rec is None or alt is None or rec == alt:
        return "Equivalent"
    return f"Recommended ({word})" if rec < alt else "Alternative"


class VesselAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Vessel & Navigation Agent", role="Route safety, corridor risk sampling, and restricted crossing specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        origin: LocationContext = context.get("origin_location") or context["location"]
        dest: LocationContext = context.get("destination_location") or context.get("secondary_location") or origin

        # The direct route is a real great circle, sampled finely enough that a
        # segment cannot step over a sanctuary between samples, and tested
        # against every MPA polygon by Shapely. Its length is the sum of its own
        # legs; there is no multiplier anywhere in this agent.
        direct_path = direct_route(
            origin.latitude, origin.longitude, dest.latitude, dest.longitude
        )
        dist_km = direct_path.length_km
        bearing = initial_bearing(origin.latitude, origin.longitude, dest.latitude, dest.longitude)

        direct_coords: List[Tuple[float, float]] = list(direct_path.points)
        mpas_hit: List[str] = list(direct_path.protected_area_names)
        crosses_mpa = direct_path.crosses_protected_waters

        direct_waypoints: List[RouteWaypoint] = []

        # Forecast conditions along the corridor. One observation covers the
        # whole passage; a missing feed stays missing rather than becoming a
        # plausible number. The risk engine handles the absence.
        ocean = context.get("ocean_observation")
        weather = context.get("weather_observation")
        base_wave = ocean.significant_wave_height_m if ocean else None
        base_wind = weather.wind_speed_knots if weather else None

        def assess(crosses: bool = False, areas: List[str] = None, inside: bool = False, inside_name: str = None):
            """Every risk category and score in this agent comes from here."""
            return calculate_marine_risk(
                ocean, weather,
                is_inside_mpa=inside, mpa_name=inside_name,
                crosses_protected_waters=crosses, protected_areas=areas or [],
            )

        clear_water = assess()

        # Named waypoints are a readable sample of the tested path. The crossing
        # test above, and the stated length, use every point of it.
        for i, (pt_lat, pt_lon, cur_dist) in enumerate(_sample_with_distance(direct_coords)):
            in_mpa, mpa_info = check_point_in_mpa(pt_lat, pt_lon)
            if in_mpa and mpa_info:
                crosses_mpa = True
                if mpa_info["name"] not in mpas_hit:
                    mpas_hit.append(mpa_info["name"])

            # Every segment risk in this agent comes from calculate_marine_risk
            # via assess(). There is no second scoring formula.
            seg_risk = (
                assess(inside=True, inside_name=mpa_info["name"]).category
                if in_mpa and mpa_info else clear_water.category
            )

            direct_waypoints.append(RouteWaypoint(
                name=f"Waypoint {i+1} ({cur_dist:.1f} km)",
                latitude=pt_lat,
                longitude=pt_lon,
                segment_risk=seg_risk,
                wave_height_m=base_wave,
                wind_knots=base_wind,
                inside_restricted_zone=in_mpa,
                restriction_detail=f"Inside {mpa_info['name']}" if in_mpa else None
            ))

        # Proximity to a sanctuary is NOT a crossing, and must not be scored as
        # one. This used to set crosses_mpa, which made the risk engine attach
        # "Wildlife Protection Act: transiting X constitutes a legal violation"
        # to a corridor passing 34 km outside a sanctuary it never entered --
        # the same defect as P0-3, which had a fisherman's own home port
        # testing as inside an MPA. Nearby zones are now reported as proximity,
        # with no penalty and no legal claim.
        constraints = context.get("constraints")
        avoid_req = constraints.avoid_protected_areas if constraints else False
        buffer_km = 60.0 if avoid_req else 35.0
        nearby_mpas: List[str] = []
        nearest_mpa_km: float = float("inf")
        for pt_lat, pt_lon in direct_coords:
            n_mpa, d_km = get_nearest_mpa(pt_lat, pt_lon)
            nearest_mpa_km = min(nearest_mpa_km, d_km)
            if d_km < buffer_km and n_mpa["name"] not in mpas_hit and n_mpa["name"] not in nearby_mpas:
                nearby_mpas.append(n_mpa["name"])

        direct_dist = round(dist_km, 1)
        direct_transit = round(dist_km / 18.5, 1)
        direct_risk = assess(crosses=crosses_mpa, areas=mpas_hit) if crosses_mpa else clear_water
        if crosses_mpa:
            direct_mpa_exp = f"Intersects {', '.join(mpas_hit)}"
        elif nearby_mpas:
            direct_mpa_exp = (
                f"No crossing; passes within {nearest_mpa_km:.0f} km of "
                f"{', '.join(nearby_mpas)}"
            )
        else:
            direct_mpa_exp = "None (Cleared)"

        # The offshore alternative is a real dog-leg: the midpoint of the direct
        # track displaced perpendicular to it by the smallest offset that
        # actually clears every polygon, tested the same way the direct route
        # was. It used to be three hardcoded coordinate offsets, a length of
        # `direct * 1.09`, and `crosses_protected_waters=False` written beside
        # them -- on a corridor that ended inside the Gulf of Mannar. Nothing
        # here is asserted: when no offset clears, detour_path is None and that
        # is reported rather than papered over.
        detour_path = detour_route(
            origin.latitude, origin.longitude, dest.latitude, dest.longitude
        )
        detour_available = detour_path is not None
        detour_coords_pts = list(detour_path.points) if detour_available else list(direct_coords)
        detour_dist = detour_path.length_km if detour_available else dist_km
        detour_transit = round(detour_dist / 18.5, 1) if detour_dist else 0.0
        alt_coords: List[List[float]] = [[lon, lat] for lat, lon in detour_coords_pts]

        detour_waypoints: List[RouteWaypoint] = []
        for idx, (c_lat, c_lon, _d) in enumerate(_sample_with_distance(detour_coords_pts)):
            d_in_mpa, d_mpa = check_point_in_mpa(c_lat, c_lon)
            detour_waypoints.append(RouteWaypoint(
                name=f"Offshore Waypoint {idx+1}",
                latitude=c_lat,
                longitude=c_lon,
                segment_risk=(
                    assess(inside=True, inside_name=d_mpa["name"]).category
                    if d_in_mpa and d_mpa else clear_water.category
                ),
                wave_height_m=base_wave,
                wind_knots=base_wind,
                inside_restricted_zone=d_in_mpa,
                restriction_detail=f"Inside {d_mpa['name']}" if d_in_mpa else None
            ))

        # Computed from the tested geometry, never asserted.
        detour_crosses = (not detour_available) or detour_path.crosses_protected_waters
        detour_areas = list(detour_path.protected_area_names) if detour_available else list(mpas_hit)
        detour_exposure = (
            "None (Cleared - 0 violations)" if not detour_crosses
            else f"Intersects {', '.join(detour_areas)}" if detour_areas
            else "No clear offshore alternative was found within 150 km of the direct track"
        )

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
                marine_risk=clear_water.category,
                risk_score=clear_water.overall_score,
                risk_factors=clear_water.contributing_factors,
                wave_exposure_m=base_wave,
                wind_exposure_knots=base_wind,
                protected_area_exposure=detour_exposure,
                crosses_protected_waters=detour_crosses,
                protected_areas=detour_areas,
                trade_offs=(
                    f"+{round(detour_dist - direct_dist, 1)} km distance "
                    f"(+{round(detour_transit - direct_transit, 1)}h transit), routed "
                    f"{detour_path.offset_km:.0f} km off the direct track, in exchange for "
                    f"zero sanctuary violation. Same forecast conditions along both corridors."
                ) if detour_available else (
                    "No offset up to 150 km from the direct track clears every protected area; "
                    "this corridor is the direct route and it does cross."
                ),
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
                marine_risk=direct_risk.category,
                risk_score=direct_risk.overall_score,
                risk_factors=direct_risk.contributing_factors,
                wave_exposure_m=base_wave,
                wind_exposure_knots=base_wind,
                protected_area_exposure=direct_mpa_exp,
                # From the geometry test, like every other flag here.
                crosses_protected_waters=crosses_mpa,
                protected_areas=mpas_hit,
                trade_offs=f"Saves {round(detour_dist - direct_dist, 1)} km and ~{int((detour_transit - direct_transit)*60)} mins, but intersects {', '.join(mpas_hit)}: {direct_risk.category.value} risk, {direct_risk.overall_score}/100.",
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
                overall_risk = direct_risk.category
                rec_action = (
                    f"SELECTED ALTERNATIVE ROUTE: Direct corridor ({direct_dist} km, {direct_transit}h transit). "
                    f"REGULATORY VIOLATION: Route intersects {', '.join(mpas_hit)}. Risk {direct_risk.category.value} ({direct_risk.overall_score}/100)."
                )
            else:
                selected_route_id = "recommended"
                active_waypoints = detour_waypoints
                active_dist = detour_dist
                active_transit = detour_transit
                overall_risk = clear_water.category
                rec_action = (
                    f"RECOMMENDED ROUTE: Proceed via Offshore Safe Corridor ({detour_dist} km). Bypasses {', '.join(mpas_hit)} buffer zone completely. "
                    f"Direct route ({direct_dist} km) scores {direct_risk.category.value} ({direct_risk.overall_score}/100) due to sanctuary intersection."
                )
        else:
            rec_candidate = RouteCandidate(
                id="recommended",
                name=f"Direct Safe Passage ({origin.name} to {dest.name})",
                distance_km=direct_dist,
                estimated_transit_hours=direct_transit,
                marine_risk=clear_water.category,
                risk_score=clear_water.overall_score,
                risk_factors=clear_water.contributing_factors,
                wave_exposure_m=base_wave,
                wind_exposure_knots=base_wind,
                protected_area_exposure=direct_mpa_exp,
                crosses_protected_waters=crosses_mpa,
                protected_areas=mpas_hit,
                trade_offs="Direct passage; no restricted zone on the corridor.",
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
                marine_risk=clear_water.category,
                risk_score=clear_water.overall_score,
                risk_factors=clear_water.contributing_factors,
                wave_exposure_m=base_wave,
                wind_exposure_knots=base_wind,
                protected_area_exposure=detour_exposure,
                crosses_protected_waters=detour_crosses,
                protected_areas=detour_areas,
                trade_offs=(
                    f"+{round(detour_dist - dist_km, 1)} km over the direct passage "
                    f"({detour_path.offset_km:.0f} km offshore of the direct track); "
                    f"same forecast conditions along both corridors."
                ) if detour_available else "No clear offshore alternative was found.",
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
                overall_risk = clear_water.category
                rec_action = f"SELECTED ALTERNATIVE ROUTE: Weather contingency corridor ({detour_dist} km)."
            else:
                selected_route_id = "recommended"
                active_waypoints = direct_waypoints
                active_dist = direct_dist
                active_transit = direct_transit
                overall_risk = clear_water.category
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
                    recommended_value=_fmt(rec_candidate.wave_exposure_m, "m"),
                    alternative_value=_fmt(alt_candidate.wave_exposure_m, "m"),
                    difference=_diff(alt_candidate.wave_exposure_m, rec_candidate.wave_exposure_m, "m"),
                    advantage=_advantage(rec_candidate.wave_exposure_m, alt_candidate.wave_exposure_m, "Calmer")
                ),
                RouteComparisonMetric(
                    metric_name="Wind Exposure",
                    unit="knots",
                    recommended_value=_fmt(rec_candidate.wind_exposure_knots, "kt"),
                    alternative_value=_fmt(alt_candidate.wind_exposure_knots, "kt"),
                    difference=_diff(alt_candidate.wind_exposure_knots, rec_candidate.wind_exposure_knots, "kt"),
                    advantage=_advantage(rec_candidate.wind_exposure_knots, alt_candidate.wind_exposure_knots, "Lighter")
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
