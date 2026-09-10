"""The frontend's bundled MPA geometry must match the backend's.

frontend/src/lib/geofence/boundaries.ts ships a copy of the six MPA polygons
so the geofence works with no network. A copy drifts. This one already had:
it was written before P0-3 and kept the four oversized rings that fix scaled
down -- Gulf of Kutch 4.35x its published area, Gulf of Mannar 2.82x, Malvan
2.44x, Coringa 1.87x -- so the browser reproduced exactly the defect P0-3
removed from the backend, flagging a fisherman in his own home port as inside
a protected area.

Parsing TypeScript with a regex is crude. The alternative is generating the
file at build time, which is a bigger change than Phase 1 allows; this at
least makes the divergence fail loudly instead of shipping.
"""

import json
import re
from pathlib import Path

import pytest

from app.geospatial.protected_areas import INDIAN_MARINE_PROTECTED_AREAS

BOUNDARIES_TS = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "lib"
    / "geofence"
    / "boundaries.ts"
)

# id: "mpa_x", ... coordinates: [[ ... ]],
_FEATURE = re.compile(
    r'id:\s*"(?P<id>mpa_[a-z_]+)".*?coordinates:\s*\[(?P<ring>\[.*?\])\],',
    re.DOTALL,
)


def _frontend_rings() -> dict[str, list[list[float]]]:
    source = BOUNDARIES_TS.read_text(encoding="utf-8")
    found = {}
    for m in _FEATURE.finditer(source):
        found[m.group("id")] = json.loads(m.group("ring"))
    return found


def _closed(coords) -> list[list[float]]:
    ring = [[float(lon), float(lat)] for lon, lat in coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


@pytest.fixture(scope="module")
def frontend_rings():
    if not BOUNDARIES_TS.exists():
        pytest.skip(f"{BOUNDARIES_TS} not present")
    return _frontend_rings()


def test_every_backend_mpa_is_present_in_the_bundle(frontend_rings):
    backend_ids = {a["id"] for a in INDIAN_MARINE_PROTECTED_AREAS}
    missing = backend_ids - set(frontend_rings)
    assert not missing, (
        f"the frontend geofence bundle is missing {sorted(missing)}; a zone the "
        "backend enforces would not be flagged offline"
    )


@pytest.mark.parametrize("area", INDIAN_MARINE_PROTECTED_AREAS, ids=lambda a: a["id"])
def test_bundled_polygon_matches_the_backend(area, frontend_rings):
    """The regression. A frontend ring that outgrew the backend's flags ports
    and anchorages as protected water."""
    mid = area["id"]
    assert mid in frontend_rings, f"{mid} absent from the frontend bundle"

    expected = _closed(area["polygon_coords"])
    actual = frontend_rings[mid]

    assert actual == expected, (
        f"{mid}: frontend geometry has drifted from "
        f"backend/app/geospatial/protected_areas.py.\n"
        f"  backend:  {expected}\n"
        f"  frontend: {actual}\n"
        "Resync the bundle. A larger frontend ring puts harbours inside an MPA."
    )
