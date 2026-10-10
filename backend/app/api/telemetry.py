"""Genuine telemetry for the CloudTwin Nexus FastAPI process.

These measurements describe this Python process and the HTTP requests observed by
this worker. They are not Render container-wide or cloud-account infrastructure metrics.
"""
from __future__ import annotations

import asyncio
import math
import os
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, Tuple

import psutil
from fastapi import APIRouter, Request
from starlette.responses import Response

router = APIRouter(prefix="/telemetry", tags=["Application Telemetry"])
_SAMPLE_LIMIT = 1000
_CPU_MEASUREMENT_SECONDS = 0.1


class _TelemetryStore:
    """Thread-safe request counters with bounded latency samples."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._request_count = 0
        self._server_error_count = 0
        self._latencies: Deque[Tuple[float, int]] = deque(maxlen=_SAMPLE_LIMIT)

    def record(self, latency_ms: float, status_code: int) -> None:
        with self._lock:
            self._request_count += 1
            if status_code >= 500:
                self._server_error_count += 1
            self._latencies.append((latency_ms, status_code))

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            count = self._request_count
            errors = self._server_error_count
            samples = list(self._latencies)

        durations = sorted(sample[0] for sample in samples)
        sample_count = len(durations)
        average = round(sum(durations) / sample_count, 3) if sample_count else None
        if sample_count:
            p95_index = max(0, math.ceil(0.95 * sample_count) - 1)
            p95 = round(durations[p95_index], 3)
        else:
            p95 = None

        return {
            "requestCountSinceProcessStart": count,
            "serverErrorCountSinceProcessStart": errors,
            "latencySampleCount": sample_count,
            "latencySampleCapacity": _SAMPLE_LIMIT,
            "averageLatencyMsRecentSamples": average,
            "p95LatencyMsRecentSamples": p95,
            "latencySampleDescription": (
                f"Most recent {sample_count} completed requests, up to {_SAMPLE_LIMIT} samples"
            ),
        }


_store = _TelemetryStore()
_process = psutil.Process(os.getpid())


async def collect_http_telemetry(request: Request, call_next) -> Response:
    """Count completed HTTP requests, excluding telemetry reads and preflights."""
    if request.method == "OPTIONS" or request.url.path.endswith("/telemetry/summary"):
        return await call_next(request)

    started = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        elapsed_ms = (time.perf_counter() - started) * 1000.0
        _store.record(elapsed_ms, status_code)


@router.get("/summary")
async def get_telemetry_summary() -> Dict[str, Any]:
    """Return real process measurements and counters observed by this worker."""
    measured_at = datetime.now(timezone.utc).isoformat()

    cpu_percent = None
    memory_rss_bytes = None
    process_status = "available"
    try:
        # Measure over a real 100 ms interval without blocking the ASGI event loop.
        cpu_percent = round(
            float(await asyncio.to_thread(_process.cpu_percent, _CPU_MEASUREMENT_SECONDS)), 2
        )
        memory_rss_bytes = int(_process.memory_info().rss)
    except (psutil.Error, OSError, RuntimeError):
        process_status = "partially_unavailable"

    memory_rss_mib = (
        round(memory_rss_bytes / (1024 * 1024), 2)
        if memory_rss_bytes is not None
        else None
    )

    return {
        "source": "CloudTwin Nexus FastAPI application telemetry",
        "scope": "This Python backend worker process only; not the whole container or cloud account.",
        "measuredAt": measured_at,
        "process": {
            "status": process_status,
            "pid": os.getpid(),
            "cpuPercent": cpu_percent,
            "cpuMeasurementIntervalSeconds": _CPU_MEASUREMENT_SECONDS,
            "cpuPercentMeaning": "Process CPU time over the measurement interval; 100% is one logical CPU.",
            "memoryRssBytes": memory_rss_bytes,
            "memoryRssMiB": memory_rss_mib,
            "memoryMeaning": "Resident set size (RSS) of this Python process, not total service/container memory.",
        },
        "http": _store.snapshot(),
        "limitations": [
            "Counters and latency samples are in memory and reset when this worker restarts.",
            "With multiple workers, each worker reports only its own observations.",
            "Latency statistics summarize the most recent 1000 completed non-telemetry HTTP requests.",
        ],
    }
