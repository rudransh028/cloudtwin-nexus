from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_website_monitor_blocks_local_targets():
    response = client.post("/api/v1/website-monitor/check", json={"url": "http://localhost:8000/healthz"})
    assert response.status_code == 400


def test_website_monitor_requires_valid_public_url():
    response = client.post("/api/v1/website-monitor/check", json={"url": "not a valid url"})
    assert response.status_code == 400


def test_website_monitor_history_is_available():
    response = client.get("/api/v1/website-monitor/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
