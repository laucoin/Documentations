# ADR 019 — Backend security hardening (rate limiting, session/token policy, audit logging)

## Status

Accepted — Track A · A3 of the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan). Backend-scoped. The **frontend-delivery** security controls (Content-Security-Policy, cookie flags, CSRF, SSR response headers) are deliberately **out of scope here** — they live in the Nuxt tier and are specified in the frontend track after the Phase-0 spike (they depend on Ant Design Vue's SSR style handling). This ADR builds on the network posture from [ADR 022](/registry/technical/adr/022-ssr-auth-bff) and stays within the reactive constraints of [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc).

## Context

The backend's baseline is already reasonable — OIDC-delegated auth ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)), project-scoped RBAC ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)), distroless non-root images ([ADR 010](/registry/technical/adr/010-container-delivery-semantic-release)), secrets via environment. The gaps this ADR closes: there is **no rate limiting**, **no formal session/token lifetime policy**, and **no dedicated audit trail** for privileged actions. The RBAC model itself is trusted as-is (no re-audit in this pass), and step-up/MFA is deferred to the IdP.

Two facts from the migration reshape the threat model:

- After [ADR 022](/registry/technical/adr/022-ssr-auth-bff), **Spring is private and its only caller is the Nuxt BFF**; the browser never reaches it directly, and the token-brokering / login endpoints have moved to Nuxt. So classic login brute-force limiting is now a **Nuxt/IdP** concern, not the backend's.
- Every backend call carries a validated IdP JWT, so the backend can rate-limit and audit **per authenticated user** (`sub`), not just per IP.

## Decision

### 1 — Rate limiting (layered, reactive)

- **Edge tier** (ingress in front of Nuxt): coarse **per-IP volumetric** limits to shed floods and abusive clients before they reach the app. Infrastructure-level, no app code.
- **Backend tier** (Spring): fine-grained **per-user, per-endpoint** limits on **sensitive and expensive** operations — `anonymize`, `delete`, project `disable/enable`, membership changes, the `purge` jobs, and the trigram search/picker endpoints. Implemented with a **non-blocking, in-process** limiter (Bucket4j backed by Caffeine) so the WebFlux event loop is never blocked ([ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)) and no shared cache is required (consistent with the Caffeine-only decision in [ADR 018](/registry/technical/adr/018-backend-caching-db)). Backend limits are therefore **per-replica**; the **edge tier provides the global** volumetric limit. Over-limit returns `429 Too Many Requests` with a `Retry-After` header, rendered through the existing `RegistryControllerAdvice` as a localized `ErrorDto`.
- Keys derive from the JWT `sub` (falling back to IP for the few unauthenticated paths). Limits are **configurable per environment**.

### 2 — Network posture (from ADR 022)

Spring runs on a **private segment**, reachable only by the Nuxt tier plus its own egress (PostgreSQL, IdP JWKS, metrics scraper). An optional **mTLS / network policy** restricts callers to Nuxt. CORS shrinks to server-to-server. This is **defense in depth on top of** JWT validation + RBAC, never a substitute — the resource server keeps enforcing authz regardless of network origin (zero trust).

### 3 — API & transport headers

Even as a private JSON API: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on authenticated responses, and `server_tokens`/framework banner suppression. HSTS and CSP are **public-tier (Nuxt)** concerns and are specified there.

### 4 — Session & token policy

- **Short-lived access tokens** (target ≈ 5–15 min) and **longer refresh tokens** with **refresh-token rotation**; exact lifetimes are IdP-configured and environment-tunable.
- The **Nuxt BFF** enforces an **idle timeout** and an **absolute session lifetime**, refreshing access tokens server-side within those bounds and forcing re-login when they lapse.
- **Forced re-evaluation** on security-relevant changes: a blocked or anonymized account is already refused at JWT→user conversion ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)); role/permission changes take effect by the next token refresh. Logout **revokes the refresh token** and clears the BFF session.
- This item **straddles both tiers**: token lifetimes and idle/absolute limits are enforced in Nuxt; the backend continues to honor token expiry and account state on every call.

### 5 — Security audit logging

A dedicated, **append-only audit trail** — separate from ordinary application logs — records **privileged and security-relevant actions**: role changes, block/unblock, anonymize, project create/disable/enable/delete, membership invite/remove/block, support-profile creation, and every `purge` job. Each entry captures **actor (`sub` + user id), action, target id(s), timestamp, outcome, and a request correlation id**. Auth events surfaced by the Nuxt BFF (login success/failure, refresh failure) feed the same trail. Emission is **non-blocking** (reactive sink / structured log stream to a SIEM, with a durable fallback), retained per the data-retention policy, and never contains secrets or token material.

### 6 — Supply-chain scanning in CI

Add to the pipeline: **dependency vulnerability scanning** (SCA), **secret scanning**, and **container image scanning**, failing the build on high-severity findings. This complements the existing env-based secret management.

## Consequences

### Positive

- **Abuse is bounded at two layers** without blocking the reactive event loop, and sensitive/expensive operations get per-user protection.
- **A tamper-resistant record** of who did what to whom exists for incident response and compliance (GDPR anonymization, retention purges).
- **Predictable session behaviour**: bounded token lifetimes and enforced timeouts limit the window of a stolen session, and privileged changes converge quickly.
- **Known-vulnerable dependencies and leaked secrets are caught in CI** rather than in production.

### Negative

- **New moving parts**: an in-process rate-limit store (Caffeine, per [ADR 018](/registry/technical/adr/018-backend-caching-db)), a SIEM/log sink for audit, and CI scanners to run and tune — more to operate and more false positives to triage.
- **Audit writes add work on the write path** for privileged actions; kept off the hot path by non-blocking emission, but it is real overhead and a new durability concern.
- **Tuning burden**: rate-limit thresholds and scanner severity gates need calibration to avoid blocking legitimate use or crying wolf.

### Why not rate-limit only at the edge

Edge-only limiting can't see the authenticated user or distinguish a cheap read from an expensive purge, so it can't protect per-user or per-operation. The backend tier adds exactly that; the edge still does the coarse volumetric job. (Backend-only was also rejected — it lets floods reach the app before being shed.)

### Why not audit via ordinary application logging

Reusing app logs mixes high-value security events into noisy operational output, with no separation, retention guarantee, or tamper-resistance. A dedicated append-only trail keeps the security record first-class.
