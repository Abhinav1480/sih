"""Canonical query 6, and the routing that had never worked.

Two defects, both of the same kind: a number and a flag that were written down
rather than worked out.

  * The route was a straight line and its "safe offshore detour" was three
    hardcoded coordinate offsets with a length of `direct * 1.09`.
  * That detour asserted `crosses_protected_waters = False` as a literal --
    on a corridor that ended inside the Gulf of Mannar.

Everything here checks the opposite: that the flag is the result of
intersecting real geometry against the real MPA polygons, and that the length
is the sum of the route's own legs.
"""

import inspect
from datetime import datetime, timezone

import pytest

from app.geospatial.calculations import haversine_distance
from app.geospatial.protected_areas import INDIAN_MARINE_PROTECTED_AREAS, check_route_crosses_mpa
from app.geospatial.routing import (
    DEFAULT_SPACING_KM,
    detour_route,
    direct_route,
    great_circle_waypoints,
    path_length_km,
)

# Kakinada -> Visakhapatnam: open water, no sanctuary between them.
CLEAR = (16.9891, 82.2475, 17.6868, 83.2185)
# A short hop across the Gulf of Mannar Marine National Park.
THROUGH_MPA = (9.3, 79.4, 8.7, 78.9)


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------


def test_route_length_is_the_sum_of_its_own_legs():
    """No multiplier. The old detour was `direct * 1.09`."""
    path = direct_route(*CLEAR)
    straight = haversine_distance(*CLEAR)

    assert path.length_km == pytest.approx(straight, abs=0.5), (
        f"stated length {path.length_km} km against a great-circle distance of "
        f"{straight:.1f} km"
    )
    assert path.length_km == path_length_km(path.points)


def test_a_detour_is_longer_because_it_goes_further_not_by_a_factor():
    direct = direct_route(*THROUGH_MPA)
    detour = detour_route(*THROUGH_MPA)
    assert detour is not None

    assert detour.length_km == path_length_km(detour.points)
    assert detour.length_km > direct.length_km
    ratio = detour.length_km / direct.length_km
    assert ratio != pytest.approx(1.09, abs=1e-6), (
        "the detour is exactly 9% longer, which is the hardcoded factor returning"
    )


def test_the_path_is_sampled_finely_enough_to_not_step_over_a_sanctuary():
    """The narrowest MPA held is roughly 8 km across."""
    points = great_circle_waypoints(*CLEAR)
    gaps = [
        haversine_distance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
        for i in range(len(points) - 1)
    ]
    assert max(gaps) <= DEFAULT_SPACING_KM + 0.5
    assert points[0] == pytest.approx((CLEAR[0], CLEAR[1]), abs=1e-4)
    assert points[-1] == pytest.approx((CLEAR[2], CLEAR[3]), abs=1e-4)


def test_a_degenerate_route_does_not_explode():
    path = direct_route(16.0, 82.0, 16.0, 82.0)
    assert path.length_km == 0.0
    assert len(path.points) >= 2


# ---------------------------------------------------------------------------
# Protected water testing
# ---------------------------------------------------------------------------


def test_a_route_through_an_mpa_reports_the_crossing():
    path = direct_route(*THROUGH_MPA)
    assert path.crosses_protected_waters, "a route across the Gulf of Mannar reports no crossing"
    assert "Gulf of Mannar Marine National Park" in path.protected_area_names


def test_a_route_that_avoids_every_mpa_reports_no_crossing():
    path = direct_route(*CLEAR)
    assert not path.crosses_protected_waters
    assert path.protected_area_names == []


def test_the_crossing_flag_is_computed_not_stored():
    """`crosses_protected_waters` must be derived from `crossings`."""
    source = inspect.getsource(type(direct_route(*CLEAR)).crosses_protected_waters.fget)
    assert "crossings" in source, "the flag no longer derives from the geometry test"


def test_the_detour_it_returns_is_actually_clear():
    """The regression: a corridor asserted clear that ended inside a sanctuary."""
    detour = detour_route(*THROUGH_MPA)
    assert detour is not None, "no clear detour found across the Gulf of Mannar"
    assert not detour.crosses_protected_waters

    # Re-tested independently of the routing module's own bookkeeping.
    assert check_route_crosses_mpa(detour.points) == []


