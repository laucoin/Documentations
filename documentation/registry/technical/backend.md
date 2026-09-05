# Backend

`Registry-Backend` — a fully reactive Kotlin API. Two properties define it: it is **hexagonal, and a test enforces
that**, and it is **non-blocking end to end**, which constrains every line written in it.

## Stack

| Concern     | Choice                                                 |
|-------------|--------------------------------------------------------|
| Language    | Kotlin 2.4, JVM toolchain 25, `-Xjsr305=strict`        |
| Framework   | Spring Boot 4.1, WebFlux (`Mono` / `Flux`)             |
| Persistence | Spring Data R2DBC, PostgreSQL, pooled connections      |
| Migrations  | Flyway, forward-only, over JDBC at boot                |
| Security    | OAuth2 resource server (JWT), reactive method security |
| Validation  | Jakarta Bean Validation plus custom domain constraints |
| i18n        | Spring `MessageSource`, `en` and `fr`                  |
| Docs        | springdoc OpenAPI (feature-flagged)                    |
| Metrics     | Micrometer → Prometheus (feature-flagged)              |
| Build       | Gradle Kotlin DSL, Kover coverage, ArchUnit            |
| Image       | Distroless Java 25, non-root, port 8081                |

Indentation is **tabs**, per the repository's convention.

## Hexagonal layering

Root package `fr.laucoin.registry.backend`, four top-level packages and nothing else:

```
config/           Spring wiring — security, R2DBC, i18n, Swagger, logging, Gson
domain/           The business core
  service/        Interfaces + impl/
  port/           Interfaces the domain needs infrastructure to satisfy
  model/          Business models
  validator/      Custom constraint validators
  annotation/     The constraints those validators implement
  enumeration/    Domain enums
  constant/       Permission names, error codes, translation keys
  extension/      Kotlin extensions, notably reactive helpers
  handler/        Cross-cutting request handling
infrastructure/
  in/             Inbound adapters — things the domain calls out to
    postgres/     R2DBC repositories, entities, mappers
    keycloak/     The OIDC provider adapter
  out/            Outbound adapters — things that call into the domain
    api/          Controllers, DTOs, mappers
```

::: info The `in` / `out` naming is inverted from the usual convention
Most hexagonal codebases call the driving side
(HTTP) *inbound* and the driven side (database) *outbound*. Registry names them from the **domain's** point of view:
`in` is what the domain reaches *into*, `out` is what the world reaches the domain *through*. Read the packages with
that in mind — `infrastructure/out/api` is the REST layer.
See [ADR 001](/registry/technical/adr/001-hexagonal-architecture).
:::

### Rules the build enforces

`HexagonalArchitectureTest` runs ArchUnit against the whole package on every `./gradlew build`. A violation fails the
build:

| Rule                                                                                        | Effect                                                                            |
|---------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Infrastructure must not depend on `config`                                                  | Wiring stays one-directional                                                      |
| `infrastructure.out` must not depend on `infrastructure.in`                                 | The REST layer cannot reach the database directly — it must go through the domain |
| Postgres `entity` classes are only accessible inside the postgres package                   | Persistence types cannot leak upward                                              |
| Every `@RestController` must implement a contract interface from `infrastructure.out.api`   | The OpenAPI contract and the security annotations cannot be bypassed              |
| Every `@Repository` must live in `infrastructure.in.postgres`                               | —                                                                                 |
| Every `@Service` must live in `domain.service`, the postgres package, or an adapter package | —                                                                                 |
| Every `@Service` must implement a contract interface                                        | —                                                                                 |
| The root package contains only the declared sub-packages                                    | The structure cannot drift                                                        |

The domain reaches infrastructure **only through `port` interfaces**. It contains no Spring web or persistence types.

## The controller pattern

Every endpoint is declared **twice**, on purpose: an interface that carries the contract, and an implementation that
carries none.

```kotlin
@Tag(name = "Movements management", description = "API for Movements-related operations")
@RequestMapping("/api/v1/projects/{projectId}/movements")
interface IMovementV1Controller {
	@Operation(summary = "Find Movements", description = "…")
	@PreAuthorize("hasPermission(#projectId, '\$REGISTRY_PROJECT_MOVEMENT_R')")
	@GetMapping
	fun findMovements(
		@PathVariable projectId: UUID,
		@RequestParam(defaultValue = "0") @Valid @Min(0, message = PAGE_NUMBER_IS_LOWER_THAN_ZERO) pageNumber: Int,
		…
	): Mono<PageModel<MovementReaderDto>>
}
```

The interface owns the OpenAPI annotations, the `@PreAuthorize` expression and the validation constraints; the
implementation only maps DTOs and delegates to a domain service. ArchUnit guarantees no controller escapes the pattern,
which in turn guarantees no endpoint can quietly ship without an authorisation rule.

### Conventions the interfaces follow

