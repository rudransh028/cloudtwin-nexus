from fastapi.testclient import TestClient
from app.main import app


def test_render_cost_status_never_returns_mock_values():
    response = TestClient(app).get("/api/v1/real-cloud/costs")
    assert response.status_code == 200
    payload = response.json()
    assert payload["connected"] is False
    assert payload["monthToDate"] is None
    assert payload["services"] == []
    assert payload["source"] == "Render Billing dashboard"
    assert "No AWS connection" in payload["message"]


def test_live_summary_requires_render_key(monkeypatch):
    monkeypatch.delenv("RENDER_API_KEY", raising=False)
    response = TestClient(app).get("/api/v1/real-cloud/summary")
    assert response.status_code == 503
    assert "RENDER_API_KEY" in response.json()["detail"]
