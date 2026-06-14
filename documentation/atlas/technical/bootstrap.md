# Bootstrap Orchestration

Atlas uses some of its own services to manage itself: Infisical stores the secrets, Authentik gates the logins, Argo CD reconciles every workload. That is circular by construction — Infisical cannot store its own database password, Authentik cannot be the IdP for its own login screen, Argo CD cannot deploy itself from nothing. This page is the model that resolves the circularity. The actual step-by-step procedure to install Atlas is in [Getting Started](./getting-started).

## The layered model

Installation is split into six concentric layers (`L0` through `L5`). Each layer is allowed to depend only on layers strictly below it. Nothing in the system reaches across layers in the wrong direction.

```
L0 ── pre-cluster, manual once
   └─▶ L1 ── OpenTofu seeds plain K8s Secrets
            └─▶ L2 ── Argo CD deploys platform foundations
                     └─▶ L3 ── OpenTofu handshake: Authentik ↔ Infisical
                              └─▶ L4 ── Argo CD deploys identity-aware workloads
                                       └─▶ L5 ── Argo CD applies forward-auth to bootstrap UIs
```

## L0 — Pre-cluster

**Performed once per cluster lifetime, before anything exists.** Cannot be automated by the cluster, because the cluster does not exist yet.

What L0 produces:

| Output                                                                          | Storage                   |
| ------------------------------------------------------------------------------- | ------------------------- |
| Talos PKI bundle                                                                | Password manager (sealed) |
| Talos etcd encryption key                                                       | Password manager (sealed) |
| Kubeconfig for the new cluster                                                  | Password manager (sealed) |
| Registrar DNS API token                                                         | Password manager          |
| OpenTofu state backend credentials (e.g. S3 access key)                         | Password manager          |
| Generated bootstrap passwords (Infisical admin, Authentik admin, Argo CD admin) | Password manager          |

These are the only secrets in the system that cannot be reproduced from Git. Losing the password manager means rebuilding from scratch with a new identity.

## L1 — OpenTofu seeds plain Kubernetes Secrets

**Triggered by `tofu apply -target=module.l1`.** OpenTofu reads L0 secrets from environment variables (sourced from the password manager), connects to the cluster using the L0 kubeconfig, and creates:

| Secret                                                        | Namespace          | Consumer                     | Why it must live here, not in Infisical                                                     |
| ------------------------------------------------------------- | ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------- |
| Infisical bootstrap (DB password, encryption key, admin user) | `infisical`        | Infisical itself             | Infisical cannot start without these — chicken-and-egg with itself                          |
| Authentik bootstrap (DB password, secret key, admin user)     | `authentik`        | Authentik itself             | Same                                                                                        |
| Initial Infisical service token for ESO                       | `external-secrets` | External Secrets Operator    | ESO needs this to _reach_ Infisical at all                                                  |
| cert-manager registrar API token                              | `cert-manager`     | cert-manager `ClusterIssuer` | Needed before the first certificate can be issued, before Infisical is reachable over HTTPS |
| Argo CD admin password                                        | `argocd`           | Argo CD                      | Bootstrap admin — break-glass account, stays alive forever                                  |

L1 also installs the Argo CD Helm chart and creates the root `Application` resource that points at the `apps/root/` directory of the GitOps repository (the app-of-apps pattern).

After L1: Argo CD is running and watching Git. No application workload exists yet.

## L2 — Argo CD deploys the platform foundations

**Triggered automatically by Argo CD reconciling Git.** No human action required.

Argo CD reconciles in dependency order (using sync waves):

1. **Wave 0**: cert-manager, External Secrets Operator, local-path-provisioner.
2. **Wave 1**: Traefik (now able to use cert-manager).
3. **Wave 2**: Infisical (using the L1 bootstrap secret, exposed at `infisical.<my-domain>` once cert-manager has issued its cert).
4. **Wave 3**: Authentik (same shape, exposed at `authentik.<my-domain>`).

After L2: cert-manager, Traefik, ESO, Infisical and Authentik are healthy and reachable. Identity-aware workloads (Harbor, Grafana, etc.) are _not yet deployed_ because their OIDC client secrets do not exist.

## L3 — Identity/secret handshake

**Triggered by `tofu apply -target=module.l3`.** This is the second OpenTofu apply and the only "stateful coupling" step in the whole bootstrap. See [ADR 012](./adr/012-opentofu-owns-identity-secret-bootstrap) for why OpenTofu — rather than a custom in-cluster Job — owns this step.

OpenTofu uses two providers added at L3:

- `goauthentik/authentik` — talks to Authentik's API to create OIDC applications.
- `infisical/infisical` — talks to Infisical's API to store secrets.

