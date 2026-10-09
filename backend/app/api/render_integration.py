"""Read-only integration with the Render API.

This endpoint exposes service metadata only. Render's service inventory API is not
a source for CPU/memory/request metrics, so those are deliberately not fabricated.
"""
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from app.config import settings

router = APIRouter(prefix="/render", tags=["Render Integration"])
RENDER_SERVICES_URL = "https://api.render.com/v1/services"


def _service_payload(item: Any) -> dict[str, Any] | None:
    """Handle both wrapped list items and direct service objects."""
    if not isinstance(item, dict):
        return None
    service = item.get("service", item)
    if not isinstance(service, dict):
        return None
    details = service.get("serviceDetails")
    if not isinstance(details, dict):
        details = {}
    service_id = service.get("id")
    if not service_id:
        return None

    suspended = service.get("suspended")
    status = "Suspended" if suspended is True else "Configured"
    # Only return public/operational metadata. Never expose env vars or secrets.
    return {
        "id": service_id,
        "name": service.get("name") or "Unnamed service",
        "type": service.get("type") or "Unknown",
        "region": details.get("region") or service.get("region"),
        "url": details.get("url") or service.get("url"),
        "repo": service.get("repo"),
        "branch": service.get("branch"),
        "status": status,
        "suspended": suspended,
        "createdAt": service.get("createdAt"),
        "updatedAt": service.get("updatedAt"),
    }


@router.get("/services")
async def get_render_services():
    """Return real service inventory from Render; no mock fallback."""
    api_key = settings.RENDER_API_KEY
    if not api_key:
        return {
            "connected": False,
            "source": "Render API",
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "count": 0,
            "services": [],
            "message": "Render API key is not configured on the backend.",
        }

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(
                RENDER_SERVICES_URL,
                params={"limit": 100},
                headers=headers,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Render API request timed out.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach the Render API.")

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail="Render rejected the API key. Check RENDER_API_KEY in the backend environment.",
        )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Render API returned HTTP {response.status_code}.",
        )

    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Render API returned invalid JSON.")

    if isinstance(payload, dict):
        items = payload.get("services", [])
    elif isinstance(payload, list):
        items = payload
    else:
        items = []

    services = []
    for item in items:
        parsed = _service_payload(item)
        if parsed:
            services.append(parsed)

    return {
        "connected": True,
        "source": "Render API",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(services),
        "services": services,
        "message": None,
    }
