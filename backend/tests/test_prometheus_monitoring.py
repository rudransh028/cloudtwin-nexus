from __future__ import annotations

import asyncio
import socket
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api import prometheus_monitoring as prom


def test_vector_rows_parses_prometheus_numeric_values():
    body = {
        "status": "success",
        "data": {
            "resultType": "vector",
            "result": [
                {"metric": {"instance": "node-a:9100", "job": "node"}, "value": [1, "82.3"]},
                {"metric": {"instance": "node-b:9100"}, "value": [1, "NaN"]},
                {"metric": {"job": "node-without-instance"}, "value": [1, "1"]},
            ],
        },
    }
    rows = prom._vector_rows(body)
    assert len(rows) == 2
    assert rows[0]["key"] == "node-a:9100"
    assert rows[0]["value"] == 82.3
    assert rows[1]["key"] == "node-without-instance"


def test_history_rows_averages_same_timestamp_across_series():
    body = {"data": {"resultType": "matrix", "result": [
        {"metric": {"cpu": "0"}, "values": [[1000, "10"], [1060, "20"]]},
        {"metric": {"cpu": "1"}, "values": [[1000, "30"], [1060, "40"]]},
    ]}}
    rows = prom._history_rows(body)
    assert [row["value"] for row in rows] == [20.0, 30.0]


def test_merge_keeps_down_target_and_only_returns_real_values():
    payload = {
        "up": {"rows": [{"key": "node-a:9100", "value": 1, "labels": {"job": "node"}}, {"key": "node-b:9100", "value": 0, "labels": {"job": "node"}}]},
        "cpu": {"rows": [{"key": "node-a:9100", "value": 46.6, "labels": {"job": "node"}}]},
        "memory": {"rows": []},
    }
    rows = prom._merge_resource_rows(payload)
    by_host = {row["instance"]: row for row in rows}
    assert by_host["node-a:9100"]["cpuPercent"] == 46.6
    assert by_host["node-a:9100"].get("memoryPercent") is None
    assert by_host["node-b:9100"]["up"] is False


def test_private_ip_is_blocked_by_default(monkeypatch):
    monkeypatch.delenv("PROMETHEUS_ALLOW_PRIVATE_NETWORKS", raising=False)
    with pytest.raises(HTTPException) as exc:
        prom._normalize_and_validate_url("https://127.0.0.1:9090")
    assert exc.value.status_code == 422
    assert "non-public" in str(exc.value.detail)


def test_plain_http_is_blocked_by_default(monkeypatch):
    monkeypatch.delenv("PROMETHEUS_ALLOW_PRIVATE_NETWORKS", raising=False)
    with pytest.raises(HTTPException) as exc:
        prom._normalize_and_validate_url("http://prometheus.example.com:9090")
    assert exc.value.status_code == 422
    assert "HTTPS" in str(exc.value.detail)


def test_normalizes_prometheus_path_prefix(monkeypatch):
    monkeypatch.setenv("PROMETHEUS_ALLOW_PRIVATE_NETWORKS", "false")
    monkeypatch.setattr(prom.socket, "getaddrinfo", lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))])
    base, host, port = prom._normalize_and_validate_url("https://metrics.example.com/api/v1/")
    assert base == "https://metrics.example.com"
    assert host == "metrics.example.com"
    assert port == 443


def test_rejects_password_embedded_in_url():
    with pytest.raises(HTTPException) as exc:
        prom._normalize_and_validate_url("https://user:secret@metrics.example.com")
    assert exc.value.status_code == 422


def test_request_model_requires_complete_basic_auth_pair():
    with pytest.raises(Exception):
        prom.PrometheusSnapshotRequest(endpoint="https://metrics.example.com", username="metrics-user")


def test_snapshot_endpoint_uses_live_queries_and_rule_based_insights(monkeypatch):
    monkeypatch.setattr(prom.socket, "getaddrinfo", lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))])

    class FakeResponse:
        def __init__(self, body, status=200):
            self._body = body
            self.status_code = status
            self.content = b"ok"

        def json(self):
            return self._body

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, params=None, headers=None, auth=None):
            query = (params or {}).get("query", "")
            if url.endswith("/api/v1/query_range"):
                return FakeResponse({"status": "success", "data": {"resultType": "matrix", "result": []}})
            if query == "up":
                rows = [
                    {"metric": {"instance": "node-a:9100", "job": "node"}, "value": [1, "1"]},
                    {"metric": {"instance": "node-b:9100", "job": "node"}, "value": [1, "0"]},
                ]
            elif query == prom.QUERIES["cpu"]:
                rows = [{"metric": {"instance": "node-a:9100", "job": "node"}, "value": [1, "96"]}]
            elif query == prom.QUERIES["memory"]:
                rows = [{"metric": {"instance": "node-a:9100", "job": "node"}, "value": [1, "91"]}]
            else:
                rows = []
            return FakeResponse({"status": "success", "data": {"resultType": "vector", "result": rows}})

    monkeypatch.setattr(prom.httpx, "AsyncClient", lambda *args, **kwargs: FakeClient())
    payload = prom.PrometheusSnapshotRequest(endpoint="https://metrics.example.com", include_history=True)
    result = asyncio.run(prom.get_prometheus_snapshot(payload))
    assert result["connected"] is True
    assert result["targetsTotal"] == 2
    assert result["targetsDown"] == 1
    assert result["averageCpuPercent"] == 96
    assert result["averageMemoryPercent"] == 91
    assert any("target(s) are down" in item["title"] for item in result["insights"])
    assert any("High CPU" in item["title"] for item in result["insights"])
    assert result["credentialHandling"].endswith("not stored.")
