# Agent Instructions

This file documents conventions for AI agents (Claude Code, Copilot, etc.) working on this repository. Follow these
rules precisely so that all pages remain visually and structurally consistent.

## General AI Rules & Workflow

1. **Language:**
    - **Conversation:** Reply to the user in whichever language they use to write to you.
    - **Edits:** Every file written to this repository (functional, technical, landing pages, commit messages, code
      comments) **must be strictly in English**, regardless of the language the user asked in or requested it in.
2. **Interactive First:** Always guide the user interactively. Present structured choices/options and ALWAYS include an
   `"Other (please specify)"` choice.
3. **Sequential Documentation Flow:**
    - **Step 1 — Functional First:** Focus on complete business domain requirements, roles & permissions (RBAC), user
      flows (BDD Gherkin scenarios), domain entities, and functional specs in
      `documentation/[project-name]/functional/`.
    - **Step 2 — Technical Second:** Never draft, complete, or make technical decisions
      (`documentation/[project-name]/technical/`) before the functional specs and security baseline are completed and
      fully established.
4. **Project Hub Context:** Remember this repository acts both as a central global documentation system and a hub to
   navigate between projects.
5. **Technical Decision Protocol:** A technical choice is never a non-choice. When a decision has more than one viable
   option (a library, a pattern, an architecture, a data model), present at least two alternatives with their
   advantages/drawbacks and a recommendation — then let the user make the final call. Never silently pick one option and
   present it as the only path.

---

## Communication Style & Concision

- **Absolute conciseness:** Direct, factual answers — no pleasantries, no theoretical ramblings.
- **No jargon:** Avoid complex or academic vocabulary. Explain actions in 1–2 simple sentences.
- **Strict scope:** Address only the requested task. Do not refactor surrounding content or fix unrelated items in
  passing.

---

## Commands

| Command        | Purpose                                                       |
|----------------|---------------------------------------------------------------|
| `pnpm dev`     | Start local dev server                                        |
| `pnpm build`   | Build for production — also the dead-link checker (see below) |
| `pnpm preview` | Preview production build                                      |

---

## Mandatory Pre-Task Validation

**No task, edit, or commit may be marked complete without a clean `pnpm build` run.**

1. Run `pnpm build` after any change that touches content, links, or file paths — and always before closing out a task.
2. The build fails on dead links and broken pages. A failing build means the task is **not** done, regardless of how
   complete the content looks.
3. Fix every reported error and re-run the build until it passes cleanly. Do not hand off, commit, or report completion
   on a red build.
4. Before closing out a task, check whether `README.md` needs updating (new commands, changed structure, new
   projects/sections) and update it if so.

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

All in-repo links **must be root-absolute** — resolved from the VitePress source root (`documentation/`, the `srcDir`),
never relative (`./`, `../`) to the current file. Relative links break the moment a file changes depth; root-absolute
links survive moves and restructures.

| Rule                          | Wrong                                               | Right                                                                                                         |
|-------------------------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| Always start with `/`         | `./architecture`, `../technical/architecture`       | `/registry/technical/architecture`                                                                            |
| Omit the `.md` extension      | `/registry/technical/adr/017-api-v2-conventions.md` | `/registry/technical/adr/017-api-v2-conventions`                                                              |
| Trailing slash on index pages | `/registry/technical/adr`                           | `/registry/technical/adr/`                                                                                    |
| Anchors appended as-is        | n/a                                                 | `/registry/functional/roles-and-permissions#project-options-gating` (same-page anchors stay bare: `#section`) |

