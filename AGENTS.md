# Agent Instructions

This file documents conventions for AI agents (Claude Code, Copilot, etc.) working on this repository. Follow these rules precisely so that all pages remain visually and structurally consistent.

## General AI Rules & Workflow

1. **Language:** All documentation across all projects (functional, technical, landing pages) **must be written strictly in English**.
2. **Interactive First:** Always guide the user interactively. Present structured choices/options and ALWAYS include an `"Other (please specify)"` choice.
3. **Sequential Documentation Flow:**
   - **Step 1 — Functional First:** Focus on complete business domain requirements, roles & permissions (RBAC), user flows (BDD Gherkin scenarios), domain entities, and functional specs in `documentation/[project-name]/functional/`.
   - **Step 2 — Technical Second:** Never draft, complete, or make technical decisions (`documentation/[project-name]/technical/`) before the functional specs and security baseline are completed and fully established.
4. **Project Hub Context:** Remember this repository acts both as a central global documentation system and a hub to navigate between projects.

---

## Commands

| Command        | Purpose                  |
| -------------- | ------------------------ |
| `pnpm dev`     | Start local dev server   |
| `pnpm build`   | Build for production     |
| `pnpm preview` | Preview production build |

---

## Repository Layout

```
.
├── .github/
│   └── prompts/                — Single source of truth for AI skills
│       ├── step-1-functional.md
│       └── step-2-technical.md
├── .vitepress/config.mts       — Site config: title, sidebar, footer, search
├── documentation/
│   ├── index.md                — Portal home / hub (layout: page, custom HTML/CSS)
│   ├── resume/index.md         — CV page (layout: page, custom HTML/CSS)
│   └── [project]/
│       ├── index.md            — Project landing (layout: home, VitePress YAML frontmatter)
│       ├── functional/         — STEP 1: Business domain, roles/permissions matrix, BDD specs
│       │   ├── roles-and-permissions.md
│       │   └── index.md
│       └── technical/          — STEP 2: Engineering: ADR, architecture diagrams, API specs
│           └── index.md
└── README.md
```

---

## Links & Cross-References

All in-repo links between documentation pages **must be root-absolute** — resolved from the VitePress source root (`documentation/`, the configured `srcDir`), not relative to the current file. This keeps links intact when a page is moved or a folder is restructured; relative `./` / `../` links break the moment a file changes depth.

Rules:

- **Always start with `/`.** A page at `documentation/registry/technical/architecture.md` is linked as `/registry/technical/architecture` — never `./architecture` or `../technical/architecture`.
- **Omit the `.md` extension.** VitePress serves extensionless clean URLs (`/registry/technical/adr/017-api-v2-conventions`).
- **End directory/index pages with a trailing slash.** A folder's `index.md` is linked with a trailing `/` (`/registry/technical/adr/`, `/registry/technical/migration-plan/2026-07-25-plan`) — VitePress's canonical path for an index page carries the slash, and omitting it fails the dead-link check.
- **Keep anchors as-is.** Append `#section` to the root-absolute path (`/registry/functional/roles-and-permissions#project-options-gating`). Same-page anchors stay bare (`#section`).
- **`pnpm build` is the check.** The build fails on dead links; run it after touching links or moving pages. `.vitepress/config.mts` sidebar links already follow this convention.

---

## CSS Conventions — OOCSS

All inline `<style scoped>` blocks follow **OOCSS** (Object-Oriented CSS). Split every style block into two clearly labelled sections:

```css
/* =============================================
   OBJECTS — structure (layout, shape, spacing)
   ============================================= */

/* =============================================
   SKINS — visual decoration (colors, borders)
   ============================================= */
```

## Rules

- Never use container-descendant selectors (e.g. `.card-header h4`). Always add an explicit class to the element.
- Separate structure from skin: `.card` holds `border-radius` + `padding`; `.card--soft` holds `background-color` + `border` + `transition`.
- Use `--modifier` suffix for skin variants on the same object (`.btn--primary`, `.btn--alt`, `.badge--date`, `.badge--skill`).
- Shared link skin across pages: `.link-brand` for brand-coloured anchor tags.
- Shared badge pattern: `.badge` base + `.badge--date` or `.badge--skill` modifier.

## Adding a New Project Workflow

Follow this checklist in order. Always execute via the interactive Skills (`/functional` then `/technical`).

