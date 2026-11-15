---
title: 'E2E tests'
description: 'How the Registry-E2E repository checks the application’s user journeys in a real browser, and its conventions.'
---

# E2E tests

`Registry-E2E` — a TypeScript Playwright suite that drives the application in a real browser, against the backend and frontend running locally. Its role is to act as a **safety net**: catch a regression after a version upgrade or a new feature, without going through the whole application by hand again.

It is not an exhaustive acceptance test. Display combinations and each field's bounds belong to the unit tests of the [frontend](/registry/technical/frontend#tests-and-e2e-hooks) and the [backend](/registry/technical/backend#tests); the E2E suite covers the critical journeys, the important business rules and the rights.

## Test plan

The repository keeps a test plan (`docs/test-plan.md`) derived from the [functional documentation](/registry/functional/) checked against the code. Each scenario has an identifier (`CRIT-01`, `AUTH-03`…), a priority (P0 for a critical journey, P1 for a business rule or a right, P2 for display) and a level: **UI** through the browser, or **API** through a direct backend call for rules without a dedicated rendering. Each test title starts with its identifier, so a search leads from the rule to the test.

## Repository layout

| Folder | Alias | Content |
| --- | --- | --- |
| `specs/` | — | The scenarios, sorted by domain |
| `pages/` | `@pages/` | One _page object_ per screen, with business methods (`create`, `record`…) |
| `components/` | `@components/` | What several screens share: item picker, confirmation dialog, form submission… |
| `fixtures/` | `@fixtures/` | `test.extend`: injects the page objects and the data helper into tests |
| `support/` | `@support/` | The tooling: accounts, sign-in, API client, test data, dates, permission matrix |

A scenario never touches a selector: it calls page objects and checks the locators they expose. Page objects target the `data-test-id` attribute the frontend sets on every interactive element (configured as Playwright's `testIdAttribute`), or an accessible role and label.

## Sessions and accounts

The suite signs in **only once per account**: before the tests, `support/global-setup.ts` signs in each account of the seed data set through the identity provider and saves its session (`storageState`). A test starts signed in as the platform administrator; one that needs another account declares it with `test.use`. The sign-in form is filled in by a provider-specific adapter (Authentik locally, Keycloak supported).

The accounts are those of the Authentik blueprint described in [Getting started](/registry/technical/getting-started). The matrix of expected permissions for each project role (`support/permissions.ts`) is read from the backend's migrations.

## Test data

Each test creates what it needs and leaves nothing behind:

- the `data` helper creates projects, participants, groups, vehicles, activities, alerts and movements **through the API**, faster than through the interface; the created projects are deleted at the end of the test;
- names carry a random suffix, so tests run in parallel and can be replayed without collisions;
- the API client reuses the saved session cookies and sends the CSRF header the backend requires for writes.

Tests run in parallel on several workers. Those that modify a seed account (blocking, demotion, deletion) or sign in through the identity provider, which the backend rate-limits, carry the `@exclusive` tag: they run alone, after the others. The `@smoke` tag marks the critical journey.

## E2E-specific conventions {#e2e-specific-conventions}

The shared rules are on the [Development conventions](/registry/technical/conventions) page. On top of them:

- **Linear scenarios.** A `.spec.ts` contains no `if` or loop (complexity of 1); a scenario fits in 50 to 70 lines and a file in 150. Page objects and fixtures are limited to a complexity of 4.
- **Readable steps.** Each phase is a `test.step()` described in English, which structures the scenario into Arrange, Act and Assert and shows up in the HTML report.
- **Intent-based page objects.** Their locators are `readonly` and their methods carry a business action (`archiveProject(keyword)`), not a mere click.
- **Fixture-based injection.** Page objects come in through `test.extend`, never through a `new` in a `beforeEach`; a fixture cleans up what it created.
- **No arbitrary waits.** Neither `waitForTimeout` nor pauses: Playwright's assertions wait on their own (`toBeVisible`, `toHaveText`…), and a navigation is awaited through a condition (`waitForURL`, `waitForResponse`). The configuration's global timeouts are not overridden locally.
- **Robust selectors.** `data-test-id` first, then accessible roles and labels; never a selector tied to the DOM structure or to a style class.
- **A clean console.** A journey must produce neither a console error nor a server `500` error.
- **Lightweight artifacts.** Traces and screenshots are kept only on failure.
- **Strict TypeScript.** No `any`, explicit return types on public methods, aliases (`@pages/`, `@components/`, `@fixtures/`, `@support/`) rather than `../` imports, no `.only`, and no `.skip` or `.fixme` without a ticket.

### Security

- **No secrets in the repository.** Passwords and addresses come in through environment variables (`.env`, documented by `.env.example`); saved session files are excluded from Git.
- **Fictitious data.** No real personal data in tests; the accounts are dedicated test accounts, never personal or production accounts.
- **A test environment.** The suite targets a local or staging environment, never production.
- **Verified certificates.** `ignoreHTTPSErrors` is never enabled globally.

## Running the suite

The suite needs the whole local stack ([Getting started](/registry/technical/getting-started)): PostgreSQL and Authentik, the backend and the frontend.

```bash
pnpm install && pnpm exec playwright install chromium
cp .env.example .env    # BASE_URL, API_URL, IDP, AU_PASS
pnpm test               # all tests: the parallel ones, then the @exclusive ones
pnpm test:smoke         # the critical journey
pnpm test:ui            # Playwright's UI mode, to run and debug a test
pnpm report             # the latest HTML report (steps, screenshots and traces of failures)
```

::: warning Raise the rate limits locally
Each test creates its own project, and the backend limits project creation per user and per hour. Run the local backend with `REGISTRY_PROJECT_CREATION_RATE_LIMIT_CAPACITY` raised (for example `10000`), otherwise the suite fails after a dozen tests. The same goes for personal data exports (`REGISTRY_EXPORT_RATE_LIMIT_CAPACITY`) if the suite runs several times within the hour.
:::
