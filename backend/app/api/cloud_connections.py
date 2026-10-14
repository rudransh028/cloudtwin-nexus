"""Cloud account connection validation endpoints.

The Render connector validates a caller-supplied key and never persists it.

AWS connections are validated with read-only boto3 calls, then stored with
Fernet-encrypted keys. There is no user authentication in this project, so
every saved AWS connection is shared with anyone who can reach these endpoints.
"""
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, SecretStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import AwsAccountConnection
from app.services.aws_credential_crypto import decrypt_secret, encrypt_secret
from app.services.aws_readonly import SHARED_ACCESS_NOTE, session_from_keys, validate_read_only_access

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


class AwsConnectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    account_id: str = Field(..., pattern=r"^\d{12}$")
    region: str = Field(..., min_length=2, max_length=32)
    access_key_id: SecretStr = Field(..., min_length=16)
    secret_access_key: SecretStr = Field(..., min_length=16)


def _public_aws_connection(row: AwsAccountConnection, message: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": row.id,
        "name": row.name,
        "accountId": row.account_id,
        "region": row.region,
        "status": row.status,
        "instanceCount": row.instance_count,
        "lastCheckedAt": row.last_checked_at.isoformat() if row.last_checked_at else None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "sharedAccess": SHARED_ACCESS_NOTE,
    }
    if message:
        payload["message"] = message
    return payload


@router.post("/aws")
def create_aws_connection(payload: AwsConnectionCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Validate read-only AWS credentials, encrypt them, and store a shared connection."""
    access_key = payload.access_key_id.get_secret_value().strip()
    secret_key = payload.secret_access_key.get_secret_value().strip()
    if not access_key or not secret_key:
        raise HTTPException(status_code=422, detail="Enter an AWS access key ID and secret access key.")

    encrypted_access = encrypt_secret(access_key)
    encrypted_secret = encrypt_secret(secret_key)

    session = session_from_keys(access_key, secret_key, payload.region.strip())
    check = validate_read_only_access(session, payload.account_id, payload.region.strip())

    row = AwsAccountConnection(
        name=payload.name.strip(),
        account_id=payload.account_id,
        region=payload.region.strip(),
        status="validated",
        encrypted_access_key_id=encrypted_access,
        encrypted_secret_access_key=encrypted_secret,
        instance_count=check.get("instanceCount"),
        last_error=None,
        last_checked_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _public_aws_connection(
        row,
        "AWS credentials were validated with read-only EC2 and CloudWatch calls and stored encrypted. "
        + SHARED_ACCESS_NOTE,
    )


@router.get("/aws")
def list_aws_connections(db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(AwsAccountConnection).order_by(AwsAccountConnection.created_at.desc()).all()
    return {
        "connections": [_public_aws_connection(row) for row in rows],
        "sharedAccess": SHARED_ACCESS_NOTE,
    }


@router.delete("/aws/{connection_id}")
def delete_aws_connection(connection_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(AwsAccountConnection, connection_id)
    if row is None:
        raise HTTPException(status_code=404, detail="AWS connection not found.")
    db.delete(row)
    db.commit()
    return {"deleted": True, "id": connection_id}


@router.get("/aws/{connection_id}/metrics")
def get_saved_aws_connection_metrics(
    connection_id: str,
    hours: int = Query(default=1, ge=1, le=24),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """EC2 inventory and CloudWatch CPU for a saved account. Credentials are not returned."""
    from app.services.aws_readonly import collect_ec2_cloudwatch
    row = db.get(AwsAccountConnection, connection_id)
    if row is None:
        raise HTTPException(status_code=404, detail="AWS connection not found.")
    session = session_from_keys(
        decrypt_secret(row.encrypted_access_key_id),
        decrypt_secret(row.encrypted_secret_access_key),
        row.region,
    )
    return collect_ec2_cloudwatch(
        session,
        row.region,
        None,
        hours,
        connection_id=row.id,
        connection_name=row.name,
        account_id=row.account_id,
    )
