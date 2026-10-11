"""Secure, on-demand queries against a user-configured Prometheus HTTP API.

Credentials are request-scoped and are never persisted. Missing exporters/series are
reported as unavailable; this module never synthesizes infrastructure measurements.
"""
from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, SecretStr, model_validator

router = APIRouter(prefix="/prometheus", tags=["Prometheus Live Metrics"])

MAX_RESPONSE_BYTES = 2_000_000
REQUEST_TIMEOUT_SECONDS = 10.0

QUERIES: dict[str, str] = {
    "up": "up",
    "cpu": '100 * (1 - avg by (instance, job) (rate(node_cpu_seconds_total{mode="idle"}[5m])))',
    "memory": "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))",
    "disk": 'max by (instance, job) (100 * (1 - (node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"})))',
    "load1": "node_load1",
    "network_rx": 'sum by (instance, job) (rate(node_network_receive_bytes_total{device!="lo"}[5m]))',
    "network_tx": 'sum by (instance, job) (rate(node_network_transmit_bytes_total{device!="lo"}[5m]))',
    "container_count": 'count by (instance, job) (container_memory_usage_bytes{container!=""})',
    "container_memory": 'sum by (instance, job) (container_memory_usage_bytes{container!=""})',
    "container_cpu": 'sum by (instance, job) (rate(container_cpu_usage_seconds_total{container!=""}[5m])) * 100',
    "http_rps": "sum by (instance, job) (rate(http_requests_total[5m]))",
}

HISTORY_QUERIES: dict[str, str] = {
    "cpu": '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))',
    "memory": "100 * (1 - (sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)))",
}


class PrometheusSnapshotRequest(BaseModel):
    endpoint: str = Field(..., min_length=8, max_length=700, description="Prometheus base URL; may include a path prefix such as /api/prom")
    bearer_token: SecretStr | None = Field(default=None, description="Optional bearer token. Never persisted.")
    username: str | None = Field(default=None, max_length=200, description="Optional basic-auth username")
    password: SecretStr | None = Field(default=None, description="Optional basic-auth password or access-policy token. Never persisted.")
    include_history: bool = True

    @model_validator(mode="after")
    def validate_auth_choice(self) -> "PrometheusSnapshotRequest":
        basic_username = bool((self.username or "").strip())
        basic_password = bool(self.password and self.password.get_secret_value())
        bearer = bool(self.bearer_token and self.bearer_token.get_secret_value())
        if basic_username != basic_password:
            raise ValueError("For basic authentication, enter both username and password/token.")
        if bearer and (basic_username or basic_password):
            raise ValueError("Choose bearer-token authentication or basic authentication, not both.")
        return self


def _private_networks_allowed() -> bool:
    return os.getenv("PROMETHEUS_ALLOW_PRIVATE_NETWORKS", "false").strip().lower() in {"1", "true", "yes"}


def _normalize_and_validate_url(raw: str) -> tuple[str, str, int]:
    try:
        parsed = urlsplit(raw.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError
        host = parsed.hostname.rstrip(".").lower()
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Enter a valid Prometheus base URL without embedded credentials, query parameters, or a fragment.") from None

    allow_private = _private_networks_allowed()
    if parsed.scheme != "https" and not allow_private:
        raise HTTPException(status_code=422, detail="Use an HTTPS Prometheus endpoint. HTTP is allowed only for explicitly enabled private/local development endpoints.")

    if host in {"localhost", "localhost.localdomain"} or host.endswith((".localhost", ".local", ".internal")):
        if not allow_private:
            raise HTTPException(status_code=422, detail="Private/local Prometheus endpoints are blocked by default. Only enable PROMETHEUS_ALLOW_PRIVATE_NETWORKS in a trusted, private deployment.")
    else:
        try:
            literal = ipaddress.ip_address(host)
            if not literal.is_global and not allow_private:
                raise HTTPException(status_code=422, detail="Private or non-public IP addresses are blocked for security. Use a publicly reachable HTTPS endpoint.")
        except ValueError:
            # Resolve every returned address to protect against hostnames that point into a private network.
            try:
                resolved = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
                addresses = {info[4][0].split("%", 1)[0] for info in resolved}
            except (OSError, socket.gaierror):
                raise HTTPException(status_code=422, detail="The Prometheus hostname could not be resolved from the backend. Use a publicly reachable endpoint and check its DNS.") from None
            if not addresses:
                raise HTTPException(status_code=422, detail="The Prometheus hostname did not resolve to an IP address.")
            if not allow_private:
                for address in addresses:
                    try:
                        ip = ipaddress.ip_address(address)
                    except ValueError:
                        raise HTTPException(status_code=422, detail="The Prometheus hostname resolved unexpectedly; connection blocked for security.") from None
                    if not ip.is_global:
                        raise HTTPException(status_code=422, detail="The Prometheus hostname resolves to a private or non-public IP, which is blocked for security.")

    path = parsed.path.rstrip("/")
    if path.endswith("/api/v1"):
        path = path[:-7].rstrip("/")
    base = urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))
    return base, host, port


