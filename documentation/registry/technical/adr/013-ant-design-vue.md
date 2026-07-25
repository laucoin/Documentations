# ADR 013 — Design system: Ant Design Vue (replacing PrimeNG)

## Status

Accepted — the design-system base for the rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)); the accessibility work it depends on is [ADR 015](/registry/technical/adr/015-accessibility). The Phase-0 spike (see [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan)) de-risks SSR style handling early in implementation.

## Context

The Angular app used **PrimeNG**, which moved to non-free licensing for the versions Registry would need — the trigger for replacing the component library. The rewrite ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)) is on Vue 3 / Nuxt, so the replacement must be a Vue library, and it must be **genuinely free** so the project does not walk into a second licensing trap. Registry is a **data-heavy line-of-business admin UI** — tables, forms, date/time pickers, pagination, modals — so a comprehensive component set is worth a lot.

The options weighed:

- **Ant Design Vue** — MIT-licensed, enterprise-grade, very complete component set; theming via design tokens; CSS-in-JS.
- **Nuxt UI (on Reka UI)** — accessibility-first headless primitives with a styled layer; less "batteries-included" for dense data components, and its Pro tier is paid.
- **Reka UI + Tailwind (headless)** — WAI-ARIA-first primitives, fully free, but the entire visual layer is hand-built.
- **Vuetify** — Material, comprehensive, but heavier and less focused on dense enterprise data.
- **PrimeVue** — excluded: same licensing situation as PrimeNG.

## Decision

Adopt **Ant Design Vue** (MIT) as the component library and design-system base.

- **Comprehensive components** cover the admin surface (data tables, forms + validation display, pickers, modals, notifications) with little custom building.
- **i18n** through `ConfigProvider` `locale` (en/fr), wired to the app's i18n layer.

#### Theming

Theming is applied through `ConfigProvider theme`, split across two inputs so brand and mode are independent:

- **Brand seed tokens** — `colorPrimary`, the status colors (`colorSuccess`/`Warning`/`Error`), `borderRadius`, and `logo` — come from the **runtime config** ([ADR 008](/registry/technical/adr/008-frontend-runtime-config) / [ADR 023](/registry/technical/adr/023-nuxt-runtime-config)), so per-environment rebranding stays a **deploy-time** concern with no rebuild. They map onto Ant Design **seed tokens**.
- **Light / dark** is the **user preference** (`SYSTEM`/`LIGHT`/`DARK`, Pinia state — [ADR 014](/registry/technical/adr/014-pinia-state-management)), mapped to Ant Design's `defaultAlgorithm` / `darkAlgorithm`; `SYSTEM` follows `prefers-color-scheme`.
- **Per-mode brand overrides.** Because a primary that reads well in light can be too light or too dark in dark mode, the config allows a `dark` override block; any token it does not set inherits the base (light) value. The common case stays a single value, while operators can tune `colorPrimary` (and, e.g., a dark-mode `logo`) per mode. This also keeps the WCAG contrast target met in **both** modes ([ADR 015](/registry/technical/adr/015-accessibility)):

  ```json
  "theme": {
    "colorPrimary": "#1677ff", "colorSuccess": "#52c41a",
    "borderRadius": 6, "logo": "/brand/logo.svg",
    "dark": { "colorPrimary": "#3c9aff", "logo": "/brand/logo-dark.svg" }
  }
  ```

- **SSR-resolved.** Both the seed tokens and the resolved algorithm are decided on the **Nuxt server** (runtime config + the theme preference held in the BFF session — [ADR 022](/registry/technical/adr/022-ssr-auth-bff)), so first paint already carries the right brand color and mode — no flash of default-blue or wrong-mode before hydration. Proven in the Phase-0 spike alongside the CSS-in-JS style extraction.
- **SSR style handling is a spike item.** Ant Design Vue uses **CSS-in-JS**, so server rendering ([ADR 012](/registry/technical/adr/012-ssr-rendering)) requires **style extraction** (`@ant-design/cssinjs` style register via a Nuxt plugin) to avoid a flash of unstyled content, and the same inline-style mechanism complicates the strict CSP (`style-src 'nonce-…'`) defined in the frontend security headers ([ADR 024](/registry/technical/adr/024-frontend-security-headers)). The Phase-0 spike de-risks clean SSR extraction **and** its interaction with the nonced CSP early in implementation.

