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

Two further public services — **SonarQube** (code quality, with a PostgreSQL database managed by the CloudNativePG operator) and **Home Assistant** (home automation) — are routed by Traefik and TLS-protected the same way, but sit **outside** the Authentik box: both keep their own native login (Home Assistant has no usable OIDC and breaks under forward-auth; SonarQube Community Build's SSO is not wired). They are otherwise standard GitOps workloads under `apps/`.

cert-manager runs in the background and provisions TLS certificates for every public host via the HTTP-01 ACME challenge (Let's Encrypt), validated over the port-80 forward through Traefik. DNS-01 against the registrar's API is available as an opt-out (see [ADR 006](/atlas/technical/adr/006-cert-manager-tls)) but is not the shipped default.

## Bootstrap chain

Atlas is built layer-by-layer so the circular dependencies between Argo CD, Authentik and Infisical can be resolved. The five layers — from `talosctl` on a bare disk to a fully-protected SSO platform — are documented in [Bootstrap Orchestration](/atlas/technical/bootstrap). The step-by-step procedure to actually run a bootstrap is in [Getting Started](/atlas/technical/getting-started).

At a glance:

| Layer | Owner                | What happens                                                                                                                                                                                                                                                         |
| ----- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L0    | Operator (once)      | OpenTofu (`bootstrap/talos`) installs Talos and brings the node up; Talos secrets and OpenTofu state land in the password manager.                                                                                                                                   |
| L1    | OpenTofu             | `bootstrap/baseline` (local-path, MetalLB, cert-manager) then `bootstrap/argo` (Argo CD + root ApplicationSet). The operator also hand-creates the out-of-band bootstrap & machine-identity Secrets.                                                                 |
| L2    | Argo CD              | Platform foundations come up: ESO, Traefik, Infisical, Authentik (cert-manager already installed at L1).                                                                                                                                                             |
| L3    | In-cluster (Argo CD) | Identity/secret handshake: the `infisical-seeder` Job generates secrets, Authentik blueprints create the OIDC/proxy clients, the `harbor-oidc-config` Job wires Harbor. See [ADR 012](/atlas/technical/adr/012-opentofu-owns-identity-secret-bootstrap).                            |
| L4    | Argo CD              | Identity-aware workloads come up consuming the seeded secrets via ESO: Harbor, Grafana, Prometheus, Loki, Alertmanager, Velero. The standalone apps SonarQube (database via the CloudNativePG operator) and Home Assistant land here too, on their own native login. |
| L5    | Argo CD              | Bootstrap UIs (Argo CD via OIDC, Traefik dashboard via forward-auth) are protected — the platform is now closed.                                                                                                                                                     |

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

| Concern                   | Location                                           |
| ------------------------- | -------------------------------------------------- |
| Talos secrets (PKI, etcd) | My password manager (sealed)                       |
| Cluster bootstrap config  | OpenTofu state, encrypted backend                  |
| Workload manifests        | GitOps repo (`apps/`)                              |
| Runtime secrets           | Infisical                                          |
| User identities           | Authentik (Postgres)                               |
| Container images          | Harbor (object storage on local PV)                |
| Metrics & logs            | Prometheus + Loki (local PVs, short retention)     |
| Code-quality analysis     | SonarQube (PostgreSQL via CloudNativePG, local PV) |
| Home-automation state     | Home Assistant (local PV)                          |
| Long-term backups         | Restic snapshots in external S3                    |