def _metric_key(metric: dict[str, Any]) -> str | None:
    for key in ("instance", "pod", "node", "name", "job"):
        value = metric.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def _number(value: Any) -> float | None:
    try:
        out = float(value)
        return out if out == out and abs(out) != float("inf") else None
    except (TypeError, ValueError):
        return None


def _vector_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if not isinstance(data, dict) or data.get("resultType") != "vector":
        return []
    result = data.get("result")
    if not isinstance(result, list):
        return []
    rows: list[dict[str, Any]] = []
    for item in result:
        if not isinstance(item, dict):
            continue
        metric = item.get("metric") if isinstance(item.get("metric"), dict) else {}
        pair = item.get("value")
        if not isinstance(pair, list) or len(pair) < 2:
            continue
        value = _number(pair[1])
        key = _metric_key(metric)
        if value is None or key is None:
            continue
        rows.append({"key": key, "value": value, "labels": metric})
    return rows


def _history_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    result = data.get("result") if isinstance(data, dict) else None
    if not isinstance(result, list):
        return []
    # Prometheus query_range returns a matrix; average samples for duplicate series per minute.
    samples: dict[int, list[float]] = {}
    for series in result:
        values = series.get("values") if isinstance(series, dict) else None
        if not isinstance(values, list):
            continue
        for pair in values:
            if not isinstance(pair, list) or len(pair) < 2:
                continue
            timestamp, value = _number(pair[0]), _number(pair[1])
            if timestamp is None or value is None:
                continue
            second = int(timestamp)
            samples.setdefault(second, []).append(value)
    return [{"timestamp": datetime.fromtimestamp(second, timezone.utc).isoformat(), "value": round(sum(vals) / len(vals), 2)} for second, vals in sorted(samples.items())]


async def _prom_query(client: httpx.AsyncClient, base: str, query: str, auth_headers: dict[str, str], auth: tuple[str, str] | None) -> dict[str, Any]:
    try:
        response = await client.get(f"{base}/api/v1/query", params={"query": query}, headers=auth_headers, auth=auth)
        if response.status_code >= 400:
            return {"ok": False, "rows": [], "status": response.status_code}
        if len(response.content) > MAX_RESPONSE_BYTES:
            return {"ok": False, "rows": [], "status": 413}
        body = response.json()
        if not isinstance(body, dict) or body.get("status") != "success":
            return {"ok": False, "rows": [], "status": response.status_code}
        return {"ok": True, "rows": _vector_rows(body), "status": response.status_code}
    except httpx.TimeoutException:
        return {"ok": False, "rows": [], "status": "timeout"}
    except (httpx.HTTPError, ValueError):
        return {"ok": False, "rows": [], "status": None}


async def _prom_range(client: httpx.AsyncClient, base: str, query: str, auth_headers: dict[str, str], auth: tuple[str, str] | None, start: int, end: int) -> list[dict[str, Any]]:
    try:
        response = await client.get(
            f"{base}/api/v1/query_range",
            params={"query": query, "start": start, "end": end, "step": "60s"},
            headers=auth_headers,
            auth=auth,
        )
        if response.status_code >= 400 or len(response.content) > MAX_RESPONSE_BYTES:
            return []
        body = response.json()
        if not isinstance(body, dict) or body.get("status") != "success":
            return []
        return _history_rows(body)
    except (httpx.HTTPError, ValueError):
        return []


