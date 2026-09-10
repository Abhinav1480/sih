"""Read clipped ISRO granules from disk and answer point queries from them.

The files are written by ``backend/scripts/subset_granules.py`` from real
MOSDAC downloads: INSAT-3DR Imager L3B daily SST and OLR, and EOS-06 OCM3 L2C
ocean-colour products. Variable names, units, fill values and acquisition
times are the granule's own. This module only selects a granule near the
requested time, samples the valid pixels around the requested point, and
reports exactly what it did: which file, how many pixels, how far the nearest
one was, and how many days the acquisition is from the requested time.

Every reading is ``CACHED``: real data, served from disk, never a live
retrieval. It is never ``LIVE`` and never ``DEMO``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import h5py
import numpy as np

from app.geospatial.calculations import haversine_distance
from app.models.schemas import DataFreshness, SatelliteReading
from app.providers.base import ProviderUnavailable

# Product key -> (dataset name inside the file, ORCA variable name, unit the
# reading is reported in, sampling radius in km). Radii follow the products'
# native resolution: L3B pixels are a few km, OCM pixels are 360 m.
PRODUCTS: Dict[str, Tuple[str, str, str, float]] = {
    "insat3dr_l3b_sst_daily": ("SST_DLY", "sea_surface_temperature", "degC", 12.0),
    "insat3dr_l3b_olr_daily": ("OLR_DLY", "outgoing_longwave_radiation", "W.m-2", 12.0),
    "eos06_ocm3_l2c_oc": ("CHL", "chlorophyll_a", "mg/m3", 3.0),
}

MAX_DAYS_FROM_REQUEST = 3


@dataclass(frozen=True)
class _Grid:
    lat: np.ndarray      # 2-D, same shape as data
    lon: np.ndarray
    data: np.ndarray     # 2-D float64 with NaN where the granule had fill
    unit: str
    long_name: str


@lru_cache(maxsize=64)
def _load(path: str, dataset: str) -> _Grid:
    with h5py.File(path, "r") as f:
        var = f[dataset]
        data = var[()].astype("float64")
        fill = var.attrs.get("_FillValue")
        if fill is not None:
            data[data == float(np.asarray(fill).ravel()[0])] = np.nan
        lat = f["latitude"][()].astype("float64")
        lon = f["longitude"][()].astype("float64")
        if lat.ndim == 1:
            lon, lat = np.meshgrid(lon, lat)
        unit = var.attrs.get("units", b"")
        long_name = var.attrs.get("long_name", b"")
        unit = unit.decode() if isinstance(unit, bytes) else str(unit)
        long_name = long_name.decode() if isinstance(long_name, bytes) else str(long_name)
    return _Grid(lat=lat, lon=lon, data=data, unit=unit, long_name=long_name)


class ISROFixtureStore:
    """Index of clipped granules plus point sampling."""

    def __init__(self, root: Path):
        self.root = Path(root)

    @property
    def index_path(self) -> Path:
        return self.root / "index.json"

    def load_index(self) -> Dict:
        try:
            return json.loads(self.index_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

    def products(self) -> List[str]:
        return sorted(k for k, v in self.load_index().get("products", {}).items() if v)

    def is_populated(self) -> bool:
        return bool(self.products())

    def bbox(self) -> Optional[Tuple[float, float, float, float]]:
        box = self.load_index().get("bbox_lat_min_lat_max_lon_min_lon_max")
        return tuple(box) if box else None

    def covers(self, lat: float, lon: float) -> bool:
        box = self.bbox()
        if not box:
            return False
        lat0, lat1, lon0, lon1 = box
        return lat0 <= lat <= lat1 and lon0 <= lon <= lon1

    # ------------------------------------------------------------------

    def read(self, product: str, lat: float, lon: float, when: datetime) -> SatelliteReading:
        """Sample `product` at (lat, lon) from the granule nearest to `when`.

        Raises ProviderUnavailable, with the reason, when the point is outside
        the clipped box, no granule lies within MAX_DAYS_FROM_REQUEST, or every
        candidate granule is cloud-masked around the point.
        """
        if product not in PRODUCTS:
            raise ProviderUnavailable(f"no reader for product {product!r}")
        dataset, variable, unit, radius_km = PRODUCTS[product]

        if not self.covers(lat, lon):
            raise ProviderUnavailable(
                f"({lat:.3f}N, {lon:.3f}E) is outside the clipped granule box {self.bbox()}; "
                f"run subset_granules.py with a box that covers it"
            )

        entries = self.load_index().get("products", {}).get(product, [])
        if not entries:
            raise ProviderUnavailable(f"no clipped granules for {product}")

        when_utc = when.astimezone(timezone.utc) if when.tzinfo else when.replace(tzinfo=timezone.utc)
        ranked = sorted(entries, key=lambda e: abs(self._acquired(e) - when_utc))
        nearest_days = abs(self._acquired(ranked[0]) - when_utc).total_seconds() / 86400.0
        if nearest_days > MAX_DAYS_FROM_REQUEST:
            raise ProviderUnavailable(
                f"nearest {product} granule ({ranked[0]['acquisition_start'][:10]}) is "
                f"{nearest_days:.1f} days from the requested time {when_utc.date()}; "
                f"limit is {MAX_DAYS_FROM_REQUEST} days"
            )

        cloud_masked: List[str] = []
        for entry in ranked:
            acquired = self._acquired(entry)
            if abs(acquired - when_utc).total_seconds() / 86400.0 > MAX_DAYS_FROM_REQUEST:
                break
            grid = _load(str(self.root / entry["file"]), dataset)
            sample = self._sample(grid, lat, lon, radius_km)
            if sample is None:
                cloud_masked.append(entry["source_file"])
                continue
            value, pixels, nearest_km = sample
            if unit == "degC" and grid.unit == "K":
                value = value - 273.15
            days_off = (acquired - when_utc).total_seconds() / 86400.0
            source = (
                f"ISRO MOSDAC {entry['satellite']} {entry['sensor']} "
                f"{entry['processing_level']} {dataset}"
            )
            return SatelliteReading(
                variable=variable,
                value=round(float(value), 3),
                unit=unit,
                source=source,
                status=DataFreshness.CACHED,
                timestamp=acquired,
                granule=entry["source_file"],
                satellite=entry["satellite"],
                sensor=entry["sensor"],
                processing_level=entry["processing_level"],
                pixels_used=pixels,
                nearest_pixel_km=round(nearest_km, 2),
                days_from_request=round(days_off, 2),
                note=(
                    f"{grid.long_name} from {entry['source_file']}, acquired "
                    f"{acquired.isoformat(timespec='minutes')}, median of {pixels} valid pixel(s) "
                    f"within {radius_km:g} km (nearest {nearest_km:.1f} km). Served from a clipped "
                    f"granule cached on disk, not a live retrieval."
                ),
            )

        raise ProviderUnavailable(
            f"{product}: no valid pixel within {radius_km:g} km of ({lat:.3f}N, {lon:.3f}E) in any "
            f"granule within {MAX_DAYS_FROM_REQUEST} days of {when_utc.date()} "
            f"(cloud-masked in {', '.join(cloud_masked)})"
        )

    # ------------------------------------------------------------------

    @staticmethod
    def _acquired(entry: Dict) -> datetime:
        acquired = datetime.fromisoformat(entry["acquisition_start"])
        return acquired if acquired.tzinfo else acquired.replace(tzinfo=timezone.utc)

    @staticmethod
    def _sample(grid: _Grid, lat: float, lon: float, radius_km: float) -> Optional[Tuple[float, int, float]]:
        # Coarse degree box first, then exact great-circle distance.
        deg = radius_km / 100.0
        near = (np.abs(grid.lat - lat) <= deg) & (np.abs(grid.lon - lon) <= deg) & np.isfinite(grid.data)
        if not near.any():
            return None
        idx = np.argwhere(near)
        dists = np.array([haversine_distance(lat, lon, grid.lat[i, j], grid.lon[i, j]) for i, j in idx])
        inside = dists <= radius_km
        if not inside.any():
            return None
        values = grid.data[near][inside]
        return float(np.median(values)), int(inside.sum()), float(dists[inside].min())
