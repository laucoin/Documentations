# ADR 010 — Harbor as image registry

## Status

Accepted

## Context

Atlas needs a private OCI registry to host the container images I build for personal projects. The open-source candidates considered were:

1. **Harbor** (CNCF graduated) — full-featured: web UI, projects/RBAC, vulnerability scanning (Trivy), image signing (Cosign), replication, garbage collection.
2. **Zot** — lightweight OCI-native registry, simpler, no built-in scanner.
3. **Distribution / `registry:2`** — the CNCF reference registry. Minimal: no UI, no scanning, no RBAC.
4. **Gitea Package Registry** — bundled with a Gitea (or Forgejo) instance. Adequate but requires also running Gitea.

The brief explicitly asks for an "open-source JFrog-style solution", which points squarely at Harbor.

## Decision

Use **Harbor**, deployed via the upstream Helm chart, behind Authentik OIDC for authentication.

## Consequences

### Positive

- **Closest OSS analogue to JFrog Artifactory** for container images. Web UI, projects, robot accounts, retention policies, garbage collection — all built-in.
- **Vulnerability scanning out of the box** via the Trivy scanner adapter. Every pushed image is automatically scanned; results appear in the UI.
- **OIDC integration with Authentik** ([ADR 008](./008-authentik-oidc)) lets users sign in with the platform's single SSO instead of a Harbor-specific password.
- **Project-level RBAC** keeps personal/family/guest images separated within a single Harbor instance — no need to deploy multiple registries.
- **CNCF graduated**, with a large enterprise install base. Long-term maintenance risk is low.
- **Replication is available** if Atlas later needs an off-site mirror.

### Negative

- **Significantly heavier than Distribution.** Harbor is ~10 deployments (core, registry, registry-controller, jobservice, portal, trivy, postgres, redis, etc.). For a single-node homelab the resource cost is non-trivial — expect ~1 GB RAM at idle.
- **Trivy scan database is large and frequently updated.** Disk usage grows, and updates can saturate a slow home connection if not throttled.
- **Robot account credentials are sensitive.** They must live in Infisical ([ADR 009](./009-infisical-secrets)), not in Git or in `~/.docker/config.json` for long.
- **Helm chart upgrades occasionally break.** Harbor's chart has historically had non-trivial upgrade notes; the GitOps repo must pin the chart version.

### Why not Zot or Distribution

Zot is a great fit for a registry-only use case and would consume a fraction of the resources Harbor does. The deciding factor was the JFrog-shaped requirement: a UI for users to browse projects, scanning, and per-project RBAC. Building those on top of Zot or Distribution would re-implement what Harbor already ships.

### Why not Gitea Package Registry

Gitea's registry is a good choice if Atlas already had a Git forge. It does not, and adding one only to get a registry would inflate scope. If a self-hosted Git forge becomes part of Atlas later, this ADR may be revisited.
