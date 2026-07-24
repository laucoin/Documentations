# ADR 009 — NGXS for frontend state management

## Status

Accepted

## Context

The frontend has real shared state, not just component-local view state. Some of it is cross-cutting and lives for the whole session — the authenticated user, theme and language preferences, notifications, online/offline status, screen width. Some of it is per-feature — the data and UI state of a lazy-loaded domain area. That state needs a predictable, testable shape, and it needs to reach templates as Angular **Signals**, which is how the components consume reactive values.

The Angular ecosystem offers a spectrum of answers:

- **NgRx** — the incumbent Redux-style store: powerful, large ecosystem, but heavy on boilerplate (actions, reducers, effects, selectors as separate ceremony).
- **NGXS** — a store built around decorators (`@State`, `@Action`, `@Selector`) with much less boilerplate and a natural fit for facade-style access.
- **Signals-only / plain services** — hold state in services with signals and no store library at all: minimal, but offers little structure once the number of interacting domains grows.

The state is non-trivial enough that "plain services" would drift into ad-hoc structure, but not so vast that NgRx's ceremony pays for itself.

## Decision

Use **NGXS**, exposed to components as Signals through **facade classes**.

- State is defined with NGXS decorators (`@State` / `@Action` / `@Selector`) and read by components as Angular Signals via `selectSignal`, so templates get plain reactive values and never touch the store API directly.
- **Facades** sit between components and the store: components call facade methods and read facade signals, keeping NGXS an implementation detail of each domain.
- Feature state is **provided per route** — scoped to the lazy-loaded route subtree rather than registered globally — so a feature's state is code-split and loaded with the feature, not up front.
- A single **root state** holds the genuinely global, cross-cutting concerns: auth / current user, preferences (theme, language), and UI (notifications, online status, screen width).

## Consequences

### Positive

- **Far less boilerplate than NgRx.** Decorator-based state and actions collapse the reducer/effect/action ceremony into a smaller, more direct surface, which suits an app of this size.
- **Facades keep the store swappable and components clean.** Components depend on a small facade API, not on NGXS types. The store technology stays an implementation detail behind a per-domain seam.
- **State is code-split with its feature.** Per-route provisioning means a feature's state ships and loads with the lazy route, not in the initial bundle — global state is reserved for what is truly global.
- **First-class Signal interop.** `selectSignal` hands templates ordinary Angular signals, so state consumption uses the same reactive primitive as the rest of the app with no bridging glue.

### Negative

- **Smaller community than NgRx.** Fewer examples, fewer answered questions, a smaller pool of developers who already know it. On unusual problems there is less prior art to lean on.
- **Opinionated model.** The decorator/state-class approach is a way of doing things; going against its grain is awkward, and the team is committing to its conventions.
- **The reset cascade is a maintenance surface.** Selecting a different project profile triggers a reset that has to cascade across the dependent feature states. That cross-state dependency is real and must be kept correct as feature states are added or changed — a forgotten dependency is a stale-state bug.

### Why not NgRx

NgRx is the safer ecosystem bet — larger community, more tooling, deeper documentation — and at very large scale its rigour pays off. It was rejected here for boilerplate: the action/reducer/effect ceremony is a lot of code to carry for this app's state, and NGXS delivers the same predictable, testable store with a lighter footprint and a cleaner fit to the facade pattern.

### Why not signals-only / plain services

Holding everything in services with signals and no store library is the minimal option and is genuinely fine for small apps. This app has enough interacting domains — a reset cascade across feature states, cross-cutting session concerns, per-route scoping — that "just services" would reinvent a store informally, without the structure, action semantics, or dev tooling NGXS provides. The structure earns its place here.

> Note: an earlier assumption that this frontend used NgRx is incorrect. The state library is **NGXS**; this ADR is the record of that.
