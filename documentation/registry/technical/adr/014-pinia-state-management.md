# ADR 014 — Frontend state management: Pinia (replacing NGXS)

## Status

Accepted — the state layer for the rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)). **Supersedes [ADR 009](/registry/technical/adr/009-ngxs-state-management)** (NGXS).

**Amended 2026-07-25 (B1 validation): the facade layer is dropped.** Components consume Pinia stores **directly** (`storeToRefs` for state/getters, actions called on the store); the per-store `useXxxFacade` composables are not carried into the rewrite. Rationale and the replacement discipline are recorded in the Decision below.

## Context

The Angular app held its shared state in **NGXS**, exposed to components as Signals through **facade classes**, with feature state provided per lazy route and a root state for cross-cutting concerns ([ADR 009](/registry/technical/adr/009-ngxs-state-management)). NGXS is Angular-only, so the Vue 3 / Nuxt rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)) needs a state solution from the Vue ecosystem.

The state shape itself has not changed and its reasoning from ADR 009 still holds: there is genuinely shared, cross-cutting session state (auth/current user, theme/language preferences, notifications, online status, screen width) plus per-feature domain state, and a **reset cascade** — selecting a different project profile resets the dependent feature state. That is more than plain reactive variables should carry informally, but not so much that a heavy Redux-style store is warranted.

The Vue options:

- **Pinia** — the official Vue store: tiny API (`defineStore`), first-class TypeScript, devtools, and an official Nuxt module (`@pinia/nuxt`) with SSR state hydration.
- **Plain composables** — hold state in `ref`/`reactive` inside composables, no store library.
- **Vuex** — the previous-generation store, now superseded by Pinia as Vue's recommendation.

## Decision

Use **Pinia**, with **direct store consumption** (the facade pattern from ADR 009 is *not* carried over — see the 2026-07-25 amendment).

- **Stores per domain** (`defineStore`), consumed **directly** by components: `storeToRefs` for state/getters, actions called on the store. A Pinia store already *is* the typed, small-surface API the NGXS facade existed to provide — NGXS needed the facade to hide dispatch ceremony, selector wiring, and Observable→Signal conversion, none of which exist in Pinia. A blanket facade would add one mirror composable per domain store (mostly `storeToRefs` re-exports), doubling the touch points for every change while decoupling from nothing that could realistically be swapped.
- **Orchestration lives in store actions** — an operation that spans the store *and* other systems (an HTTP call, cookie persistence, i18n locale switch, a navigation) is a store action, never inlined in a component. A cross-cutting composable is introduced only when behaviour genuinely spans **multiple** stores/systems and belongs to none of them.
- **The SSR/side-effect discipline the facade used to centralize carries over as a rule:** components never touch cookies, HTTP, or the router for state concerns — store actions are the only side-effect location. Pure state setters (used by SSR hydration) stay separate from user-action orchestrators (which persist and trigger side effects), so server boot code never accidentally writes cookies.
- **Vue reactivity replaces Signals**: Pinia state and getters are reactive, so templates consume them directly, the same role `selectSignal` played before.
- **Feature stores are code-split with their lazy route** (Nuxt), loaded with the feature rather than up front; **global stores** hold the truly cross-cutting concerns (auth/current user, preferences, UI).
- **The reset cascade** is re-implemented with explicit reset actions / `$reset`, cascading across the dependent feature stores when the selected profile changes.
- **SSR hydration** via `@pinia/nuxt`: store state is serialized on the server and hydrated on the client, and Pinia's **per-request store instances** prevent cross-request state leakage on the Nuxt server ([ADR 012](/registry/technical/adr/012-ssr-rendering)).

The NGXS→Pinia concept mapping: `@State` → `defineStore`; `@Selector`/`selectSignal` → getters / reactive state; `@Action` → store actions; facade class → **the store itself** (its typed public surface); per-route provided state → route-scoped, code-split store; root state → global stores.

## Consequences

### Positive

- **Official, well-supported, low-boilerplate.** Pinia is Vue's recommended store with a small surface — comparable to NGXS's low ceremony — plus strong TypeScript and devtools.
- **One less layer (amendment).** Components depend on the store's typed surface directly; there is no per-domain mirror composable to keep in sync, and the "components see a small API, side effects live behind it" property is preserved by the actions-only-side-effects rule rather than by an extra file.
- **SSR-ready.** `@pinia/nuxt` handles server hydration and per-request isolation, which the SSR model ([ADR 012](/registry/technical/adr/012-ssr-rendering)) requires.
- **Code-split state.** Feature stores ship with their lazy route, keeping the initial bundle lean.

### Negative

- **The reset cascade is still a maintenance surface.** As with NGXS, the cross-store reset on profile change must be kept correct as feature stores are added — a forgotten dependency is a stale-state bug.
- **SSR store discipline.** Server-side state must stay per-request; a store mutated at module scope would leak across users. `@pinia/nuxt` gives each request its own store instances, but the discipline is real — the reference pattern enforces it by declaring state through the **factory form** `state: () => ({ … })` (never a shared object literal or module-scope variable), so every request gets a fresh state object.
- **Team ramp** onto Pinia idioms.
- **The discipline moved from structure to convention (amendment).** The facade *forced* components through a narrow API; direct store use makes "no side effects in components" and "setters vs orchestrators" review-enforced rules instead — they must be policed in code review (the repository's AGENTS.md carries the checklist).

### Why not plain composables

Holding everything in `ref`/`reactive` composables with no store is fine for small apps, but this app's interacting domains, reset cascade, cross-cutting session state, and SSR-hydration needs would reinvent a store informally — the same reasoning that rejected signals-only in ADR 009. Pinia provides the structure, devtools, and hydration for little cost.

### Why not Vuex

Vuex is the previous generation and is explicitly superseded by Pinia as Vue's recommended store; it carries more boilerplate and weaker TypeScript for no benefit here.
