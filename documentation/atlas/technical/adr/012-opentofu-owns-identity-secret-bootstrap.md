# ADR 012 — In-cluster automation owns the identity/secret bootstrap handshake (L3)

## Status

Accepted

> This ADR was originally accepted in the opposite direction ("expand OpenTofu's scope to own L3"). It has been **revised in place**: Atlas now performs the L3 handshake in-cluster. The reasoning for both options is kept below so the trade-off stays on record.

## Context

[ADR 003](./003-opentofu-vs-terraform-vs-pulumi) chose OpenTofu for the IaC layer with an explicit intent: OpenTofu's footprint inside Atlas should be tiny — just enough to install Talos, the cluster baseline, and Argo CD, then let Argo CD take over. [ADR 004](./004-argocd-vs-flux) reinforced this: Argo CD's app-of-apps owns every workload; OpenTofu does not.

When sequencing the actual installation, an unavoidable handshake step emerged between two of the platform's services:

1. Authentik ([ADR 008](./008-authentik-oidc)) is the OIDC IdP for every other public service.
2. Infisical ([ADR 009](./009-infisical-secrets)) is the secret store that ESO syncs into Kubernetes.
3. Every identity-aware service (Harbor, Grafana, Argo CD, plus the Traefik dashboard via Authentik's proxy/forward-auth provider) needs OIDC client config that is _defined in Authentik_ and _stored in Infisical_.
4. This handshake must happen _after_ Authentik and Infisical are running, but _before_ the identity-aware workloads can authenticate.

It is the only stateful coupling in the otherwise pure-GitOps flow. Two options exist:

1. **Expand OpenTofu's scope.** A second `tofu apply` runs after Argo CD has brought Authentik and Infisical up, using the `goauthentik/authentik` and `infisical/infisical` providers to declaratively create OIDC applications and store their secrets in Infisical. Walks back the minimalism of ADR 003/004 and adds a second laptop-side apply.
2. **In-cluster automation.** Kubernetes resources delivered via Argo CD (a seeder `Job`, Authentik blueprints, a Harbor config `Job`) perform the handshake from inside the cluster. Keeps OpenTofu tiny and the whole platform reconciled by one engine, at the cost of a couple of small bootstrap Jobs.

## Decision

**Perform the handshake in-cluster**, reconciled by Argo CD, using three declarative pieces instead of a second `tofu apply`:

1. **`infisical-seeder` Job** (`apps/platform/infisical-seeder.yaml`) — an Argo sync-hook Job that authenticates to Infisical with the read-write seeder identity and generates the random secrets each service needs under `/authentik`, `/harbor`, `/grafana`, `/argocd`.
2. **Authentik blueprints** (`apps/identity/authentik-blueprints.yaml`) — a ConfigMap the Authentik worker applies on startup, declaring the `groups` scope mapping, the `*-admins` groups, the OAuth2 providers/applications for Harbor/Grafana/Argo CD, and a proxy (forward-auth) provider for the Traefik dashboard bound to the embedded outpost. Client ids/secrets are pinned via `!Env` to the same Infisical values the apps consume, so both sides always agree.
3. **`harbor-oidc-config` Job** (`apps/platform/harbor-oidc-config.yaml`) — a sync-hook Job that flips Harbor's auth mode to OIDC against Authentik.

OpenTofu's footprint stays minimal (Talos, baseline, Argo CD); no `goauthentik/authentik` or `infisical/infisical` providers are added, and no second apply step exists.

## Consequences

### Positive

- **Pure GitOps, no second apply.** The handshake is reconciled by Argo CD like every other workload. The operator runs OpenTofu once (three applies up front), then only ever pushes to Git — there is no laptop-side `tofu apply -target=module.l3`.
- **OpenTofu stays tiny.** ADR 003/004's minimalism is preserved: no identity/secret state in OpenTofu, no extra providers on their own release cadence, no `tofu import` recovery path for OIDC clients.
- **Declarative where it counts.** Authentik configuration is a diffable blueprint ConfigMap; Infisical secrets are seeded idempotently. Renaming a redirect URI is a normal manifest change.
- **Same machinery as the rest of the platform.** Blueprints, Jobs and ESO are already in use; the handshake self-heals the same way every other Application does.

### Negative

- **Two custom Jobs to maintain.** The seeder and harbor-oidc-config Jobs are small imperative pieces with their own images, pulled from a public registry at bootstrap (Harbor does not exist yet at this stage).
- **Idempotency/retry is the Jobs' and ESO's responsibility.** Re-running is handled by Argo sync hooks and ESO's `refreshInterval` rather than by Terraform's generic reconciliation; partial failures are recovered by the next sync, not a single `apply`.
- **Eventually consistent.** Identity-aware apps can deploy before their secrets exist and sit degraded until the seeder runs and ESO syncs. This is normal during bootstrap but looks momentarily unhealthy in the Argo CD UI.
- **Two sources must agree.** The Authentik blueprint and the Infisical seeder both describe the OIDC handshake; the `!Env` pinning keeps them aligned, but it is a convention to uphold when adding a new SSO client.

### Why not the OpenTofu second apply

Owning L3 in OpenTofu would re-expand its scope (walking back ADR 003/004), add two providers to track, grow OpenTofu state with every OIDC client, and introduce a second `tofu apply` mid-bootstrap. Keeping the handshake in-cluster means the platform reconciles and self-heals it with the same engine it uses for everything else — worth the cost of a couple of small bootstrap Jobs.
