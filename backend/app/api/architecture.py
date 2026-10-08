from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.digital_twin_service import digital_twin_service
from app.schemas.dtos import ComponentSchema, DependencySchema
from app.config import settings

router = APIRouter(tags=["Architecture & Digital Twin"])

@router.get("/components", response_model=List[ComponentSchema])
async def list_components():
    await digital_twin_service.sync_with_providers()
    return digital_twin_service.get_components()

@router.get("/components/{component_id}", response_model=ComponentSchema)
async def get_component_detail(component_id: str):
    await digital_twin_service.sync_with_providers()
    comp = digital_twin_service.get_component(component_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    return comp

@router.get("/dependencies", response_model=List[DependencySchema])
async def list_dependencies():
    return digital_twin_service.get_dependencies()

@router.get("/twin/status")
async def get_twin_status():
    await digital_twin_service.sync_with_providers()
    components = digital_twin_service.get_components()
    return {
        "status": "synchronized",
        "cluster": "aws-eks-production-cluster",
        "region": settings.AWS_REGION,
        "trackedComponents": len(components),
        "graphEdges": len(digital_twin_service.get_dependencies()),
        "driftPercent": 0.0,
        "lastSyncedAt": "Just now",
        "cadenceSeconds": 15,
        "cloudMode": settings.CLOUD_MODE,
        "kubernetesMode": settings.KUBERNETES_MODE,
        "telemetryMode": settings.TELEMETRY_MODE
    }