@pytest.mark.parametrize(
    "area", INDIAN_MARINE_PROTECTED_AREAS, ids=lambda a: a["id"]
)
def test_a_route_straight_through_each_mpa_centre_is_detected(area):
    """Every polygon must be reachable by the test, not just the one we picked."""
    lat, lon = area["center"]
    path = direct_route(lat - 0.35, lon - 0.35, lat + 0.35, lon + 0.35)
    assert path.crosses_protected_waters, f"a route through {area['name']} reports no crossing"
    assert area["name"] in path.protected_area_names


def test_detour_returns_none_rather_than_a_route_it_cannot_clear():
    """A route that cannot be cleared must say so, not assert success."""
    # Offsets that are all far too small to clear a large sanctuary.
    detour = detour_route(*THROUGH_MPA, offsets_km=(0.1, 0.2))
    assert detour is None


# ---------------------------------------------------------------------------
# One risk formula
# ---------------------------------------------------------------------------


def _code_only(module) -> str:
    """Module source with comments and docstrings removed.

    The comments in the vessel agent describe the `* 1.09` multiplier that was
    taken out, on purpose, so that whoever reads it knows what not to
    reintroduce. Scanning raw source would flag that description as the defect
    it warns about -- the same reason the frontend honesty suite strips
    comments before it looks for anything.
    """
    import io
    import tokenize

    source = inspect.getsource(module)
    out, prev_end, prev_type = [], (1, 0), tokenize.INDENT
    for tok in tokenize.generate_tokens(io.StringIO(source).readline):
        if tok.type == tokenize.COMMENT:
            continue
        if tok.type == tokenize.STRING and prev_type in (
            tokenize.INDENT, tokenize.DEDENT, tokenize.NEWLINE, tokenize.NL
        ):
            continue  # a docstring
        out.append(tok.string)
        if tok.type not in (tokenize.NL, tokenize.NEWLINE):
            prev_type = tok.type
    return " ".join(out)


def test_the_vessel_agent_scores_only_through_calculate_marine_risk():
    from app.agents import vessel_agent

    code = _code_only(vessel_agent)
    assert "calculate_marine_risk" in code
    # The agent funnels every assessment through one local helper.
    assert code.count("calculate_marine_risk (") + code.count("calculate_marine_risk(") == 1, (
        "calculate_marine_risk is called from more than one place in the vessel "
        "agent; there should be exactly one assess() helper"
    )
    for banned in ("* 20", "* 1.5", "* 1.09", "scoreMap"):
        assert banned not in code, f"{banned!r} looks like a second scoring formula"


# ---------------------------------------------------------------------------
# The canonical query
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


KAKINADA = {"latitude": 16.9891, "longitude": 82.2475}


def _ask(client, query, location=None):
    return client.post(
        "/api/query", json={"query": query, "user_location": location or KAKINADA}
    ).json()


def test_canonical_query_6_returns_a_route(client):
    """The regression. This query returned needs_clarification and nothing else."""
    body = _ask(
        client,
        "What is the safest route for a fishing vessel considering weather and sea state conditions?",
    )

    assert not body.get("needs_clarification"), "canonical query 6 still asks for clarification"
    assert body["intent"] == "route_analysis"

    cards = {c["type"] for c in body["cards"]}
    assert "route_plan" in cards, f"no route card: {cards}"
    assert body["risk"] is not None, "a route was produced with no risk assessment"
    assert body["evidence"], "a route was produced citing nothing"


def test_an_inferred_destination_is_disclosed(client):
    """ORCA chose where to sail. It has to say so."""
    body = _ask(
        client,
        "What is the safest route for a fishing vessel considering weather and sea state conditions?",
    )
    limitations = " ".join(body["meta"]["limitations"])
    assert "No destination was named" in limitations, (
        "the route destination was inferred and the response does not say so"
    )


def test_a_named_destination_is_used_rather_than_inferred(client):
    body = _ask(client, "What is the safest route for a fishing vessel from Kakinada to Chennai?")
    assert not body.get("needs_clarification")
    route = next(c for c in body["cards"] if c["type"] == "route_plan")
    assert "Chennai" in route["destination"]["name"]
    limitations = " ".join(body["meta"]["limitations"])
    assert "No destination was named" not in limitations


