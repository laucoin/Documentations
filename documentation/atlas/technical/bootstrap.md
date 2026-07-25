# Bootstrap Orchestration

Atlas uses some of its own services to manage itself: Infisical stores the secrets, Authentik gates the logins, Argo CD reconciles every workload. That is circular by construction — Infisical cannot store its own database password, Authentik cannot be the IdP for its own login screen, Argo CD cannot deploy itself from nothing. This page is the model that resolves the circularity. The actual step-by-step procedure to install Atlas is in [Getting Started](/atlas/technical/getting-started).

## The layered model

Installation is split into six concentric layers (`L0` through `L5`). Each layer is allowed to depend only on layers strictly below it. The first two layers are imperative (OpenTofu, run from the operator's laptop); everything from L2 onward is Argo CD reconciling Git and is **eventually consistent** — there is no gated "apply the next layer" step. Argo CD's self-heal/retry and ESO's `refreshInterval` close the remaining ordering races on their own.

```
L0 ── pre-cluster, OpenTofu installs Talos
   └─▶ L1 ── OpenTofu: baseline + Argo CD; operator hand-creates out-of-band Secrets
            └─▶ L2 ── Argo CD deploys platform foundations
                     └─▶ L3 ── in-cluster handshake: seeder Job + Authentik blueprints
                              └─▶ L4 ── Argo CD deploys identity-aware workloads
                                       └─▶ L5 ── bootstrap UIs protected (OIDC + forward-auth)
```

## L0 — Pre-cluster

**Performed once per cluster lifetime.** OpenTofu (`bootstrap/talos`) generates the Talos machine config and installs Talos onto the bare disk, then writes out a `kubeconfig` and `talosconfig`. This is the only layer that runs before a working cluster exists.

What L0 produces:

| Output                                 | Storage                      |
| -------------------------------------- | ---------------------------- |
| Talos PKI bundle / etcd encryption key | OpenTofu state (sealed)      |
| `kubeconfig` for the new cluster       | Repo root (gitignored, 0600) |
| `talosconfig`                          | Repo root (gitignored, 0600) |
| `bootstrap/talos/terraform.tfstate`    | Password manager (sealed)    |

The Talos state file is the only secret in the system that cannot be reproduced from Git. Losing it means rebuilding Talos PKI from scratch.

## L1 — OpenTofu: cluster baseline and Argo CD

Two more OpenTofu applies, run from the operator's laptop against the L0 kubeconfig:

1. **`bootstrap/baseline`** installs `local-path-provisioner` (default StorageClass), MetalLB (one L2-advertised LoadBalancer IP), and cert-manager with three `ClusterIssuer`s (`selfsigned`, `letsencrypt-staging`, `letsencrypt-prod`). The Let's Encrypt issuers use the **HTTP-01** challenge over the Traefik ingress class, so they only start issuing once Traefik comes up at L2.
2. **`bootstrap/argo`** installs the Argo CD Helm chart and creates the root `ApplicationSet` (`apps/_root/applicationset.yaml`), which generates one `Application` per directory under `apps/*`. Argo CD's OIDC config (issuer = `authentik.<my-domain>`) is set here too, so SSO is wired from the start and activates once Authentik is up.

The operator also hand-creates the **out-of-band Secrets** — the ones that cannot live in Infisical because they bootstrap Infisical and its sync path:

| Secret                         | Namespace          | Consumer                  | Why it is out-of-band                                                  |
| ------------------------------ | ------------------ | ------------------------- | ---------------------------------------------------------------------- |
| `infisical-bootstrap`          | `infisical`        | Infisical itself          | `ENCRYPTION_KEY` / `AUTH_SECRET` — Infisical cannot start without them |
| `infisical-credentials`        | `external-secrets` | External Secrets Operator | Read-only machine identity ESO uses to _reach_ Infisical at all        |
| `infisical-seeder-credentials` | `infisical`        | `infisical-seeder` Job    | Read-write machine identity used to seed every other secret            |

The two machine identities are created in the Infisical UI (project slug `atlas`, environment `prod`) during this phase — the only manual UI step in the whole bootstrap. Argo CD does **not** need a hand-seeded admin password: the chart generates `argocd-initial-admin-secret`, which stays as the break-glass account.

After L1: Argo CD is running and watching Git. No application workload exists yet.

## L2 — Argo CD deploys the platform foundations

**Triggered automatically by Argo CD reconciling Git.** No human action required.

Argo CD brings up the foundation Applications: External Secrets Operator (plus the per-app `ClusterSecretStore`s pointing at Infisical), Traefik (the LoadBalancer ingress, which also unblocks HTTP-01 issuance), Infisical (using the L1 `infisical-bootstrap` Secret), and Authentik. These have soft ordering dependencies (Traefik before certs, Infisical before ESO can sync), which Argo CD resolves by retrying failed syncs rather than by a strict wave ordering.

After L2: ESO, Traefik, Infisical and Authentik are healthy and reachable at their hostnames. Identity-aware workloads are not yet usable because their OIDC client secrets do not exist.

## L3 — Identity/secret handshake (in-cluster)

This is the only "stateful coupling" step in the whole bootstrap. Unlike earlier designs, it is **not** a second OpenTofu apply — it is performed entirely in-cluster, reconciled by Argo CD. See [ADR 012](/atlas/technical/adr/012-opentofu-owns-identity-secret-bootstrap) for why the in-cluster path was chosen over an external `tofu apply`.

Three pieces cooperate:

1. **`infisical-seeder` Job** (`apps/platform/infisical-seeder.yaml`) — an Argo sync-hook Job that authenticates to Infisical with the read-write seeder identity and generates the random secrets each service needs (Authentik secret key + bootstrap password, Harbor admin + OIDC client id/secret, Grafana admin + OIDC client id/secret, Argo CD OIDC client id/secret, SonarQube monitoring passcode) under `/authentik`, `/harbor`, `/grafana`, `/argocd`, `/sonarqube`. Velero's S3 credentials are entered manually, not generated.
2. **Authentik blueprints** (`apps/identity/authentik-blueprints.yaml`) — a ConfigMap the Authentik worker applies on startup. It declaratively creates the `groups` scope mapping, the three `*-admins` groups, the OAuth2 providers + applications for Harbor/Grafana/Argo CD, and a proxy (forward-auth) provider for the Traefik dashboard bound to the embedded outpost. Each client id/secret is pinned via `!Env` to the same Infisical values the apps consume, so both sides of every handshake always agree.
3. **`harbor-oidc-config` Job** (`apps/platform/harbor-oidc-config.yaml`) — a sync-hook Job that flips Harbor's auth mode to OIDC against Authentik, replacing the manual API call.

Meanwhile every identity-aware workload already declares its `ExternalSecret`, pointing at the matching Infisical path. ESO retries on its `refreshInterval` until the seeder has populated those paths, so the handshake converges without an operator gating it.

After L3: Authentik knows about every downstream service; Infisical holds every OIDC client secret; the cluster converges toward fully-deployed identity-aware workloads.

## L4 — Argo CD deploys identity-aware workloads

**Reconciled continuously by Argo CD** — there is no toggle to flip. The `apps/*` ApplicationSet already generates these Applications; they simply stay degraded until their `ExternalSecret`s resolve, then go Healthy:

1. Harbor (OIDC client config from Infisical via ESO).
2. Grafana (same).
3. Prometheus, Alertmanager, Loki, Promtail.
4. Velero (once its S3 credentials are entered in Infisical).
5. SonarQube (PostgreSQL via the CloudNativePG operator; monitoring passcode from Infisical) and Home Assistant — both **not** identity-aware: they keep their own native login rather than going through Authentik (see [Services](/atlas/functional/services#sonarqube--code-quality)).

Each workload starts, its `ExternalSecret` resolves its secret from Infisical, the pod consumes it, and the service comes up SSO-ready.

After L4: All public-facing services are live — the identity-aware ones behind Authentik, SonarQube and Home Assistant on their own native login.

## L5 — Protection of bootstrap UIs

The two bootstrap UIs are protected differently:

- **Argo CD** — uses OIDC against Authentik (configured in `bootstrap/argo`), with the local `admin` user kept as a break-glass account.
- **Traefik dashboard** — exposed at `traefik.<my-domain>` by an `IngressRoute` (`apps/infra/traefik-dashboard-ingressroute.yaml`) that attaches the `authentik-forward-auth` Middleware. The embedded Authentik outpost (bound to the `traefik-provider` proxy provider in the blueprint) answers the forward-auth requests.

After L5: every public hostname is behind Authentik. The platform is closed.

## Image-pull bootstrap

Layers L2 and earlier cannot pull container images from Harbor — Harbor does not exist yet. They pull from upstream public registries (`ghcr.io`, `quay.io`, `docker.io`). Image pins live in each Application's Helm values under `apps/` in the GitOps repo. Only L4 workloads (and personal applications afterward) pull from `harbor.<my-domain>`.

## Break-glass accounts

Atlas deliberately keeps a non-Authentik path into every service, because a broken Authentik must not lock me out of the platform I need to log in to in order to fix Authentik.

| Service            | Break-glass account                                            | When to use it                                                                                               |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Authentik admin UI | Local `akadmin` user, password in Infisical + password manager | If Authentik OIDC is broken, the local form still works — you reach it at `authentik.<my-domain>/if/admin/`. |
| Argo CD UI/CLI     | Local `admin` user (kept enabled forever)                      | If Authentik OIDC is broken, log in with `argocd login` using the local password.                            |
| Grafana            | Local admin user                                               | Same idea: `?disableLoginForm=false` URL param exposes the local form.                                       |
| Harbor             | Local admin user                                               | Same.                                                                                                        |
| Traefik dashboard  | Inaccessible if forward-auth is broken                         | Acceptable — Traefik itself stays functional regardless; the dashboard is observability, not control.        |

Break-glass passwords are stored in the password manager _and_ mirrored into Infisical for rotation. They are never removed.

## Mapping back to the simplified 3-stage view

The simplified summary on the [Architecture](/atlas/technical/architecture#bootstrap-chain) page collapses some layers for readability. The mapping is:

| Simplified                              | Full              |
| --------------------------------------- | ----------------- |
| Stage 1 — OpenTofu (Talos)              | L0                |
| Stage 2 — OpenTofu (baseline + Argo CD) | L1                |
| Stage 3 — Argo CD (continuous)          | L2 + L3 + L4 + L5 |

## See also

- [Getting Started](/atlas/technical/getting-started) — the step-by-step procedure
- [Architecture](/atlas/technical/architecture) — the system overview
- [ADR 003 — OpenTofu](/atlas/technical/adr/003-opentofu-vs-terraform-vs-pulumi)
- [ADR 004 — Argo CD](/atlas/technical/adr/004-argocd-vs-flux)
- [ADR 008 — Authentik](/atlas/technical/adr/008-authentik-oidc)
- [ADR 009 — Infisical](/atlas/technical/adr/009-infisical-secrets)
- [ADR 012 — In-cluster identity/secret bootstrapping](/atlas/technical/adr/012-opentofu-owns-identity-secret-bootstrap)
