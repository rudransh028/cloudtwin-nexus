import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.dtos import SimulationScenario

client = TestClient(app)

def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_dashboard_summary():
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "healthScore" in data

def test_digital_twin_components():
    response = client.get("/api/v1/components")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_simulation_run():
    scenario = {
        "name": "Test Simulation",
        "trafficMultiplier": 2.0,
        "injectedFailures": ["api"],
        "infraChanges": []
    }
    response = client.post("/api/v1/simulations", json=scenario)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["latencyAfter"] > 0
    assert "components" in data

def test_predictions():
    response = client.get("/api/v1/predictions")
    assert response.status_code == 200

def test_cost_breakdown():
    response = client.get("/api/v1/cost/breakdown")
    assert response.status_code == 200

def test_architecture_findings():
    response = client.get("/api/v1/findings")
    assert response.status_code == 200

def test_optimizer():
    response = client.get("/api/v1/architectures")
    assert response.status_code == 200
