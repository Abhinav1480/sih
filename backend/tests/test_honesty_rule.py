"""The honesty rule, enforced on the backend. See docs/HONESTY_RULE.md.

    No user-visible value may originate from a `||` default or an equivalent
    fallback, and no agency name may appear beside a value that agency did
    not produce.

The frontend half is frontend/scripts/check-honesty.mjs. This is the half that
needs the running system: whether a provider substitutes a constant, whether an
evidence record's provider is the one that produced the observation, and whether
anything but `calculate_marine_risk` scores risk.

Every check here has a proof test in test_honesty_rule_proofs.py that
reintroduces the violation and confirms the check fails on it.

Run:  pytest -m honesty
"""

import ast
import inspect
import re
from pathlib import Path

import pytest

from app.models.schemas import DataFreshness
from app.providers import provenance as provenance_module

pytestmark = pytest.mark.honesty

PROVIDERS_DIR = Path(__file__).resolve().parents[1] / "app" / "providers"
APP_DIR = Path(__file__).resolve().parents[1] / "app"

# Variables a provider MEASURES. A literal standing in for one of these is a
# fabricated observation; a literal standing in for a timeout or a page size is
# configuration.
MEASURED = (
    "wave_height", "swell_wave_height", "swell_wave_period", "swell_wave_direction",
    "wind_speed", "wind_gusts", "wind_direction", "temperature", "sea_surface",
    "sst", "chlorophyll", "salinity", "visibility", "current_speed",
    "current_direction", "tide", "depth", "pressure", "humidity", "precipitation",
)

_MEASURED_RE = re.compile("|".join(MEASURED), re.IGNORECASE)


def _measured(name: str) -> bool:
    return bool(name and _MEASURED_RE.search(name))


def _provider_files():
    return sorted(p for p in PROVIDERS_DIR.glob("*.py") if p.name != "__init__.py")


# ---------------------------------------------------------------------------
# 1. No provider returns a literal constant for a measured variable.
#    P0-6 scanned open_meteo.py alone. This scans every provider.
# ---------------------------------------------------------------------------


def _constant_substitutions(path: Path):
    """Find `x.get("wave_height", [1.5])` and `wave_height or 1.5` in one file."""
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    hits = []

    def literal(node):
        """The constant a node yields, if it is a bare literal or list of them."""
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, (ast.List, ast.Tuple)) and node.elts:
            vals = [literal(e) for e in node.elts]
            if all(v is not None for v in vals):
                return vals
        return None

    for node in ast.walk(tree):
        # d.get("wave_height", [1.5])
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "get"
            and len(node.args) == 2
            and isinstance(node.args[0], ast.Constant)
            and isinstance(node.args[0].value, str)
            and _measured(node.args[0].value)
        ):
            default = literal(node.args[1])
            if default is not None:
                hits.append((node.lineno, f'.get("{node.args[0].value}", {default!r})'))

        # wave_height or 1.5
        if isinstance(node, ast.BoolOp) and isinstance(node.op, ast.Or):
            last = node.values[-1]
            default = literal(last)
            if default is None:
                continue
            src = ast.unparse(node)
            if _measured(src):
                hits.append((node.lineno, src[:100]))

    return hits


@pytest.mark.parametrize("path", _provider_files(), ids=lambda p: p.name)
def test_no_provider_substitutes_a_constant_for_a_measurement(path):
    """The P0-6 defect class, across every provider rather than one file.

    `open_meteo.py` read six fields as `hourly.get("wave_height", [1.5])[idx]
    or 1.5`, so a feed that omitted a series produced 1.5 m seas and 12 kt
    winds -- a benign LOW-risk verdict -- published as a live Copernicus
    observation. A provider that does not carry a variable must say so.
    """
    hits = _constant_substitutions(path)
    assert not hits, (
        f"{path.name} substitutes a constant for a measured variable:\n"
        + "\n".join(f"    line {ln}: {src}" for ln, src in hits)
        + "\n  Raise ProviderUnavailable or omit the field. A constant published "
        "as an observation is indistinguishable from a measurement."
    )


# ---------------------------------------------------------------------------
# 2. An evidence record's provider must be the one that produced the value.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "query",
    [
        "Is it safe to venture into the sea tomorrow morning?",
        "Where is the nearest Potential Fishing Zone today?",
        "What are the tide, weather and sea conditions near my fishing location?",
        "Which fishing zones should be avoided due to hazardous marine conditions?",
    ],
)
def test_evidence_provider_matches_the_tier_its_source_earns(query):
    """An evidence record may not claim a tier its source string does not earn.

    `classify_tier` is the single place that maps a source string to a tier, and
    it caps anything blended, synthetic or European at FALLBACK. A record whose
    stored tier is more authoritative than what its own provider string
    classifies to is an unearned promotion -- the exact defect P0's provenance
    work removed.
    """
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        response = client.post(
            "/api/query",
            json={
                "query": query,
                "user_location": {"latitude": 16.9891, "longitude": 82.2475},
            },
        )
    assert response.status_code == 200
    evidence = response.json().get("evidence") or []
    assert evidence, f"no evidence returned for {query!r}"

    order = {"FALLBACK": 0, "NATIONAL": 1, "ISRO": 2}
    wrong = []
    for rec in evidence:
        provider = rec.get("provider") or ""
        claimed = rec.get("provider_tier") or "FALLBACK"
        earned = provenance_module.classify_tier(provider)
        earned = getattr(earned, "value", earned)
        if order.get(claimed, 0) > order.get(earned, 0):
            wrong.append(f"{rec.get('id')}: provider={provider!r} claims {claimed}, earns {earned}")

    assert not wrong, (
        "evidence records claim a tier their own provider string does not earn:\n"
        + "\n".join("    " + w for w in wrong)
    )


