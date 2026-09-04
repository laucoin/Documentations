# ADR 008 — NGXS for frontend state management

## Status

<Badge type="tip" text="Accepted" />

## Context

The frontend has real shared state: session-wide concerns (current user, theme/language preferences, notifications, online status, screen width) and per-feature state for each lazy-loaded domain area. It needs a predictable shape and it needs to reach templates as Angular **Signals**.

The Angular options span NgRx (Redux-style, heavy on ceremony), NGXS (decorator-based store), and plain signals/services (no store library).

## Decision

Use **NGXS**, exposed to components as Signals through **facade classes**.

- State is defined with NGXS decorators (`@State` / `@Action` / `@Selector`) and read by components as Signals via `selectSignal`; components never touch the store API directly.
- **Facades** sit between components and the store.
- Feature state is **provided per route** — scoped to the lazy-loaded subtree and code-split with it.
- A single **root state** holds the genuinely global concerns (auth / current user, preferences, cross-cutting UI).
- Selecting a different project profile triggers a **reset cascade** across the dependent feature states.

### Why NGXS

The honest driver is **learning and exploration** — the same motivation as [ADR 001](/registry/technical/adr/001-hexagonal-architecture). NGXS was the store adopted at the author's workplace around the time this project started, and this codebase was a place to work with it directly. The NgRx-vs-NGXS-vs-services comparison was not run on its merits for Registry's actual needs.

## Consequences

### Positive

- **Less boilerplate than NgRx.** Decorator state and actions are a smaller surface than reducers/effects/actions.
- **Facades keep the store swappable** and components clean — they depend on a small facade API, not NGXS types.
- **State is code-split with its feature** via per-route provisioning.
- **First-class Signal interop** through `selectSignal`.

### Negative

- **Smaller community than NgRx** — fewer examples and answered questions.
- **The reset cascade is a maintenance surface** — a forgotten dependency when adding a feature state is a stale-state bug.

## Retrospective

Living with it, two problems stand out:

- **It is very verbose as implemented.** Each slice is a state class, actions, selectors, and a facade wrapping all of it; a small piece of feature state is a lot of files and indirection for what it does.
- **Dead code is very hard to detect.** Actions, selectors, and state fields are wired together dynamically and consumed through facades and `selectSignal`, so static analysis and the IDE cannot tell which of them are actually still used. Unused state and actions accumulate silently.

A lighter approach — signal-based services, or Angular's newer signal store — would likely have been enough for this app's state and easier to keep clean. NGXS is kept because it is in place and consistent, not because it would be the choice again here.
