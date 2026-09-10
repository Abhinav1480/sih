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
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import h5py
import numpy as np

from app.geospatial.calculations import haversine_distance
from app.models.schemas import (
    DataFreshness,
    FieldProvenance,
    OceanObservation,
    ProviderTier,
    SatelliteReading,
    WeatherObservation,
)
from app.providers.base import (
    BaseOceanProvider,
    BaseWeatherProvider,
    ProviderCapability,
    ProviderUnavailable,
    TieredProvider,
)
from app.utils import clock

@dataclass(frozen=True)
class _Product:
    """How one clipped product is read, and how far a reading may reach.

    `radius_km` is a search radius, not a resampling kernel: the value returned
    is the median of the valid pixels inside it and every reading reports how
    far the nearest one actually was. The radii are set by where the data is,
    which for a coastal query point is offshore -- Kakinada sits 15.1 km from
    the nearest valid INSAT SST pixel, because the pixels in between are land.
    A radius under that returns nothing at all rather than something distant,
    which is a worse answer, not a more honest one.

    `max_age_days` is the product's own validity, not one global number. A
    daily binned scene goes stale in days; an 8-day composite is a slowly
    varying signal whose window is its answer.
    """

    dataset: str
    variable: str
    unit: str
    radius_km: float
    max_age_days: float


PRODUCTS: Dict[str, _Product] = {
    "insat3dr_l3b_sst_daily": _Product("SST_DLY", "sea_surface_temperature", "degC", 25.0, 3.0),
    "insat3dr_l3b_olr_daily": _Product("OLR_DLY", "outgoing_longwave_radiation", "W.m-2", 25.0, 3.0),
    "eos06_ocm3_l2c_oc": _Product("CHL", "chlorophyll_a", "mg/m3", 10.0, 3.0),
    "eos06_ocm3_l2c_ga": _Product("CDOM", "cdom_absorption", "1/m", 10.0, 3.0),
    "eos06_ocm3_l3c_flh_8day": _Product(
        "FLH", "fluorescence_line_height", "W m^-2 sr^-1 Mu(m)^-1", 25.0, 8.0
    ),
}

# SARAL is along-track nadir altimetry, not a grid, so it is read by a separate
# path rather than sampled from a raster.
SARAL_PRODUCT = "saral_altika_igdr_swh"

MAX_DAYS_FROM_REQUEST = 3

# How far the nearest usable altimeter point may be from the query position
# before the reading is refused outright.
#
# A nadir altimeter's ground tracks are ~300 km apart at this latitude, so the
# nearest pass to Kakinada in the granules held is 320 km away. That is beyond
# the spatial decorrelation scale of a wave field, so the value is not a
# measurement *at* the query point and is never presented as one: every reading
# carries its real distance, and the note says which pass it came from and how
# far away. Past this limit even a labelled value stops being informative.
MAX_TRACK_DISTANCE_KM = 400.0

# The SARAL quality filter, applied at read time and not negotiable.
#
# Unfiltered `swh` in the committed granules reaches 29.66 m, which is a
# retrieval artefact rather than a sea state. `surface_type == 0` removes land
# crossings and `qual_alt_1hz_swh` removes nothing further -- that flag does not
# discriminate in this set. `swh_rms` is what does. These three together keep
# 809 of 877 ocean points and bring the maximum to 6.80 m, p99 5.32 m, median
# 1.75 m, which is a September Bay of Bengal sea state.
#
# Without this a 29 m wave height reaches calculate_marine_risk and produces a
# SEVERE verdict out of instrument noise.
SARAL_SURFACE_TYPE_OCEAN = 0
SARAL_MIN_NUMVAL = 20
SARAL_MAX_RMS_M = 2.0
SARAL_QUALITY_FILTER = (
    f"surface_type == {SARAL_SURFACE_TYPE_OCEAN} AND "
    f"swh_numval >= {SARAL_MIN_NUMVAL} AND swh_rms < {SARAL_MAX_RMS_M}"
)


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


