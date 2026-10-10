from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone, date
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/real-cloud", tags=["Real Cloud Data"])
RENDER_API = "https://api.render.com/v1"
_COST_CACHE: Optional[Dict[str, Any]] = None
_COST_CACHE_AT: Optional[datetime] = None
TIMEOUT = httpx.Timeout(15.0, connect=5.0)


def _series(payload: Any) -> List[Dict[str, Any]]:
    """Normalize Render's metric series payload into label/value points."""
    if not isinstance(payload, list):
        return []
    out: List[Dict[str, Any]] = []
    for series in payload:
        if not isinstance(series, dict):
            continue
        labels = series.get("labels", [])
        label_map = {x.get("field"): x.get("value") for x in labels if isinstance(x, dict)}
        values = series.get("values", [])
        for point in values if isinstance(values, list) else []:
            if isinstance(point, dict) and isinstance(point.get("value"), (int, float)):
                out.append({**label_map, "timestamp": point.get("timestamp"), "value": float(point["value"]), "unit": point.get("unit")})
    return out


async def _render_get(client: httpx.AsyncClient, path: str, params: Optional[dict] = None) -> Any:
    key = os.getenv("RENDER_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="RENDER_API_KEY is not configured on the backend.")
    response = await client.get(f"{RENDER_API}{path}", headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}, params=params)
    if response.status_code >= 400:
        detail = response.text[:500]
        raise HTTPException(status_code=502, detail=f"Render API {path} returned HTTP {response.status_code}: {detail}")
    return response.json()


async def _metric(client: httpx.AsyncClient, path: str, resource_id: str, start: str, end: str, extra: Optional[dict] = None) -> List[Dict[str, Any]]:
    try:
        params = {"resource": resource_id, "startTime": start, "endTime": end, "resolutionSeconds": 60}
        params.update(extra or {})
        payload = await _render_get(client, path, params)
        return _series(payload)
    except HTTPException:
        return []


