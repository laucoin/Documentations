# ADR 022 — Authentication topology under SSR: Nuxt as OIDC client / BFF, Spring as a standalone resource server

## Status

Accepted — the auth topology for the rewrite. **Amends [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)** — the confidential-client / token-brokering role moves to the Nuxt tier; Spring's resource-server role, JWT→user converter, JIT provisioning, and project-scoped RBAC are unchanged. Required by [ADR 012](/registry/technical/adr/012-ssr-rendering). The Phase-0 spike (see [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan)) de-risks the SSR + OIDC flow early in implementation.

## Context

Server-side rendering ([ADR 012](/registry/technical/adr/012-ssr-rendering)) needs the user's token available to the Nuxt server at render time, so token custody has to move off the browser. A *thin* BFF — where Spring keeps brokering the OIDC exchange and Nuxt merely stores the resulting tokens — works, but it splits token ownership awkwardly across two tiers and leaves it unclear which tier "owns" authentication.

Two principles resolve the split cleanly:

1. **Authentication and authorization are different concerns and belong in different tiers.** *Who you are* can be owned entirely by the web tier; *what you may do* must be enforced at the resource server, right next to the data.
2. **Authorization must stay in Spring for multi-tenant isolation.** Registry's authorization is database-driven, project-scoped RBAC ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)) — permission strings `"{projectId}_{PERMISSION}"`, the custom `PermissionEvaluator`, visibility gating — and that string-namespacing *is* the tenant-isolation mechanism. Moving it to a client would both duplicate it and make any direct path to Spring a cross-tenant breach.

A third, forward-looking requirement shapes the decision: **Spring should remain a standalone business API** that future clients ("bricks") — another BFF, a mobile app, a partner integration, a scheduled service — can consume without re-implementing security. That is only possible if Spring authenticates and authorizes **independently of any particular client**.

## Decision

Adopt a **full BFF**: the Nuxt server owns authentication end-to-end; Spring is a self-contained resource server.

**Nuxt (web tier) — owns authentication & browser security:**
- Acts as the **OIDC client**: builds the authorize URL, handles the callback, performs the authorization-code and refresh-token exchanges. The **client secret lives on the Nuxt server**, never in the browser.
- Owns the browser **session**: a `Secure`, `httpOnly`, `SameSite` cookie; server-side token storage; **token refresh**; and a **CSRF** defense (SameSite + synchroniser token on state-changing calls).
- Forwards the user's **IdP access token as `Authorization: Bearer`** when calling Spring.

**Spring (business API) — owns authorization, stays a resource server:**
- **Validates the forwarded JWT** against the IdP's JWKS (exactly as today) — it trusts the **IdP's signature**, not Nuxt.
- Runs the **JWT→user converter**, JIT provisioning, and blocked/anonymized checks unchanged.
- Enforces the **project-scoped RBAC** ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)) unchanged.
- **Drops the token-brokering endpoints** (`/authentication/login/uri`, `/logout/uri`, `/token`, `/token/refresh`) — those responsibilities move to Nuxt. This is where Spring becomes a cleaner, client-agnostic REST API.

**Network posture:**
- **Spring is not publicly exposed.** In production only the Nuxt tier (and infra: PostgreSQL, IdP JWKS egress, the metrics scraper) can reach it; the browser never calls Spring directly. Optional **mTLS / network policy** restricts callers to Nuxt.
- Network isolation is **defense in depth, layered *on top of* — never instead of** — Spring's JWT validation and RBAC. A private network does not license the resource server to trust its callers (zero trust).
- Because the browser no longer makes cross-origin calls to Spring, its **CORS allowlist shrinks to server-to-server** (or disappears).

```
[PUBLIC]  Browser ──(httpOnly session cookie)──▶ Nuxt server ──┐ OIDC client
[PUBLIC]  Browser ──(login redirect)──▶ IdP  ◀──(code/refresh, client secret)──┘
[PRIVATE] Nuxt ──(Bearer = user's IdP JWT)──▶ Spring resource server
[PRIVATE] Spring ──(validate JWT via JWKS)──▶ IdP
[PRIVATE] Spring ──(R2DBC)──▶ PostgreSQL
          Spring still: validate JWT · JWT→user / JIT · project-scoped RBAC
```