@dataclass(frozen=True)
class _Track:
    """One SARAL pass: 1 Hz along-track records, unfiltered."""

    lat: np.ndarray
    lon: np.ndarray
    swh: np.ndarray
    swh_rms: np.ndarray
    swh_numval: np.ndarray
    surface_type: np.ndarray


@lru_cache(maxsize=32)
def _load_track(path: str) -> _Track:
    with h5py.File(path, "r") as f:
        def col(name: str) -> np.ndarray:
            return np.asarray(f[name][()], dtype="float64")

        lon = col("lon")
        return _Track(
            lat=col("lat"),
            # The granule stores longitude 0..360; ORCA works in -180..180.
            lon=np.where(lon > 180.0, lon - 360.0, lon),
            swh=col("swh"),
            swh_rms=col("swh_rms"),
            swh_numval=col("swh_numval"),
            surface_type=col("surface_type"),
        )


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
        spec = PRODUCTS[product]
        dataset, variable, unit, radius_km = spec.dataset, spec.variable, spec.unit, spec.radius_km
        max_age = spec.max_age_days

        if not self.covers(lat, lon):
            raise ProviderUnavailable(
                f"({lat:.3f}N, {lon:.3f}E) is outside the clipped granule box {self.bbox()}; "
                f"run subset_granules.py with a box that covers it"
            )

        entries = self.load_index().get("products", {}).get(product, [])
        if not entries:
            raise ProviderUnavailable(f"no clipped granules for {product}")

        when_utc = when.astimezone(timezone.utc) if when.tzinfo else when.replace(tzinfo=timezone.utc)
        ranked = sorted(entries, key=lambda e: self._age_days(e, when_utc))
        nearest_days = self._age_days(ranked[0], when_utc)
        if nearest_days > max_age:
            raise ProviderUnavailable(
                f"nearest {product} granule ({ranked[0]['acquisition_start'][:10]}"
                f"..{ranked[0]['acquisition_end'][:10]}) is {nearest_days:.1f} days from the "
                f"requested time {when_utc.date()}; limit for this product is {max_age:g} days"
            )

        cloud_masked: List[str] = []
        for entry in ranked:
            acquired = self._acquired(entry)
            if self._age_days(entry, when_utc) > max_age:
                break
            grid = _load(str(self.root / entry["file"]), dataset)
            sample = self._sample(grid, lat, lon, radius_km)
            if sample is None:
                cloud_masked.append(entry["source_file"])
                continue
            value, pixels, nearest_km = sample
            if unit == "degC" and grid.unit == "K":
                value = value - 273.15
            days_off = self._age_days(entry, when_utc)
            source = (
                f"ISRO MOSDAC {entry['satellite']} {entry['sensor']} "
                f"{entry['processing_level']} {dataset}"
            )
            var_source, var_institution = self.variable_attribution(product, dataset)
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
                variable_source=var_source,
                variable_institution=var_institution,
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
            f"granule within {max_age:g} days of {when_utc.date()} "
            f"(no retrieval -- cloud or land -- in {', '.join(cloud_masked)})"
        )

    # ------------------------------------------------------------------

    def variable_attribution(self, product: str, variable: str) -> Tuple[str, str]:
        """The `source` and `institution` index.json records for one variable.

        A SARAL IGDR carries ECMWF model wind and Meteo-France MFWAM wave period
        and direction beside the altimeter's own swh, in a file whose
        institution is CNES. subset_granules.py copied each variable's own
        attribution into the index precisely so this lookup exists; publishing a
        European model field as an ISRO measurement is the mislabelling
        app/providers/provenance.py was written to prevent.
        """
        for entry in self.load_index().get("products", {}).get(product, []):
            info = entry.get("variables", {}).get(variable)
            if info:
                return str(info.get("source", "")), str(info.get("institution", ""))
        return "", ""

    def read_saral_swh(self, lat: float, lon: float, when: datetime) -> SatelliteReading:
        """Nearest quality-passing SARAL 1 Hz significant wave height.

        The filter in SARAL_QUALITY_FILTER is applied here, at read time, before
        anything downstream can see a value. A point that fails it does not
        exist as far as the rest of ORCA is concerned.
        """
        entries = self.load_index().get("products", {}).get(SARAL_PRODUCT, [])
        if not entries:
            raise ProviderUnavailable(f"no clipped granules for {SARAL_PRODUCT}")

        when_utc = when.astimezone(timezone.utc) if when.tzinfo else when.replace(tzinfo=timezone.utc)
        ranked = sorted(entries, key=lambda e: self._age_days(e, when_utc))

        in_window = [e for e in ranked if self._age_days(e, when_utc) <= MAX_DAYS_FROM_REQUEST]
        if not in_window:
            nearest = ranked[0]
            days = self._age_days(nearest, when_utc)
            raise ProviderUnavailable(
                f"nearest SARAL pass ({nearest['acquisition_start'][:10]}) is {days:.1f} days "
                f"from {when_utc.date()}; limit is {MAX_DAYS_FROM_REQUEST} days"
            )

        # `in_window` is ordered by how close each pass is to the requested
        # time, and the FIRST acceptable one wins. Ordering by distance instead
        # meant one pass answered for every hour inside the window, so a
        # week-long trend drew six points from a single observation and showed a
        # flat line. The question is "what were conditions at time T", so the
        # pass nearest T is the answer, provided it is close enough in space to
        # be worth reporting at all.
        best: Optional[Tuple[float, float, Dict, int, int]] = None  # dist, swh, entry, kept, total
        nearest_rejected: Optional[float] = None
        for entry in in_window:
            track = _load_track(str(self.root / entry["file"]))
            keep = (
                (track.surface_type == SARAL_SURFACE_TYPE_OCEAN)
                & (track.swh_numval >= SARAL_MIN_NUMVAL)
                & (track.swh_rms < SARAL_MAX_RMS_M)
                & np.isfinite(track.swh)
            )
            if not keep.any():
                continue
            lat_k, lon_k, swh_k = track.lat[keep], track.lon[keep], track.swh[keep]
            dists = np.array([haversine_distance(lat, lon, la, lo) for la, lo in zip(lat_k, lon_k)])
            i = int(np.argmin(dists))
            if dists[i] > MAX_TRACK_DISTANCE_KM:
                if nearest_rejected is None or dists[i] < nearest_rejected:
                    nearest_rejected = float(dists[i])
                continue
            best = (float(dists[i]), float(swh_k[i]), entry, int(keep.sum()), int(keep.size))
            break

        if best is None:
            if nearest_rejected is not None:
                raise ProviderUnavailable(
                    f"nearest quality-passing SARAL point is {nearest_rejected:.0f} km from "
                    f"({lat:.3f}N, {lon:.3f}E); limit is {MAX_TRACK_DISTANCE_KM:.0f} km. Nadir "
                    f"tracks are ~300 km apart, so this position has no altimeter coverage in "
                    f"the granules held"
                )
            raise ProviderUnavailable(
                f"no SARAL 1 Hz point within {MAX_DAYS_FROM_REQUEST} days of {when_utc.date()} "
                f"passes the quality filter ({SARAL_QUALITY_FILTER})"
            )

        distance_km, swh, entry, kept, total = best

        acquired = self._acquired(entry)
        days_off = self._age_days(entry, when_utc)
        var_source, var_institution = self.variable_attribution(SARAL_PRODUCT, "swh")
        return SatelliteReading(
            variable="significant_wave_height",
            value=round(swh, 3),
            unit="m",
            source=f"ISRO/CNES {entry['satellite']} {entry['sensor']} {entry['processing_level']} swh",
            status=DataFreshness.CACHED,
            timestamp=acquired,
            granule=entry["source_file"],
            satellite=entry["satellite"],
            sensor=entry["sensor"],
            processing_level=entry["processing_level"],
            variable_source=var_source,
            variable_institution=var_institution,
            pixels_used=kept,
            nearest_pixel_km=round(distance_km, 2),
            days_from_request=round(days_off, 2),
            quality_filter=SARAL_QUALITY_FILTER,
            note=(
                f"Significant wave height from the SARAL/AltiKa nadir pass in {entry['source_file']}, "
                f"acquired {acquired.isoformat(timespec='minutes')}. This is the nearest 1 Hz point "
                f"that passes {SARAL_QUALITY_FILTER}, and it is {distance_km:.0f} km from the "
                f"requested position -- an altimeter measures along its ground track, not at the "
                f"query point. {kept} of {total} points in this pass pass the filter. Served from a "
                f"clipped granule cached on disk, not a live retrieval."
            ),
        )

    # ------------------------------------------------------------------

    @staticmethod
    def _acquired(entry: Dict) -> datetime:
        acquired = datetime.fromisoformat(entry["acquisition_start"])
        return acquired if acquired.tzinfo else acquired.replace(tzinfo=timezone.utc)

    @staticmethod
    def _acquired_end(entry: Dict) -> datetime:
        end = datetime.fromisoformat(entry.get("acquisition_end") or entry["acquisition_start"])
        return end if end.tzinfo else end.replace(tzinfo=timezone.utc)

    @classmethod
    def _age_days(cls, entry: Dict, when: datetime) -> float:
        """Days between `when` and the granule's acquisition WINDOW.

        Zero when `when` falls inside it. Ranking an 8-day composite by its
        window start made a product valid until 5 September look 12.5 days old
        on 10 September, and it was dropped for staleness it did not have.
        """
        start, end = cls._acquired(entry), cls._acquired_end(entry)
        if start <= when <= end:
            return 0.0
        gap = (start - when) if when < start else (when - end)
        return gap.total_seconds() / 86400.0

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


