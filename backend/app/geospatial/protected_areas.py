from typing import List, Dict, Any, Optional, Tuple
from app.geospatial.calculations import point_in_polygon_exact, line_intersects_polygon_exact, haversine_distance

# ---------------------------------------------------------------------------
# THE GEOMETRY BELOW IS APPROXIMATE. It is not gazetted boundary data.
#
# Each MPA is a hand-drawn 4-vertex quadrilateral placed over roughly the right
# water. It is good enough to say "you are near a sanctuary"; it is not good
# enough to decide a prosecution, and it must not be presented as authoritative.
#
# The quadrilaterals were originally drawn well oversized: Gulf of Kutch 4.35x
# its published area, Gulf of Mannar 2.82x, Malvan 2.44x, Coringa 1.87x. At
# that size the Rameswaram and Malvan harbour nodes tested as INSIDE an MPA, so
# a +20 legal-violation penalty and a Wildlife Protection Act citation fired on
# a fisherman sitting in his own home port.
#
# Each oversized ring has been scaled toward its own centroid by
# sqrt(published_area / drawn_area), which preserves the shape and lands within
# 0.1% of the published area. Gahirmatha (0.94x) and Mahatma Gandhi (0.99x)
# were already close and are untouched.
#
# The published areas used as targets are general reference figures, NOT read
# from a dataset in this repository:
#     Gahirmatha 1435, Gulf of Mannar 560, Malvan 29.1,
#     Gulf of Kutch 620.8, Mahatma Gandhi 281.5, Coringa 235.7   (km^2)
#
# Replacing this with real WDPA / Protected Planet geometry is the proper fix
# and is out of scope for the phase that shrank it.
GEOMETRY_PRECISION = "APPROXIMATE"
GEOMETRY_NOTE = (
    "Marine protected area boundaries are approximate: each is a simplified "
    "quadrilateral scaled to the sanctuary's published area, not gazetted "
    "survey geometry. Confirm boundaries against the notified sanctuary map "
    "before relying on them for a legal or navigational decision."
)

