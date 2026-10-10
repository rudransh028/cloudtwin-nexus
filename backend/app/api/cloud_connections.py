"""Cloud account connection validation endpoints.

The Render connector validates a caller-supplied key and never persists it.
Other providers are not labelled connected until secure, provider-specific
collectors are implemented.
"""
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, SecretStr

router = APIRouter(prefix="/connections", tags=["Cloud Connections"])
RENDER_API_BASE = "https://api.render.com/v1"


class RenderConnectionTest(BaseModel):
    api_key: SecretStr = Field(..., min_length=1, description="Render API key; validated but never stored")


@router.post("/test/render")
async def test_render_connection(payload: RenderConnectionTest) -> dict[str, Any]:
    """Validate a Render API key and return a safe first-page service inventory."""
    api_key = payload.api_key.get_secret_value().strip()
    if not api_key:
        raise HTTPException(status_code=422, detail="Enter a Render API key.")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0)) as client:
            response = await client.get(
                f"{RENDER_API_BASE}/services",
                params={"limit": 20},
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Render did not respond in time. Please retry.") from None
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not reach the Render API. Please retry.") from None

    if response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Render rejected this API key. Check the key and its permissions.")
    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="Render rate limit reached. Please wait and retry.")
    if not 200 <= response.status_code < 300:
        raise HTTPException(status_code=502, detail=f"Render API returned HTTP {response.status_code}.")

    try:
        body = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Render returned an unexpected response.") from None

    items = body.get("services", body) if isinstance(body, dict) else body
    if not isinstance(items, list):
        raise HTTPException(status_code=502, detail="Render returned an unexpected services format.")

    services = []
    for item in items:
        if not isinstance(item, dict):
            continue
        service = item.get("service", item)
        if not isinstance(service, dict):
            continue
        services.append({
            "id": service.get("id"),
            "name": service.get("name") or "Unnamed service",
            "type": service.get("type"),
            "region": service.get("region"),
            "suspended": service.get("suspended"),
            "url": service.get("url"),
            "createdAt": service.get("createdAt"),
        })

    return {
        "connected": True,
        "provider": "render",
        "source": "Render API",
        "message": "API key validated. This key was not saved.",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "serviceCountReturned": len(services),
        "services": services,
        "paginationNote": "The first page only is returned (up to 20 services).",
        "credentialHandling": "The submitted API key was used for this check only and was not persisted.",
    }
