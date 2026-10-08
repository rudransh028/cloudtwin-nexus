from abc import ABC, abstractmethod
from typing import Dict, Any, List
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class CloudProvider(ABC):
    @abstractmethod
    def discover_resources(self) -> Dict[str, List[Dict[str, Any]]]:
        pass

class MockCloudProvider(CloudProvider):
    def discover_resources(self) -> Dict[str, List[Dict[str, Any]]]:
        return {
            "ec2": [
                {"id": "i-0abcd1234efgh5678", "type": "t3.medium", "state": "running"},
                {"id": "i-0wxyz9876vuts5432", "type": "t3.large", "state": "running"}
            ],
            "rds": [
                {"id": "db-primary", "engine": "postgres", "status": "available", "class": "db.r5.large"}
            ],
            "s3": [
                {"name": "cloudtwin-assets-bucket"}
            ]
        }

class AWSCloudProvider(CloudProvider):
    def __init__(self):
        try:
            import boto3
            self.session = boto3.Session(
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
            self.connected = True
        except Exception as e:
            logger.warning(f"Failed to initialize AWS boto3 session: {e}")
            self.connected = False

    def discover_resources(self) -> Dict[str, List[Dict[str, Any]]]:
        if not self.connected:
            return {"ec2": [], "rds": [], "s3": []}
            
        resources = {"ec2": [], "rds": [], "s3": []}
        
        try:
            ec2 = self.session.client('ec2')
            instances = ec2.describe_instances()
            for reservation in instances.get('Reservations', []):
                for instance in reservation.get('Instances', []):
                    resources["ec2"].append({
                        "id": instance.get('InstanceId'),
                        "type": instance.get('InstanceType'),
                        "state": instance.get('State', {}).get('Name')
                    })
        except Exception as e:
            logger.debug(f"AWS EC2 discovery failed: {e}")

        try:
            rds = self.session.client('rds')
            dbs = rds.describe_db_instances()
            for db in dbs.get('DBInstances', []):
                resources["rds"].append({
                    "id": db.get('DBInstanceIdentifier'),
                    "engine": db.get('Engine'),
                    "status": db.get('DBInstanceStatus'),
                    "class": db.get('DBInstanceClass')
                })
        except Exception as e:
            logger.debug(f"AWS RDS discovery failed: {e}")

        try:
            s3 = self.session.client('s3')
            buckets = s3.list_buckets()
            for bucket in buckets.get('Buckets', []):
                resources["s3"].append({
                    "name": bucket.get('Name')
                })
        except Exception as e:
            logger.debug(f"AWS S3 discovery failed: {e}")

        return resources

def get_cloud_provider() -> CloudProvider:
    if settings.CLOUD_MODE.lower() == "aws":
        return AWSCloudProvider()
    return MockCloudProvider()
