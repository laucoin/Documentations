# ADR 011 — Prometheus + Loki + Alertmanager + Grafana for observability

## Status

Accepted

## Context

Atlas needs to answer three questions: _is it up?_, _was it slow?_, and _what just broke?_. That requires metrics, logs, and alerts. The choices were:

1. **Prometheus + Loki + Alertmanager + Grafana** — the "PLG" stack. The de-facto OSS default.
2. **Full LGTM stack** (Loki + Grafana + Tempo + Mimir) — adds distributed tracing (Tempo) and long-term metrics (Mimir).
3. **VictoriaMetrics + VictoriaLogs + Grafana** — lighter alternative to Prometheus + Loki, single-node-friendly.
4. **No observability** — accept that the platform is a black box.

Atlas runs on one node, with single-digit users, and hosts few enough microservices that distributed tracing is unnecessary. Long-term metrics retention is also not a goal; "the last 30 days" is enough to investigate any incident.

## Decision

Use **Prometheus** for metrics, **Loki** for logs, **Alertmanager** for alert routing, and **Grafana** as the visualization and alert-UI layer. Deploy via the **kube-prometheus-stack** Helm chart, with Loki and Grafana added alongside.

## Consequences

### Positive

- **kube-prometheus-stack ships pre-built dashboards and alert rules** for cluster components (nodes, kubelet, etcd, API server). Day-one signal without writing PromQL.
- **Prometheus + Loki share the same query mental model.** PromQL for metrics, LogQL for logs; LogQL is "PromQL-shaped" enough that switching contexts is cheap.
- **Alertmanager is mature.** Routing, inhibition, silencing, deduplication all work as advertised.
- **Grafana is the lingua franca of OSS dashboards.** Community dashboards for every component Atlas runs already exist.
- **OIDC SSO with Authentik** ([ADR 008](/atlas/technical/adr/008-authentik-oidc)) — guests reach dashboards I share with them without separate Grafana accounts.
- **Loki is operationally lighter than ELK** for the log volumes a homelab produces.

### Per-service dashboards

On top of the cluster dashboards the chart ships, each Atlas service gets one curated community dashboard. Rather than vendoring large dashboard JSON into Git, they are referenced by their grafana.com ID (`gnetId`) with a **pinned revision** in the kube-prometheus-stack Helm values; the chart's init container downloads each at start-up and a file provider loads them into a **Services** folder. This keeps the values file small and declarative, at the cost of an egress dependency on grafana.com at pod start.

A dashboard is only meaningful if the service is actually scraped, so each one is paired with a `ServiceMonitor`/`PodMonitor` (Prometheus' selectors are intentionally empty, so any monitor in any namespace is discovered). Two cases are worth noting: cert-manager's ServiceMonitor is enabled in the OpenTofu baseline (it lives below the GitOps layer), and Home Assistant's `/api/prometheus` endpoint needs a long-lived token created once in its UI before its dashboard fills in.

### Negative

- **Resource footprint is non-trivial.** kube-prometheus-stack alone (operator + Prometheus + Alertmanager + node-exporter + kube-state-metrics) is ~600 MB RAM at idle. Plus Loki, plus Grafana, the observability layer is the biggest single resource consumer on the node.
- **Prometheus' TSDB is unsuited to long retention** on a single node. Atlas keeps 30 days locally; anything older is either lost (acceptable) or exported to backup snapshots.
- **kube-prometheus-stack CRD changes between chart majors** can require manifest edits. Pin the chart version and read release notes.
- **Loki storage configuration has many footguns** (chunks vs. indexes, retention, compaction). Atlas uses the single-binary mode with filesystem storage to keep configuration trivial — at the cost of horizontal scalability that isn't needed.
- **Alertmanager → notification delivery still needs a sink.** Atlas uses email via the registrar's SMTP (or a small relay); a future ADR may document a different sink.

### Why not the full LGTM stack

Tempo and Mimir solve real problems (distributed tracing across many microservices, long-retention metrics across many clusters) that Atlas does not have. Deploying them anyway would be cosplaying enterprise-scale on a single node.

### Why not VictoriaMetrics

VictoriaMetrics is genuinely lighter than Prometheus and would be a credible choice on a resource-constrained node. The deciding factor was ecosystem gravity: nearly every community Helm chart and Grafana dashboard targets Prometheus first. Atlas trades a bit of RAM for that convenience.
