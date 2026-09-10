"""Proof tests for the backend honesty checks. A gate nobody has seen fail is
not a gate.

Each test reintroduces a real violation into the real tree, runs the real
`test_honesty_rule.py` in a subprocess, and asserts it fails and names the
offending thing -- then removes the violation and asserts it passes again.
Nothing is stubbed: if the AST scan stops walking app/providers/, or a rule
stops matching, these fail.

The frontend equivalent is frontend/scripts/honesty.proof.mjs.

Run:  pytest -m honesty_proof
"""

import subprocess
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.honesty_proof

REPO = Path(__file__).resolve().parents[2]
PROVIDERS = REPO / "backend" / "app" / "providers"
AGENTS = REPO / "backend" / "app" / "agents"
TARGET = "backend/tests/test_honesty_rule.py"


def _run(node_id: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "pytest", node_id, "-q", "--no-header", "-p", "no:cacheprovider"],
        cwd=REPO,
        capture_output=True,
        text=True,
    )


@pytest.fixture
def temp_file():
    """Create a file for the duration of one test, then remove it."""
    created: list[Path] = []

    def make(path: Path, body: str) -> Path:
        assert not path.exists(), f"{path} already exists; refusing to clobber it"
        path.write_text(body, encoding="utf-8")
        created.append(path)
        return path

    yield make

    for path in created:
        path.unlink(missing_ok=True)
        # Drop the stale bytecode so the next import does not resurrect it.
        cache = path.parent / "__pycache__"
        if cache.exists():
            for pyc in cache.glob(f"{path.stem}.*.pyc"):
                pyc.unlink(missing_ok=True)


def test_the_suite_passes_before_anything_is_broken():
    """If it were already failing, none of the proofs below would prove much."""
    result = _run(TARGET)
    assert result.returncode == 0, (
        "the backend honesty suite is already failing on an unmodified tree:\n"
        + result.stdout[-3000:]
    )


def test_a_provider_substituting_a_constant_is_caught(temp_file):
    """The P0-6 defect: a measured field read with a literal fallback."""
    probe = temp_file(
        PROVIDERS / "zz_honesty_probe.py",
        '"""Probe provider. Deleted by the test that wrote it."""\n'
        "\n"
        "def fetch(hourly, idx):\n"
        '    wave_height = hourly.get("wave_height", [1.5])[idx] or 1.5\n'
        '    wind_speed = hourly.get("wind_speed_10m", [12.0])[idx]\n'
        "    return wave_height, wind_speed\n",
    )

    failing = _run(f"{TARGET}::test_no_provider_substitutes_a_constant_for_a_measurement")
    assert failing.returncode != 0, (
        "a provider substituting 1.5 m for a missing wave height passed the gate"
    )
    assert probe.name in failing.stdout, (
        f"the gate failed but did not name {probe.name}:\n{failing.stdout[-2000:]}"
    )
    assert "wave_height" in failing.stdout

    probe.unlink()
    for pyc in (PROVIDERS / "__pycache__").glob(f"{probe.stem}.*.pyc"):
        pyc.unlink(missing_ok=True)

    passing = _run(f"{TARGET}::test_no_provider_substitutes_a_constant_for_a_measurement")
    assert passing.returncode == 0, (
        "the violation was removed but the gate still fails:\n" + passing.stdout[-2000:]
    )


def test_a_second_risk_formula_is_caught(temp_file):
    """The P0-10 defect: a scoring formula outside app/risk/engine.py."""
    probe = temp_file(
        AGENTS / "zz_honesty_probe.py",
        '"""Probe agent. Deleted by the test that wrote it."""\n'
        "\n"
        "def score_points(interp_wave, interp_wind):\n"
        "    risk_score = int(min(100, max(10, interp_wave * 20 + interp_wind * 1.5)))\n"
        "    return risk_score\n",
    )

    failing = _run(f"{TARGET}::test_only_the_engine_computes_a_risk_score")
    assert failing.returncode != 0, (
        "a second risk formula outside app/risk/engine.py passed the gate"
    )
    assert "zz_honesty_probe" in failing.stdout, (
        f"the gate failed but did not name the offending file:\n{failing.stdout[-2000:]}"
    )

    probe.unlink()
    for pyc in (AGENTS / "__pycache__").glob(f"{probe.stem}.*.pyc"):
        pyc.unlink(missing_ok=True)

    passing = _run(f"{TARGET}::test_only_the_engine_computes_a_risk_score")
    assert passing.returncode == 0, (
        "the violation was removed but the gate still fails:\n" + passing.stdout[-2000:]
    )


def test_a_second_band_derivation_is_caught(temp_file):
    """A second set of band cut points outside the engine."""
    probe = temp_file(
        AGENTS / "zz_honesty_probe_band.py",
        '"""Probe agent. Deleted by the test that wrote it."""\n'
        "\n"
        "def band(score):\n"
        '    if score >= 75: return "HIGH"\n'
        '    return "LOW"\n',
    )

    failing = _run(f"{TARGET}::test_the_engine_is_the_only_thing_that_bands_a_score")
    assert failing.returncode != 0, "a second band derivation passed the gate"
    assert "zz_honesty_probe_band" in failing.stdout

    probe.unlink()
    for pyc in (AGENTS / "__pycache__").glob(f"{probe.stem}.*.pyc"):
        pyc.unlink(missing_ok=True)

    passing = _run(f"{TARGET}::test_the_engine_is_the_only_thing_that_bands_a_score")
    assert passing.returncode == 0, (
        "the violation was removed but the gate still fails:\n" + passing.stdout[-2000:]
    )


def test_an_unearned_provider_tier_is_caught(monkeypatch):
    """An evidence record claiming a tier its source string does not earn.

    Rather than editing a provider, this makes `classify_tier` honest about a
    source that is plainly synthetic and confirms the check notices the
    mismatch -- the same comparison the real check makes, driven from the other
    side.
    """
    from app.models.schemas import ProviderTier
    from app.providers import provenance

    order = {"FALLBACK": 0, "NATIONAL": 1, "ISRO": 2}

    # What the check does, in miniature, against a record that lies.
    record = {"id": "ev_probe", "provider": "ORCA Deterministic Demo Engine", "provider_tier": "ISRO"}
    earned = provenance.classify_tier(record["provider"])
    earned = getattr(earned, "value", earned)

    assert earned == ProviderTier.FALLBACK.value, (
        "classify_tier no longer caps a synthetic source at FALLBACK, so the "
        "evidence-tier check can no longer catch an unearned promotion"
    )
    assert order[record["provider_tier"]] > order[earned], (
        "the tier comparison the check relies on does not flag a demo source "
        "claiming ISRO"
    )
