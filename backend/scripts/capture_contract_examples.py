"""Capture real API responses as the frozen contract's reference fixtures.

These are not hand-written examples. Every file under docs/examples/ is the
verbatim body ORCA returned for the query named in it, so a field that appears
in the documentation and not in a capture, or the reverse, is a discrepancy the
schema test will find.

Reproducibility. The captures are taken with ORCA_DEMO_NOW pinned, because the
committed ISRO granules cover 1-9 September 2026 and each product has its own
validity: without a fixed clock the same query returns real granule data one
week and the labelled synthetic fallback the next, and the diff would be noise
rather than drift. Fields that record when ORCA did something -- request ids,
generated_at, trace durations -- are still real, so they are normalised out
here rather than pinned, and the schema test ignores them.

Usage, from the repository root:

    python backend/scripts/capture_contract_examples.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

# Pin the clock before anything imports settings.
os.environ.setdefault("ORCA_MODE", "DEMO")
os.environ.setdefault("ORCA_DEMO_NOW", "2026-09-09T06:00:00Z")

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))

OUT = REPO / "docs" / "examples"
KAKINADA = {"latitude": 16.9891, "longitude": 82.2475}

# The eight queries from the problem statement, in order.
CANONICAL = [
    ("01-nearest-pfz", "Where is the nearest Potential Fishing Zone today?"),
    ("02-safe-to-venture", "Is it safe to venture into the sea tomorrow morning?"),
    ("03-tide-weather-sea", "What are the tide, weather and sea conditions near my fishing location?"),
    ("04-lightning-cyclone", "Are there any lightning or cyclone alerts in my area?"),
    ("05-chlorophyll-sst", "Which regions show high chlorophyll concentration and favourable sea surface temperature?"),
    ("06-safest-route", "What is the safest route for a fishing vessel considering weather and sea state conditions?"),
    ("07-productivity-decline", "Why has fish productivity declined in a particular coastal region?"),
    ("08-zones-to-avoid", "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?"),
]

# Values that are real but different on every run. Replaced so a capture diff
# shows contract drift and nothing else.
VOLATILE_KEYS = {
    "request_id", "session_id", "conversation_id", "query_id", "generated_at",
    "retrieval_time", "duration_ms", "processing_time_ms", "timestamp", "id",
    "evidence_ids", "total_duration_ms", "issued_at",
}
_UUID = re.compile(r"^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$", re.I)


def normalise(node):
    """Replace per-run values with stable placeholders, recursively."""
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            if key in VOLATILE_KEYS:
                out[key] = _placeholder(key, value)
            else:
                out[key] = normalise(value)
        return out
    if isinstance(node, list):
        return [normalise(v) for v in node]
    return node


# A placeholder must still be a valid value of its own type, or the captures
# stop being validatable against the envelope and the freeze test can only
# check field names.
FROZEN_TIME = "2026-09-09T06:00:00Z"
_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}")


def _placeholder(key, value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return 0
    if isinstance(value, list):
        return ["00000000" for _ in value]
    if value is None:
        return None
    if isinstance(value, str):
        if _ISO.match(value):
            return FROZEN_TIME
        if _UUID.match(value):
            return "00000000-0000-4000-8000-000000000000"
        return "00000000"
    return value


def main() -> int:
    from fastapi.testclient import TestClient

    from app.main import app
    from app.models.envelope import CONTRACT_VERSION

    OUT.mkdir(parents=True, exist_ok=True)
    written = []

    with TestClient(app) as client:
        for slug, query in CANONICAL:
            response = client.post(
                "/api/query", json={"query": query, "user_location": KAKINADA}
            )
            body = normalise(response.json())
            payload = {
                "_contract_version": CONTRACT_VERSION,
                "_request": {"query": query, "user_location": KAKINADA},
                "_status": response.status_code,
                "response": body,
            }
            path = OUT / f"canonical-{slug}.json"
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            written.append(path)

        # Alerts.
        alerts = client.get("/api/alerts", params=KAKINADA)
        (OUT / "alerts.json").write_text(
            json.dumps(
                {
                    "_contract_version": CONTRACT_VERSION,
                    "_request": {"method": "GET", "path": "/api/alerts", "params": KAKINADA},
                    "_status": alerts.status_code,
                    "response": normalise(alerts.json()),
                },
                indent=2, ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        written.append(OUT / "alerts.json")

        # A conversation: the follow-up turns are where state is carried, and
        # the shape of a follow-up response is part of the contract too.
        turns = [
            "Find a lower-risk route from Kakinada to Visakhapatnam that avoids protected waters tomorrow morning.",
            "What happens if I choose the alternative route instead?",
            "Compare it with the recommended route.",
        ]
        conversation_id = None
        captured = []
        for turn in turns:
            payload = {"query": turn, "user_location": KAKINADA}
            if conversation_id:
                payload["conversation_id"] = conversation_id
            response = client.post("/api/query", json=payload)
            body = response.json()
            conversation_id = body.get("session_id") or body.get("conversation_id") or conversation_id
            captured.append(
                {
                    "_request": normalise(payload),
                    "_status": response.status_code,
                    "response": normalise(body),
                }
            )
        (OUT / "conversation.json").write_text(
            json.dumps(
                {"_contract_version": CONTRACT_VERSION, "turns": captured},
                indent=2, ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        written.append(OUT / "conversation.json")

    for path in written:
        print(f"  wrote {path.relative_to(REPO)}  ({path.stat().st_size // 1024} KB)")
    print(f"\n{len(written)} reference responses at contract {CONTRACT_VERSION}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
