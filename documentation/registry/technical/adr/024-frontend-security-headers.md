# ADR 024 — Frontend-tier security: CSP, cookies, CSRF, and response headers

## Status

Accepted — the **frontend half of the security work** (backend half: [ADR 019](/registry/technical/adr/019-backend-security-hardening)). The CSP baseline is committed: **strict nonce-based `script-src`** as the floor and a **pragmatic `style-src`** as the guaranteed baseline.

**Phase-0 spike outcome (2026-07-25): the fully-strict `style-src` upgrade is rejected.** The spike (see [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan)) proved SSR-extracted Ant Design Vue styles *can* be nonced, but ant-design-vue 4.x never forwards a nonce to **client-side** component style injection (`ConfigProvider`'s `csp` prop is inert for component styles) — under a nonce-only `style-src` the first client-side style regeneration (theme switch, lazily-mounted overlay) is refused and the UI renders unstyled. The committed baseline below is therefore the **final posture** unless an upstream fix lands; strict nonced `script-src` was verified end-to-end on the spike's production build.

## Context

The A3 security work was split: [ADR 019](/registry/technical/adr/019-backend-security-hardening) hardened the **backend** (rate limiting, session/token policy, audit logging, private backend), and the **frontend-delivery** controls were deferred to here because they live in the **Nuxt tier** and because the strongest control — a strict Content-Security-Policy — depends on a spike unknown: Ant Design Vue uses **CSS-in-JS**, so whether we can serve a nonce-based CSP without `'unsafe-inline'` for styles is not yet known ([ADR 013](/registry/technical/adr/013-ant-design-vue)).

Two migration decisions set the stage. After the full BFF ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)), **Nuxt is the public tier** and the owner of browser security, and auth is now **cookie-based** — which *requires* CSRF defense that bearer-in-header auth did not. And the security-header responsibility has **moved from nginx-serving-a-static-bundle to the Nuxt SSR server**.

## Decision

Set a complete browser-security baseline at the **Nuxt server** (likely via the **`nuxt-security`** module, which provides nonce-based CSP, the header set, and CSRF helpers):

- **Content-Security-Policy.** A per-request **nonce-based** policy from the Nuxt SSR server. **Committed baseline:** strict `script-src 'self' 'nonce-…'` — no `'unsafe-inline'` for scripts, the security-critical control — with a **pragmatic `style-src`** that permits inline styles for Ant Design Vue's CSS-in-JS:

  ```
  default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'unsafe-inline';
  frame-ancestors 'none'; object-src 'none'; base-uri 'self'
  ```

  **Upgrade path:** if the Phase-0 spike shows Ant Design Vue's styles can be **extracted and nonced** at SSR (`@ant-design/cssinjs`), tighten `style-src` to `'self' 'nonce-…'` and drop `'unsafe-inline'`. Roll out **Report-Only first**, then enforce. (Relaxing *styles* while keeping *scripts* strict is a deliberate, low-risk trade — script injection is the dangerous vector; CSS injection is comparatively minor.)
- **Session cookie** (from [ADR 022](/registry/technical/adr/022-ssr-auth-bff)): `Secure`, `httpOnly`, `SameSite`, `__Host-` prefix, root path, no `Domain`.
- **CSRF:** `SameSite` plus a synchroniser / double-submit token on state-changing calls proxied through the BFF.
- **Other response headers:** HSTS (with preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a locked-down `Permissions-Policy`, and `frame-ancestors 'none'` (via CSP) / `X-Frame-Options: DENY`. COOP/CORP as appropriate.

## Consequences

### Positive

- **Strong XSS mitigation.** A nonce-based CSP complements the BFF's tokens-out-of-JS posture ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)) — defense in depth against script injection.
- **Closes the cookie-auth gap.** CSRF protection is added exactly where cookie-based auth needs it.
- **A complete header baseline on the public tier**, unified in intent with the backend hardening ([ADR 019](/registry/technical/adr/019-backend-security-hardening)).

### Negative

- **The strict-`style-src` upgrade is spike-dependent.** The committed baseline ships regardless (strict scripts, inline styles allowed); tightening `style-src` to nonce-only hinges on AntD SSR style extraction proving practical. Scripts are strict either way, so the security-meaningful part is not at risk.
- **Nonce plumbing through SSR** and a Report-Only→enforce rollout add wiring and a transition window.
- **Header and Permissions-Policy tuning** is fiddly and easy to get subtly wrong.

### Why this was deferred from ADR 019

The backend hardening was independent and unblocked; these controls require the Nuxt tier to exist, and the (optional) strict-`style-src` upgrade hinges on the Ant Design Vue SSR spike. Splitting let the backend proceed immediately without waiting on a frontend unknown.