def _latest(points: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return max(points, key=lambda p: str(p.get("timestamp") or "")) if points else None


def _percent(usage: Optional[Dict[str, Any]], limit: Optional[Dict[str, Any]]) -> Optional[float]:
    if not usage:
        return None
    unit = str(usage.get("unit") or "").lower()
    value = float(usage["value"])
    if "%" in unit or "percent" in unit:
        return round(max(0.0, min(100.0, value)), 2)
    if limit and float(limit["value"]) > 0:
        return round(max(0.0, min(100.0, value / float(limit["value"]) * 100.0)), 2)
    return None


def _make_predictions(services: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    predictions = []
    for svc in services:
        for key, label in (("cpuHistory", "CPU"), ("memoryHistory", "memory")):
            history = svc.get(key) or []
            values = [float(p["value"]) for p in history if isinstance(p.get("value"), (int, float))]
            if len(values) < 4:
                continue
            # Linear trend from real observations, in units of percentage points per minute.
            n = len(values)
            xmean = (n - 1) / 2
            ymean = sum(values) / n
            denom = sum((i - xmean) ** 2 for i in range(n))
            slope = sum((i - xmean) * (v - ymean) for i, v in enumerate(values)) / denom if denom else 0.0
            current = values[-1]
            forecast_15 = max(0.0, min(100.0, current + slope * 15))
            if forecast_15 >= 85 or current >= 90:
                severity = "HIGH"
            elif forecast_15 >= 70 or (slope > 0.5 and current >= 60):
                severity = "MEDIUM"
            else:
                continue
            predictions.append({
                "id": f"{svc['id']}-{key}",
                "title": f"{svc['name']} {label} saturation trend",
                "serviceId": svc["id"],
                "severity": severity,
                "currentPercent": round(current, 2),
                "forecast15MinPercent": round(forecast_15, 2),
                "slopePercentagePointsPerMinute": round(slope, 3),
                "confidence": "Trend indicator; not a calibrated probability",
                "source": "Render API observed metrics",
                "description": f"Based on {len(values)} real metric samples from the last hour. Linear 15-minute extrapolation; not a guarantee of failure.",
                "window": "15 minutes",
            })
    return predictions


@router.get("/summary")
async def get_real_cloud_summary():
    if not os.getenv("RENDER_API_KEY", "").strip():
        raise HTTPException(status_code=503, detail="Live Render telemetry is not configured. Add RENDER_API_KEY to the backend environment.")
    now = datetime.now(timezone.utc)
    start_dt = now - timedelta(hours=1)
    start, end = start_dt.isoformat(), now.isoformat()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        raw_services = await _render_get(client, "/services", {"limit": 100})
        services = []
        for entry in raw_services if isinstance(raw_services, list) else []:
            item = entry.get("service", entry) if isinstance(entry, dict) else {}
            sid = item.get("id")
            if not sid:
                continue
            cpu, cpu_limit, mem, mem_limit = await __import__("asyncio").gather(
                _metric(client, "/metrics/cpu", sid, start, end),
                _metric(client, "/metrics/cpu-limit", sid, start, end),
                _metric(client, "/metrics/memory", sid, start, end),
                _metric(client, "/metrics/memory-limit", sid, start, end),
            )
            reqs, latency = await __import__("asyncio").gather(
                _metric(client, "/metrics/http-requests", sid, start, end),
                _metric(client, "/metrics/http-latency", sid, start, end, {"quantile": 0.95}),
            )
            cpu_latest, cpu_lim_latest = _latest(cpu), _latest(cpu_limit)
            mem_latest, mem_lim_latest = _latest(mem), _latest(mem_limit)
            req_latest, lat_latest = _latest(reqs), _latest(latency)
            service = {
                "id": sid,
                "name": item.get("name") or sid,
                "type": item.get("type"),
                "region": item.get("region"),
                "status": item.get("suspended") if item.get("suspended") is not None else (item.get("serviceDetails") or {}).get("runtime"),
                "url": item.get("url"),
                "createdAt": item.get("createdAt"),
                "cpuPercent": _percent(cpu_latest, cpu_lim_latest),
                "memoryPercent": _percent(mem_latest, mem_lim_latest),
                "cpuUsage": cpu_latest,
                "cpuLimit": cpu_lim_latest,
                "memoryUsage": mem_latest,
                "memoryLimit": mem_lim_latest,
                "requestCountLastHour": round(sum(p["value"] for p in reqs), 2) if reqs else None,
                "latestLatencyMs": lat_latest["value"] if lat_latest else None,
                "cpuHistory": [{"timestamp": p.get("timestamp"), "value": _percent(p, cpu_lim_latest)} for p in cpu if _percent(p, cpu_lim_latest) is not None],
                "memoryHistory": [{"timestamp": p.get("timestamp"), "value": _percent(p, mem_lim_latest)} for p in mem if _percent(p, mem_lim_latest) is not None],
                "metricAvailability": {
                    "cpu": bool(cpu and cpu_limit),
                    "memory": bool(mem and mem_limit),
                    "requests": bool(reqs),
                    "latency": bool(latency),
                },
            }
            services.append(service)
    cpu_vals = [s["cpuPercent"] for s in services if s["cpuPercent"] is not None]
    mem_vals = [s["memoryPercent"] for s in services if s["memoryPercent"] is not None]
    return {
        "connected": True,
        "source": "Render Metrics API",
        "observedAt": now.isoformat(),
        "windowStart": start,
        "windowEnd": end,
        "serviceCount": len(services),
        "cpuAveragePercent": round(sum(cpu_vals) / len(cpu_vals), 2) if cpu_vals else None,
        "memoryAveragePercent": round(sum(mem_vals) / len(mem_vals), 2) if mem_vals else None,
        "services": services,
        "predictions": _make_predictions(services),
        "notes": ["Values are live provider measurements when returned by Render.", "Metrics unavailable for a service are null, not replaced with simulated values.", "Forecasts are simple trend extrapolations from recent live samples, not guaranteed failure probabilities."],
    }


@router.get("/costs")
def get_render_cost_status():
    """Render-only cost status. Do not invent charges when no billing API is configured."""
    return {
        "connected": False,
        "source": "Render Billing dashboard",
        "currency": None,
        "periodStart": None,
        "periodEndExclusive": None,
        "monthToDate": None,
        "services": [],
        "nextMonthForecast": None,
        "forecastMessage": None,
        "message": (
            "Live Render CPU, memory, and HTTP metrics are fetched separately. "
            "This integration does not have an official Render invoice-total endpoint configured, "
            "so actual charges and a billing forecast are not available here. Check Render Dashboard > Billing. "
            "No AWS connection or synthetic cost values are used."
        ),
        "dataFreshness": "Actual charges must be verified in the Render Billing dashboard.",
    }
