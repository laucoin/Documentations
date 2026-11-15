---
title: 'Backend'
description: 'How the reactive Kotlin backend is structured, validated, configured and tested.'
---

# Backend

`Registry-Backend` — a fully reactive Kotlin API. Three properties define it: it is **hexagonal, and a test checks it**; it is **non-blocking end to end**; and **security is declarative**, set on each endpoint's contract rather than scattered through the code.

## Tech stack

| Concern       | Choice                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Language      | Kotlin, JVM toolchain pinned by Gradle, strict nullability               |
| Framework     | Spring Boot, WebFlux (`Mono` / `Flux`)                                   |
| Persistence   | Spring Data R2DBC (connection pool), PostgreSQL                          |
| Migrations    | Flyway, forward-only, via JDBC at startup                                |
| Security      | OAuth2 resource server (JWT), reactive method security                   |
| Mapping       | MapStruct (DTOs ↔ models ↔ entities), unmapped field = compilation error |
| Serialization | Jackson, Kotlin module                                                   |
| Validation    | Jakarta Bean Validation plus custom constraints                          |
| i18n          | Spring `MessageSource`, `fr` and `en`                                    |
| Cache         | Caffeine (principal, rate limiters, audit deduplication)                 |
| Docs          | springdoc OpenAPI 3 (can be enabled)                                     |
| Metrics       | Micrometer → Prometheus (can be enabled)                                 |
| Build         | Gradle Kotlin DSL, Kover coverage, ArchUnit                              |
| Image         | Distroless Java, non-root                                                |

The exact versions are in the repository.

## Hexagonal layout

The domain is at the center and knows neither HTTP, nor the database, nor the identity provider ([ADR 001](/registry/technical/adr/001-hexagonal-architecture)):

```text
config/            Spring wiring only (security, CORS, R2DBC, JWT, clock, i18n, Swagger, logging)
domain/
  model/           Business models, exceptions, pagination
  port/            Interfaces the infrastructure must implement
  service/
    core/          A resource's rules (participants, movements, alerts…)
    usecase/       Orchestrations spanning several resources (project creation, support profile, purges…)
    support/       Cross-cutting services (audit, translation, principal cache, features)
  helper/          Reusable rules extracted from services (movement content, conflicts…)
  enumeration/ constant/ annotation/ extension/
infrastructure/
  driving/         What calls the domain
    api/           Controllers (contract + implementation), DTOs, mappers, validation
    security/      Filter chain, limiters, CSRF, cookies, token conversion, read auditing
    scheduler/     Purge scheduler
  driven/          What the domain calls
    postgres/      R2DBC repositories, entities, query criteria, mappers
    idp/           OIDC provider adapter
```

### Rules enforced by the build

An ArchUnit test runs on every build and fails it on any violation. In particular, it guarantees that:

- the **domain** depends neither on the infrastructure, nor on the configuration, nor on Spring's web types;
- the **REST layer** cannot reach the database directly: it goes through the domain;
- persistence **entities** do not leave the PostgreSQL package;
- each **controller** implements a contract interface, and each service an interface;
- names and locations follow the conventions (`…Config`, `…Handler`, repositories in the PostgreSQL package…).

## The controller pattern {#controller-pattern}

Each endpoint is declared **twice**, on purpose: an **interface** carries the contract (path, `@PreAuthorize` access rule, validation, OpenAPI documentation); the **implementation** only maps DTOs and delegates to the domain.

```kotlin
@RequestMapping("/api/v2/projects/{projectId}/vehicles")
interface IVehicleV2Controller {
	@PreAuthorize("hasPermission(#projectId, '\$REGISTRY_PROJECT_OPTION_VEHICLE') && hasPermission(#projectId, '\$REGISTRY_PROJECT_VEHICLE_R')")
	@GetMapping
	fun findVehicles(@PathVariable projectId: UUID, …): Mono<PageModel<VehicleReaderDto>>
}
```

Since ArchUnit rejects any controller outside this pattern, **no endpoint can ship without an authorization rule**. Rules that depend on data (export right, role ceiling, last administrator, visibility) live in the services. Endpoint details are in the OpenAPI document ([API contract](/registry/technical/api-reference)).

## The security chain

The main filter chain is assembled from small ordered building blocks, each responsible for a single concern: language, security headers, rate limiting, read auditing, CSRF, public/authenticated access, then the OAuth2 resource server. A second chain, reserved for the management port, serves the documentation. The role of each block is explained in [Security](/registry/technical/security).

## Reactive discipline

The event loop is small and shared: **blocking it is the unforgivable mistake**.

- No `.block()`, `Thread.sleep`, JDBC or blocking file I/O on a request path.
- Compose with `map` / `flatMap` / `switchIfEmpty`; `concatMap` when order matters.
- Filtering, sorting and pagination **in SQL**, never in memory. Repositories write SQL by hand with bound parameters, assembled from **criteria** and **page** objects.
- Multi-step writes are transactional; the rows a rule depends on are **locked** before the check ([ADR 016](/registry/technical/adr/016-optimistic-concurrency-and-row-locks)).
- Non-critical work (audit) goes through an in-memory queue consumed in the background, so as not to delay the response.

