from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.providers.telemetry_provider import get_telemetry_provider

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=Dict[str, Any])
async def get_dashboard_summary():
    provider = get_telemetry_provider()
    return await provider.get_dashboard_summary()

@router.get("/metrics/timeseries")
async def get_timeseries_metrics(hours: int = 24):
    now = int(datetime.now(timezone.utc).timestamp())
    points = []
    for i in range(hours * 12, 0, -1):
        ts = now - (i * 300)
        points.append({
            "time": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
            "cpu": round(60 + (i % 10) * 1.5, 1),
            "memory": round(70 + (i % 8) * 0.8, 1),
            "requestRate": int(4200 + (i % 15) * 60),
            "latency": int(85 + (i % 12) * 2),
            "errorRate": round(0.2 + (i % 5) * 0.05, 2)
        })
    return points