# ---------------------------------------------------------------------------
# The chain-facing provider
# ---------------------------------------------------------------------------

DEFAULT_FIXTURE_ROOT = Path(__file__).resolve().parents[2] / "fixtures" / "isro" / "kakinada"


def _provenance(reading: SatelliteReading) -> FieldProvenance:
    """Turn a granule reading into the per-field attribution the evidence
    builder cites, so a value is never credited to a satellite that did not
    measure it."""
    return FieldProvenance(
        source=reading.source,
        status=reading.status,
        observed_at=reading.timestamp,
        granule=reading.granule,
        distance_km=reading.nearest_pixel_km,
        days_from_request=reading.days_from_request,
        institution=reading.variable_institution,
        note=reading.note,
    )


def _sea_state(wave_height_m: float) -> str:
    """WMO-style descriptor for a wave height.

    A label, not a judgement: it renames the number the engine already has and
    adds nothing to the risk score, which is calculate_marine_risk's alone.
    """
    if wave_height_m < 0.5:
        return "Calm (Rippled)"
    if wave_height_m < 1.25:
        return "Slight (Smooth)"
    if wave_height_m < 2.5:
        return "Moderate"
    if wave_height_m < 4.0:
        return "Rough"
    return "Very Rough to High"


class ISROGranuleProvider(TieredProvider, BaseOceanProvider, BaseWeatherProvider):
    """Serves real ISRO measurements from the clipped granules in this repo.

    Registered at the head of the ocean chain like any other provider and
    validated by the same `observation_validator`, so it cannot emit a tier it
    is not registered for. It is a normal chain member, not a special path.

    What it can and cannot answer is decided by what is actually on disk:

      * significant wave height  -- SARAL/AltiKa nadir altimetry, real
      * sea surface temperature  -- INSAT-3DR Imager L3B, real
      * swell height/period/dir  -- NOT CARRIED. An altimeter measures total
        significant wave height and does not decompose it. These stay None and
        the risk engine renormalises rather than being handed a guess.
      * surface wind             -- NOT CARRIED. The OSCAT-3 granules ordered
        contain zero valid retrievals anywhere in the Indian Ocean, so this
        provider declines weather outright and the chain falls to the labelled
        synthetic model. See docs/DATA_SOURCES.md section 3.

    Every value is CACHED. These are granules on disk; calling them LIVE is the
    fabrication two phases were spent removing.
    """

    provider_name = "ISRO MOSDAC cached granules (INSAT-3DR, SARAL/AltiKa, Oceansat-3)"
    provider_tier = ProviderTier.ISRO
    capabilities = {ProviderCapability.OCEAN}

    def __init__(self, root: Optional[Path] = None):
        self.store = ISROFixtureStore(Path(root or DEFAULT_FIXTURE_ROOT))

    def is_configured(self) -> bool:
        return self.store.is_populated()

    def not_configured_reason(self) -> str:
        return (
            f"no clipped ISRO granules at {self.store.root}; run "
            f"backend/scripts/subset_granules.py against a raw MOSDAC download"
        )

    async def get_ocean_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> OceanObservation:
        when = clock.now() + timedelta(hours=offset_hours)

        # Wave height is the one variable that makes an ocean observation worth
        # returning at all -- it carries the largest single weight in the risk
        # score. Without it there is nothing here the chain should prefer over
        # the tier below, so decline and let it fall through.
        swh = self.store.read_saral_swh(lat, lon, when)

        provenance = {"significant_wave_height_m": _provenance(swh)}

        sst_c: Optional[float] = None
        try:
            sst = self.store.read("insat3dr_l3b_sst_daily", lat, lon, when)
            sst_c = sst.value
            # SST comes out of a different satellite, a different file and a
            # different acquisition than the wave height. It is recorded as such
            # rather than inheriting the observation's SARAL source.
            provenance["sea_surface_temp_c"] = _provenance(sst)
        except ProviderUnavailable:
            # A real gap. Left as None rather than filled.
            pass

        return OceanObservation(
            significant_wave_height_m=swh.value,
            swell_height_m=None,
            swell_period_sec=None,
            swell_direction_deg=None,
            sea_surface_temp_c=sst_c,
            ocean_current_speed_m_s=None,
            ocean_current_direction_deg=None,
            sea_state=_sea_state(swh.value),
            status=DataFreshness.CACHED,
            source=swh.source,
            timestamp=swh.timestamp,
            field_provenance=provenance,
        )

    async def get_weather_conditions(self, lat: float, lon: float, offset_hours: int = 0) -> WeatherObservation:
        raise ProviderUnavailable(
            "no ISRO wind source: the OSCAT-3 L3 granules held contain zero valid "
            "retrievals anywhere in the Indian Ocean (0 of 416000 cells in 40S-25N, "
            "20-120E) because those revolutions cross the Pacific. Re-ordering the "
            "correct revolutions is the fix; see docs/DATA_SOURCES.md"
        )

    # -- introspection used by the evidence builder -------------------------

    def readings_for(self, lat: float, lon: float, when: datetime) -> List[SatelliteReading]:
        """Every granule-backed reading available at this point and time.

        Used to build evidence records, so each one arrives with its own
        granule, timestamp, distance, age and per-variable attribution rather
        than being summarised into a single provider string.
        """
        out: List[SatelliteReading] = []
        try:
            out.append(self.store.read_saral_swh(lat, lon, when))
        except ProviderUnavailable:
            pass
        for product in ("insat3dr_l3b_sst_daily", "insat3dr_l3b_olr_daily",
                        "eos06_ocm3_l3c_flh_8day", "eos06_ocm3_l2c_oc", "eos06_ocm3_l2c_ga"):
            try:
                out.append(self.store.read(product, lat, lon, when))
            except ProviderUnavailable:
                continue
        return out
