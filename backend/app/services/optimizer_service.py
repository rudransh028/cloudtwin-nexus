from typing import List, Dict, Any
from app.schemas.dtos import OptimizerRequest

class OptimizerService:
    """
    Multi-objective constraint solver evaluating candidate cloud architectures
    against user SLA, Latency, and Monthly Budget parameters.
    """

    def evaluate_architectures(self, req: OptimizerRequest) -> List[Dict[str, Any]]:
        candidates = [
            {
                "id": "arch-current",
                "name": "Current Architecture (Baseline)",
                "type": "current",
                "description": "Single-AZ EKS cluster with standalone PostgreSQL primary and 1 replica.",
                "cost": 18500,
                "costMonthly": 18500,
                "latency": 95,
                "avgLatencyMs": 95,
                "sla": 99.87,
                "estimatedSla": 99.87,
                "securityScore": 78,
                "reliabilityScore": 82,
                "performanceScore": 85,
                "costScore": 70
            },
            {
                "id": "arch-ha",
                "name": "High Availability Multi-AZ Architecture",
                "type": "proposed",
                "description": "Multi-AZ EKS cluster, Aurora Multi-AZ PostgreSQL, Redis Cluster, Global CloudFront CDN.",
                "cost": 32000,
                "costMonthly": 32000,
                "latency": 68,
                "avgLatencyMs": 68,
                "sla": 99.99,
                "estimatedSla": 99.99,
                "securityScore": 92,
                "reliabilityScore": 98,
                "performanceScore": 95,
                "costScore": 45
            },
            {
                "id": "arch-optimized",
                "name": "CloudTwin Nexus Balanced Recommended Architecture",
                "type": "proposed",
                "description": "Right-sized compute instances, RDS Read Replica auto-failover, Redis caching, Graviton3 instances.",
                "cost": 19400,
                "costMonthly": 19400,
                "latency": 82,
                "avgLatencyMs": 82,
                "sla": 99.95,
                "estimatedSla": 99.95,
                "securityScore": 88,
                "reliabilityScore": 94,
                "performanceScore": 90,
                "costScore": 86
            },
            {
                "id": "arch-budget",
                "name": "Ultra-Low Cost Topology",
                "type": "proposed",
                "description": "Spot compute instances for workers, single micro database instance, aggressive cache TTL.",
                "cost": 11500,
                "costMonthly": 11500,
                "latency": 130,
                "avgLatencyMs": 130,
                "sla": 99.40,
                "estimatedSla": 99.40,
                "securityScore": 72,
                "reliabilityScore": 68,
                "performanceScore": 65,
                "costScore": 95
            }
        ]

        evaluated = []
        for arch in candidates:
            cost = arch["cost"]
            lat = arch["latency"]
            sla = arch["sla"]

            if cost > req.monthlyBudget:
                verdict = "OVER_BUDGET"
            elif lat > req.maxLatencyMs or sla < req.minSla:
                verdict = "FAIL"
            else:
                verdict = "PASS"

            evaluated.append({
                **arch,
                "verdict": verdict,
                "meetsConstraints": verdict == "PASS"
            })

        return evaluated

optimizer_service = OptimizerService()
