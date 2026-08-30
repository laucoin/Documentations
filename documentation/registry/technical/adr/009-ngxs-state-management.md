# ADR 009 — NGXS with per-domain facades

## Status

Accepted

## Context

The frontend holds a large amount of shared state. Some is genuinely global — the token, the current user, the selected
profile, theme, network status, screen width, the global loader and error, the notification queue — and some belongs to
a feature area but is shared across several screens within it, such as a list, its filters and the item being edited.

Registry's screens are also mostly the same screen: a paginated, filtered, searchable list with row actions, repeated
for eleven entities. Without a shared pattern, each one grows its own subtly different data-fetching and error handling.

The requirement that a component must never be the place where HTTP calls, business logic or state mutation live needs
something to enforce it structurally.

## Decision

Use **NGXS**, with one store per feature area alongside a root `RegistryState`, and a strict one-way flow through a
**facade**:

```
Component → Facade → dispatch(Action) → @Action handler in State → Service (HTTP)
     ↑                                            │
     └───────────── selectors / signals ──────────┘
```

The facade is the **only** thing components talk to. State is never mutated outside an `@Action` handler. Feature states
and their facades are provided **at the route level** with `NgxsModule.forFeature`, so a store exists only while the
screens that need it are mounted.

A global NGXS plugin catches unhandled errors from any action: a `503` becomes a full-page error state, anything else
becomes a sticky error toast.

## Rationale & best practices

- **Maintainability:** the facade is a seam. Components stay declarative, and the eleven list screens share one shape.
- **Consistency:** centralised error handling means no action can fail silently, and no screen has to remember to handle
  a failure.
- **Performance:** route-scoped stores keep memory proportional to what is on screen; `OnPush` and the async pipe are
  the default consumption pattern.
- **Less boilerplate than NgRx:** NGXS's decorator-based actions and class-based state fit an Angular codebase with less
  ceremony.

## Consequences

- **Pros:** predictable data flow, testable state in isolation, Redux devtools outside production, and one place to
  change how errors surface.
- **Cons / trade-offs:** a third-party state library the project must keep aligned with Angular's release cadence — a
  real cost, since Angular 22 and NGXS 22 must move together. Every read still costs the action / handler / selector
  ceremony even when a component only needs one value. Route-provided stores mean state is **lost on navigation away**,
  which is usually wanted and occasionally surprising. Angular's own signals now cover part of what NGXS was chosen for.
- **Alternatives rejected:** NgRx (larger ecosystem, more boilerplate); plain services with `BehaviorSubject` (no
  dependency, but no devtools, no enforced immutability and no central error handling — the discipline would be
  convention only); signals alone (attractive today, but they were not a complete answer for shared cross-route state
  when this was decided).
