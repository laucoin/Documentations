# ADR 008 — Authentik as OIDC identity provider

## Status

Accepted

## Context

Every public-facing Atlas service (Grafana, Harbor, Infisical, Argo CD, Traefik dashboard) needs authentication. The options were:

1. **Per-app local accounts** — every service manages its own users and passwords.
2. **A central OIDC identity provider** that every service delegates to. Candidates:
   - **Authentik** — modern, OSS, polished UI, broad protocol support (OIDC, SAML, LDAP, forward-auth).
   - **Keycloak** — the long-standing enterprise OIDC server, JVM-based.
   - **Zitadel** — newer entrant, Go-based, multi-tenant.
   - **Dex** — minimal OIDC connector, no UI for end users.

Atlas serves a single-digit number of accounts but adds new applications often. Per-app accounts would become a credential-management mess immediately.

## Decision

Use **Authentik** as the central OIDC identity provider for every public Atlas service.

## Consequences

### Positive

- **One login screen for the platform.** Users see "Sign in to Atlas" once, then reach Grafana, Harbor, Infisical, Argo CD without re-entering credentials.
- **Broad protocol support.** OIDC for modern apps; forward-auth (Authentik's `auth_request`-style endpoint) for things that lack OIDC, like the Traefik dashboard ([ADR 005](/atlas/technical/adr/005-traefik-ingress)).
- **Polished end-user UX.** The login flow, MFA enrolment, and account settings UI are presentable to non-technical guests.
- **Group-based authorization** mapped into each downstream service. A user in the `grafana-viewers` group automatically gets the right Grafana role on first login.
- **Active open-source project** with frequent releases and good documentation.
- **Lighter resource footprint than Keycloak.** Authentik runs on Postgres + Redis + a Python worker; Keycloak adds a JVM.

### Negative

- **Single point of failure for the platform's UX.** If Authentik is down, every other public service is effectively down. Mitigated by Authentik's stability and by the fact that a hard outage on a homelab is acceptable.
- **One more Postgres to back up.** Authentik's state lives in Postgres; restoring it from Restic is a documented step in the [recovery workflow](/atlas/functional/workflows#w5-i-recover-from-a-disk-failure).
- **OIDC client secrets to manage.** Each downstream service needs a client ID/secret pair. These live in Infisical ([ADR 009](/atlas/technical/adr/009-infisical-secrets)) and are referenced via External Secrets.
- **Group → role mappings live in two places.** Authentik (the source of truth) and each app's config (the consumer). Drift between them is possible.

### Why not Keycloak

Keycloak is more battle-tested in enterprises and supports a wider feature surface (account federation, identity brokering at a deeper level). For a homelab those features are unused. The deciding factor was the operator experience: Authentik's UI is meaningfully nicer to use day-to-day and its resource footprint is smaller, which matters on a single node.

### Why not Zitadel or Dex

Zitadel is excellent but optimized for multi-tenancy that Atlas does not need. Dex has no end-user UI, which makes the "give a guest an account" workflow much harder.
