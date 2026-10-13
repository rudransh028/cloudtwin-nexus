import os
import json
import uuid
from datetime import datetime, timezone

import boto3
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/s3-reports", tags=["AWS S3 Reports"])


def s3_client():
    bucket = os.getenv("AWS_S3_REPORTS_BUCKET")
    if not bucket:
        raise HTTPException(status_code=503, detail="Set AWS_S3_REPORTS_BUCKET in Render environment variables.")
    kwargs = {"region_name": os.getenv("AWS_REGION", getattr(settings, "AWS_REGION", "ap-southeast-2"))}
    key = getattr(settings, "AWS_ACCESS_KEY_ID", None)
    secret = getattr(settings, "AWS_SECRET_ACCESS_KEY", None)
    if key and secret:
        kwargs.update(aws_access_key_id=key, aws_secret_access_key=secret)
    return boto3.client("s3", **kwargs), bucket


class Report(BaseModel):
    report: dict


@router.post("")
def save_report(payload: Report):
    client, bucket = s3_client()
    key = f"simulation-reports/{datetime.now(timezone.utc).strftime('%Y/%m/%d')}/{uuid.uuid4().hex}.json"
    body = {
        "savedAt": datetime.now(timezone.utc).isoformat(),
        "report": payload.report,
    }
    try:
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(body, default=str).encode(),
            ContentType="application/json",
        )
        return {"saved": True, "bucket": bucket, "key": key, "savedAt": body["savedAt"]}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"S3 save failed: {type(exc).__name__}")


@router.get("")
def list_reports(limit: int = Query(10, ge=1, le=50)):
    client, bucket = s3_client()
    try:
        result = client.list_objects_v2(
            Bucket=bucket, Prefix="simulation-reports/", MaxKeys=limit
        )
        return {
            "bucket": bucket,
            "count": len(result.get("Contents", [])),
            "reports": [
                {"key": item["Key"], "lastModified": item["LastModified"].isoformat(),
                 "sizeBytes": item["Size"]}
                for item in result.get("Contents", [])
            ],
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"S3 listing failed: {type(exc).__name__}")
