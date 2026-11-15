---
title: 'ADR 013 — Signal stores behind facades, replacing NGXS'
description: 'Why frontend state goes through signal stores behind facades.'
---

# ADR 013 — Signal stores behind facades, replacing NGXS

## Status

<Badge type="tip" text="Accepted" />

Supersedes [ADR 008](/registry/technical/adr/008-ngxs-state-management).

## Context

[ADR 008](/registry/technical/adr/008-ngxs-state-management) recorded two regrets about NGXS: each slice was verbose (state,
actions, selectors, facade) and dead code was nearly impossible to detect, because actions and selectors are wired
dynamically. At about the same time, the application moved to zoneless Angular and signals everywhere, which made a
decorator- and observable-based store the odd one out.

## Decision

Replace NGXS with **`@ngrx/signals`** and keep the facade layer. Each domain follows the same flow:

`component → facade → signalStore → api`

- `<domain>.api.ts` does HTTP only and maps DTOs to models.
- `<domain>.store.ts` is a `signalStore` (`withState` + `withMethods`); `patchState` is only called inside it. Repetitive
  loading logic (a paginated resource, its search parameters, an item, metadata lists) comes from shared builders in
  `shared/helpers/store/paged-store.methods.ts`.
- `<domain>.facade.ts` is the only thing components, guards and interceptors inject; it exposes `Signal`s and relays
  calls.

Core stores are root singletons. A page's stores are provided by that page's routes, and a `ProfileResetService` resets them
together when the user switches profile. Stores never depend on facades; they report their failures through an
`ErrorReporter`. Loading and error state are scoped to the data block being fetched, never global.

## Consequences

- **Advantages:** much less ceremony per slice. Ordinary TypeScript members let the IDE and the linter find unused code.
  State reaches templates as signals without an interop layer, which suits zoneless change detection. Facades kept
  components unchanged in spirit, which made the migration mechanical.
- **Drawbacks / trade-offs:** a large breaking migration touching every domain. Route-scoped stores need an explicit
  reset mechanism. The shared store builders are an internal abstraction new contributors have to learn.
- **Alternatives considered:** keeping NGXS (ruled out: the regrets above); full NgRx Store (more ceremony than NGXS);
  hand-written signal services (no convention for loading, pagination and error state, so each domain would invent its own).