## Validation, in two layers

- **Declarative**, on DTOs and parameters: length and size bounds everywhere, and custom constraints for cross-field rules — date consistency (start before end, time without date forbidden), min/max ranges, reason compatible with a movement's direction and type, guest movement content, mutually exclusive fields, a project's option dependencies, invitation reply.
- **Imperative**, in services, for what needs the database: membership of the same project, item not deleted, adult driver, definitive departure placed before other movements, conflict with existing items…

Each refusal throws an exception carrying an HTTP status and a **stable error code**; a single handler turns it into a translated response. Internal messages and stack traces never reach the client.

## Derived data and histories

- **Presence**: a participant's or a vehicle's status is computed from its movements and its dates, never stored.
- **Effective presence dates**: a participant's effective arrival and departure, on the other hand, are stored and **recomputed** on every creation, edit, deletion or restoration of a movement, under lock (see [Movements](/registry/functional/features/movements)).
- **_Log_ history**: the previous state of a movement, an alert or a communication is archived before each change ([ADR 018](/registry/technical/adr/018-log-history-versioning)).
- **Statistics**: average resolution time and real alert rate, planned/actual timelines of a participant or a vehicle, a vehicle's usage rate, an activity's participation and cumulative hours — all computed on demand.

## Configuration

Everything that depends on the environment comes in through **environment variables**: the image is identical everywhere. A missing required variable **makes startup fail**. The main families:

| Family            | Example settings                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Database          | host, database, schema, credentials, pool size, maximum lock wait                                               |
| Identity provider | OIDC addresses, confidential and public clients, timeouts and maximum connections, redirect allowlists          |
| Server            | API and management ports, log level, CORS origins, `Secure` cookies                                             |
| Security          | rate limits (authentication, export, search, project creation), trusted proxies, principal cache duration       |
| Audit             | queue size, read deduplication window                                                                           |
| Features          | documentation, observability, email invitation                                                                  |
| Business          | tolerance on a movement's future time, alert criticality thresholds, search caps, purge schedule and thresholds |

The exhaustive list, with default values, is kept up to date in the **backend repository README** — it is the reference.

## Tests

`./gradlew build` compiles, tests, checks coverage (enforced Kover threshold) and produces the report.

| Level         | Tools and purpose                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit          | JUnit, `mockito-kotlin`, `StepVerifier`; behavior is checked, not just calls                                                                                                                                                         |
| Parameterized | `@ParameterizedTest`, named cases                                                                                                                                                                                                    |
| Integration   | Testcontainers PostgreSQL and `WebTestClient`: real database, real filter chain                                                                                                                                                      |
| Security      | access rules of every endpoint, alignment of injected permissions with constants, refusal without option, automatically generated cross-project isolation, CSRF/CORS/headers through the real chain, rate counters under concurrency |
| Architecture  | ArchUnit, as above                                                                                                                                                                                                                   |

## Backend-specific conventions {#backend-specific-conventions}

The shared rules are on the [Development conventions](/registry/technical/conventions) page. On top of them:

- **Dependencies between services.** A controller goes through a UseCase, or calls a `support/` service directly. A `core/` service (one per resource) never calls another `core/` service or a UseCase; a UseCase is injected nowhere but in a controller; a `support/` service depends on no business service. Each service has its `I…` interface and its implementation in `impl/`.
- **Helpers in their place.** A reusable business rule goes in `domain/helper/`, a technical processing step in the `helper/` of the adapter it serves.
- **Mapping through MapStruct only.** No hand-written object conversion; a complex transformation goes through a MapStruct method or decorator.
- **Parameter objects.** Beyond seven parameters, they are grouped. A `@Query` receives its filters in a criteria object and its sorting and pagination in a `PageQuery`; only the project, the visibility and identifiers remain plain parameters. Pure data carriers (entities, DTOs, models) are exempt.
- **One-line lambdas,** without a `{ … }` block, or replaced by a method reference (`::`).
- **Typed permissions.** `@PreAuthorize` rules use the constants from `domain/constant`, never a string literal, and stay aligned with the migrations that inject the roles.
- **Forward-only migrations.** Every schema change is a new `V…` migration; an applied migration is never modified.
- **Typed, documented configuration.** Each setting goes through typed properties and appears in the repository README.
- **A consistent API.** Plural resources, version in the URL, mandatory pagination on lists, ISO 8601 dates: see [API contract](/registry/technical/api-reference).
- **Reactive tests.** `StepVerifier` for streams, Testcontainers for the database, `WebTestClient` for endpoints; the clock is injected (`Clock`) and no `Thread.sleep` appears in tests.

## See also

- [Development conventions](/registry/technical/conventions) — the rules shared by the repositories
- [Security](/registry/technical/security) — each mechanism and its role
- [Data model](/registry/technical/data-model) — schema and migrations
- [API contract](/registry/technical/api-reference) — shared conventions
- [Getting started](/registry/technical/getting-started) — run it locally
