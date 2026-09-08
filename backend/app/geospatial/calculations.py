import math
from typing import List, Tuple, Dict, Any
from shapely.geometry import Point, Polygon, LineString

EARTH_RADIUS_KM = 6371.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(EARTH_RADIUS_KM * c, 2)

def initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates initial compass bearing in degrees (0 - 360) from point 1 to point 2."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing = math.degrees(math.atan2(y, x))
    return round((bearing + 360.0) % 360.0, 1)

def destination_point(lat: float, lon: float, distance_km: float, bearing_deg: float) -> Tuple[float, float]:
    """Calculates destination coordinates given start point, distance, and bearing."""
    delta = distance_km / EARTH_RADIUS_KM
    theta = math.radians(bearing_deg)
    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)

    phi2 = math.asin(math.sin(phi1) * math.cos(delta) + math.cos(phi1) * math.sin(delta) * math.cos(theta))
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2)
    )

    return (round(math.degrees(phi2), 5), round(math.degrees(lambda2), 5))

def bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """Returns (min_lat, min_lon, max_lat, max_lon) for a given radius in km."""
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)) + 1e-6)
    return (
        round(lat - lat_delta, 4),
        round(lon - lon_delta, 4),
        round(lat + lat_delta, 4),
        round(lon + lon_delta, 4)
    )

def point_in_polygon_exact(lat: float, lon: float, polygon_coords: List[Tuple[float, float]]) -> bool:
    """Uses Shapely to check if lat/lon point is inside polygon (lon, lat order in polygon)."""
    pt = Point(lon, lat)
    poly = Polygon(polygon_coords)
    return poly.contains(pt) or poly.touches(pt)

def line_intersects_polygon_exact(waypoints: List[Tuple[float, float]], polygon_coords: List[Tuple[float, float]]) -> bool:
    """Checks if a route line intersects a polygon."""
    if len(waypoints) < 2:
        return False
    line = LineString([(pt[1], pt[0]) for pt in waypoints])
    poly = Polygon(polygon_coords)
    return line.intersects(poly)
