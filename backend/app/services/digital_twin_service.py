import networkx as nx
from typing import Dict, Any, List, Optional
import copy
import logging
from app.providers.telemetry_provider import get_telemetry_provider
from app.providers.kubernetes_provider import get_kubernetes_provider
from app.providers.aws_provider import get_cloud_provider

logger = logging.getLogger(__name__)

class DigitalTwinService:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.metadata = {
            "version": "1.0.0",
            "cluster": "aws-eks-production-cluster",
            "region": "ap-south-1"
        }
        self._initialize_default_topology()

    def _initialize_default_topology(self):
        components = [
            {"id": "comp-users", "name": "Users", "type": "user", "status": "healthy", "cpu": 0, "memory": 0, "requestRate": 5000, "errorRate": 0, "latency": 0, "cost": 0, "capacity_rps": 100000},
            {"id": "comp-lb", "name": "Load Balancer", "type": "load_balancer", "status": "healthy", "cpu": 35, "memory": 40, "requestRate": 5000, "errorRate": 0.1, "latency": 5, "cost": 850, "capacity_rps": 20000},
            {"id": "comp-gw", "name": "API Gateway", "type": "gateway", "status": "healthy", "cpu": 45, "memory": 55, "requestRate": 4950, "errorRate": 0.2, "latency": 12, "cost": 1200, "capacity_rps": 15000},
            {"id": "comp-frontend", "name": "Frontend Service", "type": "service", "status": "healthy", "cpu": 55, "memory": 60, "requestRate": 1500, "errorRate": 0.1, "latency": 45, "cost": 2100, "capacity_rps": 8000},
            {"id": "comp-api", "name": "API Service", "type": "service", "status": "warning", "cpu": 75, "memory": 70, "requestRate": 3450, "errorRate": 0.8, "latency": 85, "cost": 2800, "capacity_rps": 6000},
            {"id": "comp-auth", "name": "Auth Service", "type": "service", "status": "healthy", "cpu": 30, "memory": 40, "requestRate": 3450, "errorRate": 0.1, "latency": 25, "cost": 1500, "capacity_rps": 10000},
            {"id": "comp-orders", "name": "Order Service", "type": "service", "status": "healthy", "cpu": 65, "memory": 65, "requestRate": 850, "errorRate": 0.5, "latency": 110, "cost": 2400, "capacity_rps": 4000},
            {"id": "comp-worker", "name": "Worker", "type": "service", "status": "healthy", "cpu": 40, "memory": 80, "requestRate": 120, "errorRate": 0.05, "latency": 350, "cost": 1100, "capacity_rps": 2000},
            {"id": "comp-redis", "name": "Redis Cache", "type": "cache", "status": "healthy", "cpu": 35, "memory": 75, "requestRate": 6500, "errorRate": 0.01, "latency": 2, "cost": 1600, "capacity_rps": 25000},
            {"id": "comp-db-primary", "name": "PostgreSQL Primary", "type": "database", "status": "warning", "cpu": 85, "memory": 80, "requestRate": 4200, "errorRate": 0.2, "latency": 15, "cost": 3500, "capacity_rps": 5000},
            {"id": "comp-db-replica", "name": "PostgreSQL Replica", "type": "database", "status": "healthy", "cpu": 45, "memory": 55, "requestRate": 2100, "errorRate": 0.1, "latency": 18, "cost": 1200, "capacity_rps": 5000},
            {"id": "comp-s3", "name": "S3 Storage", "type": "storage", "status": "healthy", "cpu": 10, "memory": 15, "requestRate": 350, "errorRate": 0.02, "latency": 45, "cost": 250, "capacity_rps": 50000}
        ]

        for c in components:
            self.graph.add_node(c["id"], **c)

        dependencies = [
            ("comp-users", "comp-lb", {"id": "dep-1", "latency": 45, "traffic": 5000, "protocol": "HTTPS"}),
            ("comp-lb", "comp-gw", {"id": "dep-2", "latency": 2, "traffic": 4950, "protocol": "HTTP/2"}),
            ("comp-gw", "comp-frontend", {"id": "dep-3", "latency": 8, "traffic": 1500, "protocol": "gRPC"}),
            ("comp-gw", "comp-api", {"id": "dep-4", "latency": 10, "traffic": 3450, "protocol": "gRPC"}),
            ("comp-api", "comp-auth", {"id": "dep-5", "latency": 5, "traffic": 3450, "protocol": "HTTP/1.1"}),
            ("comp-api", "comp-orders", {"id": "dep-6", "latency": 15, "traffic": 850, "protocol": "HTTP/1.1"}),
            ("comp-api", "comp-redis", {"id": "dep-7", "latency": 2, "traffic": 6500, "protocol": "Redis RESP"}),
            ("comp-api", "comp-db-primary", {"id": "dep-8", "latency": 15, "traffic": 4200, "protocol": "PostgreSQL"}),
            ("comp-orders", "comp-db-primary", {"id": "dep-9", "latency": 18, "traffic": 850, "protocol": "PostgreSQL"}),
            ("comp-orders", "comp-worker", {"id": "dep-10", "latency": 5, "traffic": 120, "protocol": "AMQP"}),
            ("comp-db-primary", "comp-db-replica", {"id": "dep-11", "latency": 2, "traffic": 2100, "protocol": "Streaming Repl"}),
            ("comp-worker", "comp-s3", {"id": "dep-12", "latency": 25, "traffic": 150, "protocol": "AWS S3 API"})
        ]

        for u, v, attrs in dependencies:
            self.graph.add_edge(u, v, **attrs)

    async def sync_with_providers(self):
        telemetry = get_telemetry_provider()
        k8s = get_kubernetes_provider()
        aws = get_cloud_provider()
        
        # Real Cloud Data Mapping
        aws_res = aws.discover_resources()
        k8s_pods = k8s.get_pods()
        pod_metrics = await telemetry.get_pod_metrics()
        
        # Reconcile pods
        for pod in k8s_pods:
            name = pod.get("name", "")
            if "api" in name and self.graph.has_node("comp-api"):
                self.graph.nodes["comp-api"]["replicas"] = sum(1 for p in k8s_pods if "api" in p.get("name", ""))
            if "postgres" in name and self.graph.has_node("comp-db-primary"):
                self.graph.nodes["comp-db-primary"]["replicas"] = sum(1 for p in k8s_pods if "postgres" in p.get("name", ""))

        # Reconcile telemetry
        for metric in pod_metrics:
            pod_name = metric.get("pod", "")
            if "api" in pod_name and self.graph.has_node("comp-api"):
                self.graph.nodes["comp-api"]["cpu"] = metric.get("cpu", 0)
                
        # Reconcile AWS
        if aws_res.get("rds"):
            if self.graph.has_node("comp-db-primary"):
                self.graph.nodes["comp-db-primary"]["class"] = aws_res["rds"][0].get("class", "db.r5.large")

    def get_components(self) -> List[Dict[str, Any]]:
        return [data for node_id, data in self.graph.nodes(data=True)]

    def get_component(self, component_id: str) -> Optional[Dict[str, Any]]:
        if component_id in self.graph.nodes:
            return self.graph.nodes[component_id]
        return None

    def get_dependencies(self) -> List[Dict[str, Any]]:
        deps = []
        for u, v, data in self.graph.edges(data=True):
            deps.append({
                "id": data.get("id", f"{u}->{v}"),
                "sourceId": u,
                "targetId": v,
                "latency": data.get("latency", 10),
                "traffic": data.get("traffic", 100),
                "protocol": data.get("protocol", "HTTP"),
                "status": data.get("status", "healthy")
            })
        return deps

    def clone_graph(self) -> nx.DiGraph:
        return copy.deepcopy(self.graph)

digital_twin_service = DigitalTwinService()
