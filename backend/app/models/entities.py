from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cloud_provider = Column(String, default="aws")
    status = Column(String, default="healthy")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    components = relationship("Component", back_populates="project", cascade="all, delete-orphan")
    dependencies = relationship("Dependency", back_populates="project", cascade="all, delete-orphan")

class Component(Base):
    __tablename__ = "components"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # service, database, cache, gateway, load_balancer, etc.
    status = Column(String, default="healthy")
    region = Column(String, default="ap-south-1")
    cpu = Column(Float, default=0.0)
    memory = Column(Float, default=0.0)
    request_rate = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    latency = Column(Float, default=0.0)
    replicas = Column(Integer, default=2)
    cost = Column(Float, default=0.0)
    parent_id = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    project = relationship("Project", back_populates="components")

class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    source_id = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    type = Column(String, default="http")
    protocol = Column(String, default="HTTP/1.1")
    avg_latency_ms = Column(Float, default=10.0)
    traffic_rps = Column(Float, default=100.0)
    error_rate = Column(Float, default=0.0)
    status = Column(String, default="healthy")

    project = relationship("Project", back_populates="dependencies")

class SimulationRecord(Base):
    __tablename__ = "simulations"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scenario_json = Column(JSON, nullable=False)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AnalysisFinding(Base):
    __tablename__ = "analysis_findings"

    id = Column(String, primary_key=True, default=gen_uuid)
    category = Column(String, nullable=False) # reliability, security, cost, performance, architecture
    severity = Column(String, nullable=False) # critical, high, medium, low
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    component_id = Column(String, nullable=True)
    status = Column(String, default="open")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=gen_uuid)
    component_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    time_to_impact = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    trend_data = Column(JSON, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
