# Getting Started

This is the full procedure to take a bare-metal machine to a running Atlas platform — and then a short tour of how to use it day-to-day. It executes the five-layer bootstrap defined in [Bootstrap Orchestration](./bootstrap), and goes deep on the L3 identity/secret handshake.

If you only want the _concept_, read Bootstrap Orchestration. If you want to actually install Atlas on a machine in front of you, read on.

## Prerequisites

### Hardware

- One x86_64 machine: at least 4 CPU cores, 16 GB RAM, 256 GB SSD.
- Wired Ethernet on the home LAN.
- The ability to forward router ports 80 and 443 to the machine's LAN IP.
- (Recommended) Out-of-band access — IPMI, KVM-over-IP, or just physical access to a USB stick.

### Accounts, domains, external storage

- A domain name you control (in the rest of this guide referred to as `example.com`).
- An API token at your registrar with permission to create and edit DNS records — used by cert-manager's DNS-01 challenge ([ADR 006](./adr/006-cert-manager-tls)).
- An external S3-compatible bucket for Restic backups (Backblaze B2, Hetzner Object Storage, OVH Object Storage, MinIO elsewhere).
- A password manager you trust (1Password, Bitwarden, KeePassXC, …) — Atlas writes a handful of irrecoverable secrets to it during L0.

### Local tooling

| Tool        | Why                                       | Install                                    |
| ----------- | ----------------------------------------- | ------------------------------------------ |
| `talosctl`  | Talk to the Talos node                    | `brew install siderolabs/tap/talosctl`     |
| `tofu`      | Run the OpenTofu bootstrap                | `brew install opentofu`                    |
| `kubectl`   | Inspect the cluster                       | `brew install kubectl`                     |
| `helm`      | Optional: chart inspection                | `brew install helm`                        |
| `infisical` | Pull secrets locally for personal scripts | `brew install infisical/get-cli/infisical` |
| `restic`    | Run or verify backups manually            | `brew install restic`                      |

### The two repositories

Atlas lives in two Git repositories. Fork both before continuing.

| Repository     | What it contains                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `atlas-iac`    | OpenTofu code for L1 (cluster bootstrap, Argo CD install, seed secrets) and L3 (Authentik ↔ Infisical handshake)     |
| `atlas-gitops` | Argo CD `Application` manifests, Helm value overrides, `ExternalSecret` declarations — everything Argo CD reconciles |

## L0 — Bring up Talos

### Step 0.1 — Install Talos on the node

Download the latest stable Talos ISO from <https://www.talos.dev>, write it to a USB stick, boot the node from it. The node boots into Talos' maintenance mode and prints its IP on the console. Note the IP — referred to below as `<NODE_IP>`.

### Step 0.2 — Generate the cluster secrets

From your laptop:

```bash
mkdir -p ~/atlas/talos && cd ~/atlas/talos
talosctl gen config atlas https://<NODE_IP>:6443
```

This produces `controlplane.yaml`, `worker.yaml`, `talosconfig`, and a `secrets.yaml` bundle. You only need `controlplane.yaml` (single-node cluster) and `talosconfig`.

**Seal everything in your password manager right now.** Specifically:

- `controlplane.yaml` (contains the PKI and the etcd encryption key)
- `talosconfig` (your mTLS credentials for `talosctl`)
- `secrets.yaml`

If you lose these you cannot recover the cluster — you can only rebuild it from scratch under a new identity.

### Step 0.3 — Apply and bootstrap

```bash
talosctl apply-config --insecure --nodes <NODE_IP> --file controlplane.yaml
talosctl --talosconfig ./talosconfig --nodes <NODE_IP> bootstrap
talosctl --talosconfig ./talosconfig --nodes <NODE_IP> kubeconfig ~/.kube/atlas
export KUBECONFIG=~/.kube/atlas
kubectl get nodes        # should show one Ready node within ~60s
```

The kubeconfig also goes into the password manager.

## L1 — Run the first OpenTofu apply

### Step 1.1 — Configure the IaC repo

In `atlas-iac/`, copy `terraform.tfvars.example` to `terraform.tfvars` and fill in:

```hcl
domain               = "example.com"
acme_email           = "you@example.com"
registrar_provider   = "ovh"            # or "gandi", "porkbun", etc.
backup_bucket        = "atlas-backup"
backup_region        = "eu-central-1"
oidc_services = [
  "harbor",
  "grafana",
  "infisical",
  "argocd",
  "traefik",   # forward-auth, not OIDC client
]
```

