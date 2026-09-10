"""Clip raw ISRO granules to the demo box and write small fixtures.

Raw granules (hundreds of MB, fetched from MOSDAC out of band) live outside
the repository. This script reads each one, clips it to a lat/lon box, and
writes a compressed NetCDF beside an ``index.json`` that the MOSDAC adapter
reads at query time. Nothing is resampled, renamed or re-scaled: variable
names, units and fill values are the ones inside the granule, and the
acquisition times come from the granule's own metadata.

Products are recognised from the file name. A file that matches no known
product is reported and skipped rather than guessed at.

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

PRODUCT_KEYS = {
    ("insat", "SST"): "insat3dr_l3b_sst_daily",
    ("insat", "OLR"): "insat3dr_l3b_olr_daily",
    ("ocm", "OC"): "eos06_ocm3_l2c_oc",
    ("ocm", "GA"): "eos06_ocm3_l2c_ga",
}


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


def _summarise(values: np.ndarray, fill: Optional[float], units: str, long_name: str) -> VariableSummary:
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
    )


def _parse_insat_stamp(stamp: str) -> datetime:
    """'05SEP2026_0015' -> 2026-09-05T00:15Z (INSAT L3B times are UTC)."""
    return datetime.strptime(stamp.strip(), "%d%b%Y_%H%M").replace(tzinfo=timezone.utc)


def _parse_ocm_time(date_of_pass: str, scene_time: str) -> datetime:
    """'01-SEP-2026' + '06:10:33:6398972520' -> 2026-09-01T06:10:33Z."""
    hh, mm, ss = scene_time.split(":")[:3]
    day = datetime.strptime(date_of_pass.strip(), "%d-%b-%Y")
    return day.replace(hour=int(hh), minute=int(mm), second=int(ss), tzinfo=timezone.utc)


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

def run(src: Path, out: Path, bbox: BBox) -> int:
    out.mkdir(parents=True, exist_ok=True)
    entries: List[FixtureEntry] = []
    unknown: List[str] = []
    outside: List[str] = []
    partial: List[str] = []

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
            entry = clip_insat_l3b(path, bbox, out, variable)
        else:
            m = _OCM_L2.match(path.name)
            if m:
                entry = clip_ocm_l2(path, bbox, out, m.group(1))
            else:
                unknown.append(path.name)
                continue
        if entry is None:
            outside.append(path.name)
            continue
        entries.append(entry)
        valid = ", ".join(f"{k}={v.valid_pixels}/{v.total_pixels}" for k, v in entry.variables.items())
        print(f"  + {entry.file}  {entry.acquisition_start[:16]}Z  {valid}")

    index = {
        "bbox_lat_min_lat_max_lon_min_lon_max": bbox.as_list(),
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_dir_note": "Raw granules are not committed; see backend/scripts/subset_granules.py",
        "products": {},
    }
    for e in sorted(entries, key=lambda e: (e.product, e.acquisition_start)):
        index["products"].setdefault(e.product, []).append(asdict(e))
    (out / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")

    print(f"\nwrote {len(entries)} fixtures to {out} across {len(index['products'])} products")
    for product, items in index["products"].items():
        print(f"  {product}: {len(items)} granules")
    if outside:
        print(f"skipped {len(outside)} granules that do not cover the box")
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
    args = parser.parse_args(argv)
    return run(Path(args.src), Path(args.out), BBox(*args.bbox))


if __name__ == "__main__":
    sys.exit(main())
