# ADR 012 — Rendering strategy: server-side rendering (SSR) on Nuxt

## Status

Accepted — commits full SSR for the rewrite. Builds on [ADR 011](/registry/technical/adr/011-vue-nuxt-frontend). The Phase-0 spike (see [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan)) de-risks SSR feasibility early in implementation.

## Context

The frontend rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)) has to pick a rendering model. The stated goal is better first paint and time-to-first-byte. Registry is an **authenticated** line-of-business app: only four endpoints are public and nothing is publicly indexable, so the classic SSR wins — SEO and fast first paint for *anonymous* content — do not apply here.

The options considered:

- **SPA / SSG** — client-rendered, optionally a Nuxt app in SPA or static-shell mode. Keeps the immutable-nginx-bundle delivery model and the current client-token flow; meets the first-paint goal through code-splitting, prefetch, caching, and a prerendered shell.
- **Full SSR** — the Nuxt server renders pages, including authenticated ones. Adds a Node server tier and requires the user's token server-side, which reworks token custody (ADR 022).
- **Hybrid** — Nuxt defaulting to SPA/SSG with selective per-route SSR later.

## Decision

Adopt **full SSR on Nuxt**. Authenticated pages are server-rendered, which requires the Nuxt server to hold the session token — handled by the full-BFF model in **[ADR 022](/registry/technical/adr/022-ssr-auth-bff)** (Nuxt becomes the OIDC client; Spring becomes a private, standalone resource server). The immutable-image delivery property is preserved by supplying environment config through Nuxt `runtimeConfig` ([ADR 023](/registry/technical/adr/023-nuxt-runtime-config), revising [ADR 008](/registry/technical/adr/008-frontend-runtime-config)).

The Phase-0 spike de-risks SSR feasibility — the OIDC auth model and Ant Design Vue's CSS-in-JS style extraction (no FOUC) — early in implementation.

## Consequences

### Positive

- **Server-rendered authenticated pages.** Markup arrives rendered rather than as an empty shell hydrated after a client-side data round-trip, improving perceived load for the app's real (logged-in) surface.
- **A single framework surface** for rendering, routing, data-fetching, and server middleware (the BFF), rather than bolting a server tier onto an SPA later.

### Negative

- **A Node server tier to run and secure.** SSR replaces the "static bundle on nginx" simplicity ([ADR 010](/registry/technical/adr/010-container-delivery-semantic-release) still applies to imaging) with a running Node process — more to deploy, scale, and monitor.
- **Auth becomes stateful and cookie-based.** Server-side token custody and refresh, plus a CSRF defense, are introduced (ADR 022) — a larger security surface than client-held bearer tokens.
- **CSP is harder.** Server-rendered inline styles/scripts (including Ant Design Vue's CSS-in-JS) complicate the Content-Security-Policy work ([ADR 024](/registry/technical/adr/024-frontend-security-headers)).

### Why not SPA / SSG (the recommended-but-not-chosen alternative)

For an authenticated app, SPA/SSG meets the first-paint goal without a Node tier and without reworking auth — the SEO/anonymous-paint advantages of SSR simply do not apply behind a login, so the cost/benefit favours SPA/SSG on the merits. It was **not** chosen: full SSR was selected deliberately, accepting the added server tier and auth rework. This ADR records SPA/SSG as the seriously-considered alternative so the trade-off is explicit.

### Why not hybrid

Defaulting to SPA/SSG with selective SSR keeps options open, but it defers rather than makes the decision; full SSR was chosen outright.
