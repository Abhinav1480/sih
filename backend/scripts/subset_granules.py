"""Clip raw ISRO granules to the demo box and write small fixtures.

Raw granules (hundreds of MB, fetched from MOSDAC out of band) live outside
the repository. This script reads each one, clips it to a lat/lon box, and
writes a compressed NetCDF beside an ``index.json`` that the MOSDAC adapter
reads at query time. Nothing is resampled, renamed or re-scaled: variable
names, units and fill values are the ones inside the granule, and the
acquisition times come from the granule's own metadata.

Products are recognised from the file name. A file that matches no known
product is reported and skipped rather than guessed at, and a product that is
recognised but yields nothing over the box is reported by name -- silence there
would read as "no such data" when it means "the granules held do not cover this
box", which is a different fact with a different fix.

Two products need more care than the rest, and both are documented at their
regex below rather than here: the OSCAT-3 L3 wind grid declares no coordinates,
no units, no scale attributes and no fill values, and SARAL is along-track
nadir altimetry rather than a field.

Usage (PowerShell or bash, from the repository root):

    python backend/scripts/subset_granules.py --src C:/orca-data/mosdac \
        --out backend/fixtures/isro/kakinada --bbox 16.0 18.0 81.5 83.5
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import h5py
import numpy as np
import xarray as xr

# ---------------------------------------------------------------------------
# Product recognition. Add a product here only after opening a real file and
# reading its variables; never from a product description.
# ---------------------------------------------------------------------------

# INSAT-3DR Imager, Level-3B daily binned geophysical products (HDF5).
#   3RIMG_05SEP2026_0015_L3B_SST_DLY_V02R00.h5   SST_DLY, units K
#   3RIMG_05SEP2026_0015_L3B_OLR_DLY_V01R00.h5   OLR_DLY, units W.m-2
_INSAT_L3B = re.compile(r"^3RIMG_(\d{2}[A-Z]{3}\d{4})_(\d{4})_L3B_([A-Z]+)_DLY_V\d+R\d+\.h5$")

# EOS-06 (Oceansat-3) OCM3, Level-2C geophysical products (NetCDF-4).
#   E06OCML2OC_..._360m_LAC   CHL (mg/m3), APH, AD, BP0, CDOM (1/m at 443 nm)
#   E06OCML2GA_..._360m_LAC   CDOM (1/m at 412 nm)
_OCM_L2 = re.compile(r"^E06OCML2(OC|GA)_(\d{8})_(\d{6})_(\d{3})_(\d{3})_360m_LAC_v[\d.]+\.nc$")

# EOS-06 OCM3, Level-3C 8-day fluorescence composite (NetCDF-4).
#   E06OCML3FL_20260905_8D_04km_LAC_v1.0.0.nc
# The variable is FLH, not nFLH: long_name "Fluorescence Line Height", units
# "W m^-2 sr^-1 Mu(m)^-1" (the granule's own spelling), _FillValue -999.
# Regular 1-D latitude/longitude, 4 km, 5-30 N by 50-100 E.
_OCM_L3_FLH = re.compile(r"^E06OCML3FL_(\d{8})_(\d+)D_(\d+)km_LAC_v[\d.]+\.nc$")

# EOS-06 OSCAT-3 (Scatterometer), Level-3 gridded wind vectors (HDF5).
#   E06SCTL3WW2026244_12km_v1.0.5.h5      YYYYDDD (day of year)
# Everything about this product had to be read off the granule rather than
# assumed, because almost nothing is declared:
#   * The attributes are on the `science_data` GROUP. The file root has none.
#   * Datasets carry no units, no scale_factor, no _FillValue and no long_name;
#     they are tagged as HDF5 IMAGE grayscale. Scaling comes from the group:
#     "Formula to derive value of a Parameter" = "Scale * Value + Offset",
#     "Wind Speed Scale" = 0.01, "Wind Direction Scale" = 0.01. No wind offset
#     attribute exists, so the offset is zero.
#   * There are no latitude/longitude arrays. The grid is reconstructed from
#     "WVC Rows in L3 Product" (1440), "WVC Cells in L3 Product" (2880) and
#     "WVC Size" (12 km) -> 0.125 degrees. See _OSCAT_GRID_NOTE for how the
#     orientation was established.
_OSCAT_L3 = re.compile(r"^E06SCTL3WW(\d{4})(\d{3})_(\d+)km_v[\d.]+\.h5$")

# SARAL/AltiKa Interim Geophysical Data Record, along-track altimetry (NetCDF).
#   SRL_IPN_2PfP206_0012_20260901_004630_20260901_013646.CNES.nc
# Fully CF-1.1 and self-describing. swh: "Corrected significant waveheight",
# standard_name sea_surface_wave_significant_height, units m, scale_factor
# 0.001, _FillValue 32767. lat/lon are int32 with scale_factor 1e-06 and lon
# runs 0..360.
_SARAL_IGDR = re.compile(
    r"^SRL_IPN_2P\w+_(\d{4})_(\d{8})_(\d{6})_(\d{8})_(\d{6})\.CNES\.nc$"
)

PRODUCT_KEYS = {
    ("insat", "SST"): "insat3dr_l3b_sst_daily",
    ("insat", "OLR"): "insat3dr_l3b_olr_daily",
    ("ocm", "OC"): "eos06_ocm3_l2c_oc",
    ("ocm", "GA"): "eos06_ocm3_l2c_ga",
    ("ocm", "FLH"): "eos06_ocm3_l3c_flh_8day",
    ("oscat", "WW"): "eos06_oscat3_l3_windvector",
    ("saral", "IGDR"): "saral_altika_igdr_swh",
}

# Products sampled along a nadir track rather than on a grid. A 2-degree box is
# below the sampling density of a 35-day-repeat altimeter: over the eight days
# held here, no SARAL pass comes within 320 km of the Kakinada box, though the
# instrument does cover the wider Bay of Bengal. These products are therefore
# clipped to the box grown by --track-margin-deg, and BOTH the requested box and
# the box actually used are recorded in the fixture and in index.json.
TRACK_SAMPLED = {"saral_altika_igdr_swh"}

_OSCAT_GRID_NOTE = (
    "Latitude/longitude are NOT stored in this granule. The grid is "
    "reconstructed as 1440 rows x 2880 cells of 0.125 deg from the "
    "science_data group attributes WVC Rows in L3 Product, WVC Cells in L3 "
    "Product and WVC Size. Row 0 = 90 S ascending north, cell 0 = 0 E "
    "ascending east (0..360). That orientation was not assumed: of the four "
    "candidates it is the only one placing zero valid wind retrievals inside "
    "the interiors of the Sahara, Central Asia, Siberia, the Amazon, "
    "Australia, Antarctica, Greenland and the Congo, and a scatterometer "
    "never retrieves a wind vector over land."
)

# Per-product usage notes, copied into index.json and into each fixture. These
# exist because a faithful clip is not the same as a usable measurement: this
# script deliberately does not filter, so anything that reads these fixtures
# has to know what it is holding.
PRODUCT_NOTES = {
    "saral_altika_igdr_swh": (
        "NOT quality filtered. Clipped faithfully, flags included, nothing "
        "dropped. Of 981 1-Hz points here the raw swh reaches 29.66 m, which "
        "is not a physical Bay of Bengal sea state. surface_type==0 removes "
        "land crossings (to 23.96 m) and qual_alt_1hz_swh==0 removes nothing "
        "further -- that flag does not discriminate in this set. swh_rms is "
        "what does: adding swh_numval>=20 and swh_rms<2.0 keeps 809 of the 877 "
        "ocean points and brings the maximum to 6.80 m, p99 5.32 m, median "
        "1.75 m, which is a sensible September sea state including one genuine "
        "high-sea event. Apply surface_type==0 AND swh_numval>=20 AND "
        "swh_rms<2.0 before publishing any value from this product."
    ),
    "eos06_oscat3_l3_windvector": (
        "Wind speed and direction are scaled by 0.01 from the granule's group "
        "attributes and stored already scaled, with NaN where the granule held "
        "its undeclared fill. The quality flag is stored unscaled as bit flags."
    ),
    "eos06_ocm3_l3c_flh_8day": (
        "An 8-day composite: acquisition_start and acquisition_end span the "
        "whole compositing window (65 input scenes), not one overpass. Do not "
        "present it as an observation at a single time."
    ),
}

_OSCAT_FILL_NOTE = (
    "Fill values are NOT declared in this granule. They are taken from the "
    "data: 32767 for wind speed (int16), 65535 for wind direction (uint16) "
    "and 65534 for the quality flag, each occupying 4025353 of the 4147200 "
    "cells of the granule inspected, with the largest real values 5000 "
    "(50.00 m/s) and 35999 (359.99 deg) once scaled."
)


@dataclass
class BBox:
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float

    def as_list(self) -> List[float]:
        return [self.lat_min, self.lat_max, self.lon_min, self.lon_max]


@dataclass
class VariableSummary:
    units: str
    long_name: str
    fill_value: Optional[float]
    valid_pixels: int
    total_pixels: int
    min: Optional[float]
    max: Optional[float]
    # Who produced THIS variable, from the granule's own `source` and
    # `institution` attributes. Empty when the granule does not say.
    #
    # This is not decoration. A SARAL IGDR carries ECMWF model wind
    # (wind_speed_model_u/v) and Meteo-France MFWAM wave period and direction
    # alongside the altimeter's own swh, inside a file whose institution is
    # CNES. Without this, a downstream adapter reading "an ISRO granule" would
    # label a European model field as an ISRO measurement -- exactly the
    # mislabelling app/providers/provenance.py exists to prevent.
    source: str = ""
    institution: str = ""


@dataclass
class FixtureEntry:
    file: str
    product: str
    satellite: str
    sensor: str
    processing_level: str
    acquisition_start: str
    acquisition_end: str
    source_file: str
    variables: Dict[str, VariableSummary] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _attr(obj, key: str, default=""):
    value = obj.attrs.get(key, default)
    if isinstance(value, (bytes, np.bytes_)):
        return value.decode(errors="replace")
    if isinstance(value, np.ndarray):
        return value.tolist() if value.size > 1 else value.item()
    return value


def _summarise(values: np.ndarray, fill: Optional[float], units: str, long_name: str,
               source: str = "", institution: str = "") -> VariableSummary:
    data = values.astype("float64")
    if fill is not None:
        data = np.where(data == fill, np.nan, data)
    finite = np.isfinite(data)
    return VariableSummary(
        units=units,
        long_name=long_name,
        fill_value=fill,
        valid_pixels=int(finite.sum()),
        total_pixels=int(data.size),
        min=float(np.nanmin(data)) if finite.any() else None,
        max=float(np.nanmax(data)) if finite.any() else None,
        source=source,
        institution=institution,
    )


def _parse_insat_stamp(stamp: str) -> datetime:
    """'05SEP2026_0015' -> 2026-09-05T00:15Z (INSAT L3B times are UTC)."""
    return datetime.strptime(stamp.strip(), "%d%b%Y_%H%M").replace(tzinfo=timezone.utc)


def _parse_ocm_time(date_of_pass: str, scene_time: str) -> datetime:
    """'01-SEP-2026' + '06:10:33:6398972520' -> 2026-09-01T06:10:33Z."""
    hh, mm, ss = scene_time.split(":")[:3]
    day = datetime.strptime(date_of_pass.strip(), "%d-%b-%Y")
    return day.replace(hour=int(hh), minute=int(mm), second=int(ss), tzinfo=timezone.utc)


def _parse_ocm_l3_time(stamp: str) -> datetime:
    """'2026-08-29T06:44:05:3622108890' -> 2026-08-29T06:44:05Z.

    The L3 composite writes a fourth colon-separated field after the seconds;
    it is sub-second precision and is dropped rather than guessed at.
    """
    date_part, _, time_part = stamp.strip().partition("T")
    hh, mm, ss = time_part.split(":")[:3]
    day = datetime.strptime(date_part, "%Y-%m-%d")
    return day.replace(hour=int(hh), minute=int(mm), second=int(ss), tzinfo=timezone.utc)


def _parse_oscat_time(stamp: str) -> datetime:
    """'2026-244T00:02:55.080' -> 2026-09-01T00:02:55Z (year and day-of-year)."""
    date_part, _, time_part = stamp.strip().partition("T")
    year, doy = date_part.split("-")
    hh, mm, rest = time_part.split(":")
    sec = int(float(rest))
    base = datetime(int(year), 1, 1, tzinfo=timezone.utc) + timedelta(days=int(doy) - 1)
    return base + timedelta(hours=int(hh), minutes=int(mm), seconds=sec)


# ---------------------------------------------------------------------------
# Clippers
# ---------------------------------------------------------------------------

def clip_insat_l3b(path: Path, bbox: BBox, out_dir: Path, variable: str) -> Optional[FixtureEntry]:
    with h5py.File(path, "r") as f:
        var_name = f"{variable}_DLY"
        if var_name not in f:
            print(f"  ! {path.name}: expected dataset {var_name!r} not present, skipped")
            return None

        lat_ds, lon_ds = f["Latitude"], f["Longitude"]
        lat = lat_ds[()].astype("float64") * float(lat_ds.attrs["scale_factor"][0])
        lon = lon_ds[()].astype("float64") * float(lon_ds.attrs["scale_factor"][0])
        lat[lat_ds[()] == lat_ds.attrs["_FillValue"][0]] = np.nan
        lon[lon_ds[()] == lon_ds.attrs["_FillValue"][0]] = np.nan

        inside = (lat >= bbox.lat_min) & (lat <= bbox.lat_max) & (lon >= bbox.lon_min) & (lon <= bbox.lon_max)
        if not inside.any():
            return None
        rows = np.where(inside.any(axis=1))[0]
        cols = np.where(inside.any(axis=0))[0]
        r0, r1, c0, c1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1

        data = f[var_name][0, r0:r1, c0:c1].astype("float32")
        fill = float(f[var_name].attrs["_FillValue"][0])
        units = _attr(f[var_name], "units")
        long_name = _attr(f[var_name], "long_name")
        lat_box, lon_box = lat[r0:r1, c0:c1], lon[r0:r1, c0:c1]

        # The L3B grid is regular in this window: one latitude per row, one
        # longitude per column. Verified here rather than assumed; a granule
        # that breaks it keeps its 2-D coordinates.
        regular = (np.nanstd(lat_box, axis=1).max() < 1e-6) and (np.nanstd(lon_box, axis=0).max() < 1e-6)
        if regular:
            coords = {"latitude": ("latitude", np.nanmean(lat_box, axis=1)),
                      "longitude": ("longitude", np.nanmean(lon_box, axis=0))}
            da = xr.DataArray(data, dims=("latitude", "longitude"), coords=coords)
        else:
            da = xr.DataArray(
                data, dims=("y", "x"),
                coords={"latitude": (("y", "x"), lat_box), "longitude": (("y", "x"), lon_box)},
            )
        da.attrs.update({"units": units, "long_name": long_name, "_FillValue": fill})
        da.coords["latitude"].attrs.update({"units": "degrees_north", "standard_name": "latitude"})
        da.coords["longitude"].attrs.update({"units": "degrees_east", "standard_name": "longitude"})

        stamps = [s for s in str(_attr(f, "Input_Date_Times")).split(",") if s.strip()]
        start = _parse_insat_stamp(stamps[0])
        end = _parse_insat_stamp(stamps[-1])

        ds = xr.Dataset({var_name: da})
        ds.attrs.update({k: _attr(f, k) for k in f.attrs.keys() if k not in ("Input_Date_Times",)})
        ds.attrs["Input_Date_Times_first"] = stamps[0]
        ds.attrs["Input_Date_Times_last"] = stamps[-1]
        product = PRODUCT_KEYS[("insat", variable)]
        entry = _finish(ds, path, out_dir, product, bbox, start, end,
                        satellite=str(_attr(f, "Satellite_Name")), sensor=str(_attr(f, "Sensor_Name")),
                        level=str(_attr(f, "Processing_Level")),
                        summaries={var_name: _summarise(data, fill, units, long_name)})
        return entry


def clip_ocm_l2(path: Path, bbox: BBox, out_dir: Path, kind: str) -> Optional[FixtureEntry]:
    with xr.open_dataset(path, engine="h5netcdf", decode_times=False, mask_and_scale=False) as ds:
        lat = ds["latitude"].values
        lon = ds["longitude"].values
        lat_idx = np.where((lat >= bbox.lat_min) & (lat <= bbox.lat_max))[0]
        lon_idx = np.where((lon >= bbox.lon_min) & (lon <= bbox.lon_max))[0]
        if lat_idx.size == 0 or lon_idx.size == 0:
            return None

        sub = ds.isel(latitude=slice(lat_idx.min(), lat_idx.max() + 1),
                      longitude=slice(lon_idx.min(), lon_idx.max() + 1)).load()
        # `rbands` is an empty string dimension scale; it carries no data.
        sub = sub.drop_vars([v for v in ("rbands",) if v in sub.variables], errors="ignore")

        summaries = {}
        for name, da in sub.data_vars.items():
            fill = da.attrs.get("_FillValue", da.encoding.get("_FillValue"))
            fill = float(fill) if fill is not None else None
            units = str(da.attrs.get("units", da.attrs.get("unit", "")))
            summaries[name] = _summarise(da.values, fill, units, str(da.attrs.get("long_name", "")))
            if "unit" in da.attrs and "units" not in da.attrs:
                da.attrs["units"] = da.attrs["unit"]  # CF spelling alongside the original

        start = _parse_ocm_time(str(ds.attrs["DateOfPass"]), str(ds.attrs["Scene_Start_Time"]))
        end = _parse_ocm_time(str(ds.attrs["DateOfPass"]), str(ds.attrs["Scene_End_Time"]))
        product = PRODUCT_KEYS[("ocm", kind)]
        return _finish(sub, path, out_dir, product, bbox, start, end,
                       satellite=str(ds.attrs.get("Satellite_name", "")), sensor=str(ds.attrs.get("Sensor_id", "")),
                       level=str(ds.attrs.get("Processing_level", "")), summaries=summaries)


def clip_ocm_l3_flh(path: Path, bbox: BBox, out_dir: Path) -> Optional[FixtureEntry]:
    """EOS-06 OCM3 Level-3C 8-day fluorescence composite.

    Regular 1-D latitude/longitude, so this is a straight index slice. The
    variable is FLH -- the product is described as nFLH but nothing in the file
    is called that.
    """
    with xr.open_dataset(path, engine="h5netcdf", decode_times=False, mask_and_scale=False) as ds:
        lat = ds["latitude"].values
        lon = ds["longitude"].values
        lat_idx = np.where((lat >= bbox.lat_min) & (lat <= bbox.lat_max))[0]
        lon_idx = np.where((lon >= bbox.lon_min) & (lon <= bbox.lon_max))[0]
        if lat_idx.size == 0 or lon_idx.size == 0:
            return None

        sub = ds.isel(latitude=slice(lat_idx.min(), lat_idx.max() + 1),
                      longitude=slice(lon_idx.min(), lon_idx.max() + 1)).load()

        summaries = {}
        for name, da in sub.data_vars.items():
            fill = da.attrs.get("_FillValue", da.encoding.get("_FillValue"))
            fill = float(fill) if fill is not None else None
            summaries[name] = _summarise(
                da.values, fill,
                str(da.attrs.get("units", "")), str(da.attrs.get("long_name", "")),
                source=str(da.attrs.get("source", "")),
                institution=str(da.attrs.get("institution", ds.attrs.get("Generating_agency", ""))),
            )

        start = _parse_ocm_l3_time(str(ds.attrs["Start_Time"]))
        end = _parse_ocm_l3_time(str(ds.attrs["End_Time"]))
        return _finish(sub, path, out_dir, PRODUCT_KEYS[("ocm", "FLH")], bbox, start, end,
                       satellite=str(ds.attrs.get("Satellite_name", "")),
                       sensor=str(ds.attrs.get("Sensor_id", "")),
                       level=str(ds.attrs.get("Processing_level", "")), summaries=summaries)


def clip_oscat_l3_ww(path: Path, bbox: BBox, out_dir: Path) -> Optional[FixtureEntry]:
    """EOS-06 OSCAT-3 Level-3 gridded wind vectors.

    The granule declares no coordinates, no units, no scale attributes on the
    datasets and no fill values; see _OSCAT_GRID_NOTE and _OSCAT_FILL_NOTE for
    where each of those comes from and how it was established. Everything
    derived rather than read is recorded in the fixture's own attributes, so a
    consumer can tell the difference.
    """
    with h5py.File(path, "r") as f:
        if "science_data" not in f:
            print(f"  ! {path.name}: no science_data group, skipped")
            return None
        g = f["science_data"]

        rows = int(str(_attr(g, "WVC Rows in L3 Product")).strip())
        cells = int(str(_attr(g, "WVC Cells in L3 Product")).strip())
        step = 360.0 / cells
        if rows * step != 180.0:
            print(f"  ! {path.name}: {rows} rows x {cells} cells is not a global "
                  f"{step} deg grid, skipped rather than guessed at")
            return None

        speed_scale = float(str(_attr(g, "Wind Speed Scale")).strip())
        dir_scale = float(str(_attr(g, "Wind Direction Scale")).strip())

        # Cell centres. Row 0 = 90 S, cell 0 = 0 E; see _OSCAT_GRID_NOTE.
        lat = -90.0 + (np.arange(rows) + 0.5) * step
        lon = (np.arange(cells) + 0.5) * step

        lo_min = bbox.lon_min % 360.0
        lo_max = bbox.lon_max % 360.0
        lat_idx = np.where((lat >= bbox.lat_min) & (lat <= bbox.lat_max))[0]
        lon_idx = (np.where((lon >= lo_min) & (lon <= lo_max))[0] if lo_min <= lo_max
                   else np.where((lon >= lo_min) | (lon <= lo_max))[0])
        if lat_idx.size == 0 or lon_idx.size == 0:
            return None
        r0, r1 = int(lat_idx.min()), int(lat_idx.max()) + 1
        c0, c1 = int(lon_idx.min()), int(lon_idx.max()) + 1

        FILLS = {"wind_speed": 32767.0, "wind_direction": 65535.0, "wind_quality_flag": 65534.0}
        SCALES = {"wind_speed": speed_scale, "wind_direction": dir_scale, "wind_quality_flag": None}
        UNITS = {"wind_speed": "m s-1", "wind_direction": "degree", "wind_quality_flag": "1"}

        data_vars, summaries = {}, {}
        any_valid = False
        for pass_dir in ("Ascending", "Descending"):
            for kind in ("wind_speed", "wind_direction", "wind_quality_flag"):
                name = f"{pass_dir}_{kind}"
                if name not in g:
                    continue
                raw = g[name][r0:r1, c0:c1]
                fill = FILLS[kind]
                scale = SCALES[kind]
                if scale is None:
                    values = raw.astype("float32")
                    out_fill = fill
                else:
                    values = np.where(raw.astype("float64") == fill, np.nan,
                                      raw.astype("float64") * scale).astype("float32")
                    out_fill = float("nan")
                    any_valid = any_valid or bool(np.isfinite(values).any())
                da = xr.DataArray(values, dims=("latitude", "longitude"),
                                  coords={"latitude": lat[r0:r1], "longitude": lon[c0:c1]})
                da.attrs.update({
                    "units": UNITS[kind],
                    "long_name": name.replace("_", " "),
                    "orca_raw_fill_value": fill,
                    "orca_scale_applied": scale if scale is not None else "none",
                    "orca_derivation": (
                        "Scale * Value + Offset, offset 0 (no wind offset attribute "
                        "in the granule)" if scale is not None else
                        "bit flags, stored unscaled"),
                })
                data_vars[name] = da
                summaries[name] = _summarise(
                    values, None if scale is not None else fill,
                    UNITS[kind], name.replace("_", " "),
                    source=str(_attr(g, "Product Identification")).strip(),
                    institution=str(_attr(g, "Organization Name")).strip(),
                )

        if not data_vars or not any_valid:
            return None

        sub = xr.Dataset(data_vars)
        sub.coords["latitude"].attrs.update({"units": "degrees_north", "standard_name": "latitude"})
        sub.coords["longitude"].attrs.update({"units": "degrees_east", "standard_name": "longitude",
                                              "comment": "0..360 east of Greenwich, as reconstructed"})
        sub.attrs.update({k: _attr(g, k) for k in g.attrs.keys()})
        sub.attrs["orca_grid_note"] = _OSCAT_GRID_NOTE
        sub.attrs["orca_fill_note"] = _OSCAT_FILL_NOTE

        start = _parse_oscat_time(str(_attr(g, "Start Revolution Time")))
        end = _parse_oscat_time(str(_attr(g, "End Revolution Time")))
        return _finish(sub, path, out_dir, PRODUCT_KEYS[("oscat", "WW")], bbox, start, end,
                       satellite=str(_attr(g, "Satellite Name")).strip(),
                       sensor=str(_attr(g, "Sensor Name")).strip(),
                       level="L3", summaries=summaries)


# The along-track variables kept from a SARAL IGDR. The granule carries 145;
# these are the geolocation, the altimeter's own wave and wind measurements,
# the flags needed to use them honestly, and the two embedded model fields --
# which are kept only because their `source` and `institution` attributes ride
# along with them into index.json, so nothing downstream can mistake ECMWF or
# Meteo-France output for an ISRO measurement.
_SARAL_VARS = (
    "lat", "lon", "time",
    "swh", "swh_rms", "swh_numval", "qual_alt_1hz_swh", "qual_inst_corr_1hz_swh",
    "wind_speed_alt",
    "surface_type", "dist_coast", "ice_flag",
    "mean_wave_period_t02", "mean_wave_direction",
    "wind_speed_model_u", "wind_speed_model_v",
)


def clip_saral_igdr(path: Path, bbox: BBox, out_dir: Path) -> Optional[FixtureEntry]:
    """SARAL/AltiKa Interim GDR: 1 Hz along-track points inside the box.

    Nadir altimetry is a line, not a field, so the output keeps the `time`
    dimension rather than being placed on a grid. Longitude in the granule runs
    0..360 and is compared in that convention.
    """
    import netCDF4  # local: only this product needs it

    ds = netCDF4.Dataset(path)
    try:
        ds.set_auto_maskandscale(True)
        lat = np.asarray(ds.variables["lat"][:], dtype="float64")
        lon = np.asarray(ds.variables["lon"][:], dtype="float64")
        lon180 = np.where(lon > 180.0, lon - 360.0, lon)

        inside = ((lat >= bbox.lat_min) & (lat <= bbox.lat_max) &
                  (lon180 >= bbox.lon_min) & (lon180 <= bbox.lon_max))
        if not inside.any():
            return None
        idx = np.where(inside)[0]

        data_vars, summaries = {}, {}
        for name in _SARAL_VARS:
            if name not in ds.variables:
                continue
            var = ds.variables[name]
            if var.dimensions != ("time",):
                continue
            values = np.asarray(var[:][idx], dtype="float64")
            if np.ma.isMaskedArray(var[:][idx]):
                values = np.ma.filled(var[:][idx].astype("float64"), np.nan)
            attrs = {a: getattr(var, a) for a in var.ncattrs()
                     if a not in ("_FillValue", "scale_factor", "add_offset")}
            da = xr.DataArray(values.astype("float32") if name not in ("time",) else values,
                              dims=("time",))
            da.attrs.update({k: (v.item() if isinstance(v, np.generic) else v)
                             for k, v in attrs.items()})
            data_vars[name] = da
            summaries[name] = _summarise(
                values, None,
                str(getattr(var, "units", "")), str(getattr(var, "long_name", "")),
                source=str(getattr(var, "source", "")),
                institution=str(getattr(var, "institution", "")),
            )

        if "swh" not in data_vars:
            print(f"  ! {path.name}: no swh variable, skipped")
            return None

        sub = xr.Dataset(data_vars)
        sub.attrs.update({k: getattr(ds, k) for k in ds.ncattrs()
                          if isinstance(getattr(ds, k), (str, int, float))})
        sub.attrs["orca_track_note"] = (
            "Along-track nadir altimetry, not a grid. Points are the 1 Hz "
            "records whose lat/lon fall inside the clip box; the `time` "
            "dimension is the along-track index."
        )
        sub.attrs["orca_model_fields_note"] = (
            "wind_speed_model_u/v are ECMWF model wind and mean_wave_period_t02 "
            "/ mean_wave_direction are Meteo-France MFWAM model fields carried "
            "inside this product. They are NOT altimeter measurements. Each "
            "variable's own source and institution are recorded in index.json."
        )

        epoch = datetime(2000, 1, 1, tzinfo=timezone.utc)
        times = np.asarray(ds.variables["time"][:][idx], dtype="float64")
        start = epoch + timedelta(seconds=float(np.nanmin(times)))
        end = epoch + timedelta(seconds=float(np.nanmax(times)))

        return _finish(sub, path, out_dir, PRODUCT_KEYS[("saral", "IGDR")], bbox, start, end,
                       satellite=str(getattr(ds, "mission_name", "")),
                       sensor=str(getattr(ds, "altimeter_sensor_name", "")),
                       level="IGDR", summaries=summaries)
    finally:
        ds.close()


def _finish(ds: xr.Dataset, src: Path, out_dir: Path, product: str, bbox: BBox,
            start: datetime, end: datetime, satellite: str, sensor: str, level: str,
            summaries: Dict[str, VariableSummary]) -> FixtureEntry:
    ds.attrs.update({
        "orca_product": product,
        "orca_source_file": src.name,
        "orca_clip_bbox_lat_min_lat_max_lon_min_lon_max": bbox.as_list(),
        "orca_acquisition_start_utc": start.isoformat(),
        "orca_acquisition_end_utc": end.isoformat(),
        "orca_clip_generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "orca_note": "Clipped subset of the original granule. Values, names, units and fill values are unchanged.",
    })
    if product in PRODUCT_NOTES:
        ds.attrs["orca_usage_note"] = PRODUCT_NOTES[product]
    # netCDF attributes must be scalars, strings or numeric arrays.
    for k, v in list(ds.attrs.items()):
        if isinstance(v, (list, tuple)):
            ds.attrs[k] = np.asarray(v)
        elif v is None:
            ds.attrs[k] = ""

    target_dir = out_dir / product
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / (src.stem + ".nc")
    encoding = {name: {"zlib": True, "complevel": 6} for name in ds.data_vars}
    ds.to_netcdf(target, engine="h5netcdf", encoding=encoding)

    return FixtureEntry(
        file=str(target.relative_to(out_dir)).replace("\\", "/"),
        product=product,
        satellite=satellite,
        sensor=sensor,
        processing_level=level,
        acquisition_start=start.isoformat(),
        acquisition_end=end.isoformat(),
        source_file=src.name,
        variables=summaries,
    )


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

def run(src: Path, out: Path, bbox: BBox, track_margin: float = 0.0) -> int:
    out.mkdir(parents=True, exist_ok=True)
    entries: List[FixtureEntry] = []
    unknown: List[str] = []
    outside: Dict[str, int] = {}
    partial: List[str] = []

    track_bbox = BBox(bbox.lat_min - track_margin, bbox.lat_max + track_margin,
                      bbox.lon_min - track_margin, bbox.lon_max + track_margin)

    def note_outside(product: str) -> None:
        outside[product] = outside.get(product, 0) + 1

    for path in sorted(src.iterdir()):
        if path.suffix == ".filepart":
            partial.append(path.name)
            continue

        m = _INSAT_L3B.match(path.name)
        if m:
            variable = m.group(3)
            if ("insat", variable) not in PRODUCT_KEYS:
                unknown.append(path.name)
                continue
            product = PRODUCT_KEYS[("insat", variable)]
            entry = clip_insat_l3b(path, bbox, out, variable)
        elif _OCM_L2.match(path.name):
            kind = _OCM_L2.match(path.name).group(1)
            product = PRODUCT_KEYS[("ocm", kind)]
            entry = clip_ocm_l2(path, bbox, out, kind)
        elif _OCM_L3_FLH.match(path.name):
            product = PRODUCT_KEYS[("ocm", "FLH")]
            entry = clip_ocm_l3_flh(path, bbox, out)
        elif _OSCAT_L3.match(path.name):
            product = PRODUCT_KEYS[("oscat", "WW")]
            entry = clip_oscat_l3_ww(path, bbox, out)
        elif _SARAL_IGDR.match(path.name):
            product = PRODUCT_KEYS[("saral", "IGDR")]
            entry = clip_saral_igdr(path, track_bbox, out)
        else:
            unknown.append(path.name)
            continue

        if entry is None:
            note_outside(product)
            continue
        entries.append(entry)
        valid = ", ".join(f"{k}={v.valid_pixels}/{v.total_pixels}" for k, v in entry.variables.items())
        print(f"  + {entry.file}  {entry.acquisition_start[:16]}Z  {valid[:150]}")

    index = {
        "bbox_lat_min_lat_max_lon_min_lon_max": bbox.as_list(),
        "track_bbox_lat_min_lat_max_lon_min_lon_max": track_bbox.as_list(),
        "track_margin_deg": track_margin,
        "track_sampled_products": sorted(TRACK_SAMPLED),
        "track_bbox_note": (
            "Nadir-altimeter products are clipped to the track bbox, not the "
            "bbox. A 2-degree box is below the sampling density of a 35-day "
            "repeat: no SARAL pass in this set comes within 320 km of the "
            "Kakinada box. Each fixture records the box that actually produced it."
        ),
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_dir_note": "Raw granules are not committed; see backend/scripts/subset_granules.py",
        "not_quality_filtered": (
            "These are faithful clips, not curated measurements. Values, names, "
            "units and fill values are the granule's own and nothing is dropped. "
            "Read product_notes before publishing any value from them."
        ),
        "product_notes": {},
        "products": {},
    }
    for e in sorted(entries, key=lambda e: (e.product, e.acquisition_start)):
        index["products"].setdefault(e.product, []).append(asdict(e))
    for product in index["products"]:
        if product in PRODUCT_NOTES:
            index["product_notes"][product] = PRODUCT_NOTES[product]
    (out / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")

    print(f"\nwrote {len(entries)} fixtures to {out} across {len(index['products'])} products")
    for product, items in sorted(index["products"].items()):
        print(f"  {product}: {len(items)} granules")

    # A product that matched files but produced nothing is reported by name.
    # Silence there would read as "no such data", when it means "the granules
    # held do not cover this box" -- a different fact with a different fix.
    empty = {p: n for p, n in outside.items() if p not in index["products"]}
    if empty:
        print("\nPRODUCTS RECOGNISED BUT EMPTY over this box (no fixture written):")
        for product, n in sorted(empty.items()):
            print(f"  = {product}: all {n} granule(s) fall outside the box or carry no valid data there")
    thin = {p: n for p, n in outside.items() if p in index["products"]}
    if thin:
        print("skipped granules that do not cover the box: " +
              ", ".join(f"{p} {n}" for p, n in sorted(thin.items())))
    if partial:
        print(f"skipped {len(partial)} incomplete download(s): {', '.join(partial)}")
    if unknown:
        print("\nUNKNOWN PRODUCTS, not clipped. Open one, read its variables, then add it to PRODUCT_KEYS:")
        for name in unknown:
            print(f"  ? {name}")
        return 2
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", default="C:/orca-data/mosdac", help="directory of raw granules")
    parser.add_argument("--out", default="backend/fixtures/isro/kakinada", help="fixture output directory")
    parser.add_argument("--bbox", nargs=4, type=float, metavar=("LAT_MIN", "LAT_MAX", "LON_MIN", "LON_MAX"),
                        default=[16.0, 18.0, 81.5, 83.5])
    parser.add_argument("--track-margin-deg", type=float, default=5.0,
                        help=("degrees to grow the box by for nadir-track products "
                              "(SARAL). A 2-degree box holds no altimeter pass at "
                              "all; the box actually used is recorded in every "
                              "fixture and in index.json. 0 disables it."))
    args = parser.parse_args(argv)
    return run(Path(args.src), Path(args.out), BBox(*args.bbox), args.track_margin_deg)


if __name__ == "__main__":
    sys.exit(main())
