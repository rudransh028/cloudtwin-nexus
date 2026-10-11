# Optional local Prometheus stack

This folder provides a small self-hosted collector for a Linux Docker host. It includes Prometheus, Node Exporter, and cAdvisor. Prometheus is bound to `127.0.0.1:9090` intentionally; do not publish its unauthenticated query API directly to the internet.

## Run it

```bash
cd monitoring
docker compose up -d
```

Then open `http://localhost:9090/targets` and confirm the `prometheus`, `node`, and `cadvisor` scrape targets. Give it about one minute so enough samples exist for rate-based queries.

This local endpoint is useful while CloudTwin Nexus is also running locally. A CloudTwin backend hosted on Render cannot access `localhost` on your laptop. For the deployed website, use a securely authenticated, publicly reachable HTTPS Prometheus-compatible query endpoint such as Grafana Cloud Metrics.

The Node Exporter guide explains its hardware/kernel metrics, and Prometheus' cAdvisor guide covers container metrics:

- https://prometheus.io/docs/guides/node-exporter/
- https://prometheus.io/docs/guides/cadvisor/

### Mac note

Docker Desktop runs Linux containers inside its Linux VM. This stack is primarily a Linux host/container example and should not be represented as native macOS hardware telemetry.
