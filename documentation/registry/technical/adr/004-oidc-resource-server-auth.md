# ADR 004 — Delegated authentication via OIDC (resource server + confidential client)

## Status

<Badge type="tip" text="Accepted" />

Amended by [ADR 013](/registry/technical/adr/013-cookie-session-transport), which changes how the browser carries
the issued tokens and adds `state` and PKCE to the authorization request. Everything below still holds.

## Context

The registry is multi-tenant and needs authentication. Building a local auth system — password store, hashing, resets, MFA, brute-force protection, session security — is a large, security-sensitive surface with no product value here.

## Decision

Delegate authentication to an **external OIDC provider** and keep **no local password store**. The provider issues JWTs; the backend plays two OAuth2 roles:

- **Resource server** — every request's JWT is validated against the provider's JWKS. Only four endpoints are public (login URL, logout URL, token, token refresh); everything else requires a valid JWT. CORS is restricted to a configured allowlist (`external.cors.urls`).
- **Confidential client** — for the login/refresh endpoints, the backend brokers the authorization-code and refresh-token exchanges **server-side**, so the **client secret never reaches the browser**.

On successful JWT validation, a custom converter maps the token to the local user: it looks the user up by OIDC subject, **refuses blocked and anonymized accounts**, **syncs changed profile fields** from the token, and **auto-provisions (JIT)** a new local user on first login, guarding against a duplicate email.

The provider is configured **generically** (JWKS / authorization / token / end-session URIs, client id, secret). The identity adapter package is named `keycloak`, but the provider is provider-agnostic — local development runs **Authentik**. The `keycloak` name is a known wart.

### Why delegate, and why server-side brokering

- **Not worth building or owning.** An IdP does credential storage, MFA, and session security better than this codebase would, and removes the highest-risk area from it.
- **Keep the secret off the browser.** Brokering the code/refresh exchange in the backend (confidential client) keeps the client secret server-side — a better posture than a public SPA client holding it.

::: warning This ADR originally read PKCE as the alternative to a confidential client
It is not. PKCE binds an authorization code to the client that requested it, protecting the code between the
redirect and the exchange; the client secret does nothing about that. The two are complementary, and
[ADR 013](/registry/technical/adr/013-cookie-session-transport) adds PKCE **alongside** the confidential client
kept here.
:::

## Consequences

### Positive

- **No credential storage to secure.** Hashing, resets, MFA, and session security are the provider's problem.
- **Single sign-on** across the platform; **zero-touch onboarding** via JIT provisioning.
- **The client secret stays server-side.**
- **Authorization stays local** — the provider proves *who*, the backend decides *what* ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)).

### Negative

- **Hard dependency on the IdP.** If it is down, nobody can log in — an accepted single point of failure.
- **The `keycloak` package name is misleading** — the provider is actually Authentik in dev and abstract in principle.
- **JIT provisioning needs care** — the converter must not create a second account for an existing email, or provision a blocked/anonymized identity.
- **Profile data is a copy** synced at login, so it can lag the provider between logins.

### Why not build local authentication

Full control and no runtime dependency on an external provider — but it re-implements a large security-critical surface and gives up SSO. The maintenance and risk cost outweighs the independence.
