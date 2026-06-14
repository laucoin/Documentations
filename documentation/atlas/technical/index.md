# Technical Documentation

This section covers the engineering of Atlas: the high-level architecture, the bootstrap chain, and the Architecture Decision Records that explain why each component was chosen.

## Documentation map

| Page                                   | Purpose                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Getting Started](./getting-started)   | Full guided installation procedure, with the L3 identity/secret handshake detailed resource-by-resource      |
| [Architecture](./architecture)         | Topology, component map, summary of the bootstrap chain                                                      |
| [Bootstrap Orchestration](./bootstrap) | The five-layer model that resolves the chicken-and-egg dependencies between Argo CD, Authentik and Infisical |
| [ADR index](./adr/)                    | All Architecture Decision Records, in causal order                                                           |

## Stack summary

| Layer                  | Component                                         |
| ---------------------- | ------------------------------------------------- |
| OS                     | Talos Linux (single node, control plane + worker) |
| Orchestrator           | Kubernetes (vanilla, shipped by Talos)            |
| Infrastructure as Code | OpenTofu                                          |
| GitOps                 | Argo CD (app-of-apps)                             |
| Ingress                | Traefik                                           |
| TLS                    | cert-manager (DNS-01 ACME)                        |
| Image registry         | Harbor                                            |
| Identity (OIDC)        | Authentik                                         |
| Secrets                | Infisical + External Secrets Operator             |
| Metrics                | Prometheus + Alertmanager                         |
| Logs                   | Loki                                              |
| Visualization          | Grafana                                           |
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