# Coordinates as (lon, lat) tuples for standard GeoJSON / Shapely
INDIAN_MARINE_PROTECTED_AREAS: List[Dict[str, Any]] = [
    {
        "id": "mpa_gahirmatha",
        "name": "Gahirmatha Marine Sanctuary",
        "state": "Odisha",
        "authority": "MoEFCC / Odisha Forest Dept",
        "designation": "Marine Wildlife Sanctuary (Olive Ridley Turtle Mass Nesting)",
        "restriction_level": "STRICT_NO_TAKE",
        "description": "World's largest rookery for Olive Ridley Sea Turtles. Mechanized fishing and trawling strictly prohibited within 20 km of shoreline from November to May.",
        "polygon_coords": [
            (86.75, 20.60),
            (87.15, 20.80),
            (87.25, 20.55),
            (86.95, 20.35),
            (86.75, 20.60)
        ],
        "center": (20.58, 87.02)
    },
    {
        "id": "mpa_gulf_of_mannar",
        "name": "Gulf of Mannar Marine National Park",
        "state": "Tamil Nadu",
        "authority": "MoEFCC / Tamil Nadu Forest Dept",
        "designation": "Biosphere Reserve & Marine National Park",
        "restriction_level": "RESTRICTED_CONSERVATION",
        "description": "Critical biodiversity hotspot with 21 islands, coral reefs, sea-cow (Dugong dugon), and seagrass beds. Commercial trawling and purse seining prohibited.",
        "polygon_coords": [
            (79.0163, 9.1051),
            (79.2842, 9.2539),
            (79.3438, 9.1348),
            (79.1056, 8.9562),
            (79.0163, 9.1051)
        ],
        "center": (9.12, 79.15)
    },
    {
        "id": "mpa_malvan",
        "name": "Malvan Marine Sanctuary",
        "state": "Maharashtra",
        "authority": "MoEFCC / Maharashtra Mangrove Cell",
        "designation": "Marine Sanctuary (Sindhudurg Coastal Ecosystem)",
        "restriction_level": "CONTROLLED_ZONING",
        "description": "Rich coral and pearl oyster banks surrounding Sindhudurg Fort. Trawling and anchoring in core reef zones banned.",
        "polygon_coords": [
            (73.4216, 16.0218),
            (73.4856, 16.0602),
            (73.4984, 16.0218),
            (73.4344, 15.9962),
            (73.4216, 16.0218)
        ],
        "center": (16.04, 73.46)
    },
    {
        "id": "mpa_kutch_jamnagar",
        "name": "Marine National Park & Sanctuary, Gulf of Kutch",
        "state": "Gujarat",
        "authority": "MoEFCC / Gujarat Forest Dept",
        "designation": "First Marine National Park of India",
        "restriction_level": "STRICT_NO_TAKE",
        "description": "Encompasses 42 islands with mangroves, live coral formations, sponges, and endangered marine turtles. Industrial vessel entry and destructive fishing banned.",
        "polygon_coords": [
            (69.4668, 22.4456),
            (69.8983, 22.6373),
            (69.9462, 22.4935),
            (69.5387, 22.3736),
            (69.4668, 22.4456)
        ],
        "center": (22.50, 69.70)
    },
    {
        "id": "mpa_mahatma_gandhi",
        "name": "Mahatma Gandhi Marine National Park (Wandoor)",
        "state": "Andaman and Nicobar Islands",
        "authority": "A&N Forest Dept / MoEFCC",
        "designation": "Marine National Park",
        "restriction_level": "STRICT_NO_TAKE",
        "description": "Protects pristine coral reefs and nesting grounds of leatherback, hawksbill, and green sea turtles. Commercial fishing prohibited.",
        "polygon_coords": [
            (92.50, 11.50),
            (92.65, 11.60),
            (92.68, 11.45),
            (92.52, 11.38),
            (92.50, 11.50)
        ],
        "center": (11.52, 92.58)
    },
    {
        "id": "mpa_coringa_mangroves",
        "name": "Coringa Wildlife Sanctuary & Marine Zone",
        "state": "Andhra Pradesh",
        "authority": "AP Forest Dept (Godavari Estuary)",
        "designation": "Estuarine & Marine Wildlife Sanctuary",
        "restriction_level": "RESTRICTED_CONSERVATION",
        "description": "Second largest mangrove formation in India, critical nursery for commercial marine fish and fishing cats. Mechanized fishing restricted in mouth of Hope Island.",
        "polygon_coords": [
            (82.2337, 16.8),
            (82.3798, 16.9096),
            (82.4163, 16.8),
            (82.2702, 16.6904),
            (82.2337, 16.8)
        ],
        "center": (16.82, 82.32)
    }
]

def check_point_in_mpa(lat: float, lon: float) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Checks whether given coordinate lies inside any recognized Indian Marine Protected Area."""
    for mpa in INDIAN_MARINE_PROTECTED_AREAS:
        if point_in_polygon_exact(lat, lon, mpa["polygon_coords"]):
            return True, mpa
    return False, None

def check_route_crosses_mpa(waypoints: List[Tuple[float, float]]) -> List[Dict[str, Any]]:
    """Checks if a vessel transit route intersects any MPA polygon."""
    intersected = []
    for mpa in INDIAN_MARINE_PROTECTED_AREAS:
        if line_intersects_polygon_exact(waypoints, mpa["polygon_coords"]):
            intersected.append(mpa)
    return intersected

def get_nearest_mpa(lat: float, lon: float) -> Tuple[Dict[str, Any], float]:
    """Finds nearest MPA and its distance in km."""
    best_mpa = INDIAN_MARINE_PROTECTED_AREAS[0]
    min_dist = float("inf")
    for mpa in INDIAN_MARINE_PROTECTED_AREAS:
        c_lat, c_lon = mpa["center"]
        d = haversine_distance(lat, lon, c_lat, c_lon)
        if d < min_dist:
            min_dist = d
            best_mpa = mpa
    return best_mpa, round(min_dist, 1)
