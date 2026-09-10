"""Geometric vessel routing with hazard-avoidance checks.

**This is not route optimisation.** It builds a great-circle path, tests every
segment of it against the real marine protected area polygons with Shapely, and
if the path is blocked it tries a small family of geometric detours and returns
the first one that is actually clear. It does not search a cost surface, does
not know about bathymetry, currents, traffic separation schemes or fuel, and
does not claim the route it returns is optimal in any sense. A* over a
bathymetric cost raster is the real thing and it is future work.

What it replaces mattered more than what it is. The previous route was a
straight line whose "safe offshore detour" was three hardcoded coordinate
offsets, a length of `direct * 1.09`, and `crosses_protected_waters=False`
written as a literal -- on a corridor that ended inside the Gulf of Mannar. The
detour was never tested against anything. Here, every returned path has had
every segment intersected against every polygon, and the flag is the result of
that test.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from app.geospatial.calculations import (
    destination_point,
    haversine_distance,
    initial_bearing,
)
from app.geospatial.protected_areas import check_route_crosses_mpa

# Great-circle sampling interval. Fine enough that a segment cannot step over a
# small sanctuary between samples: the narrowest MPA held is Malvan at roughly
# 8 km across, so 5 km guarantees at least one sample inside it.
DEFAULT_SPACING_KM = 5.0

# Detour offsets tried, in km, perpendicular to the direct track. Both sides are
# tried at each magnitude before widening, so the shortest clear path wins.
DETOUR_OFFSETS_KM = (10.0, 20.0, 35.0, 50.0, 75.0, 100.0, 150.0)


@dataclass
class RoutePath:
    """A path that has actually been tested against the MPA polygons."""

    points: List[Tuple[float, float]]
    length_km: float
    crossings: List[Dict] = field(default_factory=list)
    offset_km: float = 0.0
    offset_bearing_deg: Optional[float] = None

    @property
    def crosses_protected_waters(self) -> bool:
        """Computed from the geometry. Never asserted."""
        return bool(self.crossings)

    @property
    def protected_area_names(self) -> List[str]:
        return [m["name"] for m in self.crossings]


def great_circle_waypoints(
    lat1: float, lon1: float, lat2: float, lon2: float,
    spacing_km: float = DEFAULT_SPACING_KM,
) -> List[Tuple[float, float]]:
    """Points along the great circle from one position to the other.

    Spherical interpolation, not a fixed-bearing rhumb line: over the distances
    ORCA deals with the two differ by a few km, and the rhumb line is not the
    path a vessel steering a great circle actually takes.

    Always includes both endpoints, and always returns at least two points.
    """
    total = haversine_distance(lat1, lon1, lat2, lon2)
    if total <= 0:
        return [(lat1, lon1), (lat2, lon2)]

    steps = max(1, int(math.ceil(total / max(spacing_km, 0.1))))
    phi1, lam1 = math.radians(lat1), math.radians(lon1)
    phi2, lam2 = math.radians(lat2), math.radians(lon2)
    delta = total / 6371.0  # angular distance

    if delta == 0 or math.isclose(math.sin(delta), 0.0, abs_tol=1e-12):
        return [(lat1, lon1), (lat2, lon2)]

    points: List[Tuple[float, float]] = []
    for i in range(steps + 1):
        f = i / steps
        a = math.sin((1 - f) * delta) / math.sin(delta)
        b = math.sin(f * delta) / math.sin(delta)
        x = a * math.cos(phi1) * math.cos(lam1) + b * math.cos(phi2) * math.cos(lam2)
        y = a * math.cos(phi1) * math.sin(lam1) + b * math.cos(phi2) * math.sin(lam2)
        z = a * math.sin(phi1) + b * math.sin(phi2)
        points.append((
            round(math.degrees(math.atan2(z, math.hypot(x, y))), 6),
            round(math.degrees(math.atan2(y, x)), 6),
        ))
    return points


def path_length_km(points: Sequence[Tuple[float, float]]) -> float:
    """Sum of the great-circle legs. This is the route's stated length.

    There is no detour factor and no multiplier. A route is as long as its
    geometry, and a detour is longer because it goes further, by an amount that
    falls out of the same sum.
    """
    return round(
        sum(
            haversine_distance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
            for i in range(len(points) - 1)
        ),
        1,
    )


def _tested(points: List[Tuple[float, float]], offset_km: float = 0.0,
            offset_bearing: Optional[float] = None) -> RoutePath:
    return RoutePath(
        points=points,
        length_km=path_length_km(points),
        crossings=check_route_crosses_mpa(points),
        offset_km=offset_km,
        offset_bearing_deg=offset_bearing,
    )


def direct_route(lat1: float, lon1: float, lat2: float, lon2: float,
                 spacing_km: float = DEFAULT_SPACING_KM) -> RoutePath:
    """The great circle between two points, tested against every MPA."""
    return _tested(great_circle_waypoints(lat1, lon1, lat2, lon2, spacing_km))


def detour_route(
    lat1: float, lon1: float, lat2: float, lon2: float,
    spacing_km: float = DEFAULT_SPACING_KM,
    offsets_km: Sequence[float] = DETOUR_OFFSETS_KM,
) -> Optional[RoutePath]:
    """The shortest tested detour that clears every MPA, or None if none does.

    The detour is a dog-leg: the midpoint of the direct track is displaced
    perpendicular to it, and the route runs origin -> displaced midpoint ->
    destination as two great-circle legs. Offsets are tried smallest first and
    both sides at each magnitude, so the answer is the least deviation that
    actually works.

    Returning None is a real outcome and is reported as one. Asserting that a
    detour is clear without testing it is what produced a "safe corridor" that
    ended inside the Gulf of Mannar.
    """
    track_bearing = initial_bearing(lat1, lon1, lat2, lon2)
    total = haversine_distance(lat1, lon1, lat2, lon2)
    mid_lat, mid_lon = destination_point(lat1, lon1, total / 2.0, track_bearing)

    for offset in offsets_km:
        for side in (90.0, -90.0):
            bearing = (track_bearing + side) % 360.0
            way_lat, way_lon = destination_point(mid_lat, mid_lon, offset, bearing)
            leg_a = great_circle_waypoints(lat1, lon1, way_lat, way_lon, spacing_km)
            leg_b = great_circle_waypoints(way_lat, way_lon, lat2, lon2, spacing_km)
            points = leg_a + leg_b[1:]
            candidate = _tested(points, offset_km=offset, offset_bearing=bearing)
            if not candidate.crosses_protected_waters:
                return candidate
    return None
