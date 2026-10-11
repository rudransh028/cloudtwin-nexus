# Connect CloudTwin Nexus to Grafana Cloud Free

Grafana Cloud Free is a managed metrics option with usage limits and 14-day metrics retention. It can be used to avoid exposing a self-hosted Prometheus server publicly. See current plan details: https://grafana.com/products/cloud/free-tier/

## 1. Create the managed metrics source

1. Create a Grafana Cloud Free stack and open the Cloud Portal.
2. Open the Prometheus/Metrics details and copy the **query endpoint URL** and the endpoint user / metrics instance ID. Do not copy the remote-write URL into CloudTwin's query URL field.
3. Configure collection for the Linux VM, host, or containers you actually want to monitor. Use Grafana Cloud's guided setup / integrations to install Grafana Alloy or the recommended collector on that environment. A CloudTwin connection does not install agents on your machines for you.
4. Create an access-policy token with `metrics:read` scope for querying metrics.

Official Grafana docs explain the query endpoint and authentication: https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/query-http-api/

## 2. Fill the CloudTwin Metrics Explorer

Open `/metrics` on the deployed CloudTwin Nexus website and enter:

- **Prometheus base URL:** the *query endpoint URL* from Grafana Cloud, including its path prefix (commonly ending in `/api/prom`). The connector appends `/api/v1/query` and `/api/v1/query_range`.
- **Basic-auth username:** the Grafana Cloud metrics instance ID / endpoint user.
- **Password / access token:** the access-policy token with `metrics:read`.

Use basic authentication only when your provider's endpoint documentation specifies it. CloudTwin also supports bearer-token authentication for endpoints configured that way. Secrets are sent to the CloudTwin backend for the current request only and are not saved by the application. The endpoint URL alone is saved in this browser for convenience.

## 3. What needs to be collected

- Host CPU, RAM, disk, load, and network require Node Exporter or an equivalent host exporter.
- Container count / memory / CPU require cAdvisor or an equivalent container exporter.
- HTTP request rate requires applications to export a Prometheus metric such as `http_requests_total`.
- A connected account does not by itself provide cloud billing. Cost data must be connected through the provider's billing API separately.

If any metric series is absent, CloudTwin shows it as unavailable and suggests what to configure. It does not fabricate values.
