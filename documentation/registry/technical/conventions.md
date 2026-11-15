---
title: 'Development conventions'
description: 'The rules shared by the Registry repositories: writing code, tests, reviews, branches and commits.'
---

# Development conventions

Registry's repositories (backend, frontend, E2E tests and this documentation) share the same core rules. This page gathers them in broad strokes. The rules specific to a stack are on its page: [Backend](/registry/technical/backend#backend-specific-conventions), [Frontend](/registry/technical/frontend#frontend-specific-conventions) and [E2E tests](/registry/technical/e2e#e2e-specific-conventions).

The detailed reference is in each repository: its `AGENTS.md` and its review skills (`.claude/skills/*-review`). If this page and a skill disagree, the skill is authoritative and this page must be corrected.

## Writing code

### Short functions

| Measure | Limit | Beyond it |
| --- | --- | --- |
| Lines in a method | 25 | Split or extract (excluding signature, blank lines and comments) |
| Parameters | 7 | Group them into a parameter object |
| Nesting levels | 2 | Extract the block into a method or a helper |
| Cyclomatic complexity | 6 | Flatten with early returns or polymorphism |

In the TypeScript projects, ESLint enforces these limits; in the backend, the review does. E2E tests are stricter (see [their page](/registry/technical/e2e#e2e-specific-conventions)).

### Readable code

- **Early return.** Error cases, null values and bounds are handled at the top of the method, to keep a flat flow.
- **Systematic extraction.** A stateless computation, formatting or validation becomes a helper; services, use cases and facades stay dedicated to orchestration.
- **No unjustified duplication.** What several features have in common is shared: components, helpers and models.
- **No dead code.** What is unused is deleted, not kept "just in case".
- **Explicit names.** A name says what the item does, without abbreviation.

### Two languages

- **Code is in English:** identifiers, log and exception messages, test titles.
- **Comments are in French.** They explain the _why_ of a choice, not the _what_ the code already says.
- **Visible texts are error-free** and translated into all the application's languages (`fr`, `en`).

Every non-passive class or unit (not a model, DTO, entity or mapper) carries a three-part documentation header:

```kotlin
/**
 * Purpose: what it does, in one or two sentences
 * Scope: what it is responsible for
 * Limits: what it deliberately does not do
 */
```

Indentation uses tabs; each repository's `.editorconfig` sets their width.

## Testing {#testing}

- **AAA structure.** Each test separates its phases with the `// Arrange`, `// Act` and `// Assert` comments (in E2E tests, with `test.step()`s).
- **Behavior, not calls.** A test checks what the user or the caller observes: returned value, HTTP status, displayed content, database row. Checking that a mock was called is not enough.
- **Edge cases.** Error paths, bounds (minimum, maximum, maximum + 1) and authorization refusals have their test.
- **Cross-project isolation.** A user of project A who tries to reach a resource of project B gets a refusal, and a test checks it.
- **Deterministic tests.** No arbitrary pauses: time is simulated (injected clock, _fake timers_) and waiting is on a condition. Each test is independent of execution order.
- **Parameterized tests.** Several cases that differ only by their data form a single parameterized test, each case being named.
- **An intact suite.** No test is disabled or weakened to get CI to pass, and coverage never drops (Kover for the backend, `angular.json` thresholds for the frontend).

## Getting it reviewed

Each repository has a `code-review` skill that chains specialized reviews, from the big picture down to the details:

| Repository | Review order |
| --- | --- |
| Backend | Architecture → cybersecurity → QA → techlead → peer review |
| Frontend | Architecture and performance → cybersecurity → QA → techlead → design → peer review |
| E2E | Architecture → cybersecurity → QA → techlead |
| Documentation | Structure → parity with the code → writing → techlead → cybersecurity |

Each review starts from 100 points and removes **40** per `blocker`, **10** per `should-fix` and **2.5** per `nit`. Only the diff is scored: a defect in existing unchanged code is flagged as debt, without penalty. A category under 100 stops there: fix it, re-evaluate it, then move on to the next one.

## Versioning: branches and commits

- **Branch:** `<user>/<type>/<ticket>`, where `<type>` follows _Conventional Commits_ (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`). Without a ticket, an issue is created from the repository's templates; the frontend accepts a short _kebab-case_ topic instead (`api-v2-migration`).
- **Commit:** a lowercase sentence, optionally prefixed with `<type>(<ticket>): ` — for example `feat(123): add search filter support`. A breaking change takes a `!` (`feat(123)!: …`) and a `BREAKING CHANGE:` footer in the description.
- **Atomicity.** Each commit can be tested on its own, and stays within the scope of the branch's ticket; otherwise, it goes on another branch.
- **Before committing**, the build is green and coverage does not drop.
- **Pushing stays manual.** No tool or agent pushes on the developer's behalf, and commits carry no `Co-Authored-by`.
