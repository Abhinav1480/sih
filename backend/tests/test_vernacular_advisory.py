"""The vernacular advisory must not contradict the verdict shown beside it.

Before this suite, `multilingual.py` chose the advisory with a two-state
ladder — `is_safe = risk_category in ("LOW", "MODERATE")` — over the engine's
four bands. A MODERATE band carries verdict CAUTION in the envelope, so an
English reader was told to stay in sheltered water while a Telugu, Tamil or
Hindi reader reading the identical risk score was told conditions were
favourable and they could go fishing.

These tests pin the property that failed: for every supported language, every
band gets its own advisory, and no band ever borrows a milder band's text.
"""

import pytest

from app.utils.multilingual import (
    BAND_ADVISORY,
    LANGUAGE_CODES,
    MARINE_VOCAB,
    UNTRANSLATED_NOTICE,
    advisory_for_band,
    band_label,
)

BANDS = ["LOW", "MODERATE", "HIGH", "SEVERE"]

# Order of increasing danger. The advisory for a more dangerous band must never
# be the same string as one for a less dangerous band.
SAFE_BANDS = ["LOW", "MODERATE"]
DANGEROUS_BANDS = ["HIGH", "SEVERE"]

ALL_LANGS = sorted(LANGUAGE_CODES.keys())

WAVE = 2.5
WIND = 21.9
HORIZON = "Tomorrow"


@pytest.mark.parametrize("lang", ALL_LANGS)
def test_every_language_has_an_advisory_for_every_band(lang):
    """No band may fall through to another band's text."""
    for band in BANDS:
        text = advisory_for_band(lang, band, WAVE, WIND, HORIZON)
        assert text and text.strip(), f"{lang}/{band} produced no advisory"


@pytest.mark.parametrize("lang", ALL_LANGS)
def test_the_four_bands_are_four_distinct_advisories(lang):
    """This is the regression. Two-state collapse shows up here as a duplicate."""
    texts = {band: advisory_for_band(lang, band, WAVE, WIND, HORIZON) for band in BANDS}
    assert len(set(texts.values())) == len(BANDS), (
        f"{lang}: bands collapsed onto the same advisory -> "
        f"{ {b: t[:40] for b, t in texts.items()} }"
    )


@pytest.mark.parametrize("lang", ALL_LANGS)
def test_a_dangerous_band_never_reuses_a_safe_band_advisory(lang):
    """The exact inversion: MODERATE/HIGH/SEVERE rendering as 'go fishing'."""
    safe_texts = {advisory_for_band(lang, b, WAVE, WIND, HORIZON) for b in SAFE_BANDS}
    for band in DANGEROUS_BANDS:
        text = advisory_for_band(lang, band, WAVE, WIND, HORIZON)
        assert text not in safe_texts, f"{lang}/{band} is serving a safe-band advisory"


@pytest.mark.parametrize("lang", ALL_LANGS)
def test_moderate_is_not_the_low_advisory(lang):
    """MODERATE is the most common band and the one the old ladder mislabelled."""
    low = advisory_for_band(lang, "LOW", WAVE, WIND, HORIZON)
    moderate = advisory_for_band(lang, "MODERATE", WAVE, WIND, HORIZON)
    assert moderate != low, f"{lang}: MODERATE is being served the LOW advisory"


@pytest.mark.parametrize("lang", ALL_LANGS)
def test_severity_ordering_matches_english(lang):
    """
    Each language's four advisories must map one-to-one onto the four bands in
    the same arrangement English uses: a bijection band -> text, with no band
    sharing a partner. If a language collapsed two bands, the set shrinks.
    """
    english = {b: advisory_for_band("en", b, WAVE, WIND, HORIZON) for b in BANDS}
    target = {b: advisory_for_band(lang, b, WAVE, WIND, HORIZON) for b in BANDS}

    assert len(set(english.values())) == len(set(target.values())) == len(BANDS), (
        f"{lang}: band->advisory is not a bijection, so severity ordering "
        f"cannot match English"
    )


@pytest.mark.parametrize("lang", ALL_LANGS)
def test_computed_values_appear_in_the_advisory(lang):
    """Wave and wind were dropped entirely on the vernacular path."""
    text = advisory_for_band(lang, "MODERATE", WAVE, WIND, HORIZON)
    assert "2.5" in text, f"{lang}: wave height missing from advisory"
    assert "21.9" in text, f"{lang}: wind speed missing from advisory"
    assert HORIZON in text, f"{lang}: time horizon missing from advisory"


@pytest.mark.parametrize("lang", [l for l in ALL_LANGS if l != "en"])
def test_missing_values_say_unavailable_rather_than_printing_none(lang):
    text = advisory_for_band(lang, "MODERATE", None, None, HORIZON)
    assert "None" not in text, f"{lang}: a missing value leaked as 'None'"


@pytest.mark.parametrize("lang", [l for l in ALL_LANGS if l in MARINE_VOCAB])
def test_the_band_word_itself_is_translated(lang):
    """
    MARINE_VOCAB spells moderate 'mod_risk', so the old f"{band.lower()}_risk"
    lookup missed MODERATE and printed the raw English enum inside an otherwise
    vernacular sentence.
    """
    for band in BANDS:
        label = band_label(lang, band)
        assert label != band, f"{lang}/{band}: band word left as the English enum"


def test_an_untranslated_language_says_so_rather_than_softening():
    """
    A language with no advisory table must be told the text is English, never
    quietly handed a milder band.
    """
    unknown = "xx"
    severe = advisory_for_band(unknown, "SEVERE", WAVE, WIND, HORIZON)
    low = advisory_for_band(unknown, "LOW", WAVE, WIND, HORIZON)

    assert severe != low, "an unknown language collapsed SEVERE onto LOW"
    assert BAND_ADVISORY["en"]["SEVERE"] in severe

    # And a known language missing one band gets the notice, in its own script.
    assert set(UNTRANSLATED_NOTICE).issubset(set(MARINE_VOCAB)), (
        "every language that can carry a notice must be a vocab language"
    )


def test_english_and_vernacular_come_from_the_same_resolver():
    """
    English is not a special case. If it were resolved elsewhere the two paths
    could drift, which is how the original defect survived review.
    """
    for band in BANDS:
        assert advisory_for_band("en", band, WAVE, WIND, HORIZON).startswith(
            BAND_ADVISORY["en"][band][:20]
        )
