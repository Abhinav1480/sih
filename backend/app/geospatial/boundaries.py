import re
from typing import Optional, Dict, Any, List, Tuple
from app.models.schemas import LocationContext
from app.geospatial.calculations import haversine_distance

INDIAN_COASTAL_NODES: Dict[str, Dict[str, Any]] = {
    "visakhapatnam": {
        "aliases": ["visakhapatnam", "vizag", "waltair", "visakha", "vizag port", "విశాఖపట్నం", "विशाखापत्तनम", "விசாகப்பட்டினம்"],
        "name": "Visakhapatnam",
        "latitude": 17.6868,
        "longitude": 83.2185,
        "state": "Andhra Pradesh",
        "nearest_port": "Visakhapatnam Major Port",
        "maritime_zone": "Central Bay of Bengal",
    },
    "kakinada": {
        "aliases": ["kakinada", "cocanada", "coringa", "hope island", "kakinada port", "కాకినాడ", "काकीनाडा", "காக்கிநாடா"],
        "name": "Kakinada",
        "latitude": 16.9891,
        "longitude": 82.2475,
        "state": "Andhra Pradesh",
        "nearest_port": "Kakinada Deep Water Port",
        "maritime_zone": "Central Bay of Bengal (Godavari Coast)",
    },
    "chennai": {
        "aliases": ["chennai", "madras", "ennore", "royapuram", "chennai port", "చెన్నై", "चेन्नई", "சென்னை"],
        "name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "state": "Tamil Nadu",
        "nearest_port": "Chennai Port Trust",
        "maritime_zone": "South Bay of Bengal (Coromandel Coast)",
    },
    "paradeep": {
        "aliases": ["paradeep", "paradip", "jagatsinghpur", "paradip port", "odisha", "orissa", "gahirmatha", "पारदीप", "पारादीप", "ओडिशा", "ఒడిశా", "பாரதீப்", "ஒடிசா"],
        "name": "Paradip",
        "latitude": 20.2644,
        "longitude": 86.6667,
        "state": "Odisha",
        "nearest_port": "Paradip Port Authority",
        "maritime_zone": "North-West Bay of Bengal",
    },
    "mumbai": {
        "aliases": ["mumbai", "bombay", "jnpt", "nhava sheva", "sasoon dock", "mumbai port", "ముంబై", "मुंबई", "மும்பை"],
        "name": "Mumbai",
        "latitude": 18.9438,
        "longitude": 72.8354,
        "state": "Maharashtra",
        "nearest_port": "Mumbai Port & JNPT",
        "maritime_zone": "North-East Arabian Sea (Konkan Coast)",
    },
    "kochi": {
        "aliases": ["kochi", "cochin", "ernakulam", "mattancherry", "cochin port", "కొచ్చి", "कोच्चि", "கொச்சி", "കൊച്ചി"],
        "name": "Kochi",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "state": "Kerala",
        "nearest_port": "Cochin Port",
        "maritime_zone": "South-East Arabian Sea (Malabar Coast)",
    },
    "mangalore": {
        "aliases": ["mangalore", "mangaluru", "new mangalore", "panambur", "మంగళూరు", "मंगलुरु", "மங்களூரு"],
        "name": "Mangalore",
        "latitude": 12.9141,
        "longitude": 74.8560,
        "state": "Karnataka",
        "nearest_port": "New Mangalore Port",
        "maritime_zone": "East Arabian Sea (Canara Coast)",
    },
    "tuticorin": {
        "aliases": ["tuticorin", "thoothukudi", "thoothukudi port", "v.o. chidambaranar", "தூத்துக்குடி", "तूத்துக்குடி", "తూత్తుకుడి"],
        "name": "Thoothukudi (Tuticorin)",
        "latitude": 8.7642,
        "longitude": 78.1348,
        "state": "Tamil Nadu",
        "nearest_port": "V.O. Chidambaranar Port",
        "maritime_zone": "Gulf of Mannar",
    },
    "porbandar": {
        "aliases": ["porbandar", "porbandar port", "saurashtra coast", "पोरबंदर", "போர்பந்தர்", "పోర్‌బందర్", "પોરબંદર"],
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
        "aliases": ["machilipatnam", "bandar", "krishna district coast", "మచిలీపట్నం", "मछलीपट्टनम"],
        "name": "Machilipatnam",
        "latitude": 16.1875,
        "longitude": 81.1389,
        "state": "Andhra Pradesh",
        "nearest_port": "Machilipatnam Port",
        "maritime_zone": "Krishna-Godavari Basin",
    },
    "goa": {
        "aliases": ["goa", "mormugao", "panaji", "vasco da gama", "गोवा"],
        "name": "Goa (Mormugao)",
        "latitude": 15.4056,
        "longitude": 73.8014,
        "state": "Goa",
        "nearest_port": "Mormugao Port",
        "maritime_zone": "Central Arabian Sea",
    },
    "digha": {
        "aliases": ["digha", "sankarpur", "petuaghat", "purba medinipur", "दीघा"],
        "name": "Digha Coast",
        "latitude": 21.6266,
        "longitude": 87.5074,
        "state": "West Bengal",
        "nearest_port": "Petuaghat Fishery Harbour",
        "maritime_zone": "Northern Bay of Bengal",
    },
    "gopalpur": {
        "aliases": ["gopalpur", "gopalpur port", "ganjam coast", "berhampur coast", "గోపాల్‌పూర్", "गोपालपुर"],
        "name": "Gopalpur",
        "latitude": 19.3144,
        "longitude": 84.9655,
        "state": "Odisha",
        "nearest_port": "Gopalpur Port",
        "maritime_zone": "Central Odisha Bay of Bengal",
    },
    "puducherry": {
        "aliases": ["puducherry", "pondicherry", "pondy", "karaikal", "புதுச்சேரி", "పుదుచ్చేరి", "पुदुचेरी"],
        "name": "Puducherry",
        "latitude": 11.9416,
        "longitude": 79.8083,
        "state": "Puducherry",
        "nearest_port": "Puducherry Port",
        "maritime_zone": "Coromandel Coast",
    },
    "veraval": {
        "aliases": ["veraval", "veraval port", "somnath coast", "gir somnath", "वेरावल", "વેરાવળ"],
        "name": "Veraval",
        "latitude": 20.9077,
        "longitude": 70.3678,
        "state": "Gujarat",
        "nearest_port": "Veraval Fishing Port",
        "maritime_zone": "Saurashtra Coast (Arabian Sea)",
    },
    "haldia": {
        "aliases": ["haldia", "haldia port", "diamond harbour", "sundarbans", "హల్దియా", "हल्दिया", "হলদিয়া"],
        "name": "Haldia",
        "latitude": 22.0667,
        "longitude": 88.0667,
        "state": "West Bengal",
        "nearest_port": "Haldia Dock Complex",
        "maritime_zone": "Hooghly River Estuary & Sundarbans",
    },
    "bhavnagar": {
        "aliases": ["bhavnagar", "alang", "gulf of khambhat", "ભાવનગર", "भावनगर"],
        "name": "Bhavnagar",
        "latitude": 21.7645,
        "longitude": 72.1519,
        "state": "Gujarat",
        "nearest_port": "Bhavnagar Port",
        "maritime_zone": "Gulf of Khambhat",
    },
    "ratnagiri": {
        "aliases": ["ratnagiri", "mirya bay", "jaigad", "रत्नागिरी"],
        "name": "Ratnagiri",
        "latitude": 16.9902,
        "longitude": 73.3120,
        "state": "Maharashtra",
        "nearest_port": "Ratnagiri Mirya Bay Port",
        "maritime_zone": "Konkan Coast",
    },
    "malvan": {
        "aliases": ["malvan", "tarkarli", "sindhudurg", "malvan marine sanctuary", "मालवण"],
        "name": "Malvan",
        "latitude": 16.0558,
        "longitude": 73.4688,
        "state": "Maharashtra",
        "nearest_port": "Malvan Fishing Harbour",
        "maritime_zone": "South Konkan Coast",
    },
    "nagapattinam": {
        "aliases": ["nagapattinam", "velankanni", "nagore", "காரைக்கால்", "நாகப்பட்டினம்"],
        "name": "Nagapattinam",
        "latitude": 10.7672,
        "longitude": 79.8428,
        "state": "Tamil Nadu",
        "nearest_port": "Nagapattinam Port",
        "maritime_zone": "Palk Strait Approach",
    },
    "beypore": {
        "aliases": ["beypore", "calicut port", "kozhikode", "ബേപ്പൂർ"],
        "name": "Beypore (Kozhikode)",
        "latitude": 11.1611,
        "longitude": 75.8058,
        "state": "Kerala",
        "nearest_port": "Beypore Port",
        "maritime_zone": "North Malabar Coast",
    },
    "rameswaram": {
        "aliases": ["rameswaram", "pamban", "dhanushkodi", "gulf of mannar", "रामेश्वरम", "రామేశ్వరం", "ராமேஸ்வரம்"],
        "name": "Rameswaram",
        "latitude": 9.2876,
        "longitude": 79.3129,
        "state": "Tamil Nadu",
        "nearest_port": "Pamban Fishing Harbour",
        "maritime_zone": "Palk Bay & Gulf of Mannar",
    }
}

