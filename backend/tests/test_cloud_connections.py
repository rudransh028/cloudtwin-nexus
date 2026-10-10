from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api import cloud_connections


def client():
    app = FastAPI()
    app.include_router(cloud_connections.router, prefix="/api/v1")
    return TestClient(app)


def test_render_connection_returns_inventory_without_echoing_key(monkeypatch):
    class Response:
        status_code = 200
        @staticmethod
        def json():
            return [{"service": {"id": "srv_123", "name": "demo-api", "type": "web_service", "region": "oregon"}}]
    class AsyncClient:
        def __init__(self, *args, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def get(self, url, **kwargs):
            assert url == "https://api.render.com/v1/services"
            assert kwargs["headers"]["Authorization"] == "Bearer test-key-123"
            return Response()
    monkeypatch.setattr(cloud_connections.httpx, "AsyncClient", AsyncClient)
    response = client().post("/api/v1/connections/test/render", json={"api_key": "test-key-123"})
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True
    assert data["serviceCountReturned"] == 1
    assert data["services"][0]["name"] == "demo-api"
    assert "test-key-123" not in response.text
    assert "not saved" in data["message"].lower()


def test_rejected_render_key_returns_safe_error(monkeypatch):
    class Response:
        status_code = 401
    class AsyncClient:
        def __init__(self, *args, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def get(self, url, **kwargs): return Response()
    monkeypatch.setattr(cloud_connections.httpx, "AsyncClient", AsyncClient)
    response = client().post("/api/v1/connections/test/render", json={"api_key": "bad-key"})
    assert response.status_code == 401
    assert "rejected" in response.json()["detail"].lower()
    assert "bad-key" not in response.text