Then export the L1 secrets sourced from the password manager (the OpenTofu `kubernetes` provider also needs `KUBECONFIG` already set from Step 0.3):

```bash
export TF_VAR_registrar_api_token=$(op read "op://Atlas/registrar/token")
export TF_VAR_infisical_admin_password=$(op read "op://Atlas/infisical-admin/password")
export TF_VAR_authentik_admin_password=$(op read "op://Atlas/authentik-admin/password")
export TF_VAR_argocd_admin_password=$(op read "op://Atlas/argocd-admin/password")
export TF_VAR_backup_s3_access_key=$(op read "op://Atlas/backup-s3/access-key")
export TF_VAR_backup_s3_secret_key=$(op read "op://Atlas/backup-s3/secret-key")
```

(Replace `op read …` with your password-manager CLI of choice. Plain env vars or a SOPS-encrypted vars file work too.)

### Step 1.2 — Apply L1

```bash
cd atlas-iac
tofu init
tofu apply -target='module.l1'
```

OpenTofu performs the actions described in [Bootstrap → L1](./bootstrap#l1-opentofu-seeds-plain-kubernetes-secrets): seeds the bootstrap K8s Secrets, installs the Argo CD Helm chart, and creates the root `Application` resource.

### Step 1.3 — Verify

```bash
kubectl -n argocd get pods                 # all Running
kubectl -n argocd port-forward svc/argocd-server 8080:443
# log in at https://localhost:8080 as admin / <your L1 password>
```

## L2 — Wait for the foundations to converge

Argo CD now reconciles the root Application. **No human action required**; this takes 5-15 minutes depending on chart pull times.

Watch progress either in the Argo CD UI you just port-forwarded, or with:

```bash
kubectl get applications -n argocd -w
```

Wait until every Application listed in `apps/foundations/` is `Synced` + `Healthy`. The ones to expect: `cert-manager`, `external-secrets-operator`, `local-path-provisioner`, `traefik`, `infisical`, `authentik`.

Also wait until your DNS resolves the new hostnames and TLS works:

```bash
curl -I https://authentik.example.com    # 200 OK with a valid cert
curl -I https://infisical.example.com    # 200 OK with a valid cert
```

If TLS isn't ready in 15 minutes, check `kubectl get certificate -A` — DNS-01 propagation can take a few minutes at some registrars.

## L3 — The identity/secret handshake (detailed)

This is the part the simpler "Stage 2 — OpenTofu" view in the architecture page glosses over. L3 is what makes "every service uses SSO and pulls secrets from Infisical" actually true.

### Step 3.1 — Generate two API tokens

You need a token for OpenTofu to talk to Authentik, and one for OpenTofu to talk to Infisical.

**Authentik token:**

1. Open `https://authentik.example.com/if/admin/`.
2. Log in as `akadmin` / `$TF_VAR_authentik_admin_password`.
3. _Directory → Tokens & App Passwords → Create_. Identifier: `tofu-l3`, intent: `API token`, expires: 1 year.
4. Copy the resulting token.

```bash
export TF_VAR_authentik_token=<the-token>
```

**Infisical token:**

1. Open `https://infisical.example.com`.
2. Log in as the admin you created at L1.
3. Create a project named `atlas`. Inside it, create an environment `prod`.
4. _Project settings → Service Tokens → Create_. Name: `tofu-l3`, scope: `prod /atlas/*`, permissions: `read,write`, expires: 1 year.
5. Copy the resulting token.

```bash
export TF_VAR_infisical_token=<the-token>
```

### Step 3.2 — What `module.l3` actually contains

For every entry in `oidc_services`, OpenTofu creates the same set of resources. Here is the full example for **Harbor**, taken from `atlas-iac/modules/l3/harbor.tf`:

```hcl
# 1. An Authentik OIDC provider — issues tokens to Harbor
resource "authentik_provider_oauth2" "harbor" {
  name          = "harbor"
  authorization_flow = data.authentik_flow.default_authorization.id
  client_type   = "confidential"
  client_id     = "harbor"
  redirect_uris = [
    "https://harbor.${var.domain}/c/oidc/callback",
  ]
  property_mappings = [
    data.authentik_scope_mapping.openid.id,
    data.authentik_scope_mapping.email.id,
    data.authentik_scope_mapping.profile.id,
    data.authentik_scope_mapping.groups.id,
  ]
}

# 2. An Authentik Application — what users see in the launcher
resource "authentik_application" "harbor" {
  name              = "Harbor"
  slug              = "harbor"
  protocol_provider = authentik_provider_oauth2.harbor.id
  meta_launch_url   = "https://harbor.${var.domain}"
  meta_icon         = "https://goharbor.io/img/logos/harbor-icon-color.svg"
  group             = "Platform"
}

# 3. Push the client_id and client_secret into Infisical
resource "infisical_secret" "harbor_oidc_client_id" {
  name         = "OIDC_CLIENT_ID"
  value        = authentik_provider_oauth2.harbor.client_id
  env_slug     = "prod"
  workspace_id = data.infisical_workspace.atlas.id
  folder_path  = "/atlas/oidc/harbor"
}

resource "infisical_secret" "harbor_oidc_client_secret" {
  name         = "OIDC_CLIENT_SECRET"
  value        = authentik_provider_oauth2.harbor.client_secret
  env_slug     = "prod"
  workspace_id = data.infisical_workspace.atlas.id
  folder_path  = "/atlas/oidc/harbor"
}

# 4. (Optional) Group → role mapping, so Authentik groups become Harbor roles
resource "authentik_group" "harbor_admins" {
  name = "harbor-admins"
}
```

And in `atlas-gitops/apps/identity-aware/harbor/external-secret.yaml`, the `ExternalSecret` that consumes it:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: harbor-oidc
  namespace: harbor
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: infisical-atlas
    kind: ClusterSecretStore
  target:
    name: harbor-oidc # consumed by Harbor's Helm values
  dataFrom:
    - extract:
        key: /atlas/oidc/harbor
```

Harbor's Helm `values.yaml` then references `harbor-oidc` for its `core.oidc` config — see `apps/identity-aware/harbor/values.yaml` in the GitOps repo.

The same three-block pattern repeats for the other services. The only meaningful differences are summarized below.

#### Per-service handshake summary

| Service           | Authentik provider     | Redirect URI                                                                                 | Infisical secret path                                                  | Notes                                                                                                                                                           |
| ----------------- | ---------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Harbor            | `oauth2`               | `https://harbor.example.com/c/oidc/callback`                                                 | `/atlas/oidc/harbor`                                                   | Group `harbor-admins` → Harbor "Administrator" via OIDC group claim                                                                                             |
| Grafana           | `oauth2`               | `https://grafana.example.com/login/generic_oauth`                                            | `/atlas/oidc/grafana`                                                  | Three groups mapped to Admin / Editor / Viewer                                                                                                                  |
| Infisical         | `oauth2`               | `https://infisical.example.com/api/v1/sso/oidc/callback`                                     | `/atlas/oidc/infisical`                                                | Self-hosted Infisical IS the secret store, but its _web UI_ SSO is a separate concern. This is fine because ESO uses the L1 service token (no chicken-and-egg). |
| Argo CD           | `oauth2`               | `https://argocd.example.com/auth/callback`                                                   | `/atlas/oidc/argocd`                                                   | Group `argocd-admins` → `role:admin` in `argocd-rbac-cm`                                                                                                        |
| Traefik dashboard | `proxy` (forward-auth) | `https://traefik.example.com/outpost.goauthentik.io/callback?X-authentik-auth-callback=true` | (not stored — Authentik issues a cookie, no OIDC client secret needed) | Uses Authentik's "embedded outpost"; Traefik `Middleware` of type `forwardAuth` points at it                                                                    |

### Step 3.3 — Run the L3 apply

```bash
tofu apply -target='module.l3'
```

OpenTofu creates the resources above. Expected runtime: < 30 seconds.

### Step 3.4 — Verify the handshake

```bash
# 1. Authentik should now list 5 applications
kubectl -n authentik exec deploy/authentik-server -- \
  ak shell -c "from authentik.core.models import Application; print([a.slug for a in Application.objects.all()])"
# → ['harbor', 'grafana', 'infisical', 'argocd', 'traefik']

# 2. Infisical should now hold the OIDC client_secret for each
infisical secrets --env=prod --path=/atlas/oidc/harbor
# → OIDC_CLIENT_ID, OIDC_CLIENT_SECRET

# 3. (Once L4 deploys) Every ExternalSecret should be in SecretSynced
kubectl get externalsecrets -A
```

If any `ExternalSecret` shows `SecretSyncError`, the Infisical path or the L1 service token is wrong. Check `kubectl describe externalsecret …` for the exact reason.

## L4 — Flip the identity-aware workloads on

In `atlas-gitops/apps/root/identity-aware.yaml`, flip the toggle from `enabled: false` to `enabled: true` and push:

```bash
cd atlas-gitops
yq -i '.spec.source.helm.values.enabled = true' apps/root/identity-aware.yaml
git add -A && git commit -m "feat: enable L4 identity-aware workloads" && git push
```

Argo CD picks up the change at its next sync interval (default 3 min) or you can force it from the UI. Watch the `harbor`, `grafana`, `prometheus`, `loki`, `alertmanager` Applications go `Synced` + `Healthy`.

Then test SSO from a private browser window:

```text
https://grafana.example.com → 302 → https://authentik.example.com/oauth2/authorize?…
→ Authentik login → 302 back to Grafana → already logged in
```

If it loops or returns an OIDC error, the redirect URI in Authentik doesn't match what Grafana sends. Compare exact strings.

## L5 — Close the platform

The bootstrap UIs (Argo CD, Traefik dashboard) still accept a local-admin login. Final commit:

```bash
cd atlas-gitops
git apply ./apps/foundations/traefik/middleware-forward-auth.yaml.patch
git add -A && git commit -m "feat(L5): forward-auth on Argo CD UI and Traefik dashboard" && git push
```

Argo CD applies the two `Middleware` resources and updates the corresponding `IngressRoute`s. Verify by hitting `https://traefik.example.com` and `https://argocd.example.com` from a private window — both should now redirect to Authentik before showing anything.

The break-glass admin accounts on each service remain, in case Authentik ever breaks.

## You're done — quick tour of day-to-day usage

### Push your first image

```bash
# Create a Harbor robot account in the UI (Projects → personal → Robot Accounts).
docker login harbor.example.com -u robot$personal+ci -p <robot-token>
docker tag my-app:dev harbor.example.com/personal/my-app:0.1.0
docker push harbor.example.com/personal/my-app:0.1.0
```

In the Harbor UI, the image appears in the `personal` project within a few seconds; the Trivy scan completes within a minute.

### View dashboards

Open `https://grafana.example.com`, sign in via Authentik. The home dashboard shows cluster + Argo CD health. Application metrics for your own workloads appear once you scrape them from a `ServiceMonitor` in their namespace.

### Store and consume a secret

```bash
# Web UI: open infisical.example.com → atlas → prod → New Secret.
# Or via CLI:
infisical secrets set MY_KEY=somevalue --env=prod --path=/atlas/personal/my-app
```

Then in the GitOps repo, declare an `ExternalSecret` that materializes it into your workload's namespace as a Kubernetes `Secret`. The pattern is identical to the Harbor example shown earlier in **L3 → Step 3.2**.

### Deploy a new application

See [Functional → Workflow W6](../functional/workflows#w6-i-deploy-a-new-application-to-the-platform). Short version: add the manifests under `atlas-gitops/apps/<name>/`, register them in the `app-of-apps` root, commit and push. Argo CD picks them up within the sync interval. cert-manager issues the certificate, Traefik routes the host.

### Recover from a disk failure

See [Functional → Workflow W5](../functional/workflows#w5-i-recover-from-a-disk-failure). Short version: re-run L0 + L1 + L3 from the password manager and the IaC repo. Then `restic restore` the latest snapshot for each PVC. Total RTO is typically under an hour.

## Troubleshooting

| Symptom                                                               | Likely cause                                                                     | Fix                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `tofu apply -target=module.l1` fails on `kubernetes_secret`           | `KUBECONFIG` not set, or kubeconfig points at the wrong cluster                  | `export KUBECONFIG=~/.kube/atlas` and re-run                                    |
| L2 stuck — `certificate` never ready                                  | DNS-01 propagation delayed at the registrar                                      | Wait 5-10 minutes; then `kubectl describe challenge -A`                         |
| L3 apply fails — `authentik_provider_oauth2.harbor: 401 Unauthorized` | The Authentik token in `TF_VAR_authentik_token` is wrong or expired              | Regenerate per Step 3.1                                                         |
| L4: Grafana login loops                                               | Redirect URI mismatch between Authentik provider config and Grafana's actual URL | Edit the redirect URI in OpenTofu (`apps/identity-aware/grafana/`) and re-apply |
| L4: `ExternalSecret` stuck `SecretSyncError`                          | L1 Infisical service token has the wrong scope, or the Infisical path was typoed | `kubectl describe externalsecret <name>` shows the exact API error              |
| Cannot reach the cluster after a node reboot                          | The home WAN IP changed; DNS records still point at the old one                  | Update DNS at the registrar, or set up a dynamic-DNS updater                    |
