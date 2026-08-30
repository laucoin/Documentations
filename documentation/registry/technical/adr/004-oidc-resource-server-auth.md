# ADR 004 — OIDC resource server with backend-brokered token exchange

## Status

Accepted

## Context

Registry must not hold passwords. It needs federated sign-in through an external identity provider, and it needs the
resulting identity to carry into a stateless API that a browser SPA calls cross-origin.

The standard SPA pattern — a public OAuth2 client running Authorization Code with PKCE entirely in the browser — puts
the whole flow in JavaScript. The alternative is to keep the confidential-client role on the server, where a secret can
actually be kept.

There is also a provisioning question. Registry needs its own account row per user (for the global role, preferences and
profiles), but nobody wants to pre-create accounts before people can sign in.

## Decision

Run the backend as an **OAuth2 resource server** validating JWTs against the provider's JWKS, and make it **broker both
token exchanges** on the browser's behalf.

The backend exposes four public endpoints: build the authorize URL, build the end-session URL, exchange an authorization
code for tokens, and exchange a refresh token. The SPA performs the browser redirect and holds the resulting tokens, but
the **client secret never leaves the server**.

`TokenConverterService` converts each validated JWT into the principal, and **provisions on first sign-in**: look the
account up by OIDC subject; failing that, by email; failing that, create it with the configured default role. Personal
fields are refreshed from the token on every request, making the provider the source of truth for identity. Blocked and
anonymised accounts are refused here, before any endpoint is reached.

The provider is configured entirely through properties — issuer URLs, client credentials and the four claim names.

## Rationale & best practices

- **Security:** the OIDC client secret lives only on the server. Blocked and anonymised accounts are rejected at
  conversion, so a still-valid token cannot be used by a suspended account. Signature validation happens against the
  live JWKS on every request.
- **Operability:** no user provisioning step. Granting someone access to Registry means granting them access in the
  identity provider.
- **Portability:** the adapter speaks plain OAuth2. Local development runs Authentik; nothing binds the code to a
  specific product, despite the package being named `keycloak`.

## Consequences

- **Pros:** no passwords, no local credential storage, no session state to replicate. Account lifecycle follows the
  identity provider. Provider-agnostic and configuration-driven.
- **Cons / trade-offs:** the backend takes on a responsibility a pure resource server would not have, and the four
  brokering endpoints are public by necessity. Every request costs the database reads needed to rebuild the principal. A
  token stays valid until it expires, so a revoked profile is only enforced on the next request rather than instantly.
  Email-based account matching refuses sign-in when two accounts share an address — correct, but a support case when it
  happens. The `keycloak` package name misleads readers about what actually runs.
- **Alternatives rejected:** a public browser client with PKCE (no server secret to protect, but the entire flow and the
  refresh handling sit in JavaScript); a full BFF with server-side sessions and cookies (stronger token custody, but it
  makes the API stateful and couples the two sides far more tightly).