`pnpm build` is the authority: it fails on dead links. Run it after touching links or moving pages
(see [Mandatory Pre-Task Validation](#mandatory-pre-task-validation)). `.vitepress/config.mts` sidebar links already
follow this convention.

---

## Editor Formatting — Markdown Is Reformatted On Save

The IDE reformats Markdown on save: it **reflows prose to the editor's line width** and **realigns table pipes**. This
happens to files an agent has already written, often while the agent is still working, so a clean working tree can
acquire modifications nobody typed.

Treat that as expected, not as corruption — but check it, because one reformat is **not** safe.

### The one that breaks rendering

VitePress custom containers take their title from **the remainder of the marker line**. Reflowing pulls the first line
of the body up onto that line, so the whole paragraph becomes the title:

|           | Markdown                                                         | Renders as                                                         |
|-----------|------------------------------------------------------------------|--------------------------------------------------------------------|
| **Right** | `::: tip Short title`<br>`Body text on the next line.`<br>`:::`  | Title: *Short title*                                               |
| **Wrong** | `::: tip Short title Body text pulled up by the reflow`<br>`:::` | Title: *Short title Body text pulled up by the reflow*, body empty |

**After any reformat, inspect every `:::` marker line and re-split any that swallowed its body.** The build does **not**
catch this — the page compiles happily and renders wrong, so `pnpm build` passing is not evidence that the callouts
survived.

A quick way to spot suspects:

```shell
grep -rn "^::: \(tip\|warning\|info\|danger\|details\) " documentation/ | awk 'length($0)>120'
```

### Rules

- **Never fight the formatter.** Do not hand-rewrap prose to defeat it, and do not add formatter-disabling pragmas. Let
  it reflow, then repair what it broke.
- **Commit reformatting separately.** A reformat touching many files must land as its own `style(...)` commit, never
  mixed into a content commit — otherwise the real change is unreviewable in the diff.
- **Put the reformat on the branch that owns the files.** In a stacked series, formatting of `functional/` pages belongs
  to the functional PR and `technical/` pages to the technical one. Split the working tree by path, commit each on its
  own branch, then rebase the later branches (see [Git Strategy — Stacked PRs](#git-strategy--stacked-prs)).
- **Verify Mermaid and fenced code still render.** Reflow does not respect diagram semantics; check any page whose
  diagram or code block was touched.
- **Re-check after the final save**, since the formatter may run again on the last edit before you commit.

---

## CSS Conventions — OOCSS

All inline `<style scoped>` blocks follow **OOCSS** (Object-Oriented CSS). Split every style block into two clearly
labelled sections:

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
- Separate structure from skin: `.card` holds `border-radius` + `padding`; `.card--soft` holds `background-color` +
  `border` + `transition`.
- Use `--modifier` suffix for skin variants on the same object (`.btn--primary`, `.btn--alt`, `.badge--date`,
  `.badge--skill`).
- Shared link skin across pages: `.link-brand` for brand-coloured anchor tags.
- Shared badge pattern: `.badge` base + `.badge--date` or `.badge--skill` modifier.

---

## Git Strategy — Stacked PRs

Any task spanning more than one independently reviewable change (e.g. a project's functional **and** technical docs, or
several unrelated fixes) must be split into the smallest reviewable units and stacked as sequential PRs — never bundled
into one large PR:

1. **Branch per step:** `docs/<project>/0N-<step-name>`, branching from step `0N-1` (or from `main` for step 1).
2. **One scope per PR:** each PR covers exactly one step — no unrelated changes riding along.
3. **Clean build first:** `pnpm build` must pass (see [Mandatory Pre-Task Validation](#mandatory-pre-task-validation))
   before opening each PR.
4. **Stack the base:** open the PR against the previous step's branch, not `main`.
5. **Confirm before continuing:** stop and get user validation before starting the next step in the stack.

This mirrors the Spec-Driven Development / Stacked PR discipline defined in
`.github/prompts/generate_agents_md_for_project.md` for per-project `AGENTS.md` generation.

---

## Error Handling & Rollback Protocol

- **Spec misunderstanding:** If a change turns out to be based on a misread or outdated spec, **stop immediately**. Do
  not stack a correction commit on top of the wrong one — roll back (`git reset` / revert) to the last known-good state
  and redo the step cleanly.
- **Scope change:** If the required scope changes mid-task, update the specification/documentation first, then
  implement — never code ahead of an unwritten spec change.
- **Explain, then retry:** When rolling back, state in one sentence what was misunderstood before redoing the work.

---

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

- Focus: Business domain, functional specs, domain entities, user journeys, BDD scenarios, and feature permission
  matrix.
- Rule 1 (Security Baseline): `functional/roles-and-permissions.md` must define global authentication status, tenant
  scopes, and available roles.
- Rule 2 (Reciprocity): Adding a new role requires defining its permissions across ALL existing features.
- Rule 3 (Language): Must be drafted and validated in English before starting technical specifications.

### 4. `technical/index.md` — Technical Section Entry (Step 2)

Plain markdown doc page.

- Focus: Engineering specs, Architecture Decision Records (ADR), system diagrams, deployment topology, runbooks.
- Gatekeeper Rule: Do not fill or outline this section until Step 1 (Functional Documentation and Roles Matrix) is
  completed and validated.

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
- Do not use relative (`./` / `../`) links between doc pages — always link root-absolute from `documentation/`
  (see [Links & Cross-References](#links--cross-references)).
- Do not leave a `:::` container whose title line swallowed its body after an editor reformat, and do not assume a green
  build means the containers survived (see [Editor Formatting](#editor-formatting--markdown-is-reformatted-on-save)).
- Do not mix an editor reformat into a content commit — land it as its own `style(...)` commit.
- Do not populate `technical/` before `functional/` and `roles-and-permissions.md` are completed.
- Do not bypass interactive choices (always provide options + "Other").
- Do not create features without explicitly defining permissions for every role.
- Do not modify `documentation/resume/index.md` for project-related content.
- Do not wrap portal cards in an `<a>` tag — navigation is handled by the explicit `.btn` elements inside
  `.card-actions`.
- Do not use element selectors scoped to a container (e.g. `.portal-header h1`) — add an explicit class instead.
- Do not create new VitePress theme overrides unless explicitly asked.
- Do not add hero `image`, `actions`, or `features` links that point to non-existent pages.
- Do not mark a task, edit, or commit complete without a clean `pnpm build` run.
- Do not make a technical decision unilaterally when viable alternatives exist — present the options with pros/cons and
  let the user choose.
- Do not stack a correction commit on top of a change based on a misunderstood spec — roll back and redo instead.
- Do not bundle multiple independently reviewable changes into a single PR — stack them
  (see [Git Strategy — Stacked PRs](#git-strategy--stacked-prs)).
