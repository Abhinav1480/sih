"""The clipped ISRO fixtures must describe themselves truthfully.

`backend/scripts/subset_granules.py` clips real MOSDAC granules into
`backend/fixtures/isro/kakinada/` and writes an `index.json` an adapter will
read at query time. These tests pin the facts that were established by opening
the granules, because every one of them is a thing a reasonable person would
otherwise guess wrong:

  * The 8-day fluorescence composite is described everywhere as nFLH. The
    variable inside the file is `FLH`.
  * A SARAL IGDR carries ECMWF and Meteo-France MODEL fields next to the
    altimeter's own measurements, inside a file whose institution is CNES.
    Labelling those ISRO is exactly what app/providers/provenance.py exists to
    prevent, so the per-variable source and institution must survive into the
    index.
  * The fixtures are faithful clips, not curated measurements. Raw `swh`
    reaches 29.66 m here, which is not a physical sea state, so the index must
    carry the note saying so.
"""

import json
from pathlib import Path

import pytest

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "isro" / "kakinada"
INDEX = FIXTURES / "index.json"


@pytest.fixture(scope="module")
def index():
    if not INDEX.exists():
        pytest.skip(f"{INDEX} not present; run backend/scripts/subset_granules.py")
    return json.loads(INDEX.read_text(encoding="utf-8"))


def test_every_indexed_granule_file_exists(index):
    missing = [
        entry["file"]
        for items in index["products"].values()
        for entry in items
        if not (FIXTURES / entry["file"]).is_file()
    ]
    assert not missing, f"index.json lists {len(missing)} file(s) that are not on disk: {missing[:5]}"


def test_no_fixture_is_large_enough_to_bloat_the_repository(index):
    """Raw granules stay out. A fixture that grew to granule size means the
    clip stopped clipping."""
    big = [
        (entry["file"], (FIXTURES / entry["file"]).stat().st_size)
        for items in index["products"].values()
        for entry in items
        if (FIXTURES / entry["file"]).stat().st_size > 8 * 1024 * 1024
    ]
    assert not big, f"fixture(s) over 8 MB: {big}"


def test_the_fluorescence_variable_is_flh_not_nflh(index):
    """The product is ordered as nFLH; nothing in the granule is called that."""
    entries = index["products"].get("eos06_ocm3_l3c_flh_8day")
    if not entries:
        pytest.skip("no fluorescence composite in this fixture set")
    variables = entries[0]["variables"]
    assert "FLH" in variables, (
        f"expected the variable FLH, found {sorted(variables)}. The product is "
        "described as nFLH but the granule calls it FLH; do not rename it."
    )
    assert "nFLH" not in variables
    assert variables["FLH"]["units"] == "W m^-2 sr^-1 Mu(m)^-1", (
        "units must be the granule's own spelling, not a tidied version"
    )


def test_the_composite_window_is_not_a_single_overpass(index):
    entries = index["products"].get("eos06_ocm3_l3c_flh_8day")
    if not entries:
        pytest.skip("no fluorescence composite in this fixture set")
    e = entries[0]
    assert e["acquisition_start"] < e["acquisition_end"]
    assert e["acquisition_start"][:10] != e["acquisition_end"][:10], (
        "an 8-day composite whose start and end fall on the same day would be "
        "presenting a compositing window as an instantaneous observation"
    )


def test_saral_model_fields_keep_their_own_institution(index):
    """The regression this guards: a European model field read as ISRO."""
    entries = index["products"].get("saral_altika_igdr_swh")
    if not entries:
        pytest.skip("no SARAL granules in this fixture set")
    variables = entries[0]["variables"]

    assert "swh" in variables, f"expected swh, found {sorted(variables)}"
    assert variables["swh"]["units"] == "m"

    expected = {
        "wind_speed_model_u": "ECMWF",
        "wind_speed_model_v": "ECMWF",
        "mean_wave_period_t02": "Meteo France",
        "mean_wave_direction": "Meteo France",
    }
    for name, institution in expected.items():
        if name not in variables:
            continue
        assert variables[name]["institution"] == institution, (
            f"{name} is a {institution} model field carried inside the SARAL "
            f"product; index.json records its institution as "
            f"{variables[name]['institution']!r}. Without this an adapter would "
            "publish a European model value as an ISRO measurement."
        )


def test_the_index_says_it_is_not_quality_filtered(index):
    assert "not_quality_filtered" in index
    notes = index.get("product_notes", {})
    if "saral_altika_igdr_swh" in index["products"]:
        note = notes.get("saral_altika_igdr_swh", "")
        assert "swh_rms" in note, (
            "the SARAL note must name swh_rms: raw swh in this set reaches "
            "29.66 m, and surface_type and qual_alt_1hz_swh do not remove it"
        )


def test_track_products_record_the_box_that_actually_produced_them(index):
    """A nadir altimeter is clipped to a wider box than the demo box. That is
    fine, and it has to be visible rather than implied."""
    if "saral_altika_igdr_swh" not in index["products"]:
        pytest.skip("no SARAL granules in this fixture set")
    assert index["track_margin_deg"] > 0
    box = index["bbox_lat_min_lat_max_lon_min_lon_max"]
    track = index["track_bbox_lat_min_lat_max_lon_min_lon_max"]
    assert track[0] < box[0] and track[1] > box[1], "track bbox is not wider in latitude"
    assert track[2] < box[2] and track[3] > box[3], "track bbox is not wider in longitude"
    assert "saral_altika_igdr_swh" in index["track_sampled_products"]


@pytest.mark.parametrize(
    "product,expected_units",
    [
        ("insat3dr_l3b_sst_daily", "K"),
        ("insat3dr_l3b_olr_daily", "W.m-2"),
    ],
)
def test_insat_units_are_the_granules_own(index, product, expected_units):
    entries = index["products"].get(product)
    if not entries:
        pytest.skip(f"no {product} granules in this fixture set")
    variables = entries[0]["variables"]
    name = next(iter(variables))
    assert variables[name]["units"] == expected_units, (
        f"{product}/{name} units are {variables[name]['units']!r}, expected "
        f"{expected_units!r} as written in the granule"
    )


def test_every_variable_summary_is_complete(index):
    """A summary missing units or a pixel count is a fixture nobody can use."""
    bad = []
    for product, items in index["products"].items():
        for entry in items:
            for name, v in entry["variables"].items():
                if v["total_pixels"] <= 0:
                    bad.append(f"{product}/{entry['file']}:{name} has no pixels")
                if "units" not in v or "valid_pixels" not in v:
                    bad.append(f"{product}/{entry['file']}:{name} is missing fields")
    assert not bad, "\n".join(bad[:10])
