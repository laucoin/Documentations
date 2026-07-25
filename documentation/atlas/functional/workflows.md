# Workflows

These are the journeys Atlas exists to support. Each one is described from the actor's point of view, with the platform doing the work behind the scenes.

## W1 — A guest signs in for the first time

1. I create an account for the guest in Authentik and put them in the right group (for example `grafana-viewers`).
2. I send them the link to the application I want them to see, e.g. `grafana.<my-domain>`.
3. They open the link, get redirected to Authentik, type their credentials, and land back on the dashboard already logged in.
4. The next time they visit any Atlas service they have access to, they go straight in.

**Why this matters**: a single, professional-looking login flow for non-technical users; no per-app credential to lose.

## W2 — I push a container image

1. From my laptop I run `docker login harbor.<my-domain>` (or use a Harbor robot account credential stored in Infisical).
2. I tag and push my image: `docker push harbor.<my-domain>/personal/my-app:1.2.3`.
3. Harbor receives the image, scans it for known vulnerabilities, and shows the result in the UI within seconds.
4. The image is now pullable by the cluster (and by other machines I authorize) over HTTPS.

**Why this matters**: my images stay private, scanned, and signed; I do not depend on a third-party registry.

## W3 — I add a secret for a workload

1. I open Infisical at `infisical.<my-domain>` and sign in via Authentik.
2. I create or pick a project, then add a new secret (e.g. `STRIPE_API_KEY`) to the relevant environment.
3. In the cluster, an `ExternalSecret` resource references the Infisical project; External Secrets Operator pulls the value and creates a Kubernetes `Secret`.
4. The workload that mounts that secret restarts and picks up the new value automatically.

**Why this matters**: secrets live in one auditable place; they never appear in Git or in a shell history.

## W4 — I look at the health of the platform

1. I open Grafana at `grafana.<my-domain>` and sign in via Authentik.
2. The home dashboard shows me cluster CPU/RAM, disk usage, ingress traffic, and the status of every Argo CD application.
3. If anything is red, I drill into the relevant dashboard (per-workload, per-namespace) and check recent logs in the embedded Loki panels.
4. If an alert is firing, Alertmanager has already notified me; Grafana shows me which rule, when, and on which target.

**Why this matters**: I have one place to look when something feels off, instead of a dozen `kubectl` commands.

## W5 — I recover from a disk failure

1. I provision a new SSD (or a new machine) and re-run the OpenTofu bootstrap procedure documented in [Technical → Architecture](/atlas/technical/architecture).
2. Argo CD reinstalls every workload from Git within minutes.
3. I restore application data (Harbor blobs, Authentik database, Infisical database, Grafana dashboards, Prometheus history) from the latest Restic snapshot.
4. The platform is back online at the same URLs with the same data, modulo whatever happened between the last snapshot and the failure.

**Why this matters**: a hardware failure is an inconvenience, not a catastrophe. The bootstrap is the disaster-recovery plan.

## W6 — I deploy a new application to the platform

1. I add a new directory under `apps/` in the GitOps repository with the Helm chart or raw manifests for the application.
2. I add an entry to the Argo CD `app-of-apps` manifest pointing at it.
3. I commit and push.
4. Within the next sync interval, Argo CD picks up the new application and deploys it. If it depends on a public hostname, Traefik picks up the new `IngressRoute` and cert-manager issues a certificate.

**Why this matters**: adding a workload is a pull request, not a server-administration session.
