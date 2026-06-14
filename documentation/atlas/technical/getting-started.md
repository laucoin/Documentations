# Getting Started

This is the end-to-end procedure to take a bare-metal machine on your home LAN and turn it into a running Atlas platform — Talos Kubernetes, Argo CD GitOps, SSO via Authentik, secrets via Infisical, registry via Harbor, etc.

It assumes you have **never deployed Kubernetes or any of these tools before**. Every step that requires a human action is spelled out, including the manual `kubectl` commands, the DNS records you add at your registrar, and the buttons you click in each web UI.

> The deployment described here uses the **home-self-hosted** pattern: the node sits on your LAN with a private IP (e.g. `10.0.0.10`), but your router forwards ports **80** and **443** from your public IP to the node. A wildcard DNS record `*.atlas.<your-domain>` points at your router's public IP. Browsers (on the LAN or outside) connect over HTTPS to public IP → router → node → Traefik. Certificates are issued by Let's Encrypt via the standard **HTTP-01** challenge (LE connects back on port 80 to prove you own the domain).

If you only want the conceptual overview, read [`AGENTS.md`](./AGENTS.md). If you want to actually install Atlas, read on.

---

## Table of contents

1. [Architecture at a glance](#1-architecture-at-a-glance)
2. [Prerequisites](#2-prerequisites)
3. [Phase 0 — Plan your network and seal your vault](#3-phase-0--plan-your-network-and-seal-your-vault)
4. [Phase 1 — Fork and push the repo](#4-phase-1--fork-and-push-the-repo)
5. [Phase 2 — Install Talos (OpenTofu)](#5-phase-2--install-talos-opentofu)
6. [Phase 3 — Cluster baseline (OpenTofu)](#6-phase-3--cluster-baseline-opentofu)
7. [Phase 4 — Argo CD bootstrap (last OpenTofu step)](#7-phase-4--argo-cd-bootstrap-last-opentofu-step)
8. [Phase 5 — Traefik + the secret plane (Infisical + ESO)](#8-phase-5--traefik--the-secret-plane-infisical--eso)
9. [Phase 6 — Authentik (SSO)](#9-phase-6--authentik-sso)
10. [Phase 7 — Harbor (container registry)](#10-phase-7--harbor-container-registry)
11. [Phase 8 — Observability (Prometheus + Grafana + Loki)](#11-phase-8--observability-prometheus--grafana--loki)
12. [Phase 9 — Velero (backups + disaster recovery)](#12-phase-9--velero-backups--disaster-recovery)
13. [Phase 10 — Optional applications (SonarQube + Home Assistant)](#13-phase-10--optional-applications-sonarqube--home-assistant)
14. [Day-to-day usage](#14-day-to-day-usage)
15. [Disaster recovery drill](#15-disaster-recovery-drill)
16. [Troubleshooting](#16-troubleshooting)
17. [(Optional) Add a node to the cluster](#17-optional-add-a-node-to-the-cluster)

---

## 1. Architecture at a glance

Atlas is **one Git repository** holding two kinds of code:

| Path                             | What it does                                                                                                          | When it runs                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `bootstrap/talos/`               | OpenTofu module that installs Talos Linux on the node and produces a kubeconfig.                                      | Once, by you, with `tofu apply`. |
| `bootstrap/baseline/`            | OpenTofu module that installs the cluster floor — `local-path-provisioner`, MetalLB, cert-manager, issuers.           | Once, by you, with `tofu apply`. |
| `bootstrap/argo/`                | OpenTofu module that installs Argo CD and points it at this repo.                                                     | Once, by you, with `tofu apply`. |
| `apps/_root/applicationset.yaml` | The "root" — an Argo `ApplicationSet` that generates one Application per subdirectory of `apps/`.                     | Continuously, by Argo CD.        |
| `apps/infra/`                    | Cluster-wide infrastructure: Traefik, External Secrets Operator, the ClusterSecretStores, the CloudNativePG operator. | Continuously, by Argo CD.        |
| `apps/identity/`                 | Authentik and its TLS/IngressRoute/forward-auth wiring.                                                               | Continuously, by Argo CD.        |
| `apps/platform/`                 | Infisical, Harbor, Velero, SonarQube (+ its CloudNativePG database).                                                  | Continuously, by Argo CD.        |
| `apps/observability/`            | kube-prometheus-stack, Loki, Promtail, ServiceMonitors.                                                               | Continuously, by Argo CD.        |
| `apps/home/`                     | Home Assistant (home automation).                                                                                     | Continuously, by Argo CD.        |

The mental split:

```text
You run `tofu apply` 3 times.   ──>   Argo CD takes over forever after that.
```

After Phase 4, **you never run `kubectl apply` again for application changes**. You edit YAML in `apps/`, commit, push — Argo reconciles. The only manual `kubectl` commands left are the few one-time _bootstrap_ Secrets that have to exist before Infisical does (you can't store Infisical's own encryption key inside Infisical).

---

## 2. Prerequisites

### 2.1 Hardware

- **One x86_64 machine**: at least 4 CPU cores, 16 GB RAM, 256 GB SSD. (Atlas is single-node by design; HA is out of scope.)
- **Wired Ethernet** to your home router. Wi-Fi is technically possible but flaky for Kubernetes.
- **A USB stick** to flash the Talos installer onto.
- **Out-of-band access is a nice-to-have**: physical access to the machine and a keyboard/monitor is enough; IPMI/KVM is luxury.

### 2.2 Network — router port forwarding

Atlas serves everything on ports **80** and **443**. To let Let's Encrypt reach your cluster (HTTP-01 challenge) **and** to let any device on the internet connect to your services, configure your home router:

| WAN side                      | →   | LAN side                                           |
| ----------------------------- | --- | -------------------------------------------------- |
| TCP **80** on your public IP  | →   | TCP **80** on the node's LAN IP (e.g. `10.0.0.10`) |
| TCP **443** on your public IP | →   | TCP **443** on the node's LAN IP                   |

> If your ISP gives you a dynamic public IP, set up [DynDNS](https://www.dyndns.com/) / [DuckDNS](https://www.duckdns.org/) / your registrar's dynamic-update endpoint to keep the A record current. The router itself often has a built-in dynamic-DNS updater.

### 2.3 Domain name and DNS records

You need a domain (the rest of this guide uses **`laucoin.fr`** as the example — substitute your own everywhere). You can use **any registrar**; no DNS API access is needed because we use HTTP-01 (which proves ownership over the port-forward), not DNS-01.

At your registrar's DNS panel, add **one wildcard A record**:

```text
*.atlas.laucoin.fr   A   <your-router's-public-IP>
```

That single record covers every subdomain Atlas will use:

| Hostname                          | Used by        | Comes up in |
| --------------------------------- | -------------- | ----------- |
| `argo.atlas.laucoin.fr`           | Argo CD UI     | Phase 4     |
| `infisical.atlas.laucoin.fr`      | Infisical      | Phase 5     |
| `authentik.atlas.laucoin.fr`      | Authentik      | Phase 6     |
| `harbor.atlas.laucoin.fr`         | Harbor         | Phase 7     |
| `grafana.atlas.laucoin.fr`        | Grafana        | Phase 8     |
| `sonarqube.atlas.laucoin.fr`      | SonarQube      | Phase 10    |
| `home-assistant.atlas.laucoin.fr` | Home Assistant | Phase 10    |

> Most home routers also support **NAT hairpinning** (also called "NAT loopback") — when a LAN device asks for your public IP, the router routes it straight back to the node without leaving the house. If hairpinning isn't enabled, you'll have to enable it (or use split-horizon DNS / `/etc/hosts` overrides on LAN clients).

### 2.4 External storage for backups

Velero (Phase 9) ships PV contents to an offsite **S3-compatible bucket**. Pick a provider, create a bucket, and create a machine-scoped access key + secret key. Cheap options:

- [Backblaze B2](https://www.backblaze.com/cloud-storage) — pennies/GB, S3-compatible.
- [Wasabi](https://wasabi.com/) — flat-rate, no egress fees.
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) — zero egress fees.
- A second MinIO running on a different network if you want fully self-hosted.

You'll set the bucket name, region, and S3 endpoint URL in `apps/platform/velero.yaml` during Phase 9.

### 2.5 Password manager (for out-of-band secrets)

Atlas has exactly **three** secrets that never get migrated into Infisical (they'd be circular — Infisical can't store its own encryption key, nor the credentials used to reach it). Keep all three in 1Password / Bitwarden / KeePassXC / a hardware token / a sealed envelope:

1. `infisical-bootstrap` — Infisical's at-rest encryption key + JWT signing key (created in Phase 5).
2. `infisical-credentials` — the **read-only** machine identity (`eso`) External Secrets Operator uses to read from Infisical (created in Phase 5).
3. `infisical-seeder-credentials` — the **read-write** machine identity (`seeder`) the secret-seeder Job uses to create the random secrets (created in Phase 5).

Plus three OpenTofu state files that **must** be backed up (they hold cluster PKI and secrets):

- `bootstrap/talos/terraform.tfstate` (PKI for Talos itself — losing it means reinstalling the cluster from scratch)
- `bootstrap/baseline/terraform.tfstate`
- `bootstrap/argo/terraform.tfstate`

The repo `.gitignore` keeps these out of Git. Stash them in the same vault.

### 2.6 Local tooling

Install on your workstation (the macOS commands are shown; Linux is similar):

| Tool       | Why                                                       | Install                                |
| ---------- | --------------------------------------------------------- | -------------------------------------- |
| `talosctl` | Talk to Talos directly                                    | `brew install siderolabs/tap/talosctl` |
| `tofu`     | Run the OpenTofu modules                                  | `brew install opentofu`                |
| `kubectl`  | Inspect the cluster                                       | `brew install kubectl`                 |
| `helm`     | Optional — chart introspection                            | `brew install helm`                    |
| `velero`   | Optional — drive Velero backups/restores from your laptop | `brew install velero`                  |

### 2.7 GitHub (or any Git remote your cluster can reach)

Argo CD is GitOps — it pulls manifests from a Git URL. The simplest setup is a **public GitHub repository** (the cluster needs outbound HTTPS to GitHub, which any home router allows by default). If you'd rather self-host: Gitea / Gogs / GitLab on the LAN works fine, the URL just changes.

---

## 3. Phase 0 — Plan your network and seal your vault

Before touching any code, write down (or paste into your password manager):

1. **Node LAN IP** — the address the node will keep forever, e.g. `10.0.0.10`. Pin it on your router's DHCP reservation list so it never changes.
2. **Router LAN IP (gateway)** — your router's address, e.g. `10.0.0.1`.
3. **Router public (WAN) IP** — what `curl ifconfig.me` shows from inside your network.
4. **Subnet CIDR** — usually `/24` for home networks, e.g. `10.0.0.0/24`.
5. **NIC name** — when Talos boots, it prints the interface name on the console (e.g. `eno1`, `enp2s0`). You'll grab this in Phase 2.
6. **Install disk path** — the device Talos installs onto, e.g. `/dev/nvme0n1` or `/dev/sda`. Also printed on boot.
7. **Your contact email** — used for Let's Encrypt expiry notifications.

Verify port forwarding works _before_ you start: bring up any tiny HTTP server on the node-to-be at port 80 and `curl http://<public-ip>` from your phone on cellular data. If you get a response, the NAT is in place.

---

## 4. Phase 1 — Fork and push the repo

Argo CD needs a Git URL it can `git pull` from. Phase 4 will hardcode that URL into the bootstrap module, so pick it now.

```bash
# Fork github.com/<you>/Atlas in the GitHub UI, then:
git clone git@github.com:<you>/Atlas.git
cd Atlas
```

Open `apps/_root/applicationset.yaml` and replace **both** occurrences of `https://github.com/CHANGEME/Atlas.git` with your real repo URL:

```yaml
repoURL: https://github.com/<you>/Atlas.git # ← change both lines
```

```bash
git add apps/_root/applicationset.yaml
git commit -m "chore: pin repo URL in applicationset"
git push
```

Phase 4 will not work until the repo is reachable at the URL you put in `applicationset.yaml`.

---

## 5. Phase 2 — Install Talos (OpenTofu)

### 5.1 Flash and boot the Talos installer

1. Download the latest Talos ISO from <https://factory.talos.dev/> (any image is fine; the default works).
2. Flash to USB: `dd if=metal-amd64.iso of=/dev/diskN bs=1M` (or use [Balena Etcher](https://www.balena.io/etcher/)).
3. Boot the node from USB.
4. Talos boots into **maintenance mode** and prints, on the console:
   - The IP it got via DHCP (write it down — this is the _current_ IP, often different from the static IP you'll assign).
   - The disks it sees (note the install disk path, e.g. `/dev/nvme0n1`).
   - The NIC name (e.g. `eno1`).

> Throughout the rest of this guide, "the node's IP" = the **static IP you'll assign** (e.g. `10.0.0.10`). If the DHCP IP at first boot is different, set the static IP in your router's DHCP reservation to match what Talos got at first boot — that way the IP doesn't change between maintenance-mode and post-install.

### 5.2 Configure the Talos module

```bash
cd bootstrap/talos
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
node_ip       = "10.0.0.10"
node_hostname = "atlas"
install_disk  = "/dev/nvme0n1"

network = {
  interface   = "eno1"
  cidr        = "10.0.0.10/24"
  gateway     = "10.0.0.1"
  nameservers = ["1.1.1.1", "9.9.9.9"]
}
```

Replace:

- `node_ip` value with the displayed `IP` (without the mask) at the top of Talos Linux (`F1: Summary`)
- `install_disk` value with your disk path (for example the first PCIe SSD will be `/dev/nvme0n1`)
- `network.interface` value with the interface you want. In Talos Linux `F3: Network Config`>`Interface`>One of the list
- `network.cidr` value with the displayed `IP` at the top of Talos Linux (`F1: Summary`)
- `gateway` value with the displayed `GW` (without the mask) at the top of Talos Linux (`F1: Summary`)

### 5.3 Apply

```bash
tofu init
tofu apply
```

What happens:

1. OpenTofu calls `talosctl gen secrets` (under the hood) — produces the cluster CA, the etcd encryption key, the kubelet PKI.
2. OpenTofu renders the controlplane machine config with your patches (hostname, static IP, install disk, `allowSchedulingOnControlPlanes: true` for single-node).
3. OpenTofu calls `talosctl apply-config --insecure` — the node receives the config, installs Talos to the chosen disk, reboots.
4. OpenTofu calls `talosctl bootstrap` — etcd elects a leader, the API server comes up.
5. OpenTofu writes two files at the repo root: `kubeconfig` and `talosconfig` (mode `0600`, gitignored).

### 5.4 Verify

```bash
export KUBECONFIG=$PWD/../../kubeconfig
kubectl get nodes
# NAME    STATUS   ROLES           AGE   VERSION
# atlas   Ready    control-plane   2m    v1.31.2
```

> The role reads **`control-plane`** (not `control-plane,worker`):
> `allowSchedulingOnControlPlanes: true` removes the `NoSchedule` taint so pods
> _do_ schedule here, but Talos doesn't add a separate `worker` role label on a
> single node. The node first reports `Ready` ~30–60 s after `tofu apply`
> finishes (kubelet registration + flannel) — a brief "No resources found" right
> after bootstrap is normal.

### 5.5 Back up the Talos state

**This is the most important backup of the whole platform.** Copy these three files into your password manager:

- `bootstrap/talos/terraform.tfstate`
- `kubeconfig`
- `talosconfig`

If you lose all three you cannot recover the cluster — you can only rebuild it under a new identity (and old Velero backups will not restore, because the CA changed).

---

## 6. Phase 3 — Cluster baseline (OpenTofu)

This phase installs the things every other workload depends on: a default `StorageClass`, a load balancer, and cert-manager with three `ClusterIssuer`s.

### 6.1 Configure

```bash
cd ../baseline
cp terraform.tfvars.example terraform.tfvars
```

Edit:

```hcl
lb_ip      = "10.0.0.10"          # MetalLB advertises this IP via L2
acme_email = "you@example.com"
```

`lb_ip` is the single IP MetalLB hands out to LoadBalancer Services. On a single-node setup it's typically the same as the node's LAN IP — and it must be the same IP your router NATs ports 80/443 to.

### 6.2 Apply

```bash
tofu init
tofu apply
```

This installs:

- **local-path-provisioner** (in `local-path-storage`) — a `kubernetes_annotations` resource marks the `local-path` StorageClass as default, and a `kubernetes_labels` resource pins the `local-path-storage` namespace to Pod Security `privileged`. The provisioner creates each volume by spawning a short-lived **helper pod that mounts a `hostPath`**; Talos enforces the `baseline` Pod Security Standard cluster-wide, which forbids `hostPath`, so without the `privileged` label **every PVC hangs `Pending`** and nothing with storage (Postgres, Redis, Prometheus, Loki…) can start. All later PVCs land here.
- **MetalLB** (in `metallb-system`) — single-IP L2 pool at `var.lb_ip/32`.
- **cert-manager** (in `cert-manager`) — with CRDs, plus three `ClusterIssuer`s: `selfsigned`, `letsencrypt-staging`, `letsencrypt-prod`. Both Let's Encrypt issuers use the **HTTP-01** challenge over the Traefik ingress class — so they'll only start issuing once Phase 5 installs Traefik. That's expected; the issuers themselves are `Ready=True` right away.

### 6.3 Verify

```bash
# Default storage class
kubectl get storageclass
# NAME                   PROVISIONER             ...  AGE
# local-path (default)   rancher.io/local-path        2m

# MetalLB up
kubectl -n metallb-system get pods                # all Running

# cert-manager up
kubectl -n cert-manager get pods                  # 3 pods Running

# Issuers exist
kubectl get clusterissuer
# NAME                  READY
# letsencrypt-prod      True
# letsencrypt-staging   True
# selfsigned            True

# Smoke test: make a quick selfsigned cert
kubectl create namespace smoke
kubectl apply -n smoke -f - <<'EOF'
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: smoke
spec:
  secretName: smoke
  issuerRef: { name: selfsigned, kind: ClusterIssuer }
  dnsNames: [ smoke.local ]
EOF
kubectl -n smoke get certificate -w               # should hit Ready=True within ~10s
kubectl delete namespace smoke
```

> If you'd rather use a DNS provider's API to validate (DNS-01) — useful if you ever close port 80 — see the comment block on the `letsencrypt_prod` resource in `bootstrap/baseline/main.tf`. The default shipped here is HTTP-01 because it matches your router-forward setup.

---

## 7. Phase 4 — Argo CD bootstrap (last OpenTofu step)

After this phase, OpenTofu's job is done — every subsequent change happens in `apps/` and is reconciled by Argo CD.

### 7.1 Configure

```bash
cd ../argo
cp terraform.tfvars.example terraform.tfvars
```

Edit:

```hcl
repo_url = "https://github.com/<you>/Atlas.git"   # the URL you pushed to in Phase 1
```

### 7.2 Apply

```bash
tofu init
tofu apply
```

What happens:

1. Helm release `argocd` lands in the `argocd` namespace (chart `argo-cd:9.5.21`). The server runs in HTTP mode (`configs.params.server.insecure=true`) because Traefik will terminate TLS in front of it once Phase 5 ships.
2. A single root `Application` named `root` is created, pointing at `apps/_root/` in your repo.
3. The root `Application` syncs — it applies `apps/_root/applicationset.yaml`. That `ApplicationSet` is a **Git directory generator**: it scans `apps/*/` and creates one Argo Application per subdirectory (`infra`, `identity`, `platform`, `observability`, `home`).

### 7.3 Reach the Argo UI

You don't have Traefik yet, so port-forward:

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:80
```

Open <http://localhost:8080>. The initial admin password is in a Secret:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d
echo
```

(The two `tofu output` values `port_forward_command` and `initial_admin_password_command` print these exact commands.)

Log in as `admin`. You should see:

- `root` — Synced/Healthy
- `infra`, `identity`, `platform`, `observability` — Synced/Healthy with 0 resources (their directories are empty until Phase 5 onward)

> If `root` is **Unknown** with "repository not found", the URL in `terraform.tfvars` is wrong or the repo isn't public (and you didn't configure SSH/PAT). Fix the URL; or in Argo UI add a repository credential (Settings → Repositories).

### 7.4 Back up the Argo Tofu state

Copy `bootstrap/argo/terraform.tfstate` to your password manager.

---

## 8. Phase 5 — Traefik + the secret plane (Infisical + ESO)

This is the first phase reconciled entirely by Argo CD; from here on you mostly `git push` and watch the UI. We bring up **Traefik** (north-south routing) together with the **secret-management plane** — Infisical, External Secrets Operator, and the secret **seeder** — _before_ Authentik (Phase 6), because Authentik and every app after it draw their credentials from here. After this phase you won't `kubectl create secret` for application data again; the seeder generates the random ones and you keep only three out-of-band Secrets by hand (§2.5).

### 8.1 Create the one-shot Infisical bootstrap Secret

Infisical encrypts its own database with `ENCRYPTION_KEY` and signs its JWTs with `AUTH_SECRET`. **These two values never migrate into Infisical** (they'd be circular). Save them in your password manager.

```bash
kubectl create namespace infisical

kubectl create secret generic infisical-bootstrap \
  --namespace infisical \
  --from-literal=ENCRYPTION_KEY="$(openssl rand -hex 16)" \
  --from-literal=AUTH_SECRET="$(openssl rand -base64 32 | tr -d '\n=')"
```

### 8.2 Push and wait for sync (~5 min)

If you made any local changes in Phase 4 (e.g. the AppSet URL), `git push`. Argo syncs:

- `infra` → Application `traefik` → installs the Traefik chart → MetalLB hands it `10.0.0.10` as the LoadBalancer IP. Traefik now answers on ports 80 and 443; thanks to your router NAT, the outside world sees those ports on your public IP.
- `infra` → `external-secrets` in the `external-secrets` namespace (Helm chart `external-secrets:2.6.0` with CRDs). The Application **must** set `ServerSideApply=true` in its `syncOptions` (see `apps/infra/external-secrets-operator.yaml`): two of the chart's CRDs — `secretstores` and `clustersecretstores` — embed every provider's schema and exceed Argo's client-side apply limit (the `kubectl.kubernetes.io/last-applied-configuration` annotation caps at 256 KiB). Without it, those two CRDs silently fail to install, the operator can't find `ClusterSecretStore`/`SecretStore`, and it crash-loops — taking every `ExternalSecret` down with it.
- `platform` → `infisical` in the `infisical` namespace (chart `infisical-standalone` with embedded postgres + redis).
- `clustersecretstore` (Argo-applied `ClusterSecretStore`s — one per service folder: `infisical-authentik`, `infisical-harbor`, `infisical-grafana`, `infisical-argocd`, `infisical-velero`, `infisical-sonarqube`) — all `NotReady` for now because the credentials don't exist yet.

> **API version:** as of chart `2.6.0` the operator serves **only `external-secrets.io/v1`** — `v1beta1` was removed on 2026-05-01. Every `ClusterSecretStore` / `ExternalSecret` in this repo (`apps/infra/clustersecretstore.yaml` and the various `*-externalsecret.yaml`) uses `apiVersion: external-secrets.io/v1`. A leftover `v1beta1` manifest will silently fail to apply.

### 8.3 Create the Infisical project and two machine identities (manual, UI)

> **Reach Infisical by port-forward, not the hostname, at this point.** The
> `infisical` IngressRoute lives in the `platform` Argo app alongside the
> `infisical-seeder` Sync hook. On a first bootstrap that hook is still pending
> (it needs the `seeder` credentials you're about to create), so the app's sync
> hasn't applied the IngressRoute yet and `https://infisical.atlas.laucoin.fr`
> serves Traefik's default cert. Use a port-forward for this one manual step:
>
> ```bash
> kubectl -n infisical port-forward \
>   svc/infisical-infisical-standalone-infisical 8080:8080
> # then open http://localhost:8080
> ```
>
> Once §8.4–8.5 complete and the seeder succeeds, the `platform` sync finishes,
> the IngressRoute is applied, and the public hostname works from then on.

1. Browse to **<http://localhost:8080>** (port-forward above), or the hostname
   once it is live.
2. Sign up as the first user — that user becomes the org owner. **Save these credentials.**
3. Create an **Organization** (any name).
4. Inside it, create a **Project** with **slug exactly `atlas`** (must match `apps/infra/clustersecretstore.yaml`).
5. You already get three environments by default: `dev`, `staging`, `prod`. You'll use `prod` (matches the ClusterSecretStores).
6. **Project → Access Control → Machine Identities → Add** — create **two**, both with **Universal Auth**, and for each click in → **Create Client Secret** and copy the `Client ID` + `Client Secret` immediately (shown once):
   - `eso` — Role: **viewer** (read-only). ESO uses this to _read_ secrets from every folder.
   - `seeder` — a role with **read + write** on `prod` (e.g. a custom role, or the built-in developer/admin). The seeder Job uses this to _create_ the random secrets.

   > Secrets are organised into one folder per service (`/authentik`, `/harbor`, `/grafana`, `/argocd`, `/velero`). Project-level roles cover all folders, so no per-path grants are needed.

### 8.4 Create the two credentials Secrets

```bash
# Read identity for ESO
kubectl create secret generic infisical-credentials \
  --namespace external-secrets \
  --from-literal=clientId='paste-eso-client-id' \
  --from-literal=clientSecret='paste-eso-client-secret'

# Write identity for the seeder Job
kubectl create secret generic infisical-seeder-credentials \
  --namespace infisical \
  --from-literal=clientId='paste-seeder-client-id' \
  --from-literal=clientSecret='paste-seeder-client-secret'
```

Within a minute the `ClusterSecretStore`s go `Ready`:

```bash
kubectl get clustersecretstore
# NAME                  STATUS   CAPABILITIES   READY
# infisical-authentik   Valid    ReadOnly       True
# infisical-harbor      Valid    ReadOnly       True
# infisical-grafana     Valid    ReadOnly       True
# infisical-argocd      Valid    ReadOnly       True
# infisical-velero      Valid    ReadOnly       True
# infisical-sonarqube   Valid    ReadOnly       True
```

> Capabilities show **`ReadOnly`** because the `eso` identity is a project
> **viewer** — that's expected (ESO only reads). The `infisical-velero` store
> only goes `Valid` once the `/velero` folder exists; the seeder creates it
> empty for you (its actual S3 keys are set by hand in Phase 9).

### 8.5 Let the seeder populate every random secret

The `infisical-seeder` Job (`apps/platform/infisical-seeder.yaml`, an Argo Sync hook) now runs: it authenticates with the `seeder` identity and **creates every random secret Atlas needs**, sorted into per-service folders in `prod` — `/authentik` (the four `AUTHENTIK_*` keys), `/harbor` (`HARBOR_ADMIN_PASSWORD` + `HARBOR_OIDC_*`), `/grafana` (`GRAFANA_ADMIN_*` + `GRAFANA_OIDC_*`), `/argocd` (`ARGOCD_OIDC_*`), `/sonarqube` (`SONARQUBE_MONITORING_PASSCODE`). This replaces the old "run `openssl` a dozen times and paste into the UI" ritual.

```bash
kubectl -n infisical get jobs
kubectl -n infisical logs job/infisical-seeder    # shows "+ created" / "= kept" per key
```

Confirm in the Infisical UI that each service folder under **prod** holds its keys.

> **Idempotent & safe.** The seeder only creates keys that are absent — it never overwrites an existing value, so re-running it won't rotate anything or break a live cluster.

> The **only** secrets you set by hand are Velero's S3 credentials (Phase 9) — they're account-specific, not random. Everything else is seeded.

### 8.6 Deliverable test — rotate a value live

The `authentik-bootstrap` `ExternalSecret` (`apps/identity/authentik-externalsecret.yaml`) syncs as soon as the store is `Ready` and the keys exist — even before Authentik's pods. Change `AUTHENTIK_BOOTSTRAP_PASSWORD` in the Infisical UI; within 60 seconds:

```bash
kubectl -n authentik get secret authentik-bootstrap \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_PASSWORD}' | base64 -d
```

…prints the new value — proving the Infisical → ESO loop works end to end.

---

## 9. Phase 6 — Authentik (SSO)

Authentik now boots **straight from the secrets the seeder placed in Infisical** — there is no manual bootstrap Secret to create. And its scope mapping, OAuth2 providers, applications and admin groups are all created declaratively by a **blueprint** (`apps/identity/authentik-blueprints.yaml`, mounted via `blueprints.configMaps`), so there is **no UI clicking** in this phase or any later one.

### 9.1 What happens automatically

- ESO materializes `authentik-bootstrap` into the `authentik` namespace — the four `AUTHENTIK_*` keys **plus** the six `*_OIDC_CLIENT_ID`/`*_OIDC_CLIENT_SECRET` (the blueprint reads the OIDC values via `!Env`).
- Authentik's server/worker **and** its bundled PostgreSQL boot from that one Secret (they share `AUTHENTIK_POSTGRESQL__PASSWORD` via `postgresql.auth.existingSecret`). Because both block until the Secret exists, there is **no race on the DB password** — if Phase 5 isn't finished yet, the pods simply sit `Pending`/`CreateContainerConfigError` until ESO creates it. That's expected, not an error.
- The worker applies the blueprint: the `groups` scope mapping; the `registry-provider` / `observability-provider` / `cd-provider` OAuth2 providers + the `harbor` / `grafana` / `argo-cd` applications (client IDs/secrets pinned to the seeded Infisical values, so both sides of every handshake always match); and the `grafana-admins` / `argocd-admins` / `harbor-admins` groups — each with **`akadmin` as a member**.

Watch until quiet:

```bash
kubectl get pods -n authentik | grep -vE 'Running|Completed'
```

### 9.2 Verify the cert is issued

The `Certificate` `authentik-tls` in the `authentik` namespace requests `authentik.atlas.laucoin.fr` from `letsencrypt-prod`. With HTTP-01:

1. cert-manager creates a temporary Ingress route on Traefik for `http://authentik.atlas.laucoin.fr/.well-known/acme-challenge/<token>`.
2. Let's Encrypt looks up `authentik.atlas.laucoin.fr` → public IP, fetches the challenge URL on port 80.
3. Your router forwards :80 to the node, Traefik routes the challenge to cert-manager's responder, which returns the token.
4. LE verifies, issues the cert, cert-manager stores it in the `authentik-tls` Secret.

```bash
kubectl -n authentik get certificate
# NAME            READY   SECRET          AGE
# authentik-tls   True    authentik-tls   90s
```

### 9.3 Log in

Browse to **<https://authentik.atlas.laucoin.fr/if/admin/>** (browser-trusted, green padlock). Log in with:

- username: `akadmin`
- password: the seeded `AUTHENTIK_BOOTSTRAP_PASSWORD` — read it from the Infisical UI, or:

```bash
kubectl -n authentik get secret authentik-bootstrap \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_PASSWORD}' | base64 -d; echo
```

Under **Applications → Applications** you'll already see **Harbor**, **Grafana**, and **Argo CD**; under **Directory → Groups**, the three `*-admins` groups exist with `akadmin` in each. **No manual Authentik configuration is needed in any later phase.**

> Native login is disabled on the apps in Phases 7–8, so SSO is the only way in. `akadmin`'s membership in every admin group is what guarantees you always land with full privileges. Add your real users to these groups (Directory → Groups) once you've created them.

---

## 10. Phase 7 — Harbor (container registry)

### 10.1 The admin password is already seeded

`HARBOR_ADMIN_PASSWORD` was generated by the seeder in Phase 5 and lives in Infisical (prod, `/harbor`); ESO renders it into the `harbor-bootstrap` Secret. You only need it for the local `admin` break-glass account — read it with:

```bash
kubectl -n harbor get secret harbor-bootstrap \
  -o jsonpath='{.data.HARBOR_ADMIN_PASSWORD}' | base64 -d; echo
```

### 10.2 Wait for sync (~6 min for first run)

Harbor brings up many components (postgres, redis, core, registry, jobservice, trivy, portal). Watch the `harbor` Application in Argo. PVCs total ~62 Gi.

```bash
kubectl -n harbor get pods       # ~10 pods, all Running
kubectl -n harbor get certificate # harbor-tls Ready=True
```

### 10.3 Log in

Browse to **<https://harbor.atlas.laucoin.fr>**. Once SSO is configured (§10.5, automatic) the page offers **Login via OIDC Provider** → Authentik. The local `admin` (password from §10.1) remains as break-glass below that.

### 10.4 Smoke test — push and scan an image

```bash
docker login harbor.atlas.laucoin.fr -u admin
# password from Infisical

docker pull alpine:latest
docker tag alpine:latest harbor.atlas.laucoin.fr/library/alpine:latest
docker push harbor.atlas.laucoin.fr/library/alpine:latest
```

In the Harbor UI: Projects → library → alpine → click the tag → **Scan**. Trivy returns CVE results within 1–2 minutes.

### 10.5 Harbor SSO (automatic)

Nothing to click. Harbor's SSO is wired end to end by GitOps:

- The Authentik side (the `registry-provider` OAuth2 provider + `harbor` application + `groups` scope mapping) is created by the blueprint in Phase 6.
- `HARBOR_OIDC_CLIENT_ID`/`HARBOR_OIDC_CLIENT_SECRET` are seeded into Infisical and rendered into the `harbor-oidc` Secret by `apps/platform/harbor-oidc-externalsecret.yaml`.
- Harbor's own auth settings can't be set via Helm values, so `apps/platform/harbor-oidc-config.yaml` (an Argo Sync-hook Job) calls Harbor's API once it's up to set **auth mode = OIDC (primary)**, point it at `https://authentik.atlas.laucoin.fr/application/o/harbor/`, and map the `harbor-admins` group to Harbor admins (`oidc_auto_onboard` on).

Confirm it ran:

```bash
kubectl -n harbor get jobs
kubectl -n harbor logs job/harbor-oidc-config   # "Harbor OIDC configured (auth_mode=oidc_auth, primary)."
```

Users sign in via **Login via OIDC Provider**; the local `admin` stays as break-glass.

---

## 11. Phase 8 — Observability (Prometheus + Grafana + Loki)

### 11.1 Grafana's OIDC client (automatic)

Nothing to do. The `observability-provider` OAuth2 provider + `grafana` application (redirect URI `https://grafana.atlas.laucoin.fr/login/generic_oauth`) are created by the Authentik blueprint in Phase 6, and Grafana's OIDC settings are baked into the chart values in `apps/observability/kube-prometheus-stack.yaml`.

### 11.2 Grafana secrets (already seeded)

`GRAFANA_ADMIN_USER` (`admin`), `GRAFANA_ADMIN_PASSWORD` (break-glass), `GRAFANA_OIDC_CLIENT_ID` and `GRAFANA_OIDC_CLIENT_SECRET` were all generated by the seeder in Phase 5 and live in Infisical (prod, `/grafana`). ESO renders them into the `grafana-bootstrap` Secret. Read the break-glass password if you ever need it:

```bash
kubectl -n monitoring get secret grafana-bootstrap \
  -o jsonpath='{.data.admin-password}' | base64 -d; echo
```

### 11.3 Wait for sync (~8 min for first run)

This is the heaviest sync of the platform — kube-prometheus-stack alone pulls Prometheus, Alertmanager, Grafana, kube-state-metrics, node-exporter, prometheus-operator. Loki + Promtail come up alongside.

```bash
kubectl -n monitoring get pods       # ~10 pods
kubectl -n monitoring get certificate # grafana-tls Ready=True
kubectl get externalsecret -n monitoring grafana-bootstrap   # SecretSynced
```

### 11.4 Verify

Browse **<https://grafana.atlas.laucoin.fr>**:

- The login form is disabled and `auto_login` is on, so you're redirected **straight to Authentik** → land in Grafana. Members of `grafana-admins` (which includes `akadmin`) get the Admin role; everyone else is a Viewer.
- Break-glass: the local `admin` form is hidden. To use it when Authentik is down, temporarily set `auth.disable_login_form: false` in `apps/observability/kube-prometheus-stack.yaml` (or hit the Grafana API), then log in with `admin` + `GRAFANA_ADMIN_PASSWORD` (§11.2).

Inside:

1. **Explore → Prometheus** → run `group by (job) (up)` to list the scrape jobs, then confirm `up == 1` for `traefik`, `harbor-exporter`, `authentik-server`, and `argocd-server-metrics`. (The `job` label is the Kubernetes _Service_ name, not the app name, so these ServiceMonitors surface as the service — e.g. `authentik-server`, not `authentik` — since none set a `jobLabel`.)
2. **Explore → Loki** → query `{namespace="authentik"}` → real log lines.
3. **Dashboards → Browse** → the bundled **Node Exporter / Nodes**, **Kubelet**, and **Kubernetes / API server** dashboards have data.

### 11.5 Argo CD SSO (automatic, plus optional hardening)

Argo CD SSO is wired the same way as the others, with no UI step:

- The `cd-provider` OAuth2 provider + `argo-cd` application (redirect URI `https://argo.atlas.laucoin.fr/auth/callback`) are created by the Authentik blueprint in Phase 6.
- `ARGOCD_OIDC_CLIENT_ID`/`ARGOCD_OIDC_CLIENT_SECRET` are seeded into Infisical and materialized into the `argocd` namespace by `apps/observability/argocd-oidc-externalsecret.yaml` (the `app.kubernetes.io/part-of: argocd` label is load-bearing — Argo CD only resolves `$argocd-oidc:*` references from Secrets carrying it).
- `bootstrap/argo/main.tf` already references those values in its `oidc.config`. So SSO lights up automatically as soon as ESO materializes the Secret — no extra `tofu apply` is needed just to enable OIDC.

> Ordering: Argo CD is bootstrapped in Phase 4, but ESO/Infisical only come up in Phase 5. Until the `argocd-oidc` Secret exists the `$argocd-oidc:*` references don't resolve, so OIDC simply stays dormant and the local `admin` keeps working. Once ESO materializes the Secret, SSO lights up on the next config reload. Members of the `argocd-admins` group (which includes `akadmin`) get the admin role.

**Optional hardening — disable the local admin (force SSO).** Once you've confirmed an `akadmin` SSO login works in Argo CD, set `disable_local_admin = true` in `bootstrap/argo/terraform.tfvars` and re-run `tofu apply` in `bootstrap/argo/`. This removes the username/password form so the only way in is Authentik. **Do this only after SSO is verified** — otherwise you lock yourself out until OIDC works. Re-enabling it (set back to `false`, re-apply) is the break-glass recovery path. This is one of the few cases where you'd ever touch `bootstrap/` again after Phase 4.

---

## 12. Phase 9 — Velero (backups + disaster recovery)

### 12.1 Provision an offsite bucket (one-time)

Per §2.4 — pick a provider, create a bucket (e.g. `atlas-backups`), create scoped access creds. Note: bucket name, region, and the S3 endpoint URL (e.g. for Backblaze B2: `https://s3.us-east-005.backblazeb2.com`).

### 12.2 Edit `apps/platform/velero.yaml`

Replace the three placeholders:

```yaml
bucket: REPLACE_ME_BUCKET_NAME # e.g. atlas-backups
region: REPLACE_ME_REGION # e.g. us-east-005
s3Url: REPLACE_ME_S3_URL # e.g. https://s3.us-east-005.backblazeb2.com
```

(`region` appears twice — once under `backupStorageLocation`, once under `volumeSnapshotLocation`. Replace both.)

Commit and push.

### 12.3 Populate Velero S3 creds in Infisical

In the Infisical UI (prod, `/velero` folder) — these are the only secrets the seeder doesn't generate:

- `VELERO_S3_ACCESS_KEY` = the bucket access key
- `VELERO_S3_SECRET_KEY` = the bucket secret key

The `ExternalSecret` `velero-credentials` renders these into the `cloud` key in AWS credentials-file format that the Velero chart expects.

### 12.4 Wait for sync

```bash
kubectl -n velero get pods       # velero + node-agent DaemonSet, all Running
kubectl -n velero get externalsecret velero-credentials   # SecretSynced
```

### 12.5 Trigger a backup manually

```bash
velero backup create test-backup \
  --include-namespaces='*' \
  --wait
# … Backup completed with status: Completed.
```

Verify in your bucket — there's now an `atlas-backups/backups/test-backup/` folder with the manifest tarball + per-volume restic chunks.

The `Schedule` `nightly-full` runs every night at 03:00 with 30-day retention.

### 12.6 You're done with the install

Everything Atlas promises is now live:

- A Kubernetes cluster on a single bare-metal node, declared in OpenTofu and reconciled by Argo.
- TLS-protected hostnames for every service via Let's Encrypt + HTTP-01.
- SSO via Authentik on every service that's been wired.
- Secrets in Infisical, materialized into Kubernetes by ESO.
- Container registry with vuln scanning at `harbor.atlas.laucoin.fr`.
- Metrics + logs + dashboards at `grafana.atlas.laucoin.fr`.
- Nightly offsite backups via Velero, restorable to a fresh VM.

Two optional applications ship in the repo on top of this core — **SonarQube** and **Home Assistant** (Phase 10). Skip them if you don't want them; the platform is complete without them.

---

## 13. Phase 10 — Optional applications (SonarQube + Home Assistant)

These two ship in the repo but are **extras** layered on top of the core platform — the install above is complete without them. Both follow the standard "drop a file under `apps/`, Argo reconciles" flow (§14.3), but each has a couple of specifics worth calling out. **Neither uses Authentik SSO** (see the per-app notes for why), so both keep their own native login.

### 13.1 SonarQube (code quality)

SonarQube needs a PostgreSQL database and a kernel tweak for its embedded Elasticsearch. Both are already wired — there's nothing to create by hand:

- **Database via CloudNativePG.** `apps/infra/cloudnative-pg.yaml` installs the CloudNativePG operator (namespace `cnpg-system`, `ServerSideApply=true` because its CRDs exceed Argo's client-side annotation limit — same reason as ESO in Phase 5). `apps/platform/sonarqube-postgres.yaml` then declares a one-instance `Cluster` named `sonarqube-postgres`; the operator generates the `sonarqube-postgres-app` Secret (user + password for the `sonarqube` role/database), which SonarQube consumes via `jdbcOverwrite`.
- **`vm.max_map_count=524288` is set on the node, not in a privileged init container.** SonarQube's bundled Elasticsearch refuses to start below that. Rather than grant the namespace `privileged` Pod Security just for the chart's `initSysctl` container, the value is baked into the Talos machine config (`bootstrap/talos/patches/common.yaml.tftpl`, under `machine.sysctls`), so the namespace stays under the cluster-wide `baseline` PSS and the chart runs with `initSysctl.enabled: false`. **If you installed Talos before this sysctl patch existed, re-run Phase 2 (`tofu apply` in `bootstrap/talos`)** — otherwise the Elasticsearch pod crash-loops with a `max_map_count` error.
- **Monitoring passcode from Infisical.** The seeder generated `SONARQUBE_MONITORING_PASSCODE` in the `/sonarqube` folder back in Phase 5; ESO renders it into the `sonarqube-monitoring` Secret (`apps/platform/sonarqube-externalsecret.yaml`), and the chart's PodMonitor presents it as the Bearer token to `/api/monitoring/metrics`.

Wait for the sync, then verify:

```bash
kubectl -n cnpg-system get pods                 # cloudnative-pg operator Running
kubectl -n sonarqube get cluster                # sonarqube-postgres → healthy
kubectl -n sonarqube get pods                   # postgres + sonarqube, all Running
kubectl -n sonarqube get certificate            # sonarqube-tls Ready=True
```

Browse **<https://sonarqube.atlas.laucoin.fr>** and log in with the default `admin` / `admin`; SonarQube forces a password change on first login. It uses its **own native login** — Community Build's SSO isn't wired here, so there's no Authentik redirect. The bundled Grafana dashboard for it is gnetId **17641**.

### 13.2 Home Assistant (home automation)

Home Assistant comes up as a brand-new `home` category — the ApplicationSet's directory generator sees `apps/home/` and creates a top-level `home` Application automatically (no edit to `applicationset.yaml`).

- **Native login, by design.** HA has no usable OIDC, and putting it behind Traefik forward-auth breaks its companion mobile apps and API — so it keeps its own login. You create the owner account in the HA onboarding wizard on first visit.
- **It sits behind the in-cluster Traefik proxy**, so `apps/home/home-assistant.yaml` sets `http.use_x_forwarded_for: true` + `trusted_proxies` (the private cluster CIDRs). Without that HA rejects every proxied request with `400 Bad Request`.
- **Metrics need a one-time token.** HA's Prometheus endpoint (`/api/prometheus`) is guarded by a long-lived access token that can only be minted in the UI after first boot. Until you create the Secret, the ServiceMonitor target stays down and the Grafana dashboard (gnetId 15832) is empty:

  ```bash
  # In the HA UI: your profile → "Long-lived access tokens" → Create token, then:
  kubectl -n home-assistant create secret generic home-assistant-prometheus \
    --from-literal=token=<LLAT>
  ```

Verify and onboard:

```bash
kubectl -n home-assistant get pods               # home-assistant Running
kubectl -n home-assistant get certificate        # home-assistant-tls Ready=True
```

Browse **<https://home-assistant.atlas.laucoin.fr>** and complete the onboarding wizard.

---

## 14. Day-to-day usage

### 14.1 Push your first image to Harbor

```bash
# Create a project in the Harbor UI (Projects → New Project: "personal").
# Then in a Robot Account (Project → Robot Accounts → New), get a token.

docker login harbor.atlas.laucoin.fr -u 'robot$personal+ci' -p <token>
docker tag my-app:dev harbor.atlas.laucoin.fr/personal/my-app:0.1.0
docker push harbor.atlas.laucoin.fr/personal/my-app:0.1.0
```

To pull from inside the cluster, no extra trust step is needed — containerd already trusts the Let's Encrypt cert via the OS CA bundle.

### 14.2 Store and consume a secret

Atlas keeps one Infisical folder per service, so a new app gets its own folder and its own `ClusterSecretStore` scoped to it.

1. **In the Infisical UI** — create a folder `/my-app` (prod) and add your keys (`DATABASE_URL=postgres://…`, `API_KEY=…`).

2. **Add a store for that folder** to `apps/infra/clustersecretstore.yaml` (copy any existing block, change the name + `secretsPath`):

   ```yaml
   apiVersion: external-secrets.io/v1
   kind: ClusterSecretStore
   metadata:
     name: infisical-my-app
   spec:
     provider:
       infisical:
         auth:
           universalAuthCredentials:
             clientId:
               {
                 name: infisical-credentials,
                 key: clientId,
                 namespace: external-secrets,
               }
             clientSecret:
               {
                 name: infisical-credentials,
                 key: clientSecret,
                 namespace: external-secrets,
               }
         secretsScope:
           { projectSlug: atlas, environmentSlug: prod, secretsPath: /my-app }
         hostAPI: http://infisical-infisical-standalone-infisical.infisical.svc.cluster.local:8080
   ```

3. **Reference it** from an `ExternalSecret` in your app:

   ```yaml
   apiVersion: external-secrets.io/v1
   kind: ExternalSecret
   metadata:
     name: my-app
     namespace: my-app
   spec:
     refreshInterval: 1m
     secretStoreRef:
       name: infisical-my-app
       kind: ClusterSecretStore
     target:
       name: my-app
       creationPolicy: Owner
     dataFrom:
       - find: {}
   ```

`find: {}` pulls every key in the folder; or list them explicitly under `data:` like the app ExternalSecrets in this repo.

Commit, push — within Argo's sync interval (3 min by default) the Secret appears in your namespace.

### 14.3 Deploy a new application

Two options.

**Option A — drop a file under an existing category.** Easiest path:

1. Create `apps/platform/my-app.yaml` as an Argo `Application` (mirror the pattern in `apps/platform/harbor.yaml`).
2. `git add apps/platform/my-app.yaml && git commit -m "feat: my-app" && git push`.
3. The `platform` Application sees the new file at its next sync and creates the `my-app` Application. Within ~3 min you have a running app.

**Option B — add a whole new category.**

1. `mkdir apps/games && touch apps/games/some-game.yaml` (and write the Application).
2. Push.
3. The `ApplicationSet`'s git directory generator sees the new directory and creates a new top-level category Application `games` automatically. No edits to `apps/_root/applicationset.yaml` needed.

### 14.4 Add a custom Grafana dashboard

Create a ConfigMap with a JSON dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1" # picked up by the sidecar
data:
  my-dashboard.json: |
    { ... Grafana dashboard JSON ... }
```

Commit, push. The Grafana sidecar polls for `grafana_dashboard=1` labeled ConfigMaps across all namespaces and live-loads them.

### 14.5 Add SSO to a new service

It's all GitOps now — no Authentik UI clicking. Keep each service's secrets in its own folder:

1. **Add the provider + application to the blueprint** — copy one of the three blocks in `apps/identity/authentik-blueprints.yaml`, change the name/slug/redirect-URI, and reference `!Env <SERVICE>_OIDC_CLIENT_ID` / `!Env <SERVICE>_OIDC_CLIENT_SECRET`. (Add a `<service>-admins` group too if you want group-based roles.)
2. **Seed the two OIDC keys into the service's folder** — add `ensure /<service> <SERVICE>_OIDC_CLIENT_ID …` lines to `apps/platform/infisical-seeder.yaml` (or set them by hand in the Infisical UI).
3. **Wire both sides via ESO** — add a `ClusterSecretStore` for `/<service>` (§14.2), an `ExternalSecret` in the service's namespace for the app to consume, and an `authentik-oidc-<service>` `ExternalSecret` (in the `authentik` namespace, reading the same folder) listed in `authentik.yaml`'s `global.envFrom` so the blueprint's `!Env` resolves.
4. Commit, push. The seeder runs, ESO syncs both sides, the blueprint creates the provider — done.

> **Infisical itself stays on native login.** Infisical's SSO/OIDC is a paid (Infisical Cloud / Enterprise) feature, so it is intentionally left on its built-in username/password auth in this stack. If you hold an Infisical license, add the OIDC/SAML config to `apps/platform/infisical.yaml` Helm values.

---

## 15. Disaster recovery drill

You should rehearse this **before** you put real data on Atlas, ideally on a throwaway VM. The drill proves your platform is _rebuildable_, not just _backed up_.

### 15.1 What you need to have safely off-machine

- The three `terraform.tfstate` files (`bootstrap/talos`, `bootstrap/baseline`, `bootstrap/argo`).
- The `infisical-bootstrap` Secret values (`ENCRYPTION_KEY`, `AUTH_SECRET`).
- The `infisical-credentials` Secret values (`clientId`, `clientSecret`).
- The `infisical-seeder-credentials` Secret values (`clientId`, `clientSecret`).
- Access to the offsite Velero bucket.

### 15.2 The drill

Spin up a clean VM (or use a different physical node) and walk through:

1. Restore the three `terraform.tfstate` files into the matching paths.
2. **Re-run Phase 2**: `cd bootstrap/talos && tofu apply`. Talos installs onto the new disk; a new `kubeconfig` and `talosconfig` appear at the repo root.
3. **Re-run Phase 3**: `cd ../baseline && tofu apply`. cert-manager, MetalLB, local-path land.
4. **Re-run Phase 4**: `cd ../argo && tofu apply`. Argo comes up; root and category Applications appear.
5. **Re-create the three out-of-band Secrets**: `infisical-bootstrap`, `infisical-credentials`, and `infisical-seeder-credentials`. Argo brings up Infisical and ESO; the seeder re-runs but, because Velero restores the original Infisical database (next steps), it finds every key already present and creates nothing — so no value is rotated. Every ExternalSecret reconciles from the restored Infisical data.
6. Wait for `velero` to be Synced/Healthy.
7. List backups:

   ```bash
   velero backup get
   # NAME                   STATUS      CREATED
   # nightly-full-…20260613  Completed   …
   ```

8. Restore everything:

   ```bash
   velero restore create --from-backup nightly-full-…20260613
   ```

9. Verify: Authentik users log in, Harbor projects + images are there, Grafana dashboards still have history, etc.

Total RTO target: under an hour, dominated by image pulls.

---

## 16. Troubleshooting

| Symptom                                                                                                                                                                                      | Likely cause                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tofu apply` in `bootstrap/talos/` fails with "context deadline"                                                                                                                             | Node IP unreachable, or Talos isn't in maintenance mode                                                                                                                                                                                   | Confirm `ping <node-ip>` works; reboot the node into the Talos installer                                                                                                                                                                                                                       |
| `tofu apply` in `bootstrap/baseline/` fails on `kubernetes_*`                                                                                                                                | `kubeconfig` at repo root is missing or pointing at the wrong cluster                                                                                                                                                                     | Re-export `KUBECONFIG=./kubeconfig` from the repo root                                                                                                                                                                                                                                         |
| Argo `root` Application: "repository not found"                                                                                                                                              | `repo_url` in `bootstrap/argo/terraform.tfvars` is wrong or the repo is private                                                                                                                                                           | Fix URL; or in Argo UI add a repository credential (Settings → Repositories)                                                                                                                                                                                                                   |
| AppSet-generated Applications never appear                                                                                                                                                   | `apps/_root/applicationset.yaml` still has `CHANGEME`                                                                                                                                                                                     | Replace both `repoURL`s with the real URL, commit, push                                                                                                                                                                                                                                        |
| Cert stuck `Ready: False` for >5 min                                                                                                                                                         | HTTP-01 challenge can't reach the cluster from the internet                                                                                                                                                                               | Check: `*.atlas.<domain>` actually resolves to your public IP; router really NATs :80 to the node; node Traefik listens on :80; LE can hit `http://<host>/.well-known/...`                                                                                                                     |
| Authentik pods stuck `Pending` / `CreateContainerConfigError`, or CrashLoop "AUTHENTIK_SECRET_KEY is required"                                                                               | The `authentik-bootstrap` Secret doesn't exist yet — ESO hasn't created it because the seeder hasn't populated the `AUTHENTIK_*` keys in Infisical, or the ClusterSecretStore isn't `Ready`                                               | Check the chain: `kubectl get clustersecretstore` (all Ready?), `kubectl -n infisical logs job/infisical-seeder` (keys created?), `kubectl -n authentik get externalsecret` (SecretSynced?). Fix the first broken link — the rest self-heals                                                   |
| **Every** PVC stuck `Pending`; all StatefulSets cluster-wide (Postgres, Redis, Prometheus, Loki…) won't schedule                                                                             | local-path's volume **helper pod** mounts a `hostPath`, which Talos' cluster-wide `baseline` Pod Security Standard rejects — so no volume ever provisions                                                                                 | Ensure the `local-path-storage` namespace is labeled `pod-security.kubernetes.io/enforce=privileged` (the `kubernetes_labels` resource in `bootstrap/baseline/main.tf`), then `kubectl -n local-path-storage rollout restart deploy/local-path-provisioner` so it retries the give-up'd claims |
| Harbor pods stuck `Pending`                                                                                                                                                                  | A PVC failed to bind (often: not enough disk on the local-path host path)                                                                                                                                                                 | `kubectl -n harbor describe pvc` — free disk on the node or reduce PVC sizes in `apps/platform/harbor.yaml`                                                                                                                                                                                    |
| External Secrets operator CrashLoopBackOff; `kubectl get crd \| grep secretstore` is empty; operator log says `no matches for kind "ClusterSecretStore" in version "external-secrets.io/v1"` | Argo applied the CRDs client-side and the `secretstores`/`clustersecretstores` CRDs exceeded the 256 KiB annotation limit, so they never installed                                                                                        | Add `ServerSideApply=true` to the `external-secrets` Application's `syncOptions` in `apps/infra/external-secrets-operator.yaml`, then re-sync (Argo UI → Sync, or `kubectl -n argocd patch app external-secrets`)                                                                              |
| Authentik server CrashLoopBackOff with `fe_sendauth: no password supplied` (but Postgres is `Running`)                                                                                       | The Postgres volume was initialised on a first boot where `authentik-bootstrap` lacked `AUTHENTIK_POSTGRESQL__PASSWORD` (e.g. it raced ahead of the seeder)                                                                               | Confirm the seeder set the key (`kubectl -n infisical logs job/infisical-seeder`); then, on the already-initialised volume, delete the `data-authentik-postgresql-0` PVC once so Postgres re-inits from the now-present value (empty DB → no data loss)                                        |
| `infisical-seeder` Job failing / secrets never appear in Infisical                                                                                                                           | `infisical-seeder-credentials` missing or wrong, the `seeder` identity lacks write access on `prod`, or it isn't a member of the `atlas` project                                                                                          | `kubectl -n infisical logs job/infisical-seeder`; verify the secret exists and the `seeder` machine identity has read-write on the `atlas` project's `prod` env in the Infisical UI                                                                                                            |
| Authentik blueprint not applied (no Harbor/Grafana/Argo apps under Applications)                                                                                                             | The blueprint ConfigMap isn't mounted, or an `!Env`/`!Find` reference failed (e.g. OIDC key missing from `authentik-bootstrap`)                                                                                                           | `kubectl -n authentik logs deploy/authentik-worker \| grep -i blueprint`; confirm `blueprints.configMaps` lists `authentik-blueprints` and the six `*_OIDC_*` keys are in the `authentik-bootstrap` Secret                                                                                     |
| Harbor still shows the local login only (no "Login via OIDC Provider")                                                                                                                       | The `harbor-oidc-config` Job hasn't run or failed (Harbor not up yet, or `harbor-oidc` Secret missing)                                                                                                                                    | `kubectl -n harbor logs job/harbor-oidc-config`; ensure `harbor-oidc` ExternalSecret is `SecretSynced`, then let the Sync hook re-run (re-sync the `platform` app)                                                                                                                             |
| ExternalSecret `SecretSyncError`                                                                                                                                                             | The Infisical projectSlug/environmentSlug/secretsPath doesn't match `apps/infra/clustersecretstore.yaml` (e.g. the key is in a different folder than the store points at), the key name is wrong, or the `eso` identity lacks read access | `kubectl describe externalsecret <name>` — the exact API error is in the event log                                                                                                                                                                                                             |
| Grafana login loops                                                                                                                                                                          | Redirect URI in the Authentik provider doesn't match Grafana's (`https://grafana.atlas.laucoin.fr/login/generic_oauth`) — exact-string match                                                                                              | Fix the `redirect_uris` for `observability-provider` in `apps/identity/authentik-blueprints.yaml`; or fix `root_url` in `apps/observability/kube-prometheus-stack.yaml` if it diverges                                                                                                         |
| `docker push` to Harbor: "unauthorized"                                                                                                                                                      | You're logged in as a user with no project membership                                                                                                                                                                                     | Add yourself as Project Admin/Developer in the Harbor UI; or use a Robot Account                                                                                                                                                                                                               |
| LAN devices can't reach `authentik.atlas.laucoin.fr`                                                                                                                                         | Router doesn't do NAT hairpinning (loopback)                                                                                                                                                                                              | Enable hairpin NAT on the router; or run a local DNS override (Pi-hole / `/etc/hosts`) pointing the hostnames at the LAN IP                                                                                                                                                                    |
| Velero backup `PartiallyFailed`                                                                                                                                                              | A specific volume couldn't be backed up (e.g. exclusive-write lock)                                                                                                                                                                       | `velero backup describe <name> --details` — usually safe to retry; or annotate the pod with `backup.velero.io/backup-volumes-excludes` to skip it                                                                                                                                              |
| Argo "OutOfSync" forever on an LE-issued cert                                                                                                                                                | cert-manager rotates the Secret on renewal; the chart's hash differs from git                                                                                                                                                             | Add `ignoreDifferences` to the Application's spec for `kind: Secret` — or trust the selfHeal loop                                                                                                                                                                                              |
| SonarQube's Elasticsearch pod CrashLoopBackOff with `max virtual memory areas vm.max_map_count [65530] is too low`                                                                           | Talos was installed before the `vm.max_map_count` sysctl patch, so the node default is too low and `initSysctl` is disabled in the chart                                                                                                  | Confirm `vm.max_map_count: "524288"` is in `bootstrap/talos/patches/common.yaml.tftpl`, then re-run Phase 2 (`tofu apply` in `bootstrap/talos`) to push the updated machine config                                                                                                             |
| SonarQube stuck `Pending`/`CrashLoop` waiting on its DB                                                                                                                                      | The CloudNativePG operator or the `sonarqube-postgres` Cluster isn't up — the `sonarqube-postgres-app` Secret doesn't exist yet                                                                                                           | `kubectl -n cnpg-system get pods` (operator Running?), `kubectl -n sonarqube get cluster` (healthy?); the `SkipDryRunOnMissingResource` + selfHeal retries until the CNPG CRD is registered, so let it converge                                                                                |
| Home Assistant returns `400 Bad Request` behind the proxy                                                                                                                                    | HA doesn't trust the Traefik proxy's forwarded IP                                                                                                                                                                                         | Ensure `http.use_x_forwarded_for: true` and the cluster CIDRs are in `trusted_proxies` in `apps/home/home-assistant.yaml`                                                                                                                                                                      |
| Home Assistant Grafana dashboard (gnetId 15832) is empty / its scrape target is down                                                                                                         | The `home-assistant-prometheus` Secret holding the long-lived access token doesn't exist yet (it's a one-time manual step)                                                                                                                | Mint a long-lived access token in the HA UI (profile → Long-lived access tokens) and `kubectl -n home-assistant create secret generic home-assistant-prometheus --from-literal=token=<LLAT>`                                                                                                   |
| Talos `apply-config` fails: `static hostname is already set in v1alpha1 config`                                                                                                              | Talos ≥1.13 always emits a `HostnameConfig{auto: stable}` document, which collides with `machine.network.hostname`                                                                                                                        | Set the hostname via a `HostnameConfig{auto: off, hostname: …}` patch (`bootstrap/talos/patches/hostname.yaml.tftpl`) and drop `machine.network.hostname`. Keep `talos_version` ≥1.13                                                                                                          |
| Node boots but Talos API on :50000 is `connection refused` (no maintenance mode)                                                                                                             | The disk already holds Talos and the USB sets `talos.halt_if_installed`, so it halts before maintenance mode                                                                                                                              | Reboot from USB; at GRUB press `e` and remove the `talos.halt_if_installed` token from the kernel line, then boot                                                                                                                                                                              |
| `platform` app stuck `waiting for completion of hook …`; IngressRoutes/ExternalSecrets show `SyncFailed: no matches for kind`                                                                | The app synced before Traefik/ESO registered their CRDs, so those resources failed to apply; a pending Sync hook now blocks the retry                                                                                                     | The CRDs exist now — release the wedged operation so Argo re-syncs: `kubectl -n argocd patch app platform --type=json -p='[{"op":"remove","path":"/operation"}]'`                                                                                                                              |
| `ExternalSecret` `SecretSyncedError` although the key now exists in Infisical                                                                                                                | ESO is in a long backoff (or has a stale cache for a late-created auth secret)                                                                                                                                                            | Force it: `kubectl -n <ns> annotate externalsecret <name> force-sync=$(date +%s) --overwrite`; for a credentials-secret cache miss, `kubectl -n external-secrets rollout restart deploy/external-secrets`                                                                                      |
| SSO login fails on every app: `invalid_request: The request is otherwise malformed` (Authentik logs `Invalid grant_type for provider`)                                                       | Authentik 2026.x defaults `OAuth2Provider.grant_types` to `[]`                                                                                                                                                                            | Set `grant_types: [authorization_code, refresh_token]` on each `oauth2provider` in `apps/identity/authentik-blueprints.yaml` (the forward-auth proxy provider is unaffected)                                                                                                                   |
| Velero `node-agent` DaemonSet has 0 pods (`violates PodSecurity baseline: hostPath volumes`)                                                                                                 | node-agent mounts host pod volumes via hostPath, which baseline PSS forbids                                                                                                                                                               | Label the `velero` namespace `pod-security.kubernetes.io/enforce: privileged`                                                                                                                                                                                                                  |
| Velero `BackupStorageLocation` `Unavailable`: S3 `403 AccessDenied` on ListObjectsV2                                                                                                         | The S3 credentials authenticate but aren't authorized on the bucket (wrong region, or the user has no bucket policy/role)                                                                                                                 | On the S3 provider: confirm the bucket's region matches the endpoint, and grant the user a policy/role with list+read+write+delete on the bucket. The BSL re-validates ~every minute                                                                                                           |
| SonarQube web `Background initialization failed … Cannot create directory '/opt/sonarqube/extensions/downloads'`                                                                             | The chart's `init-fs` chowns data/temp/logs but not `extensions`, and local-path (hostPath) ignores `fsGroup`, so the dir stays root-owned                                                                                                | Add an `extraInitContainers` entry that `chown -R 1000:0 /opt/sonarqube/extensions` (see `apps/platform/sonarqube.yaml`)                                                                                                                                                                       |

---

## 17. (Optional) Add a node to the cluster

Atlas is single-node by default, but you can join extra **worker** nodes for more CPU/RAM. Workers reuse the cluster's existing machine secrets, so joining one never re-keys the cluster or disturbs the control plane.

> **Read the caveats first:**
>
> - **Storage is node-local.** The default `local-path` provisioner writes to a `hostPath` on whichever node a pod lands on. A PVC bound on the control plane is **not** reachable from a worker, and vice-versa. Stateful workloads (Postgres, Prometheus, Loki…) stay pinned to their original node. Adding a worker buys capacity for **stateless** workloads, not shared storage. (For shared storage you'd add a networked CSI like Longhorn — out of scope here.)
> - **One LoadBalancer IP.** MetalLB still advertises the single `lb_ip` via L2 from one node, so north-south traffic keeps entering through it — no extra router port-forwards needed.
> - The new machine needs a wired LAN connection and a pinned static IP (DHCP reservation), exactly like the control plane in Phase 0.

### 17.1 Boot the new machine

Flash and boot the Talos ISO exactly as in [Phase 2 §5.1](#51-flash-and-boot-the-talos-installer). From the console note the maintenance-mode IP, the install disk, and the NIC name.

### 17.2 Declare the worker (OpenTofu)

Edit `bootstrap/talos/terraform.tfvars` and add the node to `worker_nodes` (uncomment the example block):

```hcl
worker_nodes = [
  {
    hostname     = "atlas-w1"
    node_ip      = "10.0.0.11"
    install_disk = "/dev/nvme0n1"
    interface    = "eno1"
    cidr         = "10.0.0.11/24"
    gateway      = "10.0.0.1"
  },
]
```

### 17.3 Apply

```bash
cd bootstrap/talos
tofu apply
```

OpenTofu renders a **worker** machine config from the cluster's existing secrets and applies it to the new node (in maintenance mode). The node installs Talos to its disk, reboots, and its kubelet joins via the control-plane endpoint. There is **no** second `talosctl bootstrap` — bootstrap happens once, for the control plane only.

> Adding workers is non-destructive: the apply refreshes the control-plane node's config but changes nothing on it. Back up the updated `bootstrap/talos/terraform.tfstate` afterward.

### 17.4 Verify

```bash
kubectl get nodes
# NAME       STATUS   ROLES                  AGE   VERSION
# atlas      Ready    control-plane,worker   12d   v1.31.2
# atlas-w1   Ready    <none>                 90s   v1.31.2
```

Confirm scheduling lands on it:

```bash
kubectl run smoke --image=nginx --overrides='{"spec":{"nodeName":"atlas-w1"}}'
kubectl get pod smoke -o wide      # NODE column should read atlas-w1
kubectl delete pod smoke
```

### 17.5 Removing a worker

Drain and delete it from Kubernetes, then drop it from `worker_nodes` and re-apply:

```bash
kubectl drain atlas-w1 --ignore-daemonsets --delete-emptydir-data
kubectl delete node atlas-w1
# remove the entry from worker_nodes, then:
cd bootstrap/talos && tofu apply
```

Wipe the machine before reusing it elsewhere.

---

## Appendix A — file map

```text
.
├── bootstrap/
│   ├── talos/           # OpenTofu — Talos install
│   ├── baseline/        # OpenTofu — cert-manager, MetalLB, local-path-provisioner
│   └── argo/            # OpenTofu — Argo CD + root Application
├── apps/                # Continuously reconciled by Argo CD
│   ├── _root/
│   │   └── applicationset.yaml   # the fan-out
│   ├── infra/           # traefik, external-secrets, ClusterSecretStores, cloudnative-pg operator
│   ├── identity/        # authentik + forward-auth + authentik-* manifests + SSO blueprints
│   ├── platform/        # infisical (+ secret seeder), harbor (+ OIDC config), velero (+ schedule), sonarqube (+ CNPG db)
│   ├── observability/   # kube-prometheus-stack, loki, promtail, ServiceMonitors
│   └── home/            # home-assistant (+ cert, ingressroute, servicemonitor)
├── charts/              # placeholder — local Helm charts go here if you write any
├── kubeconfig           # generated by Phase 2 — gitignored, mode 0600
├── talosconfig          # generated by Phase 2 — gitignored, mode 0600
└── getting-started.md   # this file
```

## Appendix B — the out-of-band Secret inventory

These are the only secrets you create by hand. Everything else lives in Infisical.

| Secret                         | Namespace          | Created in | Reason it can't be in Infisical                                             |
| ------------------------------ | ------------------ | ---------- | --------------------------------------------------------------------------- |
| `infisical-bootstrap`          | `infisical`        | Phase 5    | Encrypts the Infisical DB itself; storing it in Infisical would be circular |
| `infisical-credentials`        | `external-secrets` | Phase 5    | The read-only (`eso`) identity ESO uses to reach Infisical — circular       |
| `infisical-seeder-credentials` | `infisical`        | Phase 5    | The read-write (`seeder`) identity used to populate Infisical — circular    |

All three stay manual forever. There is **no** manual `authentik-bootstrap` anymore — the seeder generates the Authentik keys in Infisical and ESO materializes the Secret automatically.
