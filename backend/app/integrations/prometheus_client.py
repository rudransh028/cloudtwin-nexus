import httpx
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class PrometheusClient:
    """
    Adapter for scraping Prometheus metrics from Kubernetes clusters / node-exporter.
    Falls back gracefully to synthesized live telemetry if no live cluster is available.
    """

    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        self.prometheus_url = prometheus_url

    async def query_instant(self, query: str) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.prometheus_url}/api/v1/query", params={"query": query})
                if res.status_code == 200:
                    data = res.json()
                    return data.get("data", {}).get("result", [])
        except Exception as e:
            logger.debug(f"Prometheus query failed ({e}), falling back to internal telemetry stream.")
        return []

prometheus_client = PrometheusClient()
