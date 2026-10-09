from typing import Dict, Any, List
from datetime import datetime, timezone
from app.services.digital_twin_service import digital_twin_service
from app.schemas.dtos import SimulationScenario

SIMULATION_DISCLAIMER = (
    "This result is a Digital Twin simulation only. "
    "No live AWS, Kubernetes, or storage resources were modified."
)


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

        added_replicas: Dict[str, int] = {}
        has_extra_cache = any("cache" in c for c in infra_changes)
        has_downsize_replica = any("downsize" in c for c in infra_changes)
        has_spot = any("spot" in c for c in infra_changes)
        has_s3_lifecycle = any("s3" in c or "lifecycle" in c or "glacier" in c for c in infra_changes)
        has_consolidate = any("consolidat" in c for c in infra_changes) or any(
            "node" in c and "underutil" in c for c in infra_changes
        )
        has_increase_cpu = any("cpu" in c and "increase" in c for c in infra_changes)
        has_increase_memory = any("memory" in c and "increase" in c for c in infra_changes)

        for change in infra_changes:
            if "api replica" in change:
                added_replicas["comp-api"] = added_replicas.get("comp-api", 0) + 2
            if "db replica" in change and "downsize" not in change:
                added_replicas["comp-db-primary"] = added_replicas.get("comp-db-primary", 0) + 1

        failed_nodes = set()
        network_degraded = False
        region_failed = False
        for f in injected_failures:
            if "network" in f:
                network_degraded = True
                continue
            if "region" in f:
                region_failed = True
                failed_nodes.add("comp-frontend")
                continue
            if "api" in f:
                failed_nodes.add("comp-api")
            if "database" in f or ("db" in f and "replica" not in f):
                failed_nodes.add("comp-db-primary")
            if "redis" in f:
                failed_nodes.add("comp-redis")
            if "node" in f:
                failed_nodes.add("comp-orders")

        component_results = []
        bottleneck_candidates = []
        overall_latency_sum = 0
        component_count = 0

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

            extra_rep = added_replicas.get(node_id, 0)
            effective_capacity = capacity_rps * (1.0 + (extra_rep * 0.6))
            if has_increase_cpu and node_id in ("comp-api", "comp-orders", "comp-worker"):
                effective_capacity *= 1.25
            if has_increase_memory and node_id in ("comp-api", "comp-worker", "comp-redis"):
                effective_capacity *= 1.1
            if has_downsize_replica and node_id == "comp-db-replica":
                effective_capacity *= 0.55
            if has_consolidate and node_id in ("comp-orders", "comp-worker"):
                effective_capacity *= 0.75

            effective_demand = base_rps * traffic_mult
            if has_extra_cache and "db" in node_id:
                effective_demand *= 0.45

            rho = effective_demand / max(effective_capacity, 1.0)

            if node_id in failed_nodes:
                new_status = "critical"
                new_latency = base_latency * 10
                new_cpu = 0.0
                error_rate_after = 100.0
            elif rho >= 1.0:
                new_status = "critical"
                new_latency = round(base_latency * (3.5 + min(rho, 5.0)), 1)
                new_cpu = min(100.0, base_cpu * min(rho, 1.4))
                error_rate_after = min(45.0, (rho - 1.0) * 20.0 + 5.0)
                bottleneck_candidates.append((name, rho))
            elif rho >= 0.75:
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

            if network_degraded:
                new_latency = round(new_latency * 3.2, 1)
                if new_status == "healthy":
                    new_status = "warning"
            if region_failed and node_id == "comp-frontend":
                new_latency = round(new_latency * 1.8, 1)

            if has_spot and node_id == "comp-worker" and new_status == "healthy":
                new_status = "warning"

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

        pred_latency = round((overall_latency_sum / max(component_count, 1)) * 2.2, 0)

        if failed_nodes:
            primary_bottleneck = "PostgreSQL Primary" if "comp-db-primary" in failed_nodes else "API Service"
        elif bottleneck_candidates:
            primary_bottleneck = max(bottleneck_candidates, key=lambda x: x[1])[0]
        elif network_degraded:
            primary_bottleneck = "Cross-AZ network path"
        else:
            primary_bottleneck = "API Gateway" if traffic_mult >= 10 else "None (System Healthy)"

        if failed_nodes:
            pred_sla = 82.5 if "comp-db-primary" in failed_nodes else 94.0
            affected_users = 82.0 if "comp-db-primary" in failed_nodes else 45.0
            health_after = "degraded"
        elif region_failed:
            pred_sla = 96.8
            affected_users = 22.0
            health_after = "degraded"
        elif network_degraded:
            pred_sla = 97.9
            affected_users = 14.0
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

        if has_downsize_replica:
            pred_sla = round(min(pred_sla, 99.72), 2)
        if has_consolidate:
            pred_sla = round(min(pred_sla, 99.65), 2)
        if has_spot:
            pred_sla = round(min(pred_sla, 99.70), 2)

        replica_cost = len(added_replicas) * 0.2 * baseline_cost
        change_cost = 0.0
        if has_extra_cache:
            change_cost += 900.0
        if has_downsize_replica:
            change_cost -= 600.0
        if has_spot:
            change_cost -= 450.0
        if has_s3_lifecycle:
            change_cost -= 150.0
        if has_consolidate:
            change_cost -= 800.0
        if has_increase_cpu:
            change_cost += 400.0
        if has_increase_memory:
            change_cost += 300.0

        pred_cost = round(
            baseline_cost * (1.0 + (traffic_mult - 1) * 0.35) + replica_cost + change_cost,
            0
        )

        recommendations: List[str] = []
        if "comp-db-primary" in failed_nodes or "PostgreSQL" in primary_bottleneck:
            recommendations.append("Deploy PostgreSQL Read Replica with automated failover (recovers ~300ms latency)")
            recommendations.append("Enable Redis caching on query intensive endpoints")
        if traffic_mult >= 5:
            recommendations.append("Scale API Pod HPA minReplicas from 2 to 8 ahead of predicted surge")
        if has_downsize_replica:
            recommendations.append("Keep a burst-capacity plan: downsizing the replica saves cost but reduces read headroom")
        if has_spot:
            recommendations.append("Use interruption-tolerant queues so worker spot preemption does not drop jobs")
        if has_s3_lifecycle:
            recommendations.append("Lifecycle rules only affect cold object storage cost; application latency is unchanged")
        if has_consolidate:
            recommendations.append("Confirm node packing does not push remaining workers above 75% CPU at peak")
        if not recommendations:
            recommendations.append("Current architecture topology operates within optimal latency and SLA bounds")

        applied = scenario.infraChanges or []
        insights = [
            SIMULATION_DISCLAIMER,
            f"Modeled traffic multiplier: {traffic_mult}x",
        ]
        if applied:
            insights.append("Modeled infrastructure changes: " + ", ".join(applied))
        if scenario.injectedFailures:
            insights.append("Injected simulated failures: " + ", ".join(scenario.injectedFailures))

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
            "insights": insights,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


simulation_engine = SimulationEngine()