### 1. Create the Directory Structure

```
documentation/[project-name]/
├── index.md            ← Project landing page (required)
├── functional/
│   ├── roles-and-permissions.md ← Global security baseline (required)
│   └── index.md        ← STEP 1: Functional section entry point (required)
└── technical/
    └── index.md        ← STEP 2: Technical section entry point (required)
```

### 2. `index.md` — Project Landing Page

Must use `layout: home`. Minimum required frontmatter:

```yaml
---
layout: home

hero:
  name: "Project Name"
  text: "One-line value proposition"
  tagline: "Supporting tagline."

features:
  - title: Functional Documentation
    details: Business scope, features, and domain models — described from a user's point of view.
    link: /[project-name]/functional/
    linkText: Explore
  - title: Technical Documentation
    details: Architecture overview, decision records (ADR), and system design.
    link: /[project-name]/technical/
    linkText: Explore
---
```

### 3. `functional/index.md` — Functional Section Entry (Step 1)

Plain markdown doc page.

- Focus: Business domain, functional specs, domain entities, user journeys, BDD scenarios, and feature permission matrix.
- Rule 1 (Security Baseline): `functional/roles-and-permissions.md` must define global authentication status, tenant scopes, and available roles.
- Rule 2 (Reciprocity): Adding a new role requires defining its permissions across ALL existing features.
- Rule 3 (Language): Must be drafted and validated in English before starting technical specifications.

### 4. `technical/index.md` — Technical Section Entry (Step 2)

Plain markdown doc page.

- Focus: Engineering specs, Architecture Decision Records (ADR), system diagrams, deployment topology, runbooks.
- Gatekeeper Rule: Do not fill or outline this section until Step 1 (Functional Documentation and Roles Matrix) is completed and validated.

### 5. Portal Card in `documentation/index.md`

Add a `<div class="card card--portal">` block to the `.portal-grid`. Structure:

- `.card-icon` — emoji or icon
- `.card-body` — flex column for text + actions
  - `.card-title` — project name (`<h3>`)
  - `.card-description` — short description (`<p>`)
  - `.card-actions` — row of buttons

Mandatory `.btn.btn--primary` → links to `/[project-name]/`

Optional `.btn.btn--alt` → links to the live solution (external URL). Omit if no deployed solution exists.

```html
<div class="card card--portal">
  <div class="card-icon">🔧</div>
  <div class="card-body">
    <h3 class="card-title">Project Name</h3>
    <p class="card-description">Short description of the project.</p>
    <div class="card-actions">
      <a href="/[project-name]/" class="btn btn--primary">Documentation →</a>
      <!-- Add only when a live solution exists: -->
      <!-- <a href="https://..." class="btn btn--alt" target="_blank" rel="noopener">View Solution ↗</a> -->
    </div>
  </div>
</div>
```

### 6. Sidebar in `.vitepress/config.mts`

Add a sidebar entry under `themeConfig.sidebar`:

```ts
"/[project-name]/": [
  { text: "Introduction", link: "/[project-name]/" },
  {
    text: "Functional",
    collapsed: false,
    items: [
      { text: "Overview", link: "/[project-name]/functional/" },
      { text: "Roles & Permissions", link: "/[project-name]/functional/roles-and-permissions" },
    ],
  },
  {
    text: "Technical",
    collapsed: false,
    items: [
      { text: "Overview", link: "/[project-name]/technical/" },
    ],
  },
],
```

## What NOT to do

- Do not write documentation in any language other than English (e.g., French).
- Do not use relative (`./` / `../`) links between doc pages — always link root-absolute from `documentation/` (see [Links & Cross-References](#links--cross-references)).
- Do not populate `technical/` before `functional/` and `roles-and-permissions.md` are completed.
- Do not bypass interactive choices (always provide options + "Other").
- Do not create features without explicitly defining permissions for every role.
- Do not modify `documentation/resume/index.md` for project-related content.
- Do not wrap portal cards in an `<a>` tag — navigation is handled by the explicit `.btn` elements inside `.card-actions`.
- Do not use element selectors scoped to a container (e.g. `.portal-header h1`) — add an explicit class instead.
- Do not create new VitePress theme overrides unless explicitly asked.
- Do not add hero `image`, `actions`, or `features` links that point to non-existent pages.