@pytest.mark.parametrize(
    "query",
    ["Is it safe to venture into the sea tomorrow morning?"],
)
def test_no_demo_value_is_labelled_live(query):
    """A synthetic value may not be published with a LIVE freshness stamp."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        response = client.post(
            "/api/query",
            json={
                "query": query,
                "user_location": {"latitude": 16.9891, "longitude": 82.2475},
            },
        )
    evidence = response.json().get("evidence") or []
    bad = [
        f"{r.get('id')}: provider={r.get('provider')!r} status={r.get('status')}"
        for r in evidence
        if r.get("status") == DataFreshness.LIVE.value
        and provenance_module.classify_tier(r.get("provider") or "")
        == provenance_module.ProviderTier.FALLBACK
        and any(
            m in (r.get("provider") or "").lower()
            for m in ("demo", "synthetic", "deterministic", "simulated", "fixture")
        )
    ]
    assert not bad, "a synthetic value is stamped LIVE:\n" + "\n".join("    " + b for b in bad)


# ---------------------------------------------------------------------------
# 3. Only calculate_marine_risk may produce a risk score.
# ---------------------------------------------------------------------------

# The engine itself, and the modules allowed to hold the constants it uses.
_RISK_SOURCE_ALLOWED = {
    "risk/engine.py",
}

# A second scoring formula looks like arithmetic on a wave height or wind speed
# assigned to something named like a score. `score_zone` in risk/pfz.py scores
# fishing SUITABILITY, not marine risk, and is not this rule's business.
_SCORE_ASSIGN = re.compile(
    r"\b(\w*(?:risk_score|overall_score|hazard_score)\w*)\s*=\s*(?!.*calculate_marine_risk)",
    re.IGNORECASE,
)


def _python_sources():
    for path in sorted(APP_DIR.rglob("*.py")):
        rel = path.relative_to(APP_DIR).as_posix()
        if "__pycache__" in rel:
            continue
        yield rel, path


def test_only_the_engine_computes_a_risk_score():
    """CLAUDE.md designates app/risk/engine.py as the single source of risk.

    A second formula shipped once already: `generate_historical_trend` scored
    interpolated points as `interp_wave * 20 + interp_wind * 1.5`, disagreeing
    with the engine by up to 55 points for the same instant inside the same
    response.
    """
    offenders = []
    for rel, path in _python_sources():
        if rel in _RISK_SOURCE_ALLOWED:
            continue
        text = path.read_text(encoding="utf-8")
        for i, line in enumerate(text.split("\n"), start=1):
            stripped = line.strip()
            if stripped.startswith("#") or stripped.startswith('"'):
                continue
            m = _SCORE_ASSIGN.search(line)
            if not m:
                continue
            # Reading a score off a model, or passing one through, is fine.
            rhs = line.split("=", 1)[1]
            if not re.search(r"[*/+-]\s*\d|\bmin\(|\bmax\(|\bint\(|\bround\(", rhs):
                continue
            offenders.append(f"{rel}:{i}  {stripped[:110]}")

    assert not offenders, (
        "a risk score is being computed outside app/risk/engine.py:\n"
        + "\n".join("    " + o for o in offenders)
        + "\n  calculate_marine_risk is the only formula. Two formulas means two "
        "answers to the same question in the same response."
    )


def test_the_engine_is_the_only_thing_that_bands_a_score():
    """The band must come from the engine's own cut points, not a second set."""
    from app.risk import engine

    source = inspect.getsource(engine)
    assert "def calculate_marine_risk" in source
    # The engine keeps its thresholds; nothing else may restate them.
    offenders = []
    for rel, path in _python_sources():
        if rel in _RISK_SOURCE_ALLOWED:
            continue
        text = path.read_text(encoding="utf-8")
        for i, line in enumerate(text.split("\n"), start=1):
            if re.search(r'["\']SEVERE["\']\s*if\b|\bif\s+\w*score\w*\s*>=?\s*\d+.*["\']HIGH["\']', line):
                offenders.append(f"{rel}:{i}  {line.strip()[:110]}")
    assert not offenders, (
        "a risk band is being derived outside app/risk/engine.py:\n"
        + "\n".join("    " + o for o in offenders)
    )
