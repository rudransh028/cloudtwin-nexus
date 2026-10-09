import asyncio
import ipaddress
import os
import socket
import time
from collections import deque
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/website-monitor", tags=["Website Monitor"])
_history = deque(maxlen=30)


class WebsiteCheckRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)


def _normalize_and_validate_url(raw_url: str) -> str:
    value = raw_url.strip()
    if not value.startswith(("https://", "http://")):
        value = "https://" + value
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Enter a valid public HTTP or HTTPS website URL.")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="URLs containing usernames or passwords are not allowed.")
    host = parsed.hostname.rstrip(".").lower()
    if host in {"localhost", "localhost.localdomain"} or host.endswith((".localhost", ".local", ".internal", ".test")):
        raise HTTPException(status_code=400, detail="Private and local network targets are not allowed.")
    try:
        literal_ip = ipaddress.ip_address(host)
        if not literal_ip.is_global:
            raise HTTPException(status_code=400, detail="Private and non-public IP addresses are not allowed.")
    except ValueError:
        try:
            addresses = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
        except socket.gaierror:
            raise HTTPException(status_code=400, detail="The hostname could not be resolved. Check the URL.")
        resolved = {item[4][0] for item in addresses}
        if not resolved or any(not ipaddress.ip_address(address).is_global for address in resolved):
            raise HTTPException(status_code=400, detail="The website must resolve only to public IP addresses.")
    return value


def _rule_based_analysis(status_code: int | None, latency_ms: float | None, error: str | None) -> dict:
    findings = []
    if error:
        findings.append({"severity": "critical", "title": "Website could not be reached", "detail": error, "recommendation": "Verify DNS, TLS certificates, hosting availability, and firewall rules."})
    elif status_code is not None and status_code >= 500:
        findings.append({"severity": "critical", "title": "Server-side error", "detail": f"The server returned HTTP {status_code}.", "recommendation": "Inspect application logs, dependency health, and server resource limits."})
    elif status_code in {401, 403}:
        findings.append({"severity": "warning", "title": "Access restricted", "detail": f"The server returned HTTP {status_code}; the page may require authentication or block automated requests.", "recommendation": "Confirm whether the URL is intended to be publicly accessible and review access-control rules."})
    elif status_code is not None and status_code >= 400:
        findings.append({"severity": "warning", "title": "Client or route error", "detail": f"The server returned HTTP {status_code}.", "recommendation": "Check the requested route, redirects, and application routing configuration."})
    elif latency_ms is not None and latency_ms >= 2000:
        findings.append({"severity": "warning", "title": "Slow response", "detail": f"The response took {latency_ms:.0f} ms, above the 2,000 ms warning threshold.", "recommendation": "Measure server processing time, reduce expensive requests, and inspect database or third-party API latency."})
    elif latency_ms is not None and latency_ms >= 800:
        findings.append({"severity": "info", "title": "Response time could improve", "detail": f"The response took {latency_ms:.0f} ms.", "recommendation": "Compare repeated measurements and review caching, asset size, and backend response time."})
    elif status_code is not None and 200 <= status_code < 400:
        findings.append({"severity": "healthy", "title": "No immediate issue detected", "detail": f"The website responded with HTTP {status_code}.", "recommendation": "Continue checking over time; a single successful request does not guarantee full application health."})
    return {"provider": "rule_based", "summary": findings[0]["detail"] if findings else "The check completed, but there was not enough information to diagnose the result.", "findings": findings}


async def _ai_analysis(measurement: dict, fallback: dict) -> dict:
    prompt = (
        "Analyze this public website health check. Do not claim a root cause is proven. "
        "Return concise JSON with keys summary (string), findings (array of objects with severity, title, detail, recommendation). "
        "Use only the measurement provided, label hypotheses as hypotheses, and avoid unsupported claims. Measurement: "
        + str(measurement)
    )
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            if gemini_key:
                model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}",
                    json={"contents": [{"parts": [{"text": "Return valid JSON only. You are a cautious website reliability analyst. " + prompt}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}},
                )
                response.raise_for_status()
                import json
                content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(content)
                provider = "gemini"
            elif openai_key:
                model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "system", "content": "You are a cautious website reliability analyst. Return valid JSON only."}, {"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2},
                )
                response.raise_for_status()
                import json
                content = response.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                provider = "openai"
            else:
                fallback["note"] = "AI model not configured. Add GEMINI_API_KEY (recommended) or OPENAI_API_KEY to the backend environment to enable model-generated explanations; measured checks and baseline diagnostics still work."
                return fallback
            if not isinstance(parsed.get("findings"), list) or not isinstance(parsed.get("summary"), str):
                raise ValueError("Unexpected AI response schema")
            return {"provider": provider, "summary": parsed["summary"], "findings": parsed["findings"]}
    except httpx.HTTPStatusError as exc:
        fallback["note"] = f"The AI provider returned HTTP {exc.response.status_code}. Check the API key permissions and configured model."
        return fallback
    except Exception as exc:
        fallback["note"] = f"The AI request failed ({type(exc).__name__}). Check the backend key, model, and provider configuration."
        return fallback


@router.post("/check")
async def check_website(request: WebsiteCheckRequest):
    url = _normalize_and_validate_url(request.url)
    started = time.perf_counter()
    status_code = None
    error = None
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0), follow_redirects=False, headers={"User-Agent": "CloudTwinNexus-Monitor/1.0"}) as client:
            response = await client.get(url)
            status_code = response.status_code
    except httpx.TimeoutException:
        error = "The request timed out after 8 seconds."
    except httpx.RequestError as exc:
        error = f"Connection failed: {type(exc).__name__}."
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    if error:
        health = "down"
    elif status_code is not None and status_code >= 500:
        health = "degraded"
    elif status_code is not None and status_code >= 400:
        health = "warning"
    elif latency_ms >= 2000:
        health = "slow"
    else:
        health = "up"
    measurement = {"url": url, "checkedAt": datetime.now(timezone.utc).isoformat(), "statusCode": status_code, "responseTimeMs": latency_ms, "health": health, "error": error}
    diagnosis = _rule_based_analysis(status_code, latency_ms, error)
    diagnosis = await _ai_analysis(measurement, diagnosis)
    result = {**measurement, "diagnosis": diagnosis}
    _history.appendleft(result)
    return result


@router.get("/history")
async def website_check_history():
    return list(_history)