#### Brand assets

"Theme" also covers the app's **visual identity** beyond design tokens — logo, favicon, pictograms / iconography, and status **illustrations** (error, not-found, forbidden, empty-state, warning, success, offline). This is a second, config-driven layer:

- **In-app defaults + per-environment override.** The app ships a **complete default asset set**; the runtime config (`assets` block) may override **any subset**, and anything not overridden **falls back to the built-in default** — so a deployment rebrands only what it wants and an omitted override never leaves a blank screen.
- **Per-mode variants** where it matters (a dark-mode illustration or logo), using the same base / `dark`-override shape as the theme tokens.
- **Accessibility.** Each asset carries meaningful `alt` text when it conveys information, or `aria-hidden` when purely decorative — specified with the rest of the a11y work ([ADR 015](/registry/technical/adr/015-accessibility)).

```json
"assets": {
  "logo": { "light": "/brand/logo.svg", "dark": "/brand/logo-dark.svg" },
  "favicon": "/brand/favicon.ico",
  "pictograms": { "warning": "/brand/warn.svg" },
  "illustrations": {
    "error": "/brand/error.svg",
    "empty": "/brand/empty.svg",
    "notFound": { "light": "/brand/404.svg", "dark": "/brand/404-dark.svg" }
  }
}
```

(any missing entry falls back to the built-in default)

**Accessibility caveat, stated plainly.** Ant Design Vue is **not** a headless / WAI-ARIA-first library. It gives reasonable defaults, but the accessibility mandate (keyboard navigation, ARIA correctness, focus management, no overlay/menu traps) will require **manual hardening and auditing** on top of the components — that work is a dedicated workstream in [ADR 015](/registry/technical/adr/015-accessibility), not a byproduct of the library. This is the main trade-off accepted with this choice.

## Consequences

### Positive

- **Genuinely free (MIT).** Resolves the licensing problem that triggered the change, with no premium tier required for core components.
- **Batteries-included for a data-heavy admin UI.** The complete component set minimizes custom component building, which suits Registry's surface.
- **Deploy-time brand identity preserved — colors *and* imagery.** Design tokens map to Ant Design tokens, and the brand-asset layer (logo, pictograms, status illustrations) overrides in-app defaults from config, so a tenant/environment can fully rebrand without a rebuild — keeping the one-image, config-at-deploy model.

### Negative

- **CSS-in-JS + SSR friction.** Style extraction is required to avoid FOUC, and inline styles make a strict CSP harder — both flagged for the spike and the deferred CSP work.
- **Accessibility is not first-class.** The a11y overhaul carries real manual weight — the dedicated [ADR 015](/registry/technical/adr/015-accessibility) — rather than coming free from the library — the opposite of what a headless/ARIA-first base would have given.
- **Opinionated visual language and bundle weight.** Customization lives within Ant Design's token system, and the full library is not the lightest option.

### Why not Nuxt UI / Reka (headless, a11y-first)

A headless, WAI-ARIA-first base would have made much of the accessibility mandate essentially free, which is a strong pull given [ADR 015](/registry/technical/adr/015-accessibility). It was not chosen because it is less batteries-included for dense data components (more to build) and its styled/Pro tiers reintroduce cost questions; the decision favoured Ant Design Vue's complete enterprise component set, accepting the manual a11y cost in exchange.

### Why not Vuetify or PrimeVue

Vuetify is comprehensive but Material-flavoured, heavier, and less focused on dense enterprise data. PrimeVue is excluded outright — it carries the same licensing situation as PrimeNG, so it would not solve the problem that started this.
