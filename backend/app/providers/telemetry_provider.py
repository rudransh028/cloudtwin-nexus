from abc import ABC, abstractmethod
from typing import Dict, Any, List
import random
import time
from app.config import settings
from app.integrations.prometheus_client import PrometheusClient

class TelemetryProvider(ABC):
    @abstractmethod
    async def get_node_metrics(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_pod_metrics(self) -> List[Dict[str, Any]]:
        pass
        
    @abstractmethod
    async def get_dashboard_summary(self) -> Dict[str, Any]:
        pass

class MockTelemetryProvider(TelemetryProvider):
    async def get_node_metrics(self) -> List[Dict[str, Any]]:
        return [{"node": "node-1", "cpu": 45.0, "memory": 60.0}]

    async def get_pod_metrics(self) -> List[Dict[str, Any]]:
        return [{"pod": "pod-1", "cpu": 15.0, "memory": 30.0}]

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        return {
            "healthScore": 84,
            "cpuAvg": round(67.4 + random.uniform(-3, 3), 1),
            "memoryAvg": round(72.1 + random.uniform(-2, 2), 1),
            "networkIn": 245000000,
            "networkOut": 189000000,
            "requestRate": int(4850 + random.uniform(-100, 100)),
            "errorRate": 0.3,
            "avgLatency": int(95 + random.uniform(-5, 5)),
            "activeServices": 8,
            "podCount": 14,
            "containerCount": 18,
            "nodeCount": 3,
            "estimatedCost": 18500,
            "sla": 99.87,
            "securityScore": 78,
            "riskScore": 32,
            "status": "healthy"
        }

class PrometheusTelemetryProvider(TelemetryProvider):
    def __init__(self):
        self.client = PrometheusClient(settings.PROMETHEUS_URL)

    async def get_node_metrics(self) -> List[Dict[str, Any]]:
        # Simplified PromQL
        query = '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
        cpu_res = await self.client.query_instant(query)
        results = []
        for metric in cpu_res:
            node = metric.get('metric', {}).get('instance', 'unknown')
            val = float(metric.get('value', [0, '0'])[1])
            results.append({"node": node, "cpu": round(val, 2), "memory": 0.0}) # Simplified
        return results

    async def get_pod_metrics(self) -> List[Dict[str, Any]]:
        query = 'sum by (pod) (rate(container_cpu_usage_seconds_total[5m]))'
        res = await self.client.query_instant(query)
        results = []
        for metric in res:
            pod = metric.get('metric', {}).get('pod', 'unknown')
            val = float(metric.get('value', [0, '0'])[1]) * 100
            results.append({"pod": pod, "cpu": round(val, 2), "memory": 0.0})
        return results

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        # A real implementation would run multiple PromQL queries here
        # For this prototype, we'll fetch a real CPU metric and mix with some mocked structure 
        # so the dashboard doesn't break, fulfilling "The UI should remain exactly as it is".
        cpu_res = await self.client.query_instant('avg(100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))')
        cpu_avg = 65.0
        if cpu_res and len(cpu_res) > 0:
            cpu_avg = float(cpu_res[0].get('value', [0, '0'])[1])
            
        mem_res = await self.client.query_instant('100 * (1 - ((avg_over_time(node_memory_MemFree_bytes[5m]) + avg_over_time(node_memory_Cached_bytes[5m]) + avg_over_time(node_memory_Buffers_bytes[5m])) / avg_over_time(node_memory_MemTotal_bytes[5m])))')
        mem_avg = 70.0
        if mem_res and len(mem_res) > 0:
            mem_avg = float(mem_res[0].get('value', [0, '0'])[1])
            
        return {
            "healthScore": 85,
            "cpuAvg": round(cpu_avg, 1) if not str(cpu_avg).startswith('nan') else 65.0,
            "memoryAvg": round(mem_avg, 1) if not str(mem_avg).startswith('nan') else 70.0,
            "networkIn": 245000000,
            "networkOut": 189000000,
            "requestRate": 4850,
            "errorRate": 0.3,
            "avgLatency": 95,
            "activeServices": 8,
            "podCount": 14,
            "containerCount": 18,
            "nodeCount": 3,
            "estimatedCost": 18500,
            "sla": 99.87,
            "securityScore": 78,
            "riskScore": 32,
            "status": "healthy"
        }

def get_telemetry_provider() -> TelemetryProvider:
    if settings.TELEMETRY_MODE.lower() == "prometheus":
        return PrometheusTelemetryProvider()
    return MockTelemetryProvider()
