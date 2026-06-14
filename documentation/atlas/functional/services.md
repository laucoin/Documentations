# Services

Each service Atlas exposes has a single, well-defined purpose. From a user's point of view, here is what each one is for.

## Authentik — single sign-on

The front door of the platform. Every other Atlas service redirects unauthenticated users here. After a successful login, users land back on the application they came from with a session that lasts hours, not minutes.

- **Who uses it**: every persona, every time they reach a service.
- **What it replaces**: per-app logins, shared passwords, per-app user databases.
- **Visible URL**: `authentik.<my-domain>`.

## Harbor — private image registry

A place to store the container images I build for personal projects. Harbor groups images into **projects** (think of them as folders) with their own visibility and members. Vulnerability scanning is enabled by default so I can see which images are stale before I deploy them.

- **Who uses it**: Power Users push and pull; the Platform Operator manages projects and quotas.
- **What it replaces**: the very limited free package storage of GitHub Packages and GitLab Container Registry (GitHub's free tier in particular runs out fast), as well as pushing private images to Docker Hub or to an unsigned `registry:2`.
- **Visible URL**: `harbor.<my-domain>`.

## Infisical — secret vault

A web UI and API where I store API keys, tokens, and credentials needed by my projects. Workloads inside the cluster pull from Infisical automatically; on my laptop I pull them via the Infisical CLI when I run scripts.

- **Who uses it**: Power Users store and retrieve secrets; cluster workloads inject them at runtime.
- **What it replaces**: `.env` files copied between machines, secrets stuck in shell history.
- **Visible URL**: `infisical.<my-domain>`.

## Grafana — dashboards and alerts

A single place to look when I want to know whether anything is on fire. Grafana shows me cluster health, application metrics, and recent logs. Alerts go out when something has been broken long enough to deserve attention.

- **Who uses it**: the Platform Operator daily; Power Users when they wire their own apps to Prometheus or Loki; Guest Users only on dashboards I explicitly share.
- **What it replaces**: ad-hoc `kubectl logs` sessions, no monitoring at all.
- **Visible URL**: `grafana.<my-domain>`.

## Traefik dashboard — ingress overview

A read-only view of every domain name Atlas routes. Useful when I want to confirm a new application is being served, or that a certificate has renewed.

- **Who uses it**: the Platform Operator. Hidden behind Authentik so guests never see it.
- **Visible URL**: `traefik.<my-domain>`.

## Argo CD — GitOps console

The dashboard for the engine that reconciles every workload against the Git repository. It shows me which applications are in sync, which have drifted, and why.

- **Who uses it**: the Platform Operator. Behind Authentik.
- **Visible URL**: `argocd.<my-domain>`.

## Services that are intentionally not exposed publicly

These run inside the cluster but are not reachable from the internet. Users never interact with them directly.

| Service                   | Role                                                |
| ------------------------- | --------------------------------------------------- |
| Prometheus                | Collects metrics from the cluster and applications  |
| Loki                      | Collects logs                                       |
| Alertmanager              | Dispatches alerts (email, push) on Prometheus rules |
| cert-manager              | Issues and renews TLS certificates                  |
| External Secrets Operator | Syncs secrets from Infisical into Kubernetes        |
| local-path-provisioner    | Provides on-disk storage volumes                    |
