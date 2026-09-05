# ADR 013 — Session tokens carried in HttpOnly cookies, with CSRF protection

## Status

<Badge type="warning" text="Proposed" />

Amends [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth), which stands in every other respect: authentication is still delegated to the OIDC provider, and the backend is still both a resource server and a confidential client. Only the way the browser *carries* the resulting tokens changes.

## Context

[ADR 004](/registry/technical/adr/004-oidc-resource-server-auth) settled where tokens come from but not where they live once the browser has them. In practice the SPA stores both the access token and the refresh token in `sessionStorage` and attaches the access token to every request as an `Authorization: Bearer` header.

That has two consequences worth naming.

**Any script running in the origin can read both tokens.** `sessionStorage` is reachable from JavaScript by design. A single successful XSS — in application code, or in any dependency of the Angular bundle — hands the attacker not just a short-lived access token but the refresh token, which is a renewable credential. No XSS sink exists in the application today, but the frontend also ships no Content-Security-Policy, so nothing constrains where a stolen token could be sent, and nothing raises the cost of injecting the script in the first place.

**The authorization-code flow carries no `state` and no PKCE.** The authorization URL is built from `response_type`, `client_id` and `redirect_uri` alone, and the callback component forwards whatever `code` it finds to `/authentication/token`. Nothing is carried across the redirect, so nothing can be compared on return: an attacker who holds a valid authorization code for their own identity can navigate a victim's browser to the callback and silently sign that victim into the attacker's account.

ADR 004 recorded that a public PKCE client was rejected in favour of server-side brokering. That reasoning conflated two separate things: **PKCE is not an alternative to a confidential client**. It protects the authorization code against interception and injection between the redirect and the exchange, which the client secret does nothing about. The two are complementary and are used together here.

## Decision

Move both tokens out of web storage and into cookies set by the backend, and protect the resulting ambient credentials with CSRF tokens.

### Cookies

| Cookie | Carries | `Path` | `SameSite` |
| ------ | ------- | ------ | ---------- |
| `registry_token` | Access token | `/` | `Lax` |
| `registry_refresh` | Refresh token | `/api/v1/authentication/token` | `Strict` |

Both are `HttpOnly` and `Secure`. The refresh cookie is confined to the refresh path so it is never sent on ordinary API traffic.

`Domain`, `Secure` and `SameSite` are configuration (`registry.security.cookie.*`), not constants. Registry is deployed once per tenant — the SPA at `registry.<tenant>` and the backend at `backend.registry.<tenant>` — so the domain differs per environment, and local development runs without TLS. Setting `Domain=registry.<tenant>` rather than `Domain=<tenant>` keeps the cookie off unrelated subdomains of the tenant.

### CSRF

Cookies are attached by the browser automatically, which is precisely the condition CSRF exploits — so CSRF protection, currently disabled, becomes required. Double-submit via `CookieServerCsrfTokenRepository`, with two deliberate exemptions:

- **Requests carrying an `Authorization` header.** A caller that sets its own header is not a CSRF victim; the browser never adds that header on a cross-site request. This is what keeps Swagger's *try it out* working.
- **`POST /api/v1/authentication/token`.** No session exists yet at that point; this step is protected by `state` instead.

`POST /api/v1/authentication/token/refresh` is **not** exempt: it is the endpoint that runs on an ambient credential.

Because the SPA and the API sit on different origins, Angular's built-in XSRF support does not apply — it only attaches `X-XSRF-TOKEN` to same-origin requests. The interceptor reads the cookie and sets the header itself.

### Token extraction

A `ServerAuthenticationConverter` reads `registry_token` and falls back to the standard bearer-header converter when the cookie is absent. The fallback is what lets Swagger, server-to-server callers and the retention scheduler keep using a header, and it also makes the migration safe: a backend deployed before the frontend still accepts the old header-based traffic.

### `state` and PKCE

The authorization URL gains `state`, `nonce`, `scope` and an S256 `code_challenge`, and is built through `UriComponentsBuilder` so `redirectUri` is encoded rather than concatenated. `redirectUri` is validated against the existing origin allowlist (`external.cors.urls`). The `state` and the PKCE `code_verifier` are held in short-lived `HttpOnly` cookies scoped to `/api/v1/authentication` — which keeps the backend stateless — and are checked when the code is exchanged.

## Consequences

### Positive

- **XSS can no longer steal a session.** There is nothing in web storage to read, and `HttpOnly` puts both cookies out of reach of script.
- **Login CSRF is closed.** `state` is OAuth's CSRF token, and its absence was the only real CSRF exposure in the system — disabling Spring's CSRF filter was, and remains, correct for header-based API traffic.
- **Code interception and injection are closed** by PKCE, alongside the confidential client rather than instead of it.
- **`SameSite` does most of the work.** Because the SPA and the API are same-site, the browser refuses to attach the cookies to genuinely cross-site requests; double-submit is defence in depth rather than the only line.

### Negative

- **CSRF tokens are now part of the contract.** Every mutating call needs `X-XSRF-TOKEN`, including the ~15 controller contract tests, and any future non-browser client must either send one or authenticate by header.
- **Same-site becomes a deployment constraint.** Splitting the SPA and the API across different registrable domains would force `SameSite=None`, which Safari and Firefox block as third-party cookies. The topology is now load-bearing.
- **The frontend has no automated tests**, so this migration — which is mostly a change in observable browser behaviour — is verified by build, lint and a manual script.
- **Two mechanisms coexist.** The header fallback is a second authentication path to keep in mind when reasoning about access, even though it grants nothing the cookie path does not.

### Alternatives rejected

- **Refresh token in a cookie, access token in memory only** (the OAuth 2.0 browser-app BCP shape). Materially less work — Swagger untouched, one test file to change instead of fifteen — and an XSS could then only steal a short-lived, non-renewable access token. Rejected because it still leaves a stealable credential, and loses the session on tab reload.
- **Leaving tokens in `sessionStorage` and adding a Content-Security-Policy.** A CSP is worth having regardless and is being added anyway, but it mitigates XSS rather than removing the prize; it does nothing about the missing `state`.
- **Serving the SPA from the backend** to make everything same-origin. It would delete the CORS configuration, make Angular's native XSRF support work, and allow `SameSite=Strict` throughout. Rejected for now as a larger change to the delivery topology than this decision needs, and it remains the natural follow-up if the clickjacking gap described in [Security](/registry/technical/security) has to be closed.
