---
title: 'ADR 008 — NGXS for frontend state management'
description: 'The former choice of NGXS for frontend state, superseded by ADR 013.'
---

# ADR 008 — NGXS for frontend state management

## Status

<Badge type="info" text="Superseded by ADR 013" />

## Context

The frontend has real shared state: session-wide concerns (current user, theme/language preferences, notifications, online status, screen width) and per-feature state for each lazily loaded domain. It needs a predictable shape, and it must reach templates as Angular **Signals**.

The Angular options range from NgRx (Redux-style, ceremony-heavy), to NGXS (decorator-based store), to plain signals/services (no store library).

## Decision

Use **NGXS**, exposed to components as Signals through **facade classes**.

- State is defined with NGXS decorators (`@State` / `@Action` / `@Selector`) and read by components as Signals via `selectSignal`; components never touch the store API directly.
- **Facades** sit between components and the store.
- A feature's state is **provided per route** — scoped to the lazily loaded subtree and split into the bundle with it.
- A single **root state** holds the truly global concerns (authentication / current user, preferences, cross-cutting UI).
- Selecting another project profile triggers a **reset cascade** on the dependent feature states.

### Why NGXS

The real driver is **learning and exploration** — the same motivation as [ADR 001](/registry/technical/adr/001-hexagonal-architecture). NGXS was the store adopted at the author's workplace when this project started, and this codebase was a chance to practice it hands-on. The NgRx / NGXS / services comparison was not carried out on its merits for Registry's actual needs.

## Consequences

### Positive

- **Less boilerplate than NgRx.** Decorator-based state and actions are a smaller surface than reducers/effects/actions.
- **Facades keep the store replaceable** and components clean — they depend on a small facade API, not on NGXS types.
- **State is split with its feature** thanks to per-route provisioning.
- **First-class interop with Signals** via `selectSignal`.

### Negative

- **Smaller community than NgRx** — fewer examples and answered questions.
- **The reset cascade is a maintenance surface** — a dependency forgotten when adding a feature state is a stale-state bug.

## Retrospective

In use, two problems stand out:

- **It is very verbose as implemented.** Each slice is a state class, actions, selectors and a facade wrapping it all; a small piece of feature state is a lot of files and indirection for what it does.
- **Dead code is very hard to detect.** Actions, selectors and state fields are wired dynamically and consumed through facades and `selectSignal`, so static analysis and the IDE cannot tell which ones are still actually used. Unused state and actions pile up silently.

A lighter approach — signal-based services, or Angular's more recent signal store — would probably have been enough for this application's state and easier to keep clean. NGXS is kept because it is in place and consistent, not because it would be the choice here again.

## Outcome

The retrospective above was acted upon: NGXS was removed from the frontend and replaced by `@ngrx/signals` signal stores behind facades. See [ADR 013](/registry/technical/adr/013-signal-stores-and-facades).