def location_from_coordinates(lat: float, lon: float, label: str = "Coord") -> LocationContext:
    """A LocationContext for a raw coordinate, named after the nearest known harbour.

    Used for coordinates typed into the query and for the device position sent
    as `user_location`. It never invents a place name; the coordinate is the name.
    """
    nearest_name, nearest_dist = find_nearest_harbor(lat, lon)
    return LocationContext(
        name=f"{label} ({lat:.4f}\u00b0N, {lon:.4f}\u00b0E)",
        latitude=lat,
        longitude=lon,
        radius_km=40.0,
        nearest_port=f"{nearest_name} ({nearest_dist:.1f} km)",
        state="Indian Maritime Zone",
        maritime_zone="Offshore Waters",
    )

def resolve_location(query_text: str, default_fallback: Optional[LocationContext] = None) -> Optional[LocationContext]:
    """Dynamically extracts location from query text using coordinate regex, alias lookup, or fallback."""
    clean_text = query_text.lower()

    # 1. Check for explicit coordinates e.g. "17.68, 83.21" or "16.98 N, 82.25 E"
    coord_match = re.search(
        r"(-?\d{1,2}(?:\.\d+)?)\s*[°º]?\s*([NSns])?[,\s]+(-?\d{1,3}(?:\.\d+)?)\s*[°º]?\s*([EWew])?",
        query_text
    )
    if coord_match:
        try:
            val1 = float(coord_match.group(1))
            dir1 = (coord_match.group(2) or "").upper()
            val2 = float(coord_match.group(3))
            dir2 = (coord_match.group(4) or "").upper()

            if dir1 == "S":
                val1 = -val1
            if dir2 == "W":
                val2 = -val2

            # Determine lat vs lon (India is lat ~6-38, lon ~65-100)
            if 6.0 <= val1 <= 38.0 and 65.0 <= val2 <= 100.0:
                lat, lon = val1, val2
            elif 6.0 <= val2 <= 38.0 and 65.0 <= val1 <= 100.0:
                lat, lon = val2, val1
            else:
                lat, lon = val1, val2

            return location_from_coordinates(lat, lon)
        except Exception:
            pass

    # 2. Match known coastal nodes and aliases (handling ASCII word boundary and Unicode substring)
    for key, node in INDIAN_COASTAL_NODES.items():
        for alias in node["aliases"]:
            has_unicode = any(ord(c) > 127 for c in alias)
            if has_unicode:
                if alias in clean_text:
                    return LocationContext(
                        name=node["name"],
                        latitude=node["latitude"],
                        longitude=node["longitude"],
                        radius_km=40.0,
                        nearest_port=node["nearest_port"],
                        state=node["state"],
                        maritime_zone=node["maritime_zone"]
                    )
            else:
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

    return None

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


def nearest_other_harbor(
    lat: float, lon: float, exclude_name: Optional[str] = None, min_km: float = 25.0
) -> Optional[LocationContext]:
    """The nearest coastal node that is not where the vessel already is.

    Used to infer a destination for a route query that names none. A vessel
    leaves from where it is, and the nearest other harbour is the shortest real
    passage available to it -- not a guess about intent, but a stated default
    the caller must disclose and the user can override by naming a port.

    `min_km` keeps the origin itself, and any node sharing its harbour, out of
    the answer. Returns None when nothing qualifies rather than inventing one.
    """
    best: Optional[Dict[str, Any]] = None
    best_dist = float("inf")
    for node in INDIAN_COASTAL_NODES.values():
        if exclude_name and node["name"].lower() == exclude_name.lower():
            continue
        d = haversine_distance(lat, lon, node["latitude"], node["longitude"])
        if d < min_km or d >= best_dist:
            continue
        best, best_dist = node, d
    if best is None:
        return None
    return LocationContext(
        name=best["name"],
        latitude=best["latitude"],
        longitude=best["longitude"],
        nearest_port=best.get("nearest_port"),
        state=best.get("state"),
        maritime_zone=best.get("maritime_zone"),
    )
