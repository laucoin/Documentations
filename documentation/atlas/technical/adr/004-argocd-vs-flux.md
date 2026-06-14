# ADR 004 — Argo CD over Flux

## Status

Accepted

## Context

Atlas is GitOps-driven: after the OpenTofu bootstrap installs the GitOps controller, every other workload is deployed by reconciling the cluster against a Git repository. The two mature CNCF GitOps controllers are:

1. **Argo CD** — opinionated, ships with a polished web UI, the "app-of-apps" pattern is first-class.
2. **Flux v2** — modular CRD set (Source/Kustomize/Helm controllers), CLI-first, no built-in UI.

Both reconcile Git → cluster. The difference is shape and ergonomics, not capability.

## Decision

Use **Argo CD** with the "app-of-apps" pattern.

## Consequences

### Positive

- **The UI is a first-class artifact.** Drift, sync status, manifest diffs, last-sync errors are all visible in one place. For a one-person operator, "I open Argo CD and immediately see what's wrong" is enormous. Flux's equivalent (`flux get …` on the CLI) is functional but less inviting.
- **App-of-apps fits the bootstrap chain.** OpenTofu creates a single root `Application` resource; Argo CD reads it and creates every child Application from Git. This collapses the bootstrap to one HCL resource and zero Argo CD configuration in Tofu.
- **First-class OIDC integration with Authentik** ([ADR 008](./008-authentik-oidc)). Login flows and group-based RBAC are documented and supported by the Argo CD upstream.
- **Larger user base.** More tutorials, more Stack Overflow answers, more public Argo CD ApplicationSet examples to crib from.
- **Built-in support for Helm, Kustomize, and plain manifests in the same Application.** No need to choose a templating engine up-front.

### Negative

- **Heavier footprint than Flux.** Argo CD bundles a Postgres-less but stateful API server, repo server, application controller, and Redis. Flux is just a handful of controllers.
- **The UI is also a surface area to protect.** It must be behind Authentik + Traefik; without that, exposing the Argo CD UI to the internet would be a critical mistake.
- **App-of-apps cycles are easy to introduce.** A poorly-scoped root Application can pick up its own manifest and create infinite-recursion bugs. Solved by careful path scoping in the GitOps repo.
- **Less elegant for purely declarative environments**. Flux's CRD model composes more cleanly when there is no human consuming a UI. For Atlas there is a human (me); that tilts toward Argo CD.

### Why not Flux

Flux is excellent and arguably more "Kubernetes-native" in its design. But the operational ergonomics of Argo CD — particularly the UI and the app-of-apps pattern — pay back their cost on day one of running the platform alone. Flux is the right choice for fully-automated, no-human-in-the-loop fleets; Atlas is the opposite of that.
