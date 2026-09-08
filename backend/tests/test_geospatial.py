import pytest
from app.geospatial.calculations import (
    haversine_distance,
    initial_bearing,
    destination_point,
    bounding_box,
    point_in_polygon_exact,
)
from app.geospatial.boundaries import resolve_location, find_nearest_harbor
from app.geospatial.protected_areas import check_point_in_mpa, check_route_crosses_mpa

def test_haversine_distance():
    # Visakhapatnam to Kakinada is approx 130-145 km
    d = haversine_distance(17.6868, 83.2185, 16.9891, 82.2475)
    assert 120 < d < 160

def test_initial_bearing():
    # North direction
    b = initial_bearing(10.0, 80.0, 11.0, 80.0)
    assert round(b) == 0 or round(b) == 360

def test_bounding_box():
    min_lat, min_lon, max_lat, max_lon = bounding_box(17.68, 83.21, 40.0)
    assert min_lat < 17.68 < max_lat
    assert min_lon < 83.21 < max_lon

def test_point_in_mpa_gahirmatha():
    # Gahirmatha sanctuary center (~20.58, 87.02)
    in_mpa, info = check_point_in_mpa(20.58, 87.02)
    assert in_mpa is True
    assert info is not None
    assert "Gahirmatha" in info["name"]

def test_point_outside_mpa():
    # Open sea off Visakhapatnam is clear of Gahirmatha
    in_mpa, info = check_point_in_mpa(17.65, 83.35)
    assert in_mpa is False
    assert info is None

def test_location_resolution():
    loc = resolve_location("Is it safe near Vizag harbor tomorrow?")
    assert loc.name == "Visakhapatnam"
    assert loc.state == "Andhra Pradesh"

    loc2 = resolve_location("Compare conditions at 13.08, 80.27 and Kakinada")
    assert loc2.latitude == 13.08
    assert loc2.longitude == 80.27
