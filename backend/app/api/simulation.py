from fastapi import APIRouter
from typing import Dict, Any, List
from app.services.simulation_service import simulation_engine
from app.services.digital_twin_service import digital_twin_service
from app.schemas.dtos import SimulationScenario, SimulationResultSchema

router = APIRouter(prefix="/simulations", tags=["Simulation"])

@router.post("", response_model=SimulationResultSchema)
async def run_simulation(scenario: SimulationScenario):
    await digital_twin_service.sync_with_providers()
    return simulation_engine.run_simulation(scenario)

@router.get("/templates")
async def get_simulation_templates():
    return [
        {"id": "black-friday", "name": "Black Friday Traffic Surge (10x)", "trafficMultiplier": 10.0},
        {"id": "db-crash", "name": "PostgreSQL Primary Failure", "injectedFailures": ["Kill Database"]},
        {"id": "node-loss", "name": "Kubernetes Node Loss", "injectedFailures": ["Kill Node"]},
        {"id": "cache-addition", "name": "Add Redis Cluster Caching", "infraChanges": ["Add Cache"]}
    ]
