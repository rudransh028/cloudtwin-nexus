"""Read-only AWS EC2 inventory and CloudWatch CPU telemetry."""
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError, PartialCredentialsError
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

router = APIRouter(prefix="/aws", tags=["AWS CloudWatch Metrics"])


@router.get("/metrics")
def get_aws_ec2_metrics(
    instance_id: str | None = Query(default=None, description="Optional EC2 instance ID filter"),
    hours: int = Query(default=1, ge=1, le=24),
) -> dict[str, Any]:
    """Return actual EC2 inventory and CloudWatch CPUUtilization datapoints."""
    try:
        session = boto3.Session(
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        ec2 = session.client("ec2")
        cloudwatch = session.client("cloudwatch")
        filters = []
        if instance_id:
            filters.append({"Name": "instance-id", "Values": [instance_id]})
        reservations = ec2.describe_instances(Filters=filters).get("Reservations", [])
        instances = []
        start = datetime.now(timezone.utc) - timedelta(hours=hours)
        end = datetime.now(timezone.utc)
        for reservation in reservations:
            for item in reservation.get("Instances", []):
                iid = item.get("InstanceId")
                if not iid:
                    continue
                metric = cloudwatch.get_metric_statistics(
                    Namespace="AWS/EC2",
                    MetricName="CPUUtilization",
                    Dimensions=[{"Name": "InstanceId", "Value": iid}],
                    StartTime=start,
                    EndTime=end,
                    Period=300,
                    Statistics=["Average", "Maximum"],
                )
                points = sorted(
                    [{"timestamp": p["Timestamp"].isoformat(), "averagePercent": round(float(p["Average"]), 2), "maximumPercent": round(float(p["Maximum"]), 2)} for p in metric.get("Datapoints", [])],
                    key=lambda p: p["timestamp"],
                )
                instances.append({
                    "instanceId": iid,
                    "name": next((t.get("Value") for t in item.get("Tags", []) if t.get("Key") == "Name"), iid),
                    "instanceType": item.get("InstanceType"),
                    "state": (item.get("State") or {}).get("Name", "unknown"),
                    "availabilityZone": (item.get("Placement") or {}).get("AvailabilityZone"),
                    "launchTime": item.get("LaunchTime").isoformat() if item.get("LaunchTime") else None,
                    "cpuLatestPercent": points[-1]["averagePercent"] if points else None,
                    "cpuAveragePercent": round(sum(p["averagePercent"] for p in points) / len(points), 2) if points else None,
                    "cpuMaximumPercent": max((p["maximumPercent"] for p in points), default=None),
                    "cpuHistory": points,
                    "metricStatus": "available" if points else "waiting_for_cloudwatch_data",
                })
        return {
            "connected": True,
            "provider": "AWS",
            "source": "Amazon CloudWatch / AWS EC2",
            "region": settings.AWS_REGION,
            "observedAt": datetime.now(timezone.utc).isoformat(),
            "windowHours": hours,
            "instanceCount": len(instances),
            "instances": instances,
            "note": "CPUUtilization is an actual AWS CloudWatch metric. Basic EC2 monitoring commonly publishes at 5-minute intervals; new instances may need several minutes before datapoints appear.",
        }
    except (NoCredentialsError, PartialCredentialsError):
        raise HTTPException(status_code=503, detail="AWS credentials are not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY on the backend, or attach an IAM role.") from None
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "AWS_API_ERROR")
        if code in {"AccessDenied", "AccessDeniedException", "UnauthorizedOperation"}:
            detail = "AWS denied this read-only request. Check the IAM permissions for ec2:DescribeInstances and cloudwatch:GetMetricStatistics."
        elif code in {"InvalidClientTokenId", "SignatureDoesNotMatch", "UnrecognizedClientException"}:
            detail = "AWS rejected the configured credentials. Check the key pair and AWS_REGION on the backend."
        else:
            detail = f"AWS request failed ({code}). Check the AWS region and backend logs."
        raise HTTPException(status_code=502, detail=detail) from None
    except BotoCoreError:
        raise HTTPException(status_code=502, detail="Could not connect to AWS. Check the backend network and AWS configuration.") from None
