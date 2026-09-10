"""No harbour may sit inside a marine protected area.

The six MPA polygons are hand-drawn quadrilaterals. They were drawn well
oversized -- Gulf of Kutch 4.35x its published area, Gulf of Mannar 2.82x,
Malvan 2.44x, Coringa 1.87x -- and at that size the Rameswaram and Malvan
harbour nodes tested as INSIDE an MPA. A +20 legal-violation penalty and a
Wildlife Protection Act citation therefore fired on a fisherman sitting in his
own home port.

The geometry is still approximate. These tests pin the two things that make it
safe to ship anyway: no known harbour is inside one, and the response says the
boundaries are approximate.
"""

import math

import pytest
from shapely.geometry import Polygon

from app.geospatial.boundaries import INDIAN_COASTAL_NODES
from app.geospatial.protected_areas import (
    GEOMETRY_NOTE,
    GEOMETRY_PRECISION,
    INDIAN_MARINE_PROTECTED_AREAS,
    check_point_in_mpa,
)

# Published areas, km^2. General reference figures, not read from a dataset in
# this repository -- the same caveat the module records.
PUBLISHED_AREA_KM2 = {
    "mpa_gahirmatha": 1435.0,
    "mpa_gulf_of_mannar": 560.0,
    "mpa_malvan": 29.1,
    "mpa_kutch_jamnagar": 620.8,
    "mpa_mahatma_gandhi": 281.5,
    "mpa_coringa_mangroves": 235.7,
}

# A quadrilateral will never match a gazetted boundary. This bound only catches
# the failure that mattered: a polygon grossly larger than the real sanctuary.
MAX_AREA_RATIO = 1.30


def _area_km2(coords):
    lat0 = sum(c[1] for c in coords) / len(coords)
    k = math.cos(math.radians(lat0))
    return Polygon([(lon * 111.32 * k, lat * 110.57) for lon, lat in coords]).area


def test_no_harbour_node_is_inside_a_protected_area():
    """The regression. Rameswaram and Malvan both failed this."""
    inside = []
    for name, node in INDIAN_COASTAL_NODES.items():
        hit, mpa = check_point_in_mpa(node["latitude"], node["longitude"])
        if hit:
            inside.append(f"{name} -> {mpa['name']}")

    assert not inside, (
        "harbour nodes testing as inside an MPA, which fires a legal-violation "
        "penalty on a fisherman in his home port: " + "; ".join(inside)
    )


@pytest.mark.parametrize("mpa", INDIAN_MARINE_PROTECTED_AREAS, ids=lambda m: m["id"])
def test_polygon_is_not_grossly_larger_than_the_published_sanctuary(mpa):
    published = PUBLISHED_AREA_KM2[mpa["id"]]
    drawn = _area_km2(mpa["polygon_coords"])
    ratio = drawn / published

    assert ratio <= MAX_AREA_RATIO, (
        f"{mpa['id']} is {ratio:.2f}x its published area ({drawn:.0f} vs "
        f"{published:.0f} km2). An oversized polygon claims unrestricted water."
    )


@pytest.mark.parametrize("mpa", INDIAN_MARINE_PROTECTED_AREAS, ids=lambda m: m["id"])
def test_polygon_is_still_a_valid_closed_ring(mpa):
    coords = mpa["polygon_coords"]
    assert coords[0] == coords[-1], f"{mpa['id']}: ring is not closed"
    assert len(coords) >= 4, f"{mpa['id']}: fewer than 3 distinct vertices"
    assert Polygon(coords).is_valid, f"{mpa['id']}: self-intersecting polygon"
    assert _area_km2(coords) > 0, f"{mpa['id']}: degenerate polygon"


@pytest.mark.parametrize("mpa", INDIAN_MARINE_PROTECTED_AREAS, ids=lambda m: m["id"])
def test_declared_centre_still_lies_inside_its_own_polygon(mpa):
    """Shrinking must not have moved a polygon off its declared centre."""
    lat, lon = mpa["center"]
    assert Polygon(mpa["polygon_coords"]).contains(
        __import__("shapely.geometry", fromlist=["Point"]).Point(lon, lat)
    ), f"{mpa['id']}: declared centre is outside the polygon"


def test_the_geometry_declares_itself_approximate():
    """A boundary this coarse must never read as authoritative."""
    assert GEOMETRY_PRECISION == "APPROXIMATE"
    assert "approximate" in GEOMETRY_NOTE.lower()


def test_the_response_carries_the_approximate_geometry_note():
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/api/query",
        json={
            "query": "Is it safe to go to sea tomorrow?",
            "user_location": {"latitude": 16.9891, "longitude": 82.2475},
        },
    )
    assert response.status_code == 200
    limitations = response.json()["meta"]["limitations"]
    assert any("approximate" in item.lower() for item in limitations), (
        "the response does not tell the user the MPA boundaries are approximate"
    )
