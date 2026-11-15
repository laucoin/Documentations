---
title: 'ADR 011 — PrimeNG with runtime theming'
description: 'The former choice of PrimeNG with runtime theming, superseded by ADR 014.'
---

# ADR 011 — PrimeNG with runtime theming

## Status

<Badge type="info" text="Superseded by ADR 014" />

## Context

Registry's interface is almost entirely data-rich administration: eleven paginated, filtered and searchable lists with per-row
actions, plus their forms, plus a dashboard. Hand-building tables, paginators, multi-selects, date-time pickers, dialogs,
toasts and menus would be most of the frontend's cost, and none of it would be the product.

The platform is also deployed under different visual identities, so colors, logos and light/dark palettes must vary per
deployment without rebuilding the bundle ([ADR 007](/registry/technical/adr/007-frontend-runtime-config)).

## History

PrimeNG has been present since the project was initialized (July 2024, PrimeNG 17 on Angular 18) and followed the Angular upgrades (PrimeNG 19 with Angular 19 in December 2024, then PrimeNG 22 with Angular 22 in July 2026).

## Decision

Use **PrimeNG** as the component library, themed through **`@primeuix/themes`** with the **Lara** preset as a base,
and Bootstrap's grid — the grid only — for layout.

The theme is not compiled. `AppConfig.providePrimeNg()` calls `definePreset(Lara, AppConfig.config.primeNg)`, so that
the whole preset comes from `config.json`: the semantic color palette, separate light and dark color schemes, and
per-component overrides. Dark mode is selected by a `.dark-mod` class rather than a media query, so that the
user's stored preference — `SYSTEM`, `LIGHT` or `DARK` — decides.

Logos are also configured, per theme and per size, alongside the enabled item actions and the notification durations per
severity.

## Rationale and good practices

- **Build the product, not the widgets:** the component set directly covers the needs for data tables, forms and overlays,
  including the pagination and filtering patterns every list screen repeats.
- **Theme as configuration:** reskinning a deployment is a JSON change. The light and dark palettes are defined
  independently, so contrast can be tuned per mode rather than derived.
- **Accessibility:** PrimeNG's built-in accessibility properties (`ariaLabel` and the like) are used rather than reinvented,
  which is the repository's stated convention for keeping the UI usable by keyboard and with a screen reader.

## Consequences

- **Advantages:** a large, consistent set of components with theming, dark mode and accessibility already in place.
  Per-deployment visual identity without rebuilding. Bootstrap only brings its grid, so there is no competing
  component system.
- **Drawbacks / trade-offs:** a deep dependency on a single library — its release pace dictates the frontend's, and
  PrimeNG is pinned to Angular's major version. Component internals are styled through the preset's override structure, so a
  design that fights the library is expensive. The theme object in `config.json` is big, unvalidated and easy to get subtly
  wrong. Two styling systems coexist (the PrimeNG preset and SCSS with the Bootstrap grid), so knowing where a given rule
  belongs is a judgment call. The license deserves watching: some PrimeTek components are behind a commercial offering (this risk materialized, see Outcome).
- **Rejected alternatives:** Angular Material (excellent accessibility and longevity in the Angular ecosystem,
  but a weaker data table for this kind of admin UI and a theming model less suited to
  runtime replacement); a headless library with hand-made components (maximum control over look and accessibility, at a cost
  the project cannot absorb for eleven near-identical screens); Bootstrap components alone (no data table, no real
  overlay system).

## Outcome

The migration to PrimeNG 22 revealed that the library was moving to a paid license — the license risk this ADR flagged materialized. Rather than pay or stay on an outdated version, the project left PrimeNG and created `@sgdf/ui` on that occasion. PrimeNG, `@primeuix/themes` and the Bootstrap grid were removed. The design system is now `@sgdf/ui`, which owns the theme, and the `primeNg` preset no longer exists in `config.json`. See [ADR 014](/registry/technical/adr/014-sgdf-ui-design-system).