def test_the_route_card_length_matches_its_own_waypoints(client):
    body = _ask(client, "What is the safest route for a fishing vessel from Kakinada to Visakhapatnam?")
    route = next(c for c in body["cards"] if c["type"] == "route_plan")

    origin, dest = route["origin"], route["destination"]
    straight = haversine_distance(
        origin["latitude"], origin["longitude"], dest["latitude"], dest["longitude"]
    )
    # A direct passage should be its great-circle distance; a detour is longer,
    # but never by a round factor and never shorter than the straight line.
    assert route["total_distance_km"] >= straight - 1.0
    assert route["total_distance_km"] < straight * 1.6


@pytest.mark.parametrize(
    "query",
    [
        "What is the safest route for a fishing vessel from Kakinada to Visakhapatnam?",
        "What is the safest route for a fishing vessel from Rameswaram to Thoothukudi?",
        "What is the safest route for a fishing vessel from Chennai to Visakhapatnam?",
        "What is the safest route for a fishing vessel considering weather and sea state conditions?",
    ],
)
def test_the_route_cards_crossing_flag_matches_an_independent_geometry_test(client, query):
    """The regression, end to end.

    The old detour carried `crosses_protected_waters = False` as a literal. This
    re-runs the polygon intersection over the waypoints the API actually
    returned, so a flag that stops matching the geometry it describes fails
    here whatever the agent claims. It is deliberately not told which way the
    answer should come out.
    """
    body = _ask(client, query)
    cards = [c for c in body["cards"] if c["type"] == "route_plan"]
    if not cards:
        pytest.skip(f"no route produced for {query!r}")
    route = cards[0]

    points = [(w["latitude"], w["longitude"]) for w in route["waypoints"]]
    assert len(points) >= 2, "a route card with fewer than two waypoints"
    actually_crosses = bool(check_route_crosses_mpa(points))

    assert route["crosses_protected_waters"] == actually_crosses, (
        f"the card says crosses_protected_waters={route['crosses_protected_waters']} "
        f"but intersecting its own waypoints against the MPA polygons says "
        f"{actually_crosses}"
    )
    if actually_crosses:
        assert route["protected_areas_intersected"], (
            "a crossing is reported with no sanctuary named"
        )
    else:
        assert not route["protected_areas_intersected"], (
            f"no crossing, yet {route['protected_areas_intersected']} is listed as intersected"
        )


def test_passing_near_a_sanctuary_is_not_reported_as_transiting_one(client):
    """Proximity is not a crossing, and must not carry a legal claim.

    A corridor passing 34 km outside a sanctuary used to set
    crosses_protected_waters, which made the risk engine attach "Wildlife
    Protection Act: transiting X constitutes a legal violation" to a route that
    never entered it -- the same defect as P0-3, where a fisherman's own home
    port tested as inside an MPA.
    """
    body = _ask(client, "What is the safest route for a fishing vessel from Rameswaram to Thoothukudi?")
    cards = [c for c in body["cards"] if c["type"] == "route_plan"]
    if not cards:
        pytest.skip("no route produced")
    route = cards[0]

    points = [(w["latitude"], w["longitude"]) for w in route["waypoints"]]
    if check_route_crosses_mpa(points):
        pytest.skip("this route genuinely crosses; nothing to prove here")

    rules = " ".join((body.get("risk") or {}).get("triggered_rules") or [])
    assert "legal violation" not in rules.lower(), (
        f"a route that crosses nothing carries a legal-violation rule: {rules}"
    )


def test_a_query_with_no_location_at_all_still_asks(client):
    """Inference needs somewhere to infer from. With nothing, ask."""
    body = client.post(
        "/api/query", json={"query": "What is the safest route for a fishing vessel?"}
    ).json()
    if body.get("needs_clarification"):
        assert body["intent"] == "needs_clarification"
    else:
        # A device position was supplied by default; then it must have routed.
        assert any(c["type"] == "route_plan" for c in body["cards"])