def _merge_resource_rows(query_results: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    by_instance: dict[str, dict[str, Any]] = {}
    field_map = {
        "cpu": "cpuPercent", "memory": "memoryPercent", "disk": "diskPercent",
        "load1": "load1", "network_rx": "networkRxBytesPerSecond",
        "network_tx": "networkTxBytesPerSecond", "container_count": "containerCount",
        "container_memory": "containerMemoryBytes", "container_cpu": "containerCpuCoresPercent",
        "http_rps": "httpRequestsPerSecond",
    }
    # Start with target health so down targets are retained even if no metric exporter responds.
    for row in query_results.get("up", {}).get("rows", []):
        key = row["key"]
        by_instance.setdefault(key, {"instance": key, "job": row["labels"].get("job"), "up": row["value"] == 1})
        by_instance[key]["up"] = row["value"] == 1
    for query_name, field in field_map.items():
        for row in query_results.get(query_name, {}).get("rows", []):
            key = row["key"]
            item = by_instance.setdefault(key, {"instance": key, "job": row["labels"].get("job"), "up": None})
            item[field] = round(row["value"], 2) if field not in {"containerMemoryBytes"} else int(row["value"])
    resources = list(by_instance.values())
    resources.sort(key=lambda item: (item.get("up") is False, item.get("instance", "")))
    return resources[:100]


@router.post("/snapshot")
async def get_prometheus_snapshot(payload: PrometheusSnapshotRequest) -> dict[str, Any]:
    """Query actual Prometheus series and return an on-demand infrastructure snapshot."""
    base, host, _port = await asyncio.to_thread(_normalize_and_validate_url, payload.endpoint)
    bearer = payload.bearer_token.get_secret_value().strip() if payload.bearer_token else ""
    username = (payload.username or "").strip()
    password = payload.password.get_secret_value() if payload.password else ""
    headers = {"Accept": "application/json"}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    auth = (username, password) if username and password else None

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(REQUEST_TIMEOUT_SECONDS),
            follow_redirects=False,
            trust_env=False,
            limits=httpx.Limits(max_connections=12, max_keepalive_connections=4),
        ) as client:
            names = list(QUERIES)
            query_responses = await asyncio.gather(*[_prom_query(client, base, QUERIES[name], headers, auth) for name in names])
            results = dict(zip(names, query_responses))
            # A successful Prometheus API query is required to call this a connected source.
            if not results["up"]["ok"]:
                status = results["up"].get("status")
                if status == "timeout":
                    raise HTTPException(status_code=504, detail="Prometheus timed out. Check its availability and retry.")
                if status in (401, 403):
                    raise HTTPException(status_code=401, detail="Prometheus rejected the supplied credentials. Check the token or basic-auth username/password.")
                if status == 429:
                    raise HTTPException(status_code=429, detail="Prometheus rate limit reached. Wait briefly and retry.")
                if status is not None:
                    raise HTTPException(status_code=502, detail=f"Prometheus API returned HTTP {status}. Confirm the base URL and query API access.")
                raise HTTPException(status_code=502, detail="Could not reach the Prometheus query API. Confirm that the endpoint is publicly reachable from the CloudTwin backend.")

            now = int(datetime.now(timezone.utc).timestamp())
            history: dict[str, list[dict[str, Any]]] = {"cpu": [], "memory": []}
            if payload.include_history:
                history_results = await asyncio.gather(*[
                    _prom_range(client, base, HISTORY_QUERIES[name], headers, auth, now - 3600, now)
                    for name in ("cpu", "memory")
                ])
                history = dict(zip(("cpu", "memory"), history_results))
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Prometheus timed out. Check its availability and retry.") from None
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not establish a connection to Prometheus. Check its endpoint and network access.") from None

    resources = _merge_resource_rows(results)
    up_rows = results["up"]["rows"]
    up_values = [r["value"] for r in up_rows]
    target_up = sum(1 for value in up_values if value == 1)
    target_down = sum(1 for value in up_values if value != 1)
    cpu = [r["cpuPercent"] for r in resources if isinstance(r.get("cpuPercent"), (int, float))]
    memory = [r["memoryPercent"] for r in resources if isinstance(r.get("memoryPercent"), (int, float))]
    disk = [r["diskPercent"] for r in resources if isinstance(r.get("diskPercent"), (int, float))]
    containers = [r.get("containerCount") for r in resources if isinstance(r.get("containerCount"), (int, float))]
    metric_availability = {
        "targetHealth": bool(results["up"]["rows"]),
        "cpu": bool(results["cpu"]["rows"]),
        "memory": bool(results["memory"]["rows"]),
        "disk": bool(results["disk"]["rows"]),
        "load": bool(results["load1"]["rows"]),
        "network": bool(results["network_rx"]["rows"] or results["network_tx"]["rows"]),
        "containers": bool(results["container_count"]["rows"]),
        "httpRequests": bool(results["http_rps"]["rows"]),
    }
    insights: list[dict[str, str]] = []
    if target_down:
        insights.append({"severity": "high", "title": f"{target_down} monitored target(s) are down", "detail": "Prometheus reports an `up` value of 0 for these targets. Check exporter/process health and network reachability."})
    for item in resources:
        if isinstance(item.get("cpuPercent"), (int, float)) and item["cpuPercent"] >= 85:
            insights.append({"severity": "high" if item["cpuPercent"] >= 95 else "medium", "title": f"High CPU on {item['instance']}", "detail": f"Observed CPU utilization is {item['cpuPercent']:.1f}%. This is a threshold-based observation, not a failure probability."})
        if isinstance(item.get("memoryPercent"), (int, float)) and item["memoryPercent"] >= 90:
            insights.append({"severity": "high" if item["memoryPercent"] >= 95 else "medium", "title": f"High memory use on {item['instance']}", "detail": f"Observed memory utilization is {item['memoryPercent']:.1f}%. Check memory pressure and growth over time."})
        if isinstance(item.get("diskPercent"), (int, float)) and item["diskPercent"] >= 90:
            insights.append({"severity": "high", "title": f"Low disk headroom on {item['instance']}", "detail": f"Observed root filesystem usage is {item['diskPercent']:.1f}%. Check log growth and storage capacity."})
    if not metric_availability["cpu"] or not metric_availability["memory"]:
        insights.append({"severity": "info", "title": "Host metrics are incomplete", "detail": "Install/configure Node Exporter and add it as a Prometheus scrape target to collect host CPU, RAM, disk, and network metrics."})
    if not metric_availability["containers"]:
        insights.append({"severity": "info", "title": "Container metrics not detected", "detail": "For Docker/container measurements, configure cAdvisor or another container metrics exporter in Prometheus."})
    if not up_rows:
        insights.append({"severity": "info", "title": "Prometheus is reachable but has no `up` series", "detail": "Add one or more scrape targets in Prometheus and wait for the first collection interval."})

    # Summaries are calculated only from measurements actually returned by Prometheus.
    return {
        "connected": True,
        "source": "Prometheus HTTP API",
        "endpointHost": host,
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "dataType": "live_measurements",
        "targetsTotal": len(up_rows),
        "targetsUp": target_up,
        "targetsDown": target_down,
        "averageCpuPercent": round(sum(cpu) / len(cpu), 2) if cpu else None,
        "averageMemoryPercent": round(sum(memory) / len(memory), 2) if memory else None,
        "averageDiskPercent": round(sum(disk) / len(disk), 2) if disk else None,
        "containerMetricSeries": len(results["container_count"]["rows"]),
        "metricAvailability": metric_availability,
        "resources": resources,
        "history": history,
        "insights": insights[:20],
        "notes": [
            "Values are actual Prometheus query results. Missing series are null/unavailable, not generated.",
            "Configure Node Exporter for host metrics and cAdvisor for container metrics.",
            "The backend uses submitted credentials for this request only. They are not logged or stored.",
            "This on-demand snapshot is not a trained failure-prediction model; observations use transparent thresholds.",
        ],
        "credentialHandling": "Credentials were used for this request only and were not stored.",
    }
