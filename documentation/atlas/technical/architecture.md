# Architecture

## Physical topology

Atlas runs on a single bare-metal machine at home. Talos Linux is installed directly on the disk; there is no general-purpose Linux distribution underneath. The node plays both the **control plane** and the **worker** role.

```
┌──────────────────────────────────────────────────────────────┐
│                Home network (NAT, 192.168.x.0/24)            │
│                                                              │
│  ┌────────────┐         ┌────────────────────────────────┐   │
│  │   Router   │──LAN───▶│  Atlas node — Talos Linux      │   │
│  │  (ports    │         │                                │   │
│  │  80/443    │         │  ┌──────────────────────────┐  │   │
│  │  fwd'd)    │         │  │   Kubernetes (Talos)     │  │   │
│  └─────┬──────┘         │  │                          │  │   │
│        │                │  │  Traefik (LoadBalancer)  │  │   │
│        │                │  │  Workloads (Pods, PVCs)  │  │   │
│        │                │  │  local-path PVs (/var)   │  │   │
│        ▼                │  └──────────────────────────┘  │   │
│   Internet (WAN)        └────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                      External S3-compatible bucket
                          (Restic backup target)
```

Public traffic reaches Atlas through ports 80 and 443 forwarded from the home router. DNS records at the registrar point my subdomains at the home WAN IP (kept current with a small dynamic-DNS updater or a static IP, depending on the ISP).

## Logical component map

```
                          ┌───────────────────┐
   Internet ─── 443 ─────▶│      Traefik      │  (IngressRoute CRDs)
                          └────────┬──────────┘
                                   │
                ┌──────────────────┼───────────────────┬─────────────────┐
                ▼                  ▼                   ▼                 ▼
        ┌─────────────┐    ┌──────────────┐    ┌─────────────┐   ┌──────────────┐
        │  Authentik  │    │    Harbor    │    │   Grafana   │   │  Infisical   │
        └──────┬──────┘    └──────┬───────┘    └──────┬──────┘   └──────┬───────┘
               │ OIDC IdP for ─── ┘                   │                 │
               │ Harbor, Grafana, Infisical,          │                 │
               │ Argo CD, Traefik dashboard           │                 │
               ▼                                      ▼                 ▼
        ┌─────────────┐                        ┌──────────────┐  ┌──────────────┐
        │  Forward    │                        │  Prometheus  │  │  External    │
        │  Auth (TR)  │                        │  Loki        │  │  Secrets     │
        └─────────────┘                        │  Alertmgr    │  │  Operator    │
                                               └──────────────┘  └──────────────┘
```

cert-manager runs in the background and provisions TLS certificates for every public host via DNS-01 ACME against my registrar's API.

## Bootstrap chain

Atlas is built layer-by-layer so the circular dependencies between Argo CD, Authentik and Infisical can be resolved. The five layers — from `talosctl` on a bare disk to a fully-protected SSO platform — are documented in [Bootstrap Orchestration](./bootstrap). The step-by-step procedure to actually run a bootstrap is in [Getting Started](./getting-started).

At a glance:

| Layer | Owner                   | What happens                                                                                                                                                      |
| ----- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L0    | Operator (once)         | `talosctl` brings the node up; Talos secrets land in the password manager.                                                                                        |
| L1    | OpenTofu                | Argo CD installed; bootstrap K8s Secrets seeded for Infisical, Authentik, cert-manager.                                                                           |
| L2    | Argo CD                 | Platform foundations come up: cert-manager, Traefik, ESO, Infisical, Authentik.                                                                                   |
| L3    | OpenTofu (second apply) | Identity/secret handshake: Authentik OIDC clients created, their secrets pushed into Infisical. See [ADR 012](./adr/012-opentofu-owns-identity-secret-bootstrap). |
| L4    | Argo CD                 | Identity-aware workloads come up: Harbor, Grafana, Prometheus, Loki, Alertmanager.                                                                                |
| L5    | Argo CD                 | Bootstrap UIs (Argo CD, Traefik dashboard) get forward-auth applied — the platform is now closed.                                                                 |

From L5 onwards, every change is a Git commit that Argo CD reconciles. Drift is reported in the Argo CD UI; nothing is applied with `kubectl` by hand.

## Data flows

### A user logs into Grafana

```
Browser ──▶ grafana.<my-domain>
       ◀── 302 Found (Authentik authorize URL)
       ──▶ authentik.<my-domain>/oauth2/authorize
       ──▶ login form, session created
       ◀── 302 Found (back to Grafana callback)
       ──▶ Grafana exchanges code for token
       ◀── 200 OK (Grafana home dashboard)
```

### A pod consumes a secret

```
ExternalSecret resource ──▶ External Secrets Operator
                            │
                            ▼
                       Infisical API (with service token)
                            │
                            ▼
                       Kubernetes Secret created/updated
                            │
                            ▼
                       Pod mounts the secret as env or file
```

### Backups

A CronJob runs Restic nightly:

```
PVC contents (Harbor blobs, Authentik DB dump, Infisical DB dump,
 Grafana DB, Prometheus snapshots) ──▶ Restic ──▶ External S3 bucket
```

Restore is the same procedure in reverse, scripted in the GitOps repo.

## What lives where

| Concern                   | Location                                       |
| ------------------------- | ---------------------------------------------- |
| Talos secrets (PKI, etcd) | My password manager (sealed)                   |
| Cluster bootstrap config  | OpenTofu state, encrypted backend              |
| Workload manifests        | GitOps repo (`apps/`)                          |
| Runtime secrets           | Infisical                                      |
| User identities           | Authentik (Postgres)                           |
| Container images          | Harbor (object storage on local PV)            |
| Metrics & logs            | Prometheus + Loki (local PVs, short retention) |
| Long-term backups         | Restic snapshots in external S3                |
