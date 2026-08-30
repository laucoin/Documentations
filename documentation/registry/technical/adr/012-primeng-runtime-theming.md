# ADR 012 — PrimeNG with runtime theming

## Status

Accepted

## Context

Registry's interface is almost entirely data-heavy administration: eleven paginated, filtered, searchable lists with row
actions, plus their forms, plus a dashboard. Building tables, paginators, multi-selects, date-time pickers, dialogs,
toasts and menus from scratch would be most of the frontend's cost, and none of it would be the product.

The platform is also deployed under different brandings, so colours, logos and light/dark palettes must vary per
deployment without rebuilding the bundle ([ADR 008](/registry/technical/adr/008-frontend-runtime-config)).

## Decision

Use **PrimeNG 22** as the component library, themed through **`@primeuix/themes`** with the **Lara** preset as the base,
and Bootstrap's grid — the grid only — for layout.

The theme is not compiled in. `AppConfig.providePrimeNg()` calls `definePreset(Lara, AppConfig.config.primeNg)`, so the
entire preset comes from `config.json`: the semantic colour palette, separate light and dark colour schemes, and
per-component overrides. Dark mode is selected by a `.dark-mod` class rather than a media query, so the user's stored
preference — `SYSTEM`, `LIGHT` or `DARK` — decides.

Logos are configured too, per theme and per size, alongside the enabled element actions and per-severity notification
durations.

## Rationale & best practices

- **Build the product, not the widgets:** the component set covers the data-table, form and overlay needs directly,
  including the pagination and filtering patterns every list screen repeats.
- **Theming as configuration:** re-skinning a deployment is a JSON change. Light and dark palettes are defined
  independently, so contrast can be tuned per mode rather than derived.
- **Accessibility:** PrimeNG's built-in accessibility props (`ariaLabel` and friends) are used rather than reinvented,
  which is the repository's stated convention for keeping the UI keyboard- and screen-reader-operable.

## Consequences

- **Pros:** a large, consistent component set with theming, dark mode and accessibility support already in place.
  Per-deployment branding with no rebuild. Bootstrap contributes only its grid, so there is no competing component
  system.
- **Cons / trade-offs:** a deep dependency on a single library — its release cadence dictates the frontend's, and
  PrimeNG 22 is pinned to Angular 22. Component internals are styled through the preset's override structure, so a
  design that fights the library is expensive. The theme object in `config.json` is large, unvalidated and easy to get
  subtly wrong. Two styling systems coexist (the PrimeNG preset and SCSS with the Bootstrap grid), so where a given rule
  belongs is a judgement call. Licensing is worth watching: some PrimeTek components sit behind a commercial tier.
- **Alternatives rejected:** Angular Material (excellent accessibility and a stable long-term home in the Angular
  ecosystem, but a weaker data-table story for this kind of administration UI and a theming model less suited to runtime
  swapping); a headless library with hand-built components (maximum control over appearance and accessibility, at a cost
  the project cannot absorb for eleven near-identical screens); Bootstrap components alone (no data-table, no overlay
  system worth the name).
