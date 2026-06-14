# Agent Instructions

This file documents conventions for AI agents (Claude Code, Copilot, etc.) working on this repository. Follow these rules precisely so that all pages remain visually and structurally consistent.

## Commands

| Command        | Purpose                  |
| -------------- | ------------------------ |
| `pnpm dev`     | Start local dev server   |
| `pnpm build`   | Build for production     |
| `pnpm preview` | Preview production build |

## Repository layout

```
.
├── .vitepress/config.mts       — site config: title, sidebar, footer, search
├── documentation/
│   ├── index.md                — portal home (layout: page, custom HTML/CSS)
│   ├── resume/index.md         — CV page (layout: page, custom HTML/CSS)
│   └── [project]/
│       ├── index.md            — project landing (layout: home, VitePress YAML frontmatter)
│       ├── functional/         — business domain: entities, features, workflows
│       │   └── index.md
│       └── technical/          — engineering: ADR, diagrams, runbooks
│           └── index.md
└── README.md
```

## CSS conventions — OOCSS

All inline `<style scoped>` blocks follow **OOCSS** (Object-Oriented CSS). Split every style block into two clearly labelled sections:

```css
/* =============================================
   OBJECTS — structure (layout, shape, spacing)
   ============================================= */

/* =============================================
   SKINS — visual decoration (colors, borders)
   ============================================= */
```

### Rules

- **Never** use container-descendant selectors (e.g. `.card-header h4`). Always add an explicit class to the element.
- **Separate structure from skin**: `.card` holds `border-radius` + `padding`; `.card--soft` holds `background-color` + `border` + `transition`.
- Use `--modifier` suffix for skin variants on the same object (`.btn--primary`, `.btn--alt`, `.badge--date`, `.badge--skill`).
- Shared link skin across pages: `.link-brand` for brand-coloured anchor tags.
- Shared badge pattern: `.badge` base + `.badge--date` or `.badge--skill` modifier.

## Adding a new project

Follow this checklist in order.

### 1. Create the directory structure

```
documentation/[project-name]/
├── index.md            ← project landing page (required)
├── functional/
│   └── index.md        ← functional section entry point (required)
└── technical/
    └── index.md        ← technical section entry point (required)
```

### 2. `index.md` — project landing page

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
    details: Business objects and features.
    link: /[project-name]/functional/
  - title: Technical Documentation
    details: Architecture decisions and diagrams.
    link: /[project-name]/technical/
---
```

### 3. `functional/index.md` — functional section entry

Plain markdown doc page (no special frontmatter needed). Use it as the entry point to the business domain documentation: domain entities, features, workflows.

### 4. `technical/index.md` — technical section entry

Plain markdown doc page. Use it as the entry point to engineering documentation: ADR (Architecture Decision Records), system diagrams, deployment topology, runbooks.

### 5. Portal card in `documentation/index.md`

Add a `<div class="card card--portal">` block to the `.portal-grid`. Structure:

- `.card-icon` — emoji or icon
- `.card-body` — flex column for text + actions
  - `.card-title` — project name (`<h3>`)
  - `.card-description` — short description (`<p>`)
  - `.card-actions` — row of buttons
    - **Mandatory** `.btn.btn--primary` → links to `/[project-name]/`
    - **Optional** `.btn.btn--alt` → links to the live solution (external URL). Omit if no deployed solution exists.

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

- Do not modify `documentation/resume/index.md` for project-related content.
- Do not wrap portal cards in an `<a>` tag — navigation is handled by the explicit `.btn` elements inside `.card-actions`.
- Do not use element selectors scoped to a container (e.g. `.portal-header h1`) — add an explicit class instead.
- Do not create new VitePress theme overrides unless explicitly asked.
- Do not add hero `image`, `actions`, or `features` links that point to non-existent pages.
