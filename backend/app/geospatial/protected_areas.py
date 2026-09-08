from typing import List, Dict, Any, Optional, Tuple
from app.geospatial.calculations import point_in_polygon_exact, line_intersects_polygon_exact, haversine_distance

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
            (78.90, 9.10),
            (79.35, 9.35),
            (79.45, 9.15),
            (79.05, 8.85),
            (78.90, 9.10)
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
            (73.40, 16.02),
            (73.50, 16.08),
            (73.52, 16.02),
            (73.42, 15.98),
            (73.40, 16.02)
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
            (69.20, 22.40),
            (70.10, 22.80),
            (70.20, 22.50),
            (69.35, 22.25),
            (69.20, 22.40)
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
            (82.20, 16.80),
            (82.40, 16.95),
            (82.45, 16.80),
            (82.25, 16.65),
            (82.20, 16.80)
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
