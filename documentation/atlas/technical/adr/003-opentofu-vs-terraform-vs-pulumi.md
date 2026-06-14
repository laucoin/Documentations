# ADR 003 — OpenTofu over Terraform and Pulumi

## Status

Accepted

## Context

The Atlas bootstrap (cluster creation, Argo CD install, initial secret seeding) needs an Infrastructure-as-Code tool. The three serious candidates were:

1. **Terraform** (HashiCorp) — the historical standard, but relicensed under BSL in 2023, removing the freedoms many open-source users relied on.
2. **OpenTofu** — the Linux Foundation fork of Terraform created in response to the BSL relicensing, MPL-2.0 licensed, drop-in compatible with Terraform's HCL.
3. **Pulumi** — IaC expressed in general-purpose languages (TypeScript, Python, Go). Different model, smaller provider ecosystem, more expressive code.

The bootstrap is intentionally small (just enough OpenTofu to install Argo CD and let it take over — see [ADR 004](./004-argocd-vs-flux)). The tool's footprint inside Atlas is tiny; the choice is mostly about licensing, longevity, and provider availability.

## Decision

Use **OpenTofu**.

## Consequences

### Positive

- **Truly open-source license (MPL-2.0).** No risk of a future relicensing affecting personal or commercial use. For a homelab whose entire value proposition is "no vendor lock-in", this matters.
- **HCL ergonomics for a small bootstrap.** The bootstrap is ~50 lines of declarative configuration: one Helm release, one secret, one Argo CD Application. HCL is the right tool; a full programming language (Pulumi) would be overkill.
- **First-class Talos and Kubernetes providers.** The `siderolabs/talos` provider and the upstream `hashicorp/kubernetes` and `hashicorp/helm` providers work unchanged on OpenTofu.
- **Linux Foundation governance.** Multi-vendor stewardship means no single company can change the rules unilaterally.
- **Drop-in migration path from Terraform.** If a future need arises to swap back, the `.tf` files are unchanged.

### Negative

- **Ecosystem still catching up on tooling.** Some third-party tools (Atlantis, Spacelift) have caught up; some niche tools still default to Terraform binaries.
- **Provider release lag.** OpenTofu sometimes ships provider updates a few days behind Terraform when HashiCorp publishes them.
- **Slightly smaller community knowledge base.** Stack Overflow answers are still mostly written for "Terraform"; in practice they apply unchanged.

### Why not Terraform

Using Terraform now means accepting that a future version may move further away from the open-source commons. For a platform whose entire point is to avoid vendor lock-in, this is the wrong direction of travel.

### Why not Pulumi

Pulumi is a great fit for IaC that is genuinely program-shaped (lots of loops, conditionals, dynamic resource counts). Atlas' bootstrap has none of that. Choosing Pulumi would mean carrying a Node.js (or Python) runtime, a `package.json`, and a state-management story for the sake of installing a single Helm chart. The HCL declarative style is the right impedance match for the scope.