**Session persistence & horizontal scaling:**

Because the OIDC tokens and refresh state now live on the Nuxt tier, *how* that session is persisted determines whether Nuxt can scale out. Two options:

- **Stateless encrypted session cookie (default).** The session — access token, refresh token, expiry, and CSRF secret — is serialised, encrypted (AEAD, e.g. `iron`/`jose` with a server-held key), and carried entirely in the `Secure` / `httpOnly` / `SameSite` cookie. No server-side session state, so **any Nuxt instance can serve any request** — no sticky sessions, and blue/green or rolling cutovers need no session draining or shared infrastructure. The key must be shared across instances and rotated with an overlap window.
- **Shared session store (fallback).** Session records live in a central store (Redis/KeyDB); the cookie holds only an opaque session id. Chosen **only** when the cookie approach stops fitting — session payload approaching the ~4 KB cookie ceiling, or a hard requirement for **server-side revocation** (immediate logout-everywhere / token invalidation) that a stateless cookie can't satisfy short of expiry. It adds a stateful dependency to the web tier and must be highly available.

**Decision: stateless encrypted session cookie as the default**, since it keeps the Nuxt tier horizontally scalable and operationally simple for blue/green cutovers. Revisit for a shared store only if revocation or payload-size needs demand it. Cookie flags and the encryption/CSP posture align with the frontend security headers ([ADR 024](/registry/technical/adr/024-frontend-security-headers)).

**Phase-0 spike outcome (2026-07-25): the default holds, with a sizing correction.** Against local Keycloak, a single sealed cookie holding access + refresh + id tokens measured **5073 B > the ~4096 B ceiling** and the browser silently dropped it. Splitting the id_token (needed only for logout's `id_token_hint`) into a sealed **companion cookie** brought the main session to **3483 B** — both cookies safely under the limit — and the session demonstrably survived a Nuxt server restart (stateless property confirmed). The rewrite must keep this two-cookie split, assert cookie size at runtime, and treat a production IdP whose tokens exceed the budget as the trigger for the shared-store fallback.

## Consequences

### Positive

- **Clean separation.** Authentication + session security live only in Nuxt; authorization lives only in Spring. Each concern has exactly one home.
- **Tokens leave the browser.** Access/refresh tokens live in the Nuxt server session behind an httpOnly cookie — an XSS bug cannot exfiltrate them.
- **Spring becomes a reusable business API.** Because it authenticates and authorizes independently of any client, future bricks consume it by presenting an IdP token — no RBAC duplication, no redesign.
- **Smaller public attack surface.** Spring goes private; the browser talks only to Nuxt; the token-brokering endpoints and most of the CORS surface disappear.
- **Spring gets simpler.** It sheds the confidential-client role and its login endpoints, keeping only resource-server + domain responsibilities.

### Negative

- **Nuxt gains real responsibility.** The OIDC dance, server-side refresh, session storage, and CSRF are new web-tier code — and the Nuxt tier becomes a critical availability and security component.
- **The client secret moves to the Nuxt server.** Still server-side (never in the browser), but the web tier now holds it.
- **An extra hop** for client-originated calls (browser → Nuxt → Spring) and a hard dependency on the Nuxt tier for all API access.
- **Session-tier scaling is now a design constraint.** The stateless-cookie default keeps Nuxt horizontally scalable, but choosing the shared-store fallback later introduces a stateful, highly-available dependency (Redis/KeyDB) into the web tier.

### Why not the thin BFF (Spring keeps brokering)

Leaving Spring as the confidential client and having Nuxt merely store tokens is less backend rework, but it keeps token ownership split across both tiers, keeps Spring coupled to being the login broker, and leaves the "who owns auth?" ambiguity. Rejected in favour of a single clear owner per concern.

### Why not a no-auth internal Spring

Making Spring trust Nuxt and drop its own auth/authz would break multi-tenant isolation the instant anything reaches Spring directly, and would force every future brick to re-implement RBAC — the opposite of the reusable-business-API goal. Rejected; network privacy is added *around* Spring's own enforcement, not in place of it.
