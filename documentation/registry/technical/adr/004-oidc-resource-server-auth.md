# ADR 004 — Delegated authentication via OIDC (resource server + confidential client)

## Status

Accepted

## Context

The registry is multi-tenant and needs authentication that is secure by default: credential storage, password hashing, MFA, session security, and single sign-on across the platform. Building and maintaining a local authentication system — a password store, reset flows, MFA enrolment, brute-force protection — is a large, security-sensitive surface that is easy to get subtly wrong and offers no differentiation for this product.

We wanted to offload identity to a dedicated provider while keeping the backend in control of authorization ([ADR 005](./005-db-driven-project-rbac)) and never exposing client secrets to the browser.

## Decision

Delegate authentication to an **external OIDC provider** and hold **no local password store**. The provider issues JWTs; the backend plays two OAuth2 roles:

- **OAuth2 resource server** — every request's JWT is validated against the provider's JWKS. Only the auth endpoints (login/logout URL, token, token refresh) are public; every other endpoint requires a valid JWT. CORS is restricted to a configured allowlist.
- **Confidential OAuth2 client** — for the login/refresh endpoints the backend brokers the authorization-code and refresh-token exchanges **server-side**, so the client secret never reaches the browser.

On successful JWT validation a **custom converter maps the token to the application user**. It:

- looks up the local user by **OIDC subject**;
- **blocks disabled/anonymized** accounts;
- **syncs changed profile data** from the token;
- **auto-provisions (JIT)** a new local user on first login, guarding against a duplicate email.

The provider is configured **generically**. The code names the provider bean "keycloak", but it is provider-agnostic — local development actually runs Authentik. (The generic-vs-"keycloak" naming is a known wart.)

## Consequences

### Positive

- **No credential storage to secure.** Password hashing, resets, MFA, and session security are the provider's responsibility, removing the highest-risk part of auth from this codebase.
- **Single sign-on.** Users authenticate once against the provider and reach the registry without a separate account.
- **The client secret never touches the browser.** Because the backend is a confidential client that brokers the code/refresh exchange server-side, the secret stays server-side — a materially better posture than a public SPA client.
- **Zero-touch onboarding.** JIT auto-provisioning creates the local user on first login, so there is no manual account-creation step.
- **Provider-agnostic configuration.** The OIDC config is generic, so the same code runs against Authentik in dev and any compliant provider elsewhere.
- **Authorization stays local.** The provider proves *who* you are; the backend still decides *what* you may do (see [ADR 005](./005-db-driven-project-rbac)), keeping tenant permissions under application control.

### Negative

- **Hard dependency on the IdP's availability.** If the provider is down, no one can log in. This is an accepted single point of failure for authentication.
- **The generic-vs-"keycloak" naming is misleading.** The bean and config are named after Keycloak but the provider is actually Authentik in dev and abstract in principle; new contributors reasonably assume Keycloak is required. A known wart to be cleaned up.
- **JIT provisioning needs careful duplicate-email handling.** Auto-creating a user from a token means the converter must defend against creating a second account for an email that already exists, and against provisioning disabled/anonymized identities.
- **Profile data is a copy synced at login.** Because the converter syncs profile fields from the token, the local copy can lag the provider between logins.

### Why not build local authentication

A local password store gives full control and removes the runtime dependency on an external provider. We rejected it because it re-implements a large, security-critical surface — hashing, resets, MFA, brute-force protection, session management — that a dedicated IdP already does better, and because it gives up single sign-on. The maintenance and risk cost outweighs the independence gained.

### Why the backend brokers the token exchange instead of a public SPA client

A public (PKCE, no-secret) client in the browser would remove the server-side brokering code entirely and is a legitimate modern pattern. We chose the confidential-client approach so the token exchange happens server-side and the client secret and refresh handling stay off the browser, at the cost of the login/refresh endpoints the backend must implement and maintain.
