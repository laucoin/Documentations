# ADR 015 — Accessibility (WCAG 2.2 AA)

## Status

Accepted — Track B of the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan). The standard applies to the rewritten Nuxt app ([ADR 011](/registry/technical/adr/011-vue-nuxt-frontend)); it is built in during the rewrite, not retrofitted.

## Context

The brief calls for a large accessibility overhaul — `aria-label`, `aria-hidden`, keyboard navigation, and more. The rewrite is the moment to build accessibility in rather than bolt it on. Two facts shape the work: **Ant Design Vue is not a headless / WAI-ARIA-first library** ([ADR 013](/registry/technical/adr/013-ant-design-vue)), so accessibility needs deliberate manual hardening; and the app is EU/French-facing while the **European Accessibility Act** is in force, so conformance may become a legal obligation.

## Decision

Target **WCAG 2.2 Level AA** across the application, built into the rewrite, and **structured so a formal EN 301 549 / EAA conformance package can be added later** (accessibility statement, independent audit, remediation log) **without rework** — but without running that formal process now.

### Practice areas

- **Semantics & ARIA.** Native elements first; `aria-label` / `aria-labelledby` for icon-only controls; `aria-hidden` on decorative pictograms/illustrations ([ADR 013](/registry/technical/adr/013-ant-design-vue) assets); landmark regions; `aria-live` for async notifications and validation summaries.
- **Keyboard navigation.** Every interactive element reachable and operable by keyboard, logical focus order, **visible focus indicators** never removed, and **no keyboard traps**.
- **Focus management.** Move focus into dialogs/drawers/menus on open and restore it on close; trap focus **within** modals (Ant Design Vue overlays are the main risk area); a skip-to-content link; and deliberate focus handling on route change (SPA/SSR navigation — [ADR 012](/registry/technical/adr/012-ssr-rendering)).
- **Forms.** Programmatic label association, `aria-describedby` for hints/errors, `aria-invalid`, an error summary that takes focus, and validation announced via a live region — mapping the backend's cross-field validators / `ErrorDto` to accessible messages.
- **Colour & contrast.** Meet AA contrast in **both** light and dark themes — leveraging the per-mode primary override ([ADR 013](/registry/technical/adr/013-ant-design-vue)) — and never signal by colour alone (pair with icon/text).
- **Images & media.** Meaningful `alt` where informative; empty `alt` / `aria-hidden` when decorative ([ADR 013](/registry/technical/adr/013-ant-design-vue) assets).
- **Motion.** Honour `prefers-reduced-motion`.
- **Language.** Set and switch the `lang` attribute with i18n (en/fr); localized accessible names.
- **WCAG 2.2 additions specifically.** Cover the criteria new in 2.2 — Target Size (Minimum), Focus Not Obscured, Dragging Movements, Consistent Help, Redundant Entry, and Accessible Authentication (the last pairs with the OIDC/BFF login — [ADR 022](/registry/technical/adr/022-ssr-auth-bff)).

### Ant Design Vue hardening

Audit each Ant Design Vue component in use for ARIA correctness and keyboard behaviour, wrap or patch where the defaults fall short, and keep a **per-component accessibility checklist** so the gaps are tracked rather than assumed absent.

### Testing (with [ADR 021](/registry/technical/adr/021-test-strategy-parity))

- **Automated:** `@axe-core` assertions in component and e2e tests, run in CI as a gate.
- **Manual:** keyboard-only passes and **screen-reader testing** (NVDA / VoiceOver) on the critical journeys — the part automation cannot cover.
- A **conformance checklist** maps features to WCAG 2.2 AA criteria, so an accessibility statement and external audit can be produced on demand (the formalize-later hook).

## Consequences

### Positive

- **Built in, not retrofitted.** Doing this inside the rewrite window is far cheaper than a later remediation pass, and it directly delivers the brief's `aria-*` / keyboard goals.
- **Enforceable in CI.** axe gates keep regressions out; the per-mode contrast work reuses the theming decision ([ADR 013](/registry/technical/adr/013-ant-design-vue)).
- **Ready to formalize.** The conformance checklist means EAA/EN 301 549 compliance can be produced without re-doing the work.

### Negative

- **Real manual effort.** Because Ant Design Vue is not ARIA-first, per-component hardening plus manual screen-reader/keyboard audits are unavoidable and cannot be fully automated.
- **Ongoing discipline.** Every new component must pass the checklist, or conformance erodes; the WCAG 2.2 additions add specific, easily-missed criteria.

### Why not best-effort AA only

Fixing what axe finds without the checklist and structure would leave any future EAA formalization as a from-scratch effort. Structuring for it now is cheap insurance given the EU exposure.

### Why not full EAA formalization now

The published statement, independent audit, and periodic re-audits are real overhead that is not warranted until a legal trigger applies. Building to AA and maintaining the checklist captures most of the value at a fraction of the process cost, and leaves the formal package a short step away.
