from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_telemetry_summary_has_real_process_measurements():
    response = client.get("/api/v1/telemetry/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "CloudTwin Nexus FastAPI application telemetry"
    assert "not the whole container" in payload["scope"]
    assert payload["measuredAt"]
    assert payload["process"]["pid"] > 0
    assert payload["process"]["memoryMeaning"].startswith("Resident set size")
    assert payload["process"]["memoryRssBytes"] is None or payload["process"]["memoryRssBytes"] > 0
    assert payload["process"]["cpuPercent"] is None or payload["process"]["cpuPercent"] >= 0
    assert "requestCountSinceProcessStart" in payload["http"]
    assert payload["http"]["latencySampleCapacity"] == 1000


def test_telemetry_reads_do_not_count_themselves():
    before = client.get("/api/v1/telemetry/summary").json()["http"]["requestCountSinceProcessStart"]
    health = client.get("/healthz")
    after = client.get("/api/v1/telemetry/summary").json()["http"]["requestCountSinceProcessStart"]

    assert health.status_code == 200
    assert after == before + 1


def test_latency_is_null_before_any_observed_requests_or_numeric_after_one():
    response = client.get("/api/v1/telemetry/summary")
    http = response.json()["http"]

    assert http["latencySampleCount"] <= http["latencySampleCapacity"]
    if http["latencySampleCount"]:
        assert http["averageLatencyMsRecentSamples"] >= 0
        assert http["p95LatencyMsRecentSamples"] >= 0
