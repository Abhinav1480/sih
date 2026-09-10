"""app/utils/clock.py resolves "now" against a clock the demo can freeze.

The module arrived from rescue/mosdac-work reading settings.ORCA_DEMO_NOW,
which did not exist in app/config.py. Nothing imported clock.py yet, so it was
never called and never raised -- but every call raised AttributeError. The
setting exists now; this pins both halves of the behaviour so the module is
safe to wire up.
"""

from datetime import datetime, timezone

import pytest

from app.config import settings
from app.utils.clock import now


@pytest.fixture
def clock_settings(monkeypatch):
    def configure(mode: str, frozen: str):
        monkeypatch.setattr(settings, "ORCA_MODE", mode, raising=False)
        monkeypatch.setattr(settings, "ORCA_DEMO_NOW", frozen, raising=False)

    return configure


def test_the_setting_exists():
    """The regression: clock.now() raised AttributeError, not a wrong time."""
    assert hasattr(settings, "ORCA_DEMO_NOW"), (
        "app/utils/clock.py reads settings.ORCA_DEMO_NOW; without it every "
        "call to now() raises AttributeError"
    )


def test_demo_mode_freezes_now(clock_settings):
    clock_settings("DEMO", "2026-09-10T09:00:00Z")
    assert now() == datetime(2026, 9, 10, 9, 0, tzinfo=timezone.utc)


def test_a_naive_frozen_time_is_read_as_utc(clock_settings):
    clock_settings("DEMO", "2026-09-10T09:00:00")
    assert now() == datetime(2026, 9, 10, 9, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "mode,frozen",
    [("LIVE", "2026-09-10T09:00:00Z"), ("DEMO", ""), ("DEMO", "   ")],
    ids=["live-ignores-the-freeze", "demo-with-no-freeze", "demo-with-blank-freeze"],
)
def test_falls_back_to_the_wall_clock(clock_settings, mode, frozen):
    clock_settings(mode, frozen)
    before = datetime.now(timezone.utc)
    value = now()
    assert before <= value <= datetime.now(timezone.utc)
    assert value.tzinfo is not None
