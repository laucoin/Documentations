# Technical Documentation

This section covers the engineering of Atlas: the high-level architecture, the bootstrap chain, and the Architecture Decision Records that explain why each component was chosen.

## Documentation map

| Page                                   | Purpose                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Getting Started](/atlas/technical/getting-started)   | Full guided installation procedure, including the in-cluster identity/secret handshake                       |
| [Architecture](/atlas/technical/architecture)         | Topology, component map, summary of the bootstrap chain                                                      |
| [Bootstrap Orchestration](/atlas/technical/bootstrap) | The five-layer model that resolves the chicken-and-egg dependencies between Argo CD, Authentik and Infisical |
| [ADR index](/atlas/technical/adr/)                    | All Architecture Decision Records, in causal order                                                           |

## Stack summary

| Layer                  | Component                                         |
| ---------------------- | ------------------------------------------------- |
| OS                     | Talos Linux (single node, control plane + worker) |
| Orchestrator           | Kubernetes (vanilla, shipped by Talos)            |
| Infrastructure as Code | OpenTofu                                          |
| GitOps                 | Argo CD (app-of-apps)                             |
| Ingress                | Traefik                                           |
| TLS                    | cert-manager (HTTP-01 ACME)                       |
| Image registry         | Harbor                                            |
| Identity (OIDC)        | Authentik                                         |
| Secrets                | Infisical + External Secrets Operator             |
| Metrics                | Prometheus + Alertmanager                         |
| Logs                   | Loki                                              |
| Visualization          | Grafana                                           |
| Code quality           | SonarQube (PostgreSQL via CloudNativePG operator) |
| Home automation        | Home Assistant                                    |
| Storage                | local-path-provisioner                            |
| Backup                 | Restic to external S3-compatible bucket           |

## ADR format

Each ADR lives in `adr/[NNN]-[short-title].md` and follows this structure:

```markdown
# ADR NNN — Title

## Status

Accepted | Superseded by ADR NNN | Deprecated

## Context

What problem or constraint triggered this decision?

## Decision

What was decided?

## Consequences

What are the trade-offs, risks, and follow-up actions?
```
