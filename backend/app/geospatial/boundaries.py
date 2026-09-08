import re
from typing import Optional, Dict, Any, List, Tuple
from app.models.schemas import LocationContext
from app.geospatial.calculations import haversine_distance

INDIAN_COASTAL_NODES: Dict[str, Dict[str, Any]] = {
    "visakhapatnam": {
        "aliases": ["visakhapatnam", "vizag", "waltair", "visakha", "vizag port"],
        "name": "Visakhapatnam",
        "latitude": 17.6868,
        "longitude": 83.2185,
        "state": "Andhra Pradesh",
        "nearest_port": "Visakhapatnam Major Port",
        "maritime_zone": "Central Bay of Bengal",
    },
    "kakinada": {
        "aliases": ["kakinada", "cocanada", "coringa", "hope island", "kakinada port"],
        "name": "Kakinada",
        "latitude": 16.9891,
        "longitude": 82.2475,
        "state": "Andhra Pradesh",
        "nearest_port": "Kakinada Deep Water Port",
        "maritime_zone": "Central Bay of Bengal (Godavari Coast)",
    },
    "chennai": {
        "aliases": ["chennai", "madras", "ennore", "royapuram", "chennai port"],
        "name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "state": "Tamil Nadu",
        "nearest_port": "Chennai Port Trust",
        "maritime_zone": "South Bay of Bengal (Coromandel Coast)",
    },
    "paradeep": {
        "aliases": ["paradeep", "paradip", "jagatsinghpur", "paradip port"],
        "name": "Paradip",
        "latitude": 20.2644,
        "longitude": 86.6667,
        "state": "Odisha",
        "nearest_port": "Paradip Port Authority",
        "maritime_zone": "North-West Bay of Bengal",
    },
    "mumbai": {
        "aliases": ["mumbai", "bombay", "jnpt", "nhava sheva", "sasoon dock", "mumbai port"],
        "name": "Mumbai",
        "latitude": 18.9438,
        "longitude": 72.8354,
        "state": "Maharashtra",
        "nearest_port": "Mumbai Port & JNPT",
        "maritime_zone": "North-East Arabian Sea (Konkan Coast)",
    },
    "kochi": {
        "aliases": ["kochi", "cochin", "ernakulam", "mattancherry", "cochin port"],
        "name": "Kochi",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "state": "Kerala",
        "nearest_port": "Cochin Port",
        "maritime_zone": "South-East Arabian Sea (Malabar Coast)",
    },
    "mangalore": {
        "aliases": ["mangalore", "mangaluru", "new mangalore", "panambur"],
        "name": "Mangalore",
        "latitude": 12.9141,
        "longitude": 74.8560,
        "state": "Karnataka",
        "nearest_port": "New Mangalore Port",
        "maritime_zone": "East Arabian Sea (Canara Coast)",
    },
    "tuticorin": {
        "aliases": ["tuticorin", "thoothukudi", "thoothukudi port", "v.o. chidambaranar"],
        "name": "Thoothukudi (Tuticorin)",
        "latitude": 8.7642,
        "longitude": 78.1348,
        "state": "Tamil Nadu",
        "nearest_port": "V.O. Chidambaranar Port",
        "maritime_zone": "Gulf of Mannar",
    },
    "porbandar": {
        "aliases": ["porbandar", "porbandar port", "saurashtra coast"],
        "name": "Porbandar",
        "latitude": 21.6417,
        "longitude": 69.6293,
        "state": "Gujarat",
        "nearest_port": "Porbandar Port",
        "maritime_zone": "Northern Arabian Sea (Kathiawar Coast)",
    },
    "port_blair": {
        "aliases": ["port blair", "andaman", "south andaman", "havelock", "neil island"],
        "name": "Port Blair",
        "latitude": 11.6234,
        "longitude": 92.7265,
        "state": "Andaman and Nicobar Islands",
        "nearest_port": "Port Blair Haddo Wharf",
        "maritime_zone": "Andaman Sea",
    },
    "machilipatnam": {
        "aliases": ["machilipatnam", "bandar", "krishna district coast"],
        "name": "Machilipatnam",
        "latitude": 16.1875,
        "longitude": 81.1389,
        "state": "Andhra Pradesh",
        "nearest_port": "Machilipatnam Port",
        "maritime_zone": "Krishna-Godavari Basin",
    },
    "goa": {
        "aliases": ["goa", "mormugao", "panaji", "vasco da gama"],
        "name": "Goa (Mormugao)",
        "latitude": 15.4056,
        "longitude": 73.8014,
        "state": "Goa",
        "nearest_port": "Mormugao Port",
        "maritime_zone": "Central Arabian Sea",
    },
    "digha": {
        "aliases": ["digha", "sankarpur", "petuaghat", "purba medinipur"],
        "name": "Digha Coast",
        "latitude": 21.6266,
        "longitude": 87.5074,
        "state": "West Bengal",
        "nearest_port": "Petuaghat Fishery Harbour",
        "maritime_zone": "Northern Bay of Bengal",
    },
    "rameswaram": {
        "aliases": ["rameswaram", "pamban", "dhanushkodi"],
        "name": "Rameswaram",
        "latitude": 9.2876,
        "longitude": 79.3129,
        "state": "Tamil Nadu",
        "nearest_port": "Pamban Fishing Harbour",
        "maritime_zone": "Palk Bay & Gulf of Mannar",
    }
}

