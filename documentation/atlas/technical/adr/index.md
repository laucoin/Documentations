# Architecture Decision Records

Every meaningful component in Atlas has a corresponding ADR explaining why it was picked over its alternatives. ADRs are numbered, immutable, and only superseded — never silently rewritten. The numbering follows the causal order of the decisions: first the orchestrator, then the OS, then how it is provisioned and deployed, then the platform building blocks layered on top.

## Index

### Foundations

| #                                 | Title                                    |
| --------------------------------- | ---------------------------------------- |
| [001](/atlas/technical/adr/001-kubernetes-vs-docker) | Kubernetes over Docker (Swarm / Compose) |
| [002](/atlas/technical/adr/002-talos-vs-k3s-debian)  | Talos Linux over k3s on Debian           |

### IaC and GitOps

| #                                            | Title                              |
| -------------------------------------------- | ---------------------------------- |
| [003](/atlas/technical/adr/003-opentofu-vs-terraform-vs-pulumi) | OpenTofu over Terraform and Pulumi |
| [004](/atlas/technical/adr/004-argocd-vs-flux)                  | Argo CD over Flux                  |

### Deployed solutions

| #                                          | Title                                                        |
| ------------------------------------------ | ------------------------------------------------------------ |
| [005](/atlas/technical/adr/005-traefik-ingress)               | Traefik as ingress controller                                |
| [006](/atlas/technical/adr/006-cert-manager-tls)              | cert-manager for TLS certificates                            |
| [007](/atlas/technical/adr/007-local-path-restic-storage)     | local-path-provisioner + Restic for storage and backup       |
| [008](/atlas/technical/adr/008-authentik-oidc)                | Authentik as OIDC identity provider                          |
| [009](/atlas/technical/adr/009-infisical-secrets)             | Infisical as secret manager                                  |
| [010](/atlas/technical/adr/010-harbor-registry)               | Harbor as image registry                                     |
| [011](/atlas/technical/adr/011-prometheus-loki-observability) | Prometheus + Loki + Alertmanager + Grafana for observability |
| [013](/atlas/technical/adr/013-sonarqube-code-quality)        | SonarQube for code quality (Postgres via CloudNativePG)      |
| [014](/atlas/technical/adr/014-home-assistant)                | Home Assistant for home automation                           |

### Bootstrap orchestration

| #                                                    | Title                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| [012](/atlas/technical/adr/012-opentofu-owns-identity-secret-bootstrap) | In-cluster automation owns the identity/secret bootstrap handshake (L3) |
