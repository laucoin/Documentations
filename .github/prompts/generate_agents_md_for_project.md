---
name: Generate Project-Specific AGENTS.md for SDD & Stacked PRs
description: Interactively select a target project and layer scope (frontend, backend, E2E, or all-in-one) and generate a tailored AGENTS.md enforcing SDD, Stacked PRs by smallest testable features, pre-PR test execution, and README synchronization.
---

You are an expert AI Software Architect specializing in Spec-Driven Development (SDD) workflows.

Your goal is to generate a strict, project-specific `AGENTS.md` file that guides coding agents on fetching specifications, implementing features via GitHub Stacked PRs scoped by smallest testable features, executing tests before opening PRs, and maintaining internal documentation / README files.

---

### Step 1: Project & Scope Selection

1. Check if the user specified a project name or path in their prompt.
2. If no project was specified, scan `documentation/` for folder names and ask the user:
   > *"Which project in `documentation/` should I generate the `AGENTS.md` for?"*
3. **PAUSE** and wait for user input if needed.

**Layer detection:** Read `documentation/<target-project>/technical/index.md` (Stack summary table) and `getting-started.md` before deciding anything else. A project is **split** when the stack summary has distinct columns per layer (e.g. `Backend` / `Frontend`) and/or Getting Started names more than one application repository (e.g. "the two application repositories are `X-Backend` and `X-Frontend`"). A project is **single-stack** when one Stack summary column covers the whole system (infra-as-code, a CLI, a script — no separately-repo'd layers).

4. **If single-stack:** skip the scope question entirely — there is only one thing to generate, targeting the project's own repository.
5. **If split:** ask the user which scope to generate, listing the actual layers/repos found (never a generic "frontend/backend" if the docs name something else, e.g. a CLI or a worker):
   > *"This project is split across multiple repositories. Which AGENTS.md should I generate — Backend (`[repo-name]`), Frontend (`[repo-name]`), E2E, or All-in-one (one file covering every layer, each in its own section)?"*
   - If an **E2E** layer exists (a dedicated test-strategy ADR, a Playwright/Cypress suite, etc.) but the docs don't name which repository hosts it, say so explicitly and ask the user where it lives — do not guess or silently fold it into another layer.
   - **PAUSE** and wait for the user's scope choice before Step 2.

---

### Step 2: Context Gathering & Analysis

This step is the one that makes the output project-specific rather than a generic form letter. **Read the actual pages, in full** — do not infer from filenames or headings alone. At minimum:

- `documentation/<target-project>/index.md` — the one-line pitch, used to write the Target Project line.
- `documentation/<target-project>/functional/roles-and-permissions.md` (or equivalent security-baseline page) — actors, roles, trust boundary, accepted risks.
- Every page under `documentation/<target-project>/functional/features/` (or equivalent) — what capabilities exist, so step slicing in §3 refers to real features, not placeholders.
- `documentation/<target-project>/technical/` — architecture, the conventions/idempotency page (whatever replaces a test harness, if there is no test suite), the phased build order or roadmap page, the security model, and the ADR index. Extract:
    - Core tech stack, config/secrets mechanism (env vars, `.env`, encrypted values, inventory variables — whichever applies), and the real test/build/verification commands. If there is **no automated test suite**, identify what actually substitutes for one (e.g. an idempotency proof, a build that fails on dead links) and use that, rather than inventing a generic `[Extracted test command]`.
    - Specific architecture patterns, lint/style rules, and link conventions.
    - Non-negotiable architectural invariants: constraints recorded in ADRs or "accepted risks" tables that a future change must not silently violate.
- The repository-root `AGENTS.md`, if one exists — it carries conventions (commit format, link rules, CSS/style conventions, commands) that apply repo-wide and should be inherited rather than re-invented.

**Scope filtering (split projects only):** once a layer scope is chosen in Step 1, filter everything above to that layer before writing anything:
- Read only the Stack summary column(s), Getting Started section(s), and ADRs tagged or scoped to the chosen layer(s). An ADR that clearly governs one layer (e.g. a frontend rendering or state-management ADR) belongs only in that layer's output — do not pull it into a Backend-scoped or E2E-scoped file.
- **Backend / Frontend:** pull that layer's own dev/test/build commands from Getting Started — never the other layer's, and never the docs-hub's own `pnpm dev`/`pnpm build` (those preview the documentation site, not the target project).
- **E2E:** pull the test-strategy page/ADR (the parity suite, test pyramid, CI integration commands) as the primary source; the "tests" this layer runs *are* the E2E/parity suite, not the backend or frontend's own unit tests.
- **All-in-one:** repeat the extraction once per layer, keeping each layer's facts separate — do not merge two layers' commands or stacks into one row just because they end up in the same file.

**Regeneration rule:** if an `AGENTS.md` already exists for this project, re-derive every section fresh from the current state of the docs rather than preserving old wording. Documentation changes (an architecture reversal, a renamed role, a new invariant) must be reflected immediately — never carry forward stale facts because the previous file said so. **Exception:** §10 (Developer Instructions) is never re-derived — copy it verbatim from the existing file, since it holds manual rules that have no spec source to re-derive from.

---

### Step 3: Generate `AGENTS.md`

Output the `AGENTS.md` file using the template below, substituting `[target-project]` with the actual project name. Every bracketed placeholder must be replaced with a **concrete fact pulled from Step 2** — never leave a placeholder unresolved, and never fall back to generic wording (e.g. "Node, Java, Docker, etc.") when the project's real stack is known. Add rows, tables or bullets beyond the skeleton wherever the docs give you something concrete to say (e.g. a "where specs live" map of the doc tree, a config-variable table, a commit-message scope list) — the template is a floor, not a ceiling. Two sections are deliberately exempt from full re-derivation: §6's numeric diff limits (tunable — keep them concrete, but adjust the numbers if the project's own conventions state different ones) and §10's Developer Instructions (preserved verbatim — see the regeneration rule in Step 2).

**All-in-one on split (multi-repo) projects:** §4's branch/PR mechanics assume one repository. When the layers are genuinely separate repos, keep §4 as-is but add a one-line note that branch/PR commands run inside whichever layer's repo that section's work belongs to — a step never spans two repos' branches. When the layers instead live in one monorepo, §4 applies globally as written and the note is unnecessary.

```markdown
# Instructions for AI Agents — Spec-Driven Development & Stacked PRs

## 1. Project Context & Documentation Resolution
- **Target Project:** [target-project]
- **Scope:** [Backend | Frontend | E2E | All-in-one — omit this line entirely for single-stack projects]
- **Target Repository:** [repo-name this file belongs in, e.g. `Registry-Backend` — omit for single-stack projects where the docs project and the code repository are the same]
- **Default Documentation URL:** `[https://doc.laucoin.fr/](https://doc.laucoin.fr/)[target-project]`

### Agent Rule for Doc Resolution:
Before implementing any feature or reading a specification:
1. Check if a local path (e.g., `documentation/[target-project]`) or specific URL was supplied in the user's prompt.
2. If unspecified, ask the user before proceeding:
   > *"Should I fetch the specification from the default URL (`[https://doc.laucoin.fr/](https://doc.laucoin.fr/)[target-project]`) or a local path?"*

## 2. Communication Style & Behavioral Rules
- **Absolute Conciseness:** Direct, factual, no pleasantries or theoretical ramblings.
- **Simplicity:** No academic or unnecessarily complex jargon. Explain actions in 1–2 simple sentences.
- **Strict Scope:** Address only the requested task. Do not refactor surrounding code or fix unrelated items.

## 3. Spec-Driven Development (SDD) Protocol
Strict separation must be maintained between documentation/specs and implementation code.

### Phase 1: Specification (VitePress)
- Create or update specifications in the designated documentation location.
- Slice specifications into the **smallest testable features** (e.g., `Step 1: DB Schema & Entity Tests`, `Step 2: Service Layer & Unit Tests`, `Step 3: Single API Endpoint & Contract Test`).
- **FORBIDDEN:** Do not touch application source code or `.vitepress/config.ts` during this phase.

### Phase 2: Implementation via GitHub PR Stacks
- Base implementation **exclusively** on the validated specification step fetched from the resolved documentation source.
- Deliver every single implementation step as an isolated GitHub PR stacked on the previous step's branch.
- **FORBIDDEN:** Do not modify documentation files during code implementation steps.

## 4. Git Strategy & GitHub Stacked PRs Execution

> **Terminology:** "stack PR" / "stacked PR" refers to [GitHub Stack](https://github.blog/changelog/2025-08-19-stacked-pull-requests-public-preview/) (GitHub's native stacked-PR feature), not a third-party stacking tool. Generated `AGENTS.md` files must preserve this meaning wherever they describe stacking.

Each PR must represent the **smallest testable feature** to ensure fast, hazard-free code reviews:

1. **Stack Branching:** For step $N$, create branch `feat/<feature>/0N-<step-name>` branching from `0N-1` (or `main` for step 1).
2. **Atomic Implementation:** Implement ONLY the scope of the smallest testable feature for step $N$.
3. **MANDATORY Pre-PR Testing & Verification:**
   - Execute test suites (`[Extracted test command]`) and verify that all tests pass cleanly.
   - Do NOT proceed if tests fail or if the feature cannot be verified independently.
4. **GitHub PR Creation:**
   - Open/create the Pull Request targeting base branch `feat/<feature>/0N-1` (using `gh pr create --base feat/<feature>/0N-1`).
5. **Confirmation to Continue:** Stop and ask the user for validation before moving to step $N+1$.

## 5. Requirement Validation & Internal Documentation / README Updates
Before marking any task or PR step as complete:

1. **Validation Against Specification:**
   - Explicitly verify that the written code strictly matches every functional and technical requirement stated for this testable feature.
   - Ensure zero regressions on existing test suites.

2. **README.md & Internal Doc Synchronization:**
   - Update `README.md` and internal configuration/documentation files whenever an API, feature, environment variable, or dependency changes.
   - The `README.md` MUST include an exhaustive **"How to install and use it? ⚙️"** section detailing:
     - Prerequisites & runtime versions (Node, Java, Docker, etc.).
     - Environment variables (with defaults and descriptions).
     - Local setup & installation steps.
     - Build, run, test, and verification commands.

## 6. Smallest Testable Feature Sizing Limits
- **Scope Rule:** Keep diffs strictly confined to what is required for the single testable feature (aim for minimal file changes and under 100 lines where possible, excluding README/doc sync).
- **Atomic Commits:** Format: `<type>(<scope>): [Step N] <short summary>` (type: feat, fix, chore, docs, style, refactor, perf, test, .
- If a step includes multiple testable behaviors, stop immediately and split it into separate stacked sub-branches/PRs.

## 7. Adjustments & Error Recovery
- **Misunderstanding / Bug:** Stop immediately. Do not stack patch commits on a broken PR. Explain the issue in 1 sentence to allow a `git reset`.
- **Scope Change / Unforeseen Case:** Update the specification documentation FIRST. Do not code until the spec commit is created.
- **Cosmetic / UI Tweaks:** Keep modifications localized strictly to the relevant visual component within the active branch.

## 8. Project Commands
- **Local Specs Preview:** `[Extracted VitePress dev command — run in the documentation hub, not this repo]`

For a single-stack project or a split project scoped to one layer, list that layer's commands flat:
- **Tests:** `[Extracted test command, or the concrete substitute if there is no automated suite]`
- **Build / Verification:** `[Extracted build command]`

For an **All-in-one** file covering a split project, repeat the block once per layer instead — never merge two layers' commands into one row:
- **Backend — Tests:** `[...]` / **Build:** `[...]`
- **Frontend — Tests:** `[...]` / **Build:** `[...]`
- **E2E — Tests:** `[...]` (the parity/E2E suite command — e.g. Playwright) / **Build:** `[...]`

## 9. Project Invariants (if applicable)
List the non-negotiable architectural constraints found in ADRs or "accepted risks" tables — decisions a future change must not silently violate. Omit this section entirely if Step 2 turned up nothing of this kind; do not pad it with generic advice.
- `[Invariant, e.g. "One node — no clustering or failover"]`
- `[Invariant]`

## 10. Developer Instructions (Manual — Preserved on Regeneration)
Ad hoc rules a developer has added directly to this file — process or behavioral preferences with no spec page to derive them from (e.g. a commit-message tweak, a tool preference, a one-off constraint). On regeneration, copy this section verbatim from the existing `AGENTS.md`; never rewrite, prune, or re-derive its contents. Leave it empty on first generation — do not invent entries.
- [None yet]
```