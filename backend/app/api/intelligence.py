from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.prediction_service import prediction_service
from app.services.architecture_doctor import architecture_doctor
from app.services.optimizer_service import optimizer_service
from app.schemas.dtos import PredictionSchema, FindingSchema, OptimizerRequest
from app.providers.kubernetes_provider import get_kubernetes_provider

router = APIRouter(tags=["Intelligence"])

@router.get("/predictions", response_model=List[PredictionSchema])
async def list_predictions():
    return prediction_service.get_active_predictions()

@router.get("/findings", response_model=List[FindingSchema])
async def list_findings():
    return architecture_doctor.scan_architecture()

@router.post("/optimize", response_model=List[Dict[str, Any]])
async def optimize_architecture(req: OptimizerRequest):
    return optimizer_service.evaluate_architectures(req)

@router.get("/architectures")
async def list_architectures():
    return optimizer_service.evaluate_architectures(OptimizerRequest())

@router.get("/kubernetes/nodes")
async def get_k8s_nodes():
    provider = get_kubernetes_provider()
    return provider.get_nodes()

@router.get("/kubernetes/pods")
async def get_k8s_pods():
    provider = get_kubernetes_provider()
    return provider.get_pods()

@router.get("/network/paths")
async def get_network_paths():
    return [
        {"id": "path-1", "name": "User to DB Read", "hops": ["Users", "Load Balancer", "API Gateway", "API Service", "PostgreSQL Replica"], "totalLatency": 42, "status": "healthy"},
        {"id": "path-2", "name": "User to DB Write", "hops": ["Users", "Load Balancer", "API Gateway", "API Service", "PostgreSQL Primary"], "totalLatency": 35, "status": "healthy"},
        {"id": "path-3", "name": "Checkout Flow", "hops": ["Users", "Load Balancer", "API Gateway", "API Service", "Order Service", "PostgreSQL Primary"], "totalLatency": 147, "status": "warning"},
        {"id": "path-4", "name": "Background Processing", "hops": ["Order Service", "Worker", "S3 Storage"], "totalLatency": 380, "status": "healthy"}
    ]

@router.get("/cost/breakdown")
async def get_cost_breakdown():
    return [
        {"category": "Compute", "amount": 8500, "percentage": 46},
        {"category": "Database", "amount": 4700, "percentage": 25},
        {"category": "Networking", "amount": 3100, "percentage": 17},
        {"category": "Storage", "amount": 1200, "percentage": 6},
        {"category": "Other", "amount": 1000, "percentage": 6}
    ]

@router.get("/cost/optimizations")
async def get_cost_optimizations():
    return [
        {"id": "opt-1", "title": "Downsize PostgreSQL Replica", "description": "Replica is consistently under 20% utilization", "savings": 600, "effort": "low"},
        {"id": "opt-2", "title": "Implement Spot Instances for Workers", "description": "Background workers can run on preemptible instances", "savings": 450, "effort": "medium"},
        {"id": "opt-3", "title": "Setup S3 Lifecycle Policies", "description": "Move older data to Glacier", "savings": 150, "effort": "low"},
        {"id": "opt-4", "title": "Consolidate Underutilized Nodes", "description": "Node 3 is running at 45% capacity during peak hours", "savings": 800, "effort": "high"}
    ]
