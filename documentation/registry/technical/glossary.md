---
title: 'Glossary'
description: 'The technical terms and jargon used in Registry’s technical documentation, with their definitions.'
---

# Glossary

This page defines the established technical terms (_backend_, _token_, _build_…) used throughout the documentation, along with the acronyms and the project's own vocabulary. Business terms (project, participant, movement…) are defined in the [Domain model](/registry/functional/domain-model).

## Architecture and backend

| Term | Definition | See |
| --- | --- | --- |
| **ADR** | _Architecture Decision Record_: a short document that records an architecture decision, its context and its consequences. | [ADR index](/registry/technical/adr/) |
| **ArchUnit** | Test library that checks the dependency rules between packages; the build fails if one is violated. | [Backend](/registry/technical/backend) |
| **Contract-first** | Controller pattern: an interface carries the contract (path, access rule, validation, OpenAPI), the implementation only delegates. | [Backend](/registry/technical/backend#controller-pattern) |
| **Core / support service** | A `core/` service carries a resource's rules; a `support/` service provides a technical service without a business resource (audit, translation, cache). | [Backend](/registry/technical/backend#backend-specific-conventions) |
| **Driven adapter** | What the domain calls, through a port: the PostgreSQL database, the identity provider. | [Architecture](/registry/technical/architecture) |
| **Driving adapter** | What calls the domain from the outside: the REST API, the scheduler. | [Architecture](/registry/technical/architecture) |
| **DTO** | _Data Transfer Object_: an object that carries the data of a request (_writer_) or a response (_reader_), separate from the domain models. | [Architecture](/registry/technical/architecture) |
| **Endpoint** | An API operation: an HTTP verb on a path. | [API contract](/registry/technical/api-reference) |
| **Entity** | An object that represents a database row; it never leaves the PostgreSQL package. | [Backend](/registry/technical/backend) |
| **ETag / If-Match** | Optimistic concurrency headers: a read returns the item's version, a write sends it back and fails with `412` if the item changed in the meantime. | [API contract](/registry/technical/api-reference) |
| **Feature flag** | A setting that enables or disables a feature per environment (documentation, observability, email invitation). | [Backend](/registry/technical/backend) |
| **Flyway** | Migration tool: each schema change is a versioned file, applied once and never modified afterwards. | [Data model](/registry/technical/data-model) |
| **Helper** | A stateless class or object that carries a reusable computation, formatting or validation, so that services stay dedicated to orchestration. | [Conventions](/registry/technical/conventions) |
| **Hexagonal architecture** | _Ports and adapters_ organization: the domain is at the center and knows neither HTTP, nor the database, nor the identity provider. | [Architecture](/registry/technical/architecture) |
| **Management port** | The backend's second port, without authentication, serving health, metrics and the API documentation; it must never be exposed to the Internet. | [Security](/registry/technical/security#network-exposure-the-management-port) |
| **Mapper** | What converts one object into another (DTO, model, entity) and nothing else; MapStruct generates it on the backend. | [Backend](/registry/technical/backend) |
| **Mono / Flux** | Reactor types that represent a result to come: zero or one value (`Mono`), zero or more (`Flux`). | [Backend](/registry/technical/backend) |
| **Port** | An interface defined by the domain and implemented by an adapter. | [Architecture](/registry/technical/architecture) |
| **Principal** | The request's authenticated user, as the backend rebuilds it from the token. | [Security](/registry/technical/security) |
| **R2DBC** | Reactive (non-blocking) database access driver. | [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc) |
| **Reactive** | Non-blocking programming style: a thread never waits for a response, it handles something else in the meantime. | [Backend](/registry/technical/backend) |
| **Seed** | Development data set injected into the local database (test accounts, sample projects). | [Getting started](/registry/technical/getting-started) |
| **Trigrams** | Splitting a text into sequences of three characters (`pg_trgm`), which makes search tolerant of typos and accents. | [ADR 006](/registry/technical/adr/006-flyway-trigram-search) |
| **UseCase** | A service that orchestrates several resources for a business journey; only controllers call it. | [Backend](/registry/technical/backend#backend-specific-conventions) |

## Frontend

| Term | Definition | See |
| --- | --- | --- |
| **Bundle** | The JavaScript and CSS files produced by the build and served to the browser; their size is capped by budgets. | [Frontend](/registry/technical/frontend) |
| **Design system** | A library of shared components and visual tokens; here `@sgdf/ui`, _web components_ that own the theme. | [ADR 014](/registry/technical/adr/014-sgdf-ui-design-system) |
| **Design token** | A `@sgdf/ui` CSS variable (`--sgdf-*`) for colors, typography, radii and shadows. | [Frontend](/registry/technical/frontend#frontend-specific-conventions) |
| **Facade** | The single public entry point of a frontend domain: it exposes signals and relays calls to the store. | [Frontend](/registry/technical/frontend) |
| **Guard** | A function that allows or denies access to a route; it is a usability aid, the backend re-checks everything. | [Frontend](/registry/technical/frontend) |
| **Interceptor** | A function that processes each outgoing HTTP request and its response: cookies, CSRF header, session refresh, errors. | [Frontend](/registry/technical/frontend) |
| **Lazy loading** | On-demand loading: a route's or a component's code is only downloaded when it is needed (`loadComponent`, `@defer`). | [Frontend](/registry/technical/frontend) |
| **Signal** | An Angular reactive value: whatever reads it updates when it changes. | [Frontend](/registry/technical/frontend) |
| **Signal Forms** | Angular's signal-based forms API. | [Frontend](/registry/technical/frontend) |
| **SPA** | _Single Page Application_: a single HTML page loaded once, whose content changes without reloading; nginx returns `index.html` for any unknown route. | [Frontend](/registry/technical/frontend) |
| **Store (SignalStore)** | A domain's state container, built with `@ngrx/signals`; only it changes its state. | [ADR 013](/registry/technical/adr/013-signal-stores-and-facades) |
| **Zoneless** | Angular change detection driven by signals, without the `zone.js` library. | [Frontend](/registry/technical/frontend) |

## Security

| Term | Definition | See |
| --- | --- | --- |
| **Confidential client** | An OAuth2 client that holds a secret, kept server-side; here the backend, which exchanges the sign-in code for the tokens. | [Security](/registry/technical/security) |
| **CORS** | Rules that tell the browser which sites can call the API. | [Security](/registry/technical/security) |
| **CSP** | A policy that tells the browser which resources a page can load and run. | [Security](/registry/technical/security#browser-hardening) |
| **CSRF** | An attack that makes a signed-in user perform an action from another site. | [Security](/registry/technical/security#cookie-based-session-csrf-protection) |
| **Distroless** | A container image reduced to the application and its runtime, with no shell or package manager. | [Security](/registry/technical/security) |
| **HSTS** | A header that enforces the use of HTTPS. | [Security](/registry/technical/security#browser-hardening) |
| **HttpOnly cookie** | A cookie the page's JavaScript cannot read; here it carries the session tokens. | [Security](/registry/technical/security) |
| **JIT (provisioning)** | _Just-in-time_: automatic creation of the application account on an unknown user's first sign-in. | [Security](/registry/technical/security) |
| **JWKS** | The identity provider's set of public keys, used to verify the signature of JWTs. | [Security](/registry/technical/security) |
| **JWT** | A signed token that contains the user's identity; its signature makes it possible to verify that it has not been tampered with. | [Security](/registry/technical/security) |
| **Multi-tenant** | Several organizations (here, projects) share the same application without seeing each other's data. | [Security](/registry/technical/security#authorization) |
| **Nonce** | A single-use random value; here, it authenticates a page's legitimate scripts. | [Security](/registry/technical/security#browser-hardening) |
| **OIDC / OAuth2** | Standard protocols for delegating authentication to an identity provider. | [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth) |
| **PKCE** | An OAuth2 extension that protects the sign-in code exchange for a client without a secret (here, Swagger UI). | [Getting started](/registry/technical/getting-started) |
| **Rate limiting** | A maximum number of requests per caller and per period. | [Security](/registry/technical/security#rate-limiting) |
| **RBAC** | Role-based access control. | [Roles and permissions](/registry/functional/roles-and-permissions) |
| **Resource server** | The backend's OAuth2 role: it accepts a request only if it carries a valid token. | [Security](/registry/technical/security) |
| **Soft delete** | Reversible hiding of an item, as opposed to permanent deletion. | [Security](/registry/technical/security#visibility-gating) |
| **XSS** | Injection of a malicious script into a page, which runs with the user's rights. | [Security](/registry/technical/security) |

## Tests

| Term | Definition | See |
| --- | --- | --- |
| **AAA** | _Arrange, Act, Assert_: a test prepares its context, performs the action, then checks the result, three phases separated by a comment. | [Conventions](/registry/technical/conventions#testing) |
| **Component Harness** | An object that drives an Angular component in a test through its behavior, without depending on its template's structure. | [Frontend](/registry/technical/frontend) |
| **`data-test-id`** | An attribute set on every interactive element of the frontend; it is the contract that lets E2E tests target it. | [Frontend](/registry/technical/frontend#tests-and-e2e-hooks) |
| **E2E** | _End-to-end_: a test that drives the complete application in a real browser, from the frontend down to the database. | [E2E tests](/registry/technical/e2e) |
| **Fake timers** | A simulated clock in a test, advanced by hand instead of waiting. | [Conventions](/registry/technical/conventions#testing) |
| **Fixture** | In Playwright, what a test receives ready to use (page objects, data helper) and which cleans itself up at the end. | [E2E tests](/registry/technical/e2e) |
| **Flaky** | Said of a test that fails randomly, without any code change; the determinism rules exist to prevent it. | [Conventions](/registry/technical/conventions#testing) |
| **Locator** | In Playwright, the designation of a page element, re-evaluated on each use. | [E2E tests](/registry/technical/e2e) |
| **Page object** | A class that represents a screen and exposes its business actions; E2E scenarios go through it instead of manipulating the page. | [E2E tests](/registry/technical/e2e) |
| **Parameterized test** | A single test run over a table of named cases, when the cases differ only by their data. | [Conventions](/registry/technical/conventions#testing) |
| **Smoke test** | A quick test of the critical path, run to check that the essentials work (`@smoke` tag). | [E2E tests](/registry/technical/e2e) |
| **`storageState`** | A browser session (cookies) saved by Playwright, reused to avoid signing in again for each test. | [E2E tests](/registry/technical/e2e) |
| **Testcontainers** | A library that starts a real PostgreSQL database in a container for the duration of the integration tests. | [Backend](/registry/technical/backend#tests) |

## Ways of working

| Term | Definition | See |
| --- | --- | --- |
| **Blocker / should-fix / nit** | Severity of a review point: blocking (−40), should fix (−10), detail (−2.5). | [Conventions](/registry/technical/conventions) |
| **Breaking change** | A change that breaks a contract's compatibility; it is flagged with a `!` and a `BREAKING CHANGE:` footer in the commit. | [Conventions](/registry/technical/conventions) |
| **Conventional Commits** | A naming convention for commits and branches by type (`feat`, `fix`, `refactor`…). | [Conventions](/registry/technical/conventions) |
| **Cyclomatic complexity** | The number of independent paths in a function; each condition or loop increases it. | [Conventions](/registry/technical/conventions) |
| **Diff** | The set of lines changed by a branch; it is the only part scored by a review. | [Conventions](/registry/technical/conventions) |
| **DRY** | _Don't Repeat Yourself_: a rule or a piece of logic is written in one place only. | [Conventions](/registry/technical/conventions) |
| **Early return** | Handling error cases and edge cases at the top of a function to keep a flat flow. | [Conventions](/registry/technical/conventions) |
| **Peer review** | A guided review of a change, feature by feature, in dialogue with the developer. | [Conventions](/registry/technical/conventions) |
| **semantic-release** | A tool that computes a service's version from its commits; CI then publishes the matching image. | [ADR 009](/registry/technical/adr/009-container-delivery-semantic-release) |
| **Technical debt** | A known defect deliberately left in place; a review flags it without penalizing it when it is outside the diff. | [Conventions](/registry/technical/conventions) |
