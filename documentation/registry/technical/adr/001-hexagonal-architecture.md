# ADR 001 — Hexagonal (Ports & Adapters) architecture

## Status

Accepted

## Context

The backend is a multi-tenant participant/event registry with non-trivial business rules: project-scoped permissions, visibility gating, participant lifecycle, auditing. That logic must outlive framework churn and stay testable without a running server or database.

The natural failure mode of a Spring application is that business logic leaks into controllers, entities, and repositories — a `@RestController` reaches straight into a JPA entity, a service depends on an HTTP concern, and within a year the "domain" is inseparable from the framework. Conventions in a wiki do not prevent this; only something enforced at build time does.

We needed a structure that keeps the business core framework-agnostic, and a mechanism that makes the boundaries a guarantee rather than a hope.

## Decision

Organize the backend as a hexagonal (ports & adapters) architecture with three top-level layers:

- **domain** — the core: models, port interfaces, services / use-cases, validators, enums. No Spring web or persistence types.
- **config** — Spring wiring only (bean definitions, security config). No business logic.
- **infrastructure** — adapters that implement the domain's ports: the REST/API layer, persistence, identity.

The dependency rules are **enforced by an ArchUnit test** (`HexagonalArchitectureTest`) that runs on every build:

- infrastructure must not depend on config;
- the REST/API adapter must not reach persistence or identity adapters directly — it goes through domain ports;
- persistence entities are only accessible within the persistence package;
- a `@RestController` must implement a contract interface;
- `@Repository` only in the persistence package; `@Service` only in `domain.service`, persistence, or the identity adapter;
- strict naming conventions (`*Port`, `*Service`, `*Controller`, `*Repository`, `*Dto`, `*Mapper`, `*Validator`, `*Model`, `*Enum`, `*Const`, …).

Controllers are **contract-first**: REST semantics — paths, `@PreAuthorize`, OpenAPI tags, request validation — live on an interface; the `@RestController` implementation only delegates to a domain service.

## Consequences

### Positive

- **Boundaries are a build-time guarantee, not a convention.** A pull request that makes the REST layer reach into persistence, or puts a `@Service` in the wrong package, fails CI. The architecture cannot silently erode.
- **The domain is testable in isolation.** Use-cases depend on port interfaces, so they can be unit-tested with in-memory fakes — no Spring context, no database.
- **Framework churn is contained.** Swapping the web or persistence adapter (see [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)) touches infrastructure, not the core.
- **Contract-first controllers separate the API surface from its implementation.** The interface is the single place where security and OpenAPI annotations live, which keeps the impl trivial and the generated docs honest.
- **Naming conventions make the codebase navigable.** A `*Port` is always a boundary; a `*Service` is always a use-case. New contributors orient quickly.

### Negative

- **More ceremony.** Every controller is an interface plus an implementation; every boundary is a port plus an adapter. For a small CRUD endpoint this feels like overhead.
- **The ArchUnit test is itself a maintenance surface.** Legitimate refactors sometimes require updating the rules, and a poorly-worded rule can either wave through violations or block valid code.
- **Indirection cost.** Following a request from controller → port → service → adapter is more hops than a flat MVC app, which raises the learning curve.
- **Discipline required at design time.** Deciding what belongs in the domain versus an adapter is a judgement call the rules cannot make for you.

### Why not a conventional layered Spring app

The default "controller → service → repository" layering is faster to start and familiar to every Spring developer. But it offers no protection against the domain depending on the framework: JPA entities routinely double as domain models, and controllers accumulate logic. Nothing fails when a boundary is crossed. For a system whose business rules are the whole point, we judged the up-front ceremony of ports & adapters — with the crossings actually enforced — a worthwhile trade against slow, invisible decay.

### Why not enforce boundaries by module/Gradle-subproject splits alone

Splitting layers into separate Gradle modules enforces some dependency direction through the build graph, but it is coarse: it cannot express "a `@RestController` must implement a contract interface" or the naming conventions, and it fragments the build for a codebase of this size. ArchUnit expresses fine-grained rules within a single module and keeps the whole thing buildable as one unit.
