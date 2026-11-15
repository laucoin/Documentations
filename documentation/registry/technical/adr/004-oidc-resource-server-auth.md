---
title: 'ADR 004 — Authentication delegated via OIDC (resource server + confidential client)'
description: 'Why authentication is delegated to an OIDC provider, with the backend as a confidential client.'
---

# ADR 004 — Authentication delegated via OIDC (resource server + confidential client)

## Status

<Badge type="tip" text="Accepted" />

## Context

The registry is multi-tenant and needs authentication. Building a local authentication system — password store, hashing, resets, MFA, brute-force protection, session security — is a large security-sensitive surface, with no product value here.

## Decision

Delegate authentication to an **external OIDC provider** and keep **no local password store**. The provider issues JWTs; the backend plays two OAuth2 roles:

- **Resource server** — each request's JWT is validated against the provider's JWKS. Only four authentication endpoints and the `/metadata` label lookups are public (sign-in URL, sign-out URL, token, token refresh; the sign-in and sign-out redirect URIs are checked against a configured allowlist); everything else requires a valid JWT. CORS is restricted to a configured allowlist (`EXTERNAL_CORS_URLS`).
- **Confidential client** — for the sign-in/refresh endpoints, the backend orchestrates the authorization code and refresh token exchanges **server-side**, so that the **client secret never reaches the browser**. The issued tokens are handed to the browser as `HttpOnly` cookies, and a stateless HMAC-derived CSRF token protects the state-changing calls that rely on them — see [Security](/registry/technical/security#cookie-based-session-csrf-protection).

After successful JWT validation, a custom converter maps the token to the local user: it looks the user up by OIDC subject, **refuses blocked accounts**, **syncs changed profile fields** from the token, and **automatically creates (JIT)** a new local user on first sign-in, guarding against a duplicate email.

The provider is configured **generically** (JWKS / authorization / token / end session / revocation URIs, client identifier, secret). The identity adapter package is `idp` — the provider is agnostic — and local development uses **Authentik**.

### Why delegate, and why server-side orchestration

- **It is not worth building or owning.** An IdP handles credential storage, MFA and session security better than this codebase would, and removes the riskiest area from it.
- **Keep the secret out of the browser.** Orchestrating the code/refresh exchange in the backend (confidential client) keeps the client secret server-side — a better posture than a public SPA client holding it, which is the main reason a public PKCE client was not used.

## Consequences

### Positive

- **No credential storage to secure.** Hashing, resets, MFA and session security are the provider's problem.
- **Single sign-on** across the whole platform; **zero-touch onboarding** via JIT provisioning.
- **The client secret stays server-side.**
- **Authorization stays local** — the provider proves _who_, the backend decides _what_ ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)).

### Negative

- **Strong dependency on the IdP.** If it is down, nobody can sign in — an accepted single point of failure, bounded on the backend by connection/response timeouts on every outbound call so that a stuck provider fails fast instead of hanging the request.
- **JIT provisioning needs care** — the converter must not create a second account for an existing email, nor provision a blocked identity.
- **Profile data is a copy** synced on sign-in, so it can lag behind the provider between two sign-ins.

### Why not build local authentication

Full control and no runtime dependency on an external provider — but it re-implements a large security-critical surface and gives up single sign-on. The maintenance and risk cost outweighs the independence.
