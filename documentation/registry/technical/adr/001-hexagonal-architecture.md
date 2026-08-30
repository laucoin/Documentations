# ADR 001 — Hexagonal architecture, enforced by ArchUnit

## Status

Accepted

## Context

Registry's value is its business rules — the presence derivation, the movement constraints, the two-plane permission model. Those rules outlive any framework choice, and they are the part most expensive to get wrong. A conventional layered Spring application tends to let persistence and web types seep into business code, until the rules can no longer be read, tested or changed without dragging the framework along.

Layering conventions written in a contributing guide are also not enforcement. They erode under deadline pressure, one reasonable exception at a time.

## Decision

Structure the backend as a **hexagonal (ports and adapters) architecture**, and make an **ArchUnit test suite** part of the build so violations fail like any other test.

Four top-level packages: `config`, `domain`, `infrastructure/in`, `infrastructure/out`. The domain holds services, models, validators and **port interfaces**; it reaches infrastructure only through those ports and contains no Spring web or persistence types.

`HexagonalArchitectureTest` enforces: infrastructure never depends on `config`; `infrastructure.out` never depends on `infrastructure.in`; postgres entity classes are unreachable outside the postgres package; every `@RestController` implements a contract interface; every `@Repository` lives in the postgres package; every `@Service` lives in an allowed package and implements an interface; and the root package contains only the declared sub-packages.

## Rationale & best practices

- **Security:** the rule that every controller implements a contract interface is a security control. The `@PreAuthorize` annotation lives on the interface, next to the OpenAPI documentation, where omitting it is conspicuous — an endpoint cannot quietly ship without an authorisation rule.
- **Maintainability:** the domain is testable with plain JUnit and mocked ports, no Spring context. Swapping the OIDC provider or the persistence technology is an adapter change.
- **Enforcement over convention:** the rules are checked on every `./gradlew build`, so the structure cannot drift between reviews.

## Consequences

- **Pros:** business rules are readable in isolation and cheap to unit-test. Architectural drift is impossible without a red build. The `out` layer physically cannot shortcut the domain to reach the database.
- **Cons / trade-offs:** more indirection — a field added to an entity touches the entity, its mapper, the model, the DTO and its mapper. Boilerplate mapping code is a permanent tax. A newcomer must learn the layout before writing anything.
- **Alternatives rejected:** conventional layered Spring (cheaper to start, but the domain becomes framework-coupled and untestable in isolation); hexagonal by convention with no ArchUnit (the same structure with none of the guarantees).
