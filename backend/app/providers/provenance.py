"""Classify a data source string into a provenance tier.

The rule this module exists to enforce: **a value is only as authoritative as
its weakest ingredient**. A number blended from an ISRO product and a European
model is FALLBACK, not ISRO. A synthetic demo value is FALLBACK regardless of
what it is emulating.

Never label a fallback source as ISRO. A judge who catches one mislabelled
source discounts the whole platform, and honest fallback labelling beats fake
authority every time.

BE-02 registers the real ISRO chain (Bhuvan, MOSDAC, Bhoonidhi, Oceansat-3,
SCATSAT, SARAL-AltiKa, INSAT) against these markers.
"""

from typing import Optional

from app.models.schemas import DataFreshness, ProviderTier

# Checked first: any of these anywhere in the source string caps the tier at
# FALLBACK, even when an authoritative name also appears.
_FALLBACK_MARKERS = (
    "open-meteo",
    "open meteo",
    "copernicus",
    "ecmwf",
    "noaa",
    "gfs",
    "demo",
    "synthetic",
    "deterministic",
    "simulated",
    "fixture",
)

_ISRO_MARKERS = (
    "isro",
    "nrsc",
    "bhuvan",
    "mosdac",
    "bhoonidhi",
    "insat",
    "oceansat",
    "eos-06",
    "eos06",
    "scatsat",
    "oscat",
    "saral",
    "altika",
    "ocm",
    "resourcesat",
    "cartosat",
)

_NATIONAL_MARKERS = (
    "incois",
    "imd",
    "india meteorological",
    "indian national centre",
    "moefcc",
    "indian coast guard",
    "fishery survey of india",
)


def classify_tier(source: Optional[str], status: Optional[DataFreshness] = None) -> ProviderTier:
    """Return the provenance tier for a value produced by `source`.

    `status` is authoritative when it says DEMO: a synthetic value is never
    promoted above FALLBACK no matter how the provider names itself.
    """
    if status == DataFreshness.DEMO:
        return ProviderTier.FALLBACK

    text = (source or "").lower()
    if not text:
        return ProviderTier.FALLBACK
    if any(marker in text for marker in _FALLBACK_MARKERS):
        return ProviderTier.FALLBACK
    if any(marker in text for marker in _ISRO_MARKERS):
        return ProviderTier.ISRO
    if any(marker in text for marker in _NATIONAL_MARKERS):
        return ProviderTier.NATIONAL
    return ProviderTier.FALLBACK


def is_synthetic(source: Optional[str], status: Optional[DataFreshness] = None) -> bool:
    """True when the value was generated rather than observed.

    Checks the source string as well as the status: a provider can label
    itself "(Demo Mode)" while still reporting FORECAST freshness, and the
    note attached to such a value must not claim it is a real product.
    """
    if status == DataFreshness.DEMO:
        return True
    text = (source or "").lower()
    return any(marker in text for marker in ("demo", "synthetic", "simulated", "fixture"))


def reliability_note(
    status: Optional[DataFreshness],
    live_note: str,
    source: Optional[str] = None,
) -> str:
    """Return a provenance note that is true for how the value was produced.

    A synthetic value must never carry a calibration claim. `live_note`
    describes the real product and is used only when the value came from one.
    """
    if is_synthetic(source, status):
        return (
            "Synthetic value from ORCA's deterministic demo model. Not an "
            "observation, not calibrated, and not attributable to any agency."
        )
    if status == DataFreshness.UNAVAILABLE:
        return "Source unreachable at retrieval time; no value was obtained."
    return live_note


def demo() -> None:
    """Self-check: the weakest ingredient decides the tier."""
    assert classify_tier("ISRO Bhuvan WMS") == ProviderTier.ISRO
    assert classify_tier("INCOIS Ocean State Forecast") == ProviderTier.NATIONAL
    assert classify_tier("Open-Meteo Marine") == ProviderTier.FALLBACK
    # Blended: an ISRO name does not launder the European model beside it.
    assert classify_tier("INCOIS OSF / Open-Meteo Marine") == ProviderTier.FALLBACK
    assert classify_tier("MOSDAC INSAT-3D / Copernicus") == ProviderTier.FALLBACK
    # A synthetic value is capped regardless of its label.
    assert classify_tier("MOSDAC INSAT-3D", DataFreshness.DEMO) == ProviderTier.FALLBACK
    assert classify_tier(None) == ProviderTier.FALLBACK
    assert "deterministic demo model" in reliability_note(DataFreshness.DEMO, "buoy-calibrated")
    assert reliability_note(DataFreshness.LIVE, "buoy-calibrated") == "buoy-calibrated"
    # A provider that labels itself demo but reports FORECAST is still synthetic.
    assert is_synthetic("INCOIS OSF Multi-Grid (Demo Mode)", DataFreshness.FORECAST)
    assert "deterministic demo model" in reliability_note(
        DataFreshness.FORECAST, "buoy-calibrated", "INCOIS OSF Multi-Grid (Demo Mode)"
    )
    assert not is_synthetic("Open-Meteo Marine", DataFreshness.LIVE)
    print("provenance self-check OK")


if __name__ == "__main__":
    demo()
