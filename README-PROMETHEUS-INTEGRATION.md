# CloudTwin Nexus — Live Metrics Integration

This integration adds a real Prometheus-compatible metrics connector to the existing CloudTwin Nexus full-stack project. It does not replace the existing dashboard, architecture, digital-twin, simulations, cost, or analysis pages.

## What is added

- `POST /api/v1/prometheus/snapshot`: queries the configured Prometheus HTTP API for target status, host CPU/RAM/root-disk usage, load, network rate, container series, HTTP request rate, and up to one hour of CPU/RAM history where those metric series exist.
- A new **Live Metrics** page at `/metrics` with connection settings, metric-availability indicators, charts, a resources table, and transparent rule-based operational observations.
- Request-scoped bearer/basic authentication; credentials are not persisted. The endpoint URL may be saved in browser storage.
- URL validation that requires HTTPS for publicly reachable endpoints and blocks private/non-public addresses by default to reduce SSRF risk.
- Optional local Docker Compose setup at `monitoring/` and Grafana Cloud setup notes.

The backend expects a standard Prometheus query API at `<base-url>/api/v1/query` and `<base-url>/api/v1/query_range`. For Grafana Cloud Metrics, use its **query endpoint URL** (often a base path ending `/api/prom`) and basic authentication with the metrics instance ID plus a token scoped to `metrics:read`.

## Install into your existing Mac project

1. Download and extract this update ZIP.
2. Run:

   ```bash
   bash ~/Downloads/cloudtwin-nexus-live-metrics-update/install.sh
   ```

   If your repo is stored somewhere else, use:

   ```bash
   PROJECT_DIR="/full/path/to/cloudtwin-nexus" bash "/path/to/extracted-update/install.sh"
   ```

3. The installer creates a timestamped backup in `.cloudtwin-backups/`, adds the API route and the frontend page, runs focused tests if dependencies exist, and runs `npm run build` if the existing `node_modules` are installed.
4. Review the build/test output, then inspect `git status --short` and `git diff`.

## Commit only this update

Your earlier Cloud Connections page may already have a staged change. To commit only the files from this update and leave unrelated staged work untouched, run from the repository:

```bash
git add backend/app/api/prometheus_monitoring.py backend/tests/test_prometheus_monitoring.py backend/app/main.py frontend/src/pages/PrometheusMetricsPage.tsx frontend/src/routes.tsx frontend/src/components/layout/Sidebar.tsx monitoring README-PROMETHEUS-INTEGRATION.md
git commit --only -m "Add live Prometheus metrics integration" -- backend/app/api/prometheus_monitoring.py backend/tests/test_prometheus_monitoring.py backend/app/main.py frontend/src/pages/PrometheusMetricsPage.tsx frontend/src/routes.tsx frontend/src/components/layout/Sidebar.tsx monitoring README-PROMETHEUS-INTEGRATION.md
git push origin main
```

Render should redeploy from GitHub using your existing deployment settings. The patch does not change your `VITE_API_URL` or Render service settings.

## Important scope and security notes

- The live metrics page displays only measurements that Prometheus actually returns. Node Exporter/cAdvisor or another exporter must be installed/configured on the environment being monitored.
- Public Prometheus endpoints must use HTTPS. Private/local endpoints are blocked by default. `PROMETHEUS_ALLOW_PRIVATE_NETWORKS=true` exists only for a trusted **local development** setup; do not enable it on a publicly exposed CloudTwin backend because it weakens the backend's SSRF protection.
- The Render CPU/memory metrics limitation is not bypassed by this connector. This connector queries a metrics source you control or are authorized to access.
- Operational observations are transparent threshold checks. They are not an accurate trained failure prediction model. Real cloud costs also require the corresponding provider billing API permissions; Prometheus CPU/RAM series do not automatically reveal a bill.
