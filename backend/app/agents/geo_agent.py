import time
from typing import Dict, Any
from app.agents.base import BaseSpecialistAgent
from app.geospatial.protected_areas import check_point_in_mpa, get_nearest_mpa
from app.geospatial.boundaries import find_nearest_harbor

class GeospatialAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="Geospatial & Geofencing Agent", role="GIS boundaries, MPAs, EEZ, and spatial distance specialist")

    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        loc = context["location"]

        is_mpa, mpa_info = check_point_in_mpa(loc.latitude, loc.longitude)
        nearest_mpa, mpa_dist = get_nearest_mpa(loc.latitude, loc.longitude)
        nearest_port, port_dist = find_nearest_harbor(loc.latitude, loc.longitude)

        duration_ms = int((time.time() - start) * 1000)
        step = self.record_step(
            action=f"Executed spatial boundary audit for {loc.name}",
            tool="check_restricted_zone",
            duration_ms=duration_ms,
            details=f"Inside MPA: {is_mpa} ({mpa_info['name'] if is_mpa else 'None'}). Nearest Harbor: {nearest_port} ({port_dist} km). Nearest Sanctuary: {nearest_mpa['name']} ({mpa_dist} km)"
        )

        return {
            "is_inside_mpa": is_mpa,
            "mpa_info": mpa_info,
            "nearest_mpa": nearest_mpa,
            "nearest_mpa_distance_km": mpa_dist,
            "nearest_harbor": nearest_port,
            "nearest_harbor_distance_km": port_dist,
            "step_log": step
        }

# Alias for compatibility
GeoAgent = GeospatialAgent
