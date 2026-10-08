from abc import ABC, abstractmethod
from typing import Dict, Any, List
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class KubernetesProvider(ABC):
    @abstractmethod
    def get_nodes(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_pods(self) -> List[Dict[str, Any]]:
        pass

class MockKubernetesProvider(KubernetesProvider):
    def get_nodes(self) -> List[Dict[str, Any]]:
        return [
            {"id": "node-1", "name": "ip-10-0-1-45.ec2.internal", "status": "Ready", "cpuCapacity": 4000, "memoryCapacity": 16384, "podCount": 14},
            {"id": "node-2", "name": "ip-10-0-2-112.ec2.internal", "status": "Ready", "cpuCapacity": 4000, "memoryCapacity": 16384, "podCount": 12},
            {"id": "node-3", "name": "ip-10-0-3-87.ec2.internal", "status": "Ready", "cpuCapacity": 4000, "memoryCapacity": 16384, "podCount": 18}
        ]

    def get_pods(self) -> List[Dict[str, Any]]:
        return [
            {"id": "pod-1", "name": "frontend-7d6b9d5c5f-hx2v", "namespace": "default", "node": "node-1", "status": "Running", "restarts": 0},
            {"id": "pod-2", "name": "api-687489569-z8xc", "namespace": "default", "node": "node-2", "status": "Running", "restarts": 2},
            {"id": "pod-3", "name": "db-primary-0", "namespace": "default", "node": "node-3", "status": "Running", "restarts": 0}
        ]

class RealKubernetesProvider(KubernetesProvider):
    def __init__(self):
        try:
            from kubernetes import client, config
            if settings.KUBERNETES_IN_CLUSTER:
                config.load_incluster_config()
            else:
                config.load_kube_config()
            self.v1 = client.CoreV1Api()
            self.connected = True
        except Exception as e:
            logger.warning(f"Failed to initialize Kubernetes client: {e}")
            self.connected = False

    def get_nodes(self) -> List[Dict[str, Any]]:
        if not self.connected:
            return []
        try:
            nodes = self.v1.list_node().items
            results = []
            for node in nodes:
                status = "NotReady"
                for condition in node.status.conditions:
                    if condition.type == "Ready" and condition.status == "True":
                        status = "Ready"
                results.append({
                    "id": node.metadata.uid,
                    "name": node.metadata.name,
                    "status": status,
                    "cpuCapacity": int(node.status.capacity.get('cpu', 1)) * 1000,
                    "memoryCapacity": int(node.status.capacity.get('memory', '0Ki').replace('Ki', '')) // 1024,
                    "podCount": 0 # Would need to count pods per node
                })
            return results
        except Exception as e:
            logger.error(f"Error fetching K8s nodes: {e}")
            return []

    def get_pods(self) -> List[Dict[str, Any]]:
        if not self.connected:
            return []
        try:
            pods = self.v1.list_pod_for_all_namespaces().items
            results = []
            for pod in pods:
                restarts = 0
                if pod.status.container_statuses:
                    restarts = sum(cs.restart_count for cs in pod.status.container_statuses)
                results.append({
                    "id": pod.metadata.uid,
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "node": pod.spec.node_name,
                    "status": pod.status.phase,
                    "restarts": restarts
                })
            return results
        except Exception as e:
            logger.error(f"Error fetching K8s pods: {e}")
            return []

def get_kubernetes_provider() -> KubernetesProvider:
    if settings.KUBERNETES_MODE.lower() == "real":
        return RealKubernetesProvider()
    return MockKubernetesProvider()
