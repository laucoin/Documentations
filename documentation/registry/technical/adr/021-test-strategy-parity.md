# ADR 021 — Test strategy and Angular→Vue parity (Playwright)

## Status

Accepted — Track B safety net for the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan). The **parity suite is written against the current Angular app and can start immediately** (before the Phase-0 spike), since it captures existing behaviour; running it against the new app follows the rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)).

## Context

The frontend is a full **rewrite**, not a migration ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)) — a new framework (Vue/Nuxt), new component library ([ADR 013](/registry/technical/adr/013-ant-design-vue)), new state ([ADR 014](/registry/technical/adr/014-pinia-state-management)), new rendering ([ADR 012](/registry/technical/adr/012-ssr-rendering)), and a new auth topology ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)). Rewrites carry high regression risk: it is easy to lose a behaviour, a permission gate, or an edge case that no one remembered was there. We need an executable definition of "the new app does what the old one did" that does not depend on either framework's internals.

## Decision

Adopt a **test pyramid for the new app plus a browser-level parity suite** as the cutover gate.

### 1 — Parity suite (Playwright), written against the current app first

- **Playwright end-to-end tests drive the browser through the critical user journeys** — OIDC login, profile selection, the RBAC-gated and option-gated flows, and CRUD across the domains (participants, movements, groups, vehicles, activities, communications, alerts). Because they assert **user-visible outcomes** and never touch Angular or Vue internals, the same suite runs against **both** apps.
- The suite is **authored against the current Angular app now**, turning today's actual behaviour into an executable spec (and catching pre-existing surprises early).
- It then runs against the **new Nuxt app** throughout the rewrite: each domain's parity tests must pass before that vertical slice is considered done, and the **full suite green per environment (dev → staging → prod) gates cutover**.
- **Intended divergences are conscious.** Where the new app deliberately differs (the [v2 API](/registry/technical/api-reference), the new design system), the specific assertions are updated with a recorded reason — a short divergence log — rather than silently loosened.
- **Auth in e2e** runs against a **test IdP** with seeded users; the login *fixture* differs between targets (client-held token vs BFF cookie, [ADR 022](/registry/technical/adr/022-ssr-auth-bff)) while the asserted journey stays the same.

### 2 — Test pyramid for the new app

- **Unit** (Vitest): Pinia stores/facades, composables, and utilities.
- **Component** (Vue Test Utils / Testing Library): components in isolation, **with accessibility assertions** (`@axe-core/playwright` / testing-library a11y queries) — the automatable half of [ADR 015](/registry/technical/adr/015-accessibility).
- **End-to-end** (Playwright): the critical journeys and the parity suite above.

### 3 — CI integration

Playwright runs **headless in CI** against an ephemeral stack (Nuxt + private Spring + test IdP + PostgreSQL, mirroring the local-dev compose in [Getting Started](/registry/technical/getting-started)), with **traces/video captured on failure**. The backend keeps its existing unit/integration and ArchUnit tests ([ADR 001](/registry/technical/adr/001-hexagonal-architecture)); v2 endpoints get integration coverage.

## Consequences

### Positive

- **A framework-agnostic safety net.** The parity suite is the concrete answer to "did the rewrite drop anything?", and it gates cutover objectively rather than by inspection.
- **It starts paying off before the rewrite.** Authoring against the current app documents real behaviour and surfaces existing edge cases immediately.
- **It drives the migration slice by slice.** Per-domain parity turns the rewrite into a checklist of green suites, matching the vertical-slice, validate-each-pattern approach.
- **Accessibility is testable, not aspirational.** axe assertions in component and e2e tests make the [ADR 015](/registry/technical/adr/015-accessibility) targets enforceable in CI.

### Negative

- **Real upfront and ongoing cost.** Writing and maintaining a broad e2e suite — twice-targeted — is significant work, and browser e2e is the slowest, flakiest layer to keep green.
- **Auth fixtures and a test IdP** must be stood up and kept working for both targets.
- **The divergence log needs discipline.** Every intended difference must be a deliberate assertion change with a reason, or "parity" quietly erodes into "whatever the new app happens to do."

### Why author against the current app rather than write fresh specs for the new one

Fresh specs would encode what we *think* the app should do; authoring against the running Angular app encodes what it *actually* does today — including the behaviours no one would remember to specify. For a rewrite whose goal is "no regressions," captured-actual-behaviour is the safer oracle.
