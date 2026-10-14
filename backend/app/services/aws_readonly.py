"""Read-only AWS EC2 and CloudWatch helpers for default and saved credentials."""
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError, PartialCredentialsError
from fastapi import HTTPException

SHARED_ACCESS_NOTE = (
    "Saved AWS connections are shared by anyone who can access this API. "
    "This project does not implement user sign-in or per-user isolation."
)


def aws_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, (NoCredentialsError, PartialCredentialsError)):
        return HTTPException(
            status_code=503,
            detail="AWS credentials are not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY on the backend, or attach an IAM role.",
        )
    if isinstance(exc, ClientError):
        code = exc.response.get("Error", {}).get("Code", "AWS_API_ERROR")
        if code in {"AccessDenied", "AccessDeniedException", "UnauthorizedOperation"}:
            return HTTPException(
                status_code=403,
                detail="AWS denied this read-only request. Attach IAM permissions for ec2:DescribeInstances and cloudwatch:GetMetricStatistics.",
            )
        if code in {"InvalidClientTokenId", "SignatureDoesNotMatch", "UnrecognizedClientException", "AuthFailure", "InvalidUserID.NotFound"}:
            return HTTPException(
                status_code=401,
                detail="AWS rejected these credentials. Check the access key, secret key, and region.",
            )
        return HTTPException(
            status_code=502,
            detail=f"AWS request failed ({code}). Check the region and IAM permissions.",
        )
    if isinstance(exc, BotoCoreError):
        return HTTPException(status_code=502, detail="Could not connect to AWS. Check the backend network and region.")
    return HTTPException(status_code=502, detail="Could not complete this AWS request.")


def session_from_keys(access_key_id: str, secret_access_key: str, region: str):
    return boto3.Session(
        region_name=region,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
    )


def session_from_settings(region: str, access_key_id: str | None, secret_access_key: str | None):
    return boto3.Session(
        region_name=region,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
    )


def validate_read_only_access(session, expected_account_id: str, region: str) -> dict[str, Any]:
    """Prove the keys work with STS, EC2 DescribeInstances, and CloudWatch GetMetricStatistics."""
    try:
        identity = session.client("sts").get_caller_identity()
        actual_account = str(identity.get("Account") or "")
        if expected_account_id and actual_account and actual_account != expected_account_id:
            raise HTTPException(
                status_code=400,
                detail="The credentials belong to a different AWS account than the account ID entered.",
            )
        reservations = session.client("ec2").describe_instances(MaxResults=6).get("Reservations", [])
        instance_ids = [
            item.get("InstanceId")
            for reservation in reservations
            for item in reservation.get("Instances", [])
            if item.get("InstanceId")
        ]
        probe_id = instance_ids[0] if instance_ids else "i-00000000000000000"
        end = datetime.now(timezone.utc)
        start = end - timedelta(hours=1)
        session.client("cloudwatch").get_metric_statistics(
            Namespace="AWS/EC2",
            MetricName="CPUUtilization",
            Dimensions=[{"Name": "InstanceId", "Value": probe_id}],
            StartTime=start,
            EndTime=end,
            Period=300,
            Statistics=["Average"],
        )
        return {"accountId": actual_account or expected_account_id, "region": region, "instanceCount": len(instance_ids)}
    except HTTPException:
        raise
    except Exception as exc:
        raise aws_http_error(exc) from None


def collect_ec2_cloudwatch(
    session,
    region: str,
    instance_id: str | None,
    hours: int,
    *,
    connection_id: str | None = None,
    connection_name: str | None = None,
    account_id: str | None = None,
) -> dict[str, Any]:
    try:
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
                    [
                        {
                            "timestamp": p["Timestamp"].isoformat(),
                            "averagePercent": round(float(p["Average"]), 2),
                            "maximumPercent": round(float(p["Maximum"]), 2),
                        }
                        for p in metric.get("Datapoints", [])
                    ],
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
        payload: dict[str, Any] = {
            "connected": True,
            "provider": "AWS",
            "source": "Amazon CloudWatch / AWS EC2",
            "region": region,
            "observedAt": datetime.now(timezone.utc).isoformat(),
            "windowHours": hours,
            "instanceCount": len(instances),
            "instances": instances,
            "note": "CPUUtilization is an actual AWS CloudWatch metric. Basic EC2 monitoring commonly publishes at 5-minute intervals; new instances may need several minutes before datapoints appear.",
        }
        if connection_id:
            payload["connectionId"] = connection_id
            payload["connectionName"] = connection_name
            payload["accountId"] = account_id
            payload["sharedAccess"] = SHARED_ACCESS_NOTE
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise aws_http_error(exc) from None
