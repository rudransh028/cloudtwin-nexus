from datetime import datetime, timezone

from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.entities import AwsAccountConnection  # noqa: F401
from app.api import aws_metrics, cloud_connections
from app.config import settings
from app.services import aws_readonly


class FakeSTS:
    def get_caller_identity(self):
        return {"Account": "123456789012", "Arn": "arn:aws:iam::123456789012:user/demo"}


class FakeEC2:
    def describe_instances(self, **kwargs):
        return {
            "Reservations": [{
                "Instances": [{
                    "InstanceId": "i-abc123",
                    "InstanceType": "t3.micro",
                    "State": {"Name": "running"},
                    "Placement": {"AvailabilityZone": "ap-south-1a"},
                    "Tags": [{"Key": "Name", "Value": "web"}],
                    "LaunchTime": datetime.now(timezone.utc),
                }]
            }]
        }


class FakeCloudWatch:
    def get_metric_statistics(self, **kwargs):
        return {"Datapoints": [{"Timestamp": datetime.now(timezone.utc), "Average": 12.5, "Maximum": 20.0}]}


class FakeSession:
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def client(self, name):
        return {"sts": FakeSTS(), "ec2": FakeEC2(), "cloudwatch": FakeCloudWatch()}[name]


def _app(monkeypatch, encryption_key: str | None):
    monkeypatch.setattr(settings, "AWS_CONNECTION_ENCRYPTION_KEY", encryption_key)
    monkeypatch.setattr(aws_readonly, "boto3", type("Boto", (), {"Session": FakeSession}))
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(cloud_connections.router, prefix="/api/v1")
    app.include_router(aws_metrics.router, prefix="/api/v1")
    app.dependency_overrides[get_db] = override_db
    return TestClient(app), TestingSession


def test_create_requires_encryption_key(monkeypatch):
    client, _ = _app(monkeypatch, None)
    response = client.post("/api/v1/connections/aws", json={
        "name": "lab",
        "account_id": "123456789012",
        "region": "ap-south-1",
        "access_key_id": "AKIAEXAMPLEKEY0001",
        "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    })
    assert response.status_code == 503
    assert "AWS_CONNECTION_ENCRYPTION_KEY" in response.json()["detail"]
    assert "AKIAEXAMPLEKEY0001" not in response.text
    assert "wJalrXUtnFEMI" not in response.text


def test_create_list_metrics_delete_never_exposes_secrets(monkeypatch):
    key = Fernet.generate_key().decode()
    client, Session = _app(monkeypatch, key)
    body = {
        "name": "demo-account",
        "account_id": "123456789012",
        "region": "ap-south-1",
        "access_key_id": "AKIAEXAMPLEKEY0001",
        "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    }
    created = client.post("/api/v1/connections/aws", json=body)
    assert created.status_code == 200
    data = created.json()
    assert data["name"] == "demo-account"
    assert data["accountId"] == "123456789012"
    assert data["status"] == "validated"
    assert "access_key" not in created.text.lower() or "encrypted" in created.text.lower()
    assert "AKIAEXAMPLEKEY0001" not in created.text
    assert "wJalrXUtnFEMI" not in created.text
    connection_id = data["id"]

    listed = client.get("/api/v1/connections/aws")
    assert listed.status_code == 200
    assert listed.json()["connections"][0]["id"] == connection_id
    assert "AKIAEXAMPLEKEY0001" not in listed.text

    db = Session()
    row = db.get(AwsAccountConnection, connection_id)
    assert row.encrypted_access_key_id != body["access_key_id"]
    assert row.encrypted_secret_access_key != body["secret_access_key"]
    db.close()

    metrics = client.get(f"/api/v1/aws/metrics?connection_id={connection_id}")
    assert metrics.status_code == 200
    payload = metrics.json()
    assert payload["connected"] is True
    assert payload["instanceCount"] == 1
    assert payload["instances"][0]["instanceId"] == "i-abc123"
    assert "AKIAEXAMPLEKEY0001" not in metrics.text

    default_metrics = client.get("/api/v1/aws/metrics")
    assert default_metrics.status_code == 200
    assert default_metrics.json()["connected"] is True
    assert "connectionId" not in default_metrics.json()

    deleted = client.delete(f"/api/v1/connections/aws/{connection_id}")
    assert deleted.status_code == 200
    assert client.get("/api/v1/connections/aws").json()["connections"] == []
    assert client.get(f"/api/v1/aws/metrics?connection_id={connection_id}").status_code == 404
