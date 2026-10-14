"""Read-only AWS EC2 inventory and CloudWatch CPU telemetry."""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.entities import AwsAccountConnection
from app.services.aws_credential_crypto import decrypt_secret
from app.services.aws_readonly import collect_ec2_cloudwatch, session_from_keys, session_from_settings

router = APIRouter(prefix="/aws", tags=["AWS CloudWatch Metrics"])


@router.get("/metrics")
def get_aws_ec2_metrics(
    instance_id: str | None = Query(default=None, description="Optional EC2 instance ID filter"),
    hours: int = Query(default=1, ge=1, le=24),
    connection_id: str | None = Query(default=None, description="Optional saved AWS connection ID"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return actual EC2 inventory and CloudWatch CPUUtilization datapoints.

    With no connection_id, uses the backend default AWS credentials (unchanged).
    With connection_id, uses a saved encrypted account. Connections are shared
    by anyone who can access this API; there is no per-user isolation.
    """
    if connection_id:
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
            instance_id,
            hours,
            connection_id=row.id,
            connection_name=row.name,
            account_id=row.account_id,
        )

    session = session_from_settings(settings.AWS_REGION, settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY)
    return collect_ec2_cloudwatch(session, settings.AWS_REGION, instance_id, hours)