def resolve_location(query_text: str, default_fallback: Optional[LocationContext] = None) -> LocationContext:
    """Dynamically extracts location from query text using coordinate regex, alias lookup, or fallback."""
    clean_text = query_text.lower()

    # 1. Check for explicit coordinates e.g. "17.68, 83.21" or "lat 17.68 lon 83.21"
    coord_match = re.search(r"(-?\d{1,2}\.\d{2,6})[,\s]+(-?\d{1,3}\.\d{2,6})", query_text)
    if coord_match:
        try:
            val1 = float(coord_match.group(1))
            val2 = float(coord_match.group(2))
            # Determine lat vs lon (India is lat ~6-37, lon ~68-98)
            if 6.0 <= val1 <= 38.0 and 65.0 <= val2 <= 100.0:
                lat, lon = val1, val2
            elif 6.0 <= val2 <= 38.0 and 65.0 <= val1 <= 100.0:
                lat, lon = val2, val1
            else:
                lat, lon = val1, val2

            # Find nearest known coastal node
            nearest_name = "Offshore Coordinate"
            nearest_dist = float("inf")
            for node in INDIAN_COASTAL_NODES.values():
                d = haversine_distance(lat, lon, node["latitude"], node["longitude"])
                if d < nearest_dist:
                    nearest_dist = d
                    nearest_name = node["nearest_port"]

            return LocationContext(
                name=f"Coord ({lat:.4f}°N, {lon:.4f}°E)",
                latitude=lat,
                longitude=lon,
                radius_km=40.0,
                nearest_port=f"{nearest_name} ({nearest_dist:.1f} km)",
                state="Indian Maritime Zone",
                maritime_zone="Offshore Waters"
            )
        except Exception:
            pass

    # 2. Match known coastal nodes and aliases
    for key, node in INDIAN_COASTAL_NODES.items():
        for alias in node["aliases"]:
            # word boundary matching
            pattern = rf"\b{re.escape(alias)}\b"
            if re.search(pattern, clean_text):
                return LocationContext(
                    name=node["name"],
                    latitude=node["latitude"],
                    longitude=node["longitude"],
                    radius_km=40.0,
                    nearest_port=node["nearest_port"],
                    state=node["state"],
                    maritime_zone=node["maritime_zone"]
                )

    # 3. Fallback
    if default_fallback:
        return default_fallback

    # Default to Visakhapatnam (Prime INCOIS observation hub)
    default_node = INDIAN_COASTAL_NODES["visakhapatnam"]
    return LocationContext(
        name=default_node["name"],
        latitude=default_node["latitude"],
        longitude=default_node["longitude"],
        radius_km=40.0,
        nearest_port=default_node["nearest_port"],
        state=default_node["state"],
        maritime_zone=default_node["maritime_zone"]
    )

def find_nearest_harbor(lat: float, lon: float) -> Tuple[str, float]:
    """Finds nearest coastal harbor and distance in km."""
    best_port = "Unknown Port"
    min_dist = float("inf")
    for node in INDIAN_COASTAL_NODES.values():
        d = haversine_distance(lat, lon, node["latitude"], node["longitude"])
        if d < min_dist:
            min_dist = d
            best_port = node["nearest_port"]
    return best_port, round(min_dist, 1)