For each downstream service that authenticates against Authentik (Harbor, Grafana, Infisical's own web UI, Argo CD, plus the Traefik dashboard via Authentik's _proxy/forward-auth_ provider), OpenTofu does:

1. Create an `authentik_application` + `authentik_provider_oauth2` (or `_proxy` for forward-auth) in Authentik.
2. Read back the resulting `client_id` and `client_secret`.
3. Push them as a new secret into Infisical, in the path `/atlas/oidc/<service>/`.

Meanwhile in the GitOps repo, every identity-aware workload already has its `ExternalSecret` manifest declared, pointing at that exact Infisical path. The manifests are in `apps/identity-aware/` in the GitOps repo but Argo CD has not yet been told to deploy them — they are gated behind an `app-of-apps` toggle that flips at L4.

After L3: Authentik knows about every downstream service; Infisical holds every OIDC client secret; the cluster is _ready_ to deploy identity-aware workloads, but has not yet done so.

## L4 — Argo CD deploys identity-aware workloads

**Triggered by flipping the `enabled: true` value on the L4 root Application in Git and pushing.** Argo CD reconciles and creates:

1. Harbor (using OIDC client config from Infisical via ESO).
2. Grafana (same).
3. Prometheus, Alertmanager (Prometheus is not user-facing; Alertmanager has a minimal UI behind Authentik forward-auth).
4. Loki.

Each workload starts, its `ExternalSecret` resolves its OIDC client secret from Infisical, the pod consumes the secret, and the service comes up SSO-ready.

After L4: All public-facing services are live and behind Authentik. Argo CD UI and the Traefik dashboard are still using their L1 local-admin accounts.

## L5 — Re-protection of bootstrap UIs

**Triggered by a Git commit.** Two `Middleware` resources (Authentik forward-auth) are added in front of the Argo CD UI route and the Traefik dashboard route. Argo CD itself is also reconfigured to accept OIDC tokens from Authentik for its CLI/UI logins, while keeping the local `admin` user as a break-glass account.

After L5: every public hostname is behind Authentik. The platform is closed.

## Image-pull bootstrap

Layers L2 and earlier cannot pull container images from Harbor — Harbor does not exist yet. They pull from upstream public registries (`ghcr.io`, `quay.io`, `docker.io`). The pinning is in the Helm `values.yaml` for each chart and lives in the GitOps repo's `apps/foundations/` directory. Only L4 workloads (and my own personal applications afterward) pull from `harbor.<my-domain>`.

## Break-glass accounts

Atlas deliberately keeps a non-Authentik path into every service, because a broken Authentik must not lock me out of the platform I need to log in to in order to fix Authentik.

| Service            | Break-glass account                                           | When to use it                                                                                               |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Authentik admin UI | Local `akadmin` user, password rotated post-L3 into Infisical | If Authentik OIDC is broken, the local form still works — you reach it at `authentik.<my-domain>/if/admin/`. |
| Argo CD UI/CLI     | Local `admin` user (kept enabled forever)                     | If Authentik forward-auth is broken, log in with `argocd login` using the local password.                    |
| Grafana            | Local admin user                                              | Same idea: `?disableLoginForm=false` URL param exposes the local form.                                       |
| Harbor             | Local admin user                                              | Same.                                                                                                        |
| Traefik dashboard  | Inaccessible if forward-auth is broken                        | Acceptable — Traefik itself stays functional regardless; the dashboard is observability, not control.        |

All break-glass passwords are stored in the password manager _and_ mirrored into Infisical for rotation. They are never removed.

## Mapping back to the simplified 3-stage view

The simplified summary on the [Architecture](./architecture#bootstrap-chain) page collapses some layers for readability. The mapping is:

| Simplified                     | Full         |
| ------------------------------ | ------------ |
| Stage 1 — `talosctl`           | L0           |
| Stage 2 — OpenTofu             | L1 + L3      |
| Stage 3 — Argo CD (continuous) | L2 + L4 + L5 |

## See also

- [Getting Started](./getting-started) — the step-by-step procedure
- [Architecture](./architecture) — the system overview
- [ADR 003 — OpenTofu](./adr/003-opentofu-vs-terraform-vs-pulumi)
- [ADR 004 — Argo CD](./adr/004-argocd-vs-flux)
- [ADR 008 — Authentik](./adr/008-authentik-oidc)
- [ADR 009 — Infisical](./adr/009-infisical-secrets)
- [ADR 012 — OpenTofu owns identity/secret bootstrapping](./adr/012-opentofu-owns-identity-secret-bootstrap)
