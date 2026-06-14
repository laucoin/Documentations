# ADR 013 — SonarQube for code quality

## Status

Accepted

## Context

Atlas hosts the projects I build, and I want an objective quality gate over the code I write — bugs, code smells, security hotspots, duplication, and coverage trends — instead of relying on memory and ad-hoc review. The candidates were:

1. **SonarQube Community Build** — self-hosted, the OSS edition of the de-facto standard for static analysis; web UI, quality gates, broad language coverage.
2. **SonarCloud** — the SaaS version. Free only for public repositories; private analysis is paid.
3. **Lighter linters wired into CI only** (golangci-lint, ESLint, Semgrep, etc.) — no server, no historical trend, results scattered across CI logs.
4. **Nothing** — accept that quality is tracked informally.

SonarQube is the tool I already know, it keeps history so I can see whether a project is improving, and self-hosting it means private repositories cost nothing. The notable operational catch is that, as of chart version `2026.1.0`, the SonarSource Helm chart **no longer bundles a PostgreSQL database** — SonarQube now requires an external one.

## Decision

Run **SonarQube Community Build** via the official SonarSource Helm chart, with native SonarQube login (no Authentik SSO for now). Provide its PostgreSQL with the **CloudNativePG** operator — a small single-instance `Cluster` in the `sonarqube` namespace whose generated credentials SonarQube consumes via `jdbcOverwrite`.

## Consequences

### Positive

- **Self-hosted private analysis at no per-repo cost**, unlike SonarCloud's free tier.
- **Historical trends and quality gates** in a real UI, not just CI log output.
- **CloudNativePG is a clean, Kubernetes-native database story**: backups, failover primitives, and credential generation are the operator's job, and it is reusable by any future service that needs Postgres.
- **`vm.max_map_count` is set at the node level via Talos** rather than a privileged init container, so the `sonarqube` namespace stays under the baseline Pod Security Standard.
- **Native Prometheus metrics** (`/api/monitoring/metrics`) are scraped via the chart's PodMonitor and surfaced in Grafana ([ADR 011](./011-prometheus-loki-observability)).

### Negative

- **It is heavy.** SonarQube embeds Elasticsearch; with a dedicated Postgres alongside it is one of the larger single workloads on the node (~2 GB RAM under load).
- **An external database is now mandatory**, which is why CloudNativePG enters the stack. That is one more operator to keep current.
- **No SSO yet.** Community Build does not include SAML/OIDC, so logins are SonarQube-local. Wiring Authentik would require the commercial editions or a third-party plugin — deferred.
- **Talos sysctl changes require re-applying machine config** (`tofu apply` in `bootstrap/talos`), a step outside the normal GitOps reconcile loop.

### Why not SonarCloud

SonarCloud removes all operational burden but charges for private projects, which is exactly the use case here. Self-hosting trades RAM and a database for zero marginal cost and full data ownership.

### Why CloudNativePG over a bundled or Bitnami PostgreSQL

The chart's bundled database was removed upstream, and pinning an older chart to keep it would freeze SonarQube on an old version. A generic Bitnami `postgresql` release would work but carries the 2025 Bitnami image-distribution changes; CloudNativePG is purpose-built for running Postgres on Kubernetes and is worth adopting as the platform's standard database operator.
