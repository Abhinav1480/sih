"""What a judge sees on screen must agree with what the engine decided."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
KAKINADA = {"latitude": 16.9891, "longitude": 82.2475}


def test_bootstrap_layers_carry_isro_wms_and_mpa_polygons():
    body = client.get("/api/layers", params={"lat": 16.9891, "lon": 82.2475}).json()
    layers = body["layers"]
    ids = {l["id"] for l in layers}
    assert "layer_locations" in ids and "layer_mpas" in ids
    wms = [l for l in layers if l["kind"] == "wms"]
    assert len(wms) >= 4 and all(l["provider_tier"] == "ISRO" for l in wms)
    assert all(l["provider_tier"] in {"ISRO", "NATIONAL", "FALLBACK"} for l in layers)


def test_bootstrap_layers_without_a_position_still_serve_the_map():
    layers = client.get("/api/layers").json()["layers"]
    assert any(l["kind"] == "wms" for l in layers)
    assert not any(l["id"] == "layer_locations" for l in layers)


def test_advisory_prose_never_contradicts_the_verdict():
    """A CAUTION or NO_GO verdict must not be accompanied by 'favorable' prose."""
    for query in (
        "Is it safe to venture into the sea tomorrow morning?",
        "What are the tide, weather and sea conditions near my fishing location?",
    ):
        env = client.post("/api/query", json={"query": query, "user_location": KAKINADA}).json()
        advisory = " ".join(c["body"] for c in env["cards"] if c["type"] == "advisory_text").lower()
        if env["answer"]["verdict"] in ("CAUTION", "NO_GO"):
            assert "favorable" not in advisory, (env["answer"]["verdict"], advisory)
        if env["answer"]["verdict"] == "GO":
            assert "no-go" not in advisory


def test_synthetic_layers_and_quality_labels_carry_no_agency_name():
    env = client.post("/api/query", json={"query": "Is it safe to venture into the sea tomorrow morning?", "user_location": KAKINADA}).json()
    for layer in env["layers"]:
        if layer["provider_tier"] == "FALLBACK":
            assert "INCOIS" not in layer["name"] and "IMD" not in layer["name"], layer["name"]
    # DEMO inputs are synthetic even when their freshness says FORECAST.
    assert env["meta"]["mode"] == "DEMO"
    assert "DEMO" in env["risk"]["data_quality"] or "synthetic" in env["risk"]["data_quality"].lower()
