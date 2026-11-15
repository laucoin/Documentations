---
title: 'ADR 014 — @sgdf/ui design system with Tailwind for layout'
description: 'Why the interface relies on the @sgdf/ui design system, with Tailwind for layout.'
---

# ADR 014 — `@sgdf/ui` design system with Tailwind for layout

## Status

<Badge type="tip" text="Accepted" />

Supersedes [ADR 011](/registry/technical/adr/011-primeng-runtime-theming).

## Context

[ADR 011](/registry/technical/adr/011-primeng-runtime-theming) had chosen PrimeNG with a theme injected at runtime. In practice, the theme object in
`config.json` was big and unvalidated, and two styling systems coexisted (the preset and the Bootstrap grid). Above all, the upgrade to
PrimeNG 22 (with Angular 22) revealed that the library was moving to a paid license, which triggered the departure from PrimeNG.

`@sgdf/ui` was created on that occasion for the application, which belongs to the Scouts et Guides de France: a design system following their brand guidelines, built on Web Awesome web
components and owned by the same developer.

## Decision

Build the UI on **`@sgdf/ui`**.

- **`@sgdf/ui` first.** Before building UI, check what the library already provides (component, `variant`,
  `appearance`, slots, CSS properties). When something is missing, the library is changed rather than worked around.
- **Tailwind CSS v4 is only used for layout and spacing.** It is never used to recolor or rebuild a library
  component, and the `--sgdf-*` tokens do not appear in utility classes. Bootstrap and PrimeNG (with `primeicons` and `@angular/cdk`) are
  removed.
- **The library owns the theme.** The mode (`light`, `dark`, or no attribute for the system preference) is set as `data-theme` on
  `<html>` through `BrowserService`. No theme key lives in `config.json`; the runtime configuration only keeps behavior
  ([ADR 007](/registry/technical/adr/007-frontend-runtime-config)).
- **Forms** are Angular signal forms with shared schemas and a shared field-error component, and items are edited in
  route-backed dialogs.
- **Strict CSP.** The library's fonts and icons are served from the application's origin, so nginx sets a Content Security
  Policy without `unsafe-eval`.

## Consequences

- **Advantages:** a single visual language shared with other SGDF tools, accessibility attributes derived by the library, no
  runtime theme object to get wrong, a strict CSP, and a lighter dependency tree.
- **Drawbacks / trade-offs:** the application depends on a library whose release pace the same developer controls, which is
  convenient but concentrates the risk. Reskinning a deployment without rebuilding is no longer possible; the visual identity is
  the library's. Library gaps must be raised upstream rather than fixed locally, which can slow a feature down.
- **Alternatives considered:** keeping PrimeNG (ruled out: paid license from version 22, cost of the theme and of the dual styling, off-brand look); Angular
  Material (no SGDF identity); building headless components (a cost the project cannot absorb).
