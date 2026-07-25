# ADR 011 — Frontend framework: Vue 3 on Nuxt (replacing Angular)

## Status

Accepted — commits the Vue 3 / Nuxt frontend rewrite. Supersedes the Angular-specific decisions in [ADR 008](/registry/technical/adr/008-frontend-runtime-config) and [ADR 009](/registry/technical/adr/009-ngxs-state-management). The Phase-0 spike (see [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan)) now **de-risks** the riskiest unknowns early in implementation rather than gating the decision.

## Context

Four changes land on the frontend at once: the PrimeNG component library moved to non-free licensing and must be replaced; the app needs a large accessibility overhaul; it needs a performance/caching pass; and there is a standing preference to move off Angular to Vue. Individually these look separate, but **together they constitute a ground-up rewrite of the UI layer** — replacing every component, its markup, its state wiring, and its data-fetching. There is no meaningful incremental Angular→Vue path.

The consequence that drives this decision: if the accessibility and performance work were done on the current Angular + PrimeNG app and the framework were switched afterwards, that work would be paid for twice. The rewrite is therefore the one moment where switching the framework carries a low *marginal* cost, because everything is already being touched.

The incumbent is an Angular 22 standalone SPA with NGXS state ([ADR 009](/registry/technical/adr/009-ngxs-state-management)) and runtime-config injection ([ADR 008](/registry/technical/adr/008-frontend-runtime-config)), served as an immutable nginx bundle.

## Decision

Rewrite the frontend as **Vue 3 on Nuxt**. The rewrite is committed; a **Phase-0 spike** still runs first to **de-risk** the three riskiest unknowns early in implementation — SSR + OIDC auth ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)), Ant Design Vue under SSR ([ADR 013](/registry/technical/adr/013-ant-design-vue)), and runtime-config on Nuxt ([ADR 023](/registry/technical/adr/023-nuxt-runtime-config)).

The rewrite pulls a coherent set of companion decisions, each recorded separately:

- **Rendering** — full SSR ([ADR 012](/registry/technical/adr/012-ssr-rendering)).
- **Design system** — Ant Design Vue ([ADR 013](/registry/technical/adr/013-ant-design-vue)), replacing PrimeNG.
- **State** — Pinia ([ADR 014](/registry/technical/adr/014-pinia-state-management)), superseding NGXS ([ADR 009](/registry/technical/adr/009-ngxs-state-management)); the facade pattern is retained.
- **Authentication** — Nuxt BFF token custody (ADR 022), amending [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth).
- **Runtime config** — Nuxt `runtimeConfig`, keeping one immutable image ([ADR 023](/registry/technical/adr/023-nuxt-runtime-config), revising [ADR 008](/registry/technical/adr/008-frontend-runtime-config)).

The backend is untouched: the REST contract ([API v2](/registry/technical/api-reference), [ADR 017](/registry/technical/adr/017-api-v2-conventions)) is the seam, so this is a frontend-only change.

## Consequences

### Positive

- **The rewrite window is used once.** Accessibility, the new design system, SSR, and data-caching are built into the new app's specs rather than retrofitted, so none of that work is done twice.
- **Ecosystem, DX, and hiring.** Vue 3 + Nuxt is a mainstream, well-supported stack with a large contributor pool and first-class SSR, routing, and config conventions.
- **Clean seam.** Consuming API v2 from day one means the new app never learns the v1 shape.

### Negative

- **It is a full rewrite, not a migration.** The whole UI layer is re-implemented; there is real schedule and regression risk, mitigated by the Playwright parity suite ([ADR 021](/registry/technical/adr/021-test-strategy-parity)) written against the current app.
- **Re-implementation of cross-cutting glue.** The token interceptor, i18n (`@ngx-translate` → Vue i18n), guards, and the NGXS reset-cascade all have to be rebuilt in Vue idioms.
- **Team ramp.** Committing to Vue conventions where the team's depth is currently Angular; the spike also de-risks this.

### Why not stay on Angular and only swap the component library

The PrimeNG licensing problem alone is solved by swapping components *within* Angular (e.g. Angular Material or a headless library) — no rewrite required. That is the safe path, but it was not chosen: it forfeits the stated goal of moving to Vue and does not, by itself, use the rewrite window for the accessibility/performance/SSR work.

### Why not React or another framework

React is the other mainstream option, but the explicit preference here is Vue, and Nuxt gives the SSR/routing/config conventions this migration wants out of the box. No decision-forcing reason favoured React over the stated Vue preference.
