# ADR 009 — Infisical as secret manager

## Status

Accepted

## Context

Atlas must keep secrets — API tokens, database passwords, OIDC client secrets — out of Git and out of plain-text Kubernetes manifests. The options were:

1. **SOPS + age** — secrets encrypted in Git, decrypted at deploy time. No runtime server.
2. **HashiCorp Vault** — the enterprise default. Powerful, audited, complex.
3. **Bitwarden / Vaultwarden + External Secrets Operator** — reuse a password manager I may already run.
4. **Infisical** — modern open-source secret manager with a clean web UI, lighter than Vault.

Whatever is picked needs to integrate with Kubernetes so workloads can pull secrets at runtime, and with my laptop so I can pull the same secrets when I run scripts locally.

## Decision

Use **Infisical** as the central secret store, with **External Secrets Operator (ESO)** syncing from Infisical into Kubernetes `Secret` resources.

## Consequences

### Positive

- **Clean web UI.** Browsing, adding, and rotating secrets is genuinely pleasant. For a homelab where the operator is also the only auditor, the UI doing the right thing matters more than a CLI-only flow.
- **CLI client for local use.** `infisical run -- ./my-script.sh` injects secrets into scripts on my laptop, removing `.env` files from disk.
- **OIDC SSO via Authentik** ([ADR 008](./008-authentik-oidc)) — no separate Infisical password.
- **Project and environment scoping.** Secrets are organized into projects and environments (`dev`/`prod`) with their own access tokens.
- **ESO integration is first-class.** An `InfisicalSecret` (or generic `ExternalSecret` with the Infisical provider) is a few lines of YAML.
- **Much lighter than Vault.** Postgres + Redis + a Node.js process. No unsealing rituals, no Raft quorum.

### Negative

- **Less battle-tested than Vault.** Infisical is younger; the long-term governance is a self-funded company. Mitigated by the fact that the data model is simple and migrating off is straightforward.
- **No dynamic secrets, no PKI engine, no transit encryption engine.** Vault's killer features for enterprise. Atlas does not need them.
- **The Infisical access token used by ESO is itself a bootstrap secret.** It must be created during the OpenTofu stage and stored as a Kubernetes Secret outside of GitOps' reach, otherwise the chicken-and-egg problem is unsolvable. Documented in [Bootstrap → L1](../bootstrap#l1-opentofu-seeds-plain-kubernetes-secrets).
- **One more Postgres to back up.** Restic snapshots include the Infisical DB dump.

### Why not SOPS + age

SOPS keeps secrets in Git encrypted, which sounds appealing. But it makes rotation painful (every rotation is a Git commit), it gives non-technical users no UI, and it requires every consumer (including my laptop) to know how to decrypt. The runtime server model is a better fit for "the platform serves multiple users".

### Why not Vault

Vault is the right answer for a workplace. It is overkill for a one-person homelab and demands ongoing operational attention (unsealing, key rotation, audit log review) that Atlas cannot justify. If Atlas grows beyond a homelab, this ADR should be revisited.

### Why not Vaultwarden

Vaultwarden is excellent at personal-password-manager use cases (browser autofill, sharing logins with family) but not designed for machine-to-machine secret retrieval from a Kubernetes operator. Different problem space.
