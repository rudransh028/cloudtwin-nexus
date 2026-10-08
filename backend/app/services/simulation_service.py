import networkx as nx
from typing import Dict, Any, List
from datetime import datetime, timezone
import math
from app.services.digital_twin_service import digital_twin_service
from app.schemas.dtos import SimulationScenario

class SimulationEngine:
    """
    Simulates traffic spikes, component failures, and architectural mutations
    using M/M/1 queuing theory (W = 1 / (mu - lambda)) and dependency propagation.
    """

    def run_simulation(self, scenario: SimulationScenario) -> Dict[str, Any]:
        sim_graph = digital_twin_service.clone_graph()

        traffic_mult = scenario.trafficMultiplier if scenario.trafficMultiplier is not None else 1.0
        injected_failures = [f.lower() for f in (scenario.injectedFailures or [])]
        infra_changes = [c.lower() for c in (scenario.infraChanges or [])]

        # 1. Apply Infrastructure Changes (Add Replica, Add Cache, etc.)
        added_replicas = {}
        has_extra_cache = any("cache" in c for c in infra_changes)
        
        for change in infra_changes:
            if "api replica" in change:
                added_replicas["comp-api"] = added_replicas.get("comp-api", 0) + 2
            if "db replica" in change:
                added_replicas["comp-db-primary"] = added_replicas.get("comp-db-primary", 0) + 1

        # 2. Apply Injected Failures
        failed_nodes = set()
        for f in injected_failures:
            if "api" in f:
                failed_nodes.add("comp-api")
            if "database" in f or "db" in f:
                failed_nodes.add("comp-db-primary")
            if "redis" in f:
                failed_nodes.add("comp-redis")
            if "node" in f:
                failed_nodes.add("comp-orders")

        component_results = []
        bottleneck_candidates = []
        overall_latency_sum = 0
        component_count = 0

        # Base system baseline
        baseline_latency = 95.0
        baseline_cost = 18500.0
        baseline_sla = 99.87

        for node_id, data in sim_graph.nodes(data=True):
            if data.get("type") == "user":
                continue

            name = data.get("name", node_id)
            orig_status = data.get("status", "healthy")
            base_latency = float(data.get("latency", 10.0))
            base_cpu = float(data.get("cpu", 40.0))
            base_rps = float(data.get("requestRate", 1000.0))
            capacity_rps = float(data.get("capacity_rps", 5000.0))

            # Apply replica scaling to capacity
            extra_rep = added_replicas.get(node_id, 0)
            effective_capacity = capacity_rps * (1.0 + (extra_rep * 0.6))
            
            # If caching is added, reduce DB read load
            effective_demand = base_rps * traffic_mult
            if has_extra_cache and "db" in node_id:
                effective_demand *= 0.45

            # Calculate utilization rho = lambda / mu
            rho = effective_demand / max(effective_capacity, 1.0)

            # Node failure handling
            if node_id in failed_nodes:
                new_status = "critical"
                new_latency = base_latency * 10
                new_cpu = 0.0
                error_rate_after = 100.0
            elif rho >= 1.0:
                # Saturation / queue explosion
                new_status = "critical"
                new_latency = round(base_latency * (3.5 + min(rho, 5.0)), 1)
                new_cpu = min(100.0, base_cpu * min(rho, 1.4))
                error_rate_after = min(45.0, (rho - 1.0) * 20.0 + 5.0)
                bottleneck_candidates.append((name, rho))
            elif rho >= 0.75:
                # M/M/1 queuing delay non-linear increase
                queue_factor = 1.0 / (1.0 - rho + 0.05)
                new_status = "warning"
                new_latency = round(base_latency * min(queue_factor, 4.0), 1)
                new_cpu = min(95.0, base_cpu * (1.0 + rho * 0.4))
                error_rate_after = min(5.0, rho * 2.0)
            else:
                new_status = "healthy"
                new_latency = round(base_latency * (1.0 + rho * 0.2), 1)
                new_cpu = min(80.0, base_cpu * (1.0 + (traffic_mult - 1.0) * 0.15))
                error_rate_after = 0.1

            overall_latency_sum += new_latency
            component_count += 1

            component_results.append({
                "id": node_id,
                "name": name,
                "statusBefore": orig_status,
                "statusAfter": new_status,
                "latencyBefore": base_latency,
                "latencyAfter": new_latency,
                "cpuBefore": base_cpu,
                "cpuAfter": round(new_cpu, 1),
                "errorRateBefore": float(data.get("errorRate", 0.1)),
                "errorRateAfter": round(error_rate_after, 2)
            })

        # Calculate macro metrics
        pred_latency = round((overall_latency_sum / max(component_count, 1)) * 2.2, 0)
        
        # Primary bottleneck determination
        if failed_nodes:
            primary_bottleneck = "PostgreSQL Primary" if "comp-db-primary" in failed_nodes else "API Service"
        elif bottleneck_candidates:
            primary_bottleneck = max(bottleneck_candidates, key=lambda x: x[1])[0]
        else:
            primary_bottleneck = "API Gateway" if traffic_mult >= 10 else "None (System Healthy)"

        # SLA calculation
        if failed_nodes:
            pred_sla = 82.5 if "comp-db-primary" in failed_nodes else 94.0
            affected_users = 82.0 if "comp-db-primary" in failed_nodes else 45.0
            health_after = "degraded"
        elif traffic_mult >= 50:
            pred_sla = 92.4
            affected_users = 68.0
            health_after = "degraded"
        elif traffic_mult >= 10:
            pred_sla = 97.4
            affected_users = 37.0
            health_after = "degraded"
        elif traffic_mult >= 2:
            pred_sla = 99.4
            affected_users = 6.0
            health_after = "healthy"
        else:
            pred_sla = 99.87
            affected_users = 0.0
            health_after = "healthy"

        # Cost estimation
        pred_cost = round(baseline_cost * (1.0 + (traffic_mult - 1) * 0.35 + len(added_replicas) * 0.2), 0)

        recommendations = []
        if "comp-db-primary" in failed_nodes or "PostgreSQL" in primary_bottleneck:
            recommendations.append("Deploy PostgreSQL Read Replica with automated failover (recovers ~300ms latency)")
            recommendations.append("Enable Redis caching on query intensive endpoints")
        if traffic_mult >= 5:
            recommendations.append("Scale API Pod HPA minReplicas from 2 to 8 ahead of predicted surge")
        if not recommendations:
            recommendations.append("Current architecture topology operates within optimal latency and SLA bounds")

        return {
            "id": f"sim-{int(datetime.now().timestamp())}",
            "name": scenario.name or f"{traffic_mult}x Traffic Scenario",
            "status": "completed",
            "overallHealthBefore": "healthy",
            "overallHealthAfter": health_after,
            "latencyBefore": baseline_latency,
            "latencyAfter": pred_latency,
            "slaBefore": baseline_sla,
            "slaAfter": pred_sla,
            "costBefore": baseline_cost,
            "costAfter": pred_cost,
            "requestRateBefore": 5000,
            "requestRateAfter": int(5000 * traffic_mult),
            "affectedUsersPercent": affected_users,
            "bottleneck": primary_bottleneck,
            "components": component_results,
            "recommendations": recommendations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

simulation_engine = SimulationEngine()