- **Versioned, resource-oriented URLs** — `/api/v1/...`, plural nouns, nested for ownership:
  `/api/v1/projects/{projectId}/activities`.
- **DTOs at the boundary, never entities** — separate `reader` (response) and `writer` (request) types, with mappers in
  `infrastructure/out/api/mapper`.
- **Pagination by default** — `pageNumber` (`@Min(0)`) and `pageSize` (`@Min(1)`, `@Max(200)`), returning a `PageModel`.
  No unbounded collection is ever returned.
- **Search endpoints are capped, not paginated** — the pickers under `/search/**` return a small configured maximum,
  because they feed autocompletes.
- **Errors are i18n message keys**, resolved through `ErrorConst` and the bundles in `resources/i18n`, never hardcoded
  English.

## Reactive discipline

The event loop is small and shared, so **blocking it is the one unforgivable mistake**. The rules:

- No `.block()`, no `Thread.sleep`, no blocking JDBC or file IO on a request path.
- Compose with `map` / `flatMap` / `switchIfEmpty` and the helpers in `domain/extension/ReactiveExt.kt`.
- Choose `flatMap` for concurrency and `concatMap` when order matters — deliberately, not by habit.
- Push filtering, sorting and pagination **into SQL**. Loading a page and filtering it in memory defeats the point.
- Multi-step writes are wrapped with `transactionalOperator::transactional` — visible on project creation, profile
  creation, movement creation and movement updates.

## Validation, in two layers

**Declarative** constraints live on the writer DTOs, including a set of custom ones in `domain/annotation`:

| Constraint                                               | Enforces                                                                    |
|----------------------------------------------------------|-----------------------------------------------------------------------------|
| `@MovementReason`                                        | The reason matches the movement's direction and content type                |
| `@MovementGuestContent`                                  | A guest entrance supplies identities; a guest exit references existing ones |
| `@ProjectOptionDependencies`                             | An option's prerequisites are present                                       |
| `@ProfileAcceptOrReject`                                 | An invitation is answered only with `ACCEPTED` or `REJECTED`                |
| `@BothCannotBeDefined`                                   | Mutually exclusive fields — reason *or* activity                            |
| `@AtLeastOneIsDefined`                                   | A communication attaches to a movement or an alert                          |
| `@StartBeforeEnd`, `@MinUpperMax`, `@DateDefinedForTime` | Range coherence                                                             |

**Imperative** rules that need the database live in the domain services as explicit chains — `validateMovementDate` →
`validateActivity` → `saveGuestsIfNecessary` → `validateParticipants` → `validateVehicles`. Each step raises a
`RegistryException` carrying an HTTP status and a message key, and `RegistryControllerAdvice` shapes the response.
Internal messages and stack traces never reach the client.

## Configuration

Everything environment-specific arrives as JVM options or environment variables — the image is immutable and identical
across environments.

| Group      | Keys                                                                                                             |
|------------|------------------------------------------------------------------------------------------------------------------|
| Datasource | `registry.datasource.base-url`, `.database`, `.schemas`, `.username`, `.password`                                |
| OIDC       | `external.oidc.jwks-uri`, `.authorization-uri`, `.token-uri`, `.end-session-uri`, `.client-id`, `.client-secret` |
| CORS       | `external.cors.urls` — a comma-separated allow-list, never `*`                                                   |
| Server     | `registry.server.port`, `registry.server.logging-level`                                                          |
| Features   | `registry.feature.documentation.enabled`, `registry.feature.observability.enabled`                               |

Secrets — the datasource password and the OIDC client secret — are referenced as placeholders in `application.yml`, so a
missing one **fails startup loudly** rather than silently defaulting.

Two more groups are configured in `application.yml` rather than per environment: the **search result caps** for each
picker, and the **purge schedules and thresholds** (four cron expressions, four month thresholds, all defaulting to 12
months).

## Testing

`./gradlew build` compiles, tests, verifies coverage and produces the report. The pyramid:

| Level         | Tools                                                                                                                              |
|---------------|------------------------------------------------------------------------------------------------------------------------------------|
| Unit          | JUnit 5, `mockito-kotlin` (`mock` / `whenever` / `verify`), `StepVerifier` for reactive flows                                      |
| Parameterised | `@ParameterizedTest` + `@MethodSource`, with backtick-named cases                                                                  |
| Integration   | `TestContext` — Testcontainers PostgreSQL and `WebTestClient`, including authorisation tests that assert the `@PreAuthorize` rules |
| Architecture  | ArchUnit, as above                                                                                                                 |

Tests run with `maxParallelForks` set to the available processors, and `koverVerify` plus `koverHtmlReport` are wired as
finalisers, so coverage is checked on every build rather than on request.

## Related

- [Security](/registry/technical/security) — the authority model and the filter chain
- [Data Model](/registry/technical/data-model) — schema, indexes and migrations
- [API Reference](/registry/technical/api-reference) — every endpoint and its permission
- [Getting Started](/registry/technical/getting-started) — running it locally
