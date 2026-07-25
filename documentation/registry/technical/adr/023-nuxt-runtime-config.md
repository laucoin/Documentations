# ADR 023 — Runtime configuration on Nuxt

## Status

Accepted — the runtime-config model for the rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)). **Revises [ADR 008](/registry/technical/adr/008-frontend-runtime-config)** for the Nuxt/SSR stack.

## Context

[ADR 008](/registry/technical/adr/008-frontend-runtime-config) gave the Angular SPA runtime configuration injection: two JSON files — `settings/config.json` (presentation) and `settings/env.json` (wiring) — **fetched by the browser before Angular bootstrapped**, with placeholders in the repo and the real files injected per environment, so **one immutable image** serves every environment.

Two migration decisions change how this must work:

- **SSR ([ADR 012](/registry/technical/adr/012-ssr-rendering)).** Configuration must be available on the **Nuxt server** at render time, not just fetched by the browser afterwards — otherwise the first (server-rendered) paint has no theme, no brand assets, no wiring.
- **Full BFF ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)).** The browser no longer calls Spring directly and no longer performs the OIDC exchange. So the **internal backend URL and all secrets (OIDC client secret, session secret) are server-only** — they must never be shipped to the client, where ADR 008's browser-fetched `env.json` would have exposed them.

The presentation payload also got richer ([ADR 013](/registry/technical/adr/013-ant-design-vue)): the `theme` block (design tokens with per-mode overrides) and the `assets` block (logo, pictograms, status illustrations with defaults + override). That nested structure wants to stay JSON, not become a flat wall of environment variables.

## Decision

Keep the **runtime-config-at-deploy, one-immutable-image** principle of ADR 008, re-homed onto Nuxt's runtime configuration, with a **clear public/server split**.

### Configuration taxonomy

- **Server-only** (Nuxt `runtimeConfig`, from environment variables — never sent to the browser): the **internal Spring API URL** (private per [ADR 022](/registry/technical/adr/022-ssr-auth-bff)), the **OIDC client secret**, the **session/cookie secret**, and OIDC issuer/client-id. These are new server-side concerns created by the BFF model.
- **Public presentation** (`config.json`, deploy-injected JSON): the `theme` block and `assets` block ([ADR 013](/registry/technical/adr/013-ant-design-vue)), available languages, enabled UI actions, notification durations. Rich, nested, designer-owned.
- **Public flags** (`config.json`/`env.json` or `runtimeConfig.public`): the production flag and feature flags.

### How it loads

- The **Nuxt server reads the config at startup/runtime** — JSON files for the rich presentation payload, environment variables (`NUXT_*` / `NUXT_PUBLIC_*`) for secrets and scalar wiring — and **validates it at boot**, failing fast before serving a single request.
- The **public** subset is embedded in the **SSR payload**, so the server renders with the correct theme/assets/wiring and the client **hydrates from it** — there is **no pre-bootstrap browser fetch** anymore.
- The image ships **placeholders/defaults**; the concrete files and env vars are **injected at deploy**, so the built artifact stays environment-agnostic.

## Consequences

### Positive

- **One immutable image, promoted unchanged** — the ADR 008 property is preserved; config stays a deployment concern, not a build concern.
- **The pre-bootstrap round trip is gone.** Because the server already has the config and embeds it in the SSR payload, the "extra fetch before the app can start" negative of ADR 008 disappears.
- **Secrets never reach the browser.** The server/public split, forced by the BFF ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)), is stronger than ADR 008 — where `env.json` (including the backend URL) was browser-fetched.
- **Fail-fast validation.** Loading and validating at server boot turns ADR 008's "malformed config fails when a user loads the app" into "the server refuses to start", catching bad config before it reaches anyone.
- **The rich theme/assets payload stays JSON**, keeping the [ADR 013](/registry/technical/adr/013-ant-design-vue) shape intact and designer-editable.

### Negative

- **Two config mechanisms.** Presentation as JSON files, secrets/wiring as environment variables — a slightly larger configuration surface than a single file, and the split must be understood by operators.
- **The Nuxt server must load and validate before serving**, a startup responsibility (and a hard dependency on the injected files/vars being present and correct) that the static-bundle model did not have.

### Why not env-vars-only (plain Nuxt `runtimeConfig`)

Nuxt can take everything from environment variables, which is clean for scalars and secrets. But the `theme`/`assets` payload is deeply nested and designer-owned; flattening it into env vars would be unwieldy and error-prone. Keeping JSON for presentation and env vars for secrets/wiring fits each kind of value.

### Why not build-time configuration

Baking values in at build time (the Angular `environment.ts` equivalent, or Nuxt build-time constants) gives compile-time checking but forfeits the one-image, promote-what-you-tested property — the same trade rejected in [ADR 008](/registry/technical/adr/008-frontend-runtime-config). Runtime injection remains the right choice for immutable-image delivery ([ADR 010](/registry/technical/adr/010-container-delivery-semantic-release)).
