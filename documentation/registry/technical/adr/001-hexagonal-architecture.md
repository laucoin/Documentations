# ADR 001 — Hexagonal (Ports & Adapters) architecture

## Status

<Badge type="tip" text="Accepted" />

## Context

The backend is a multi-tenant participant/event registry with non-trivial business rules: project-scoped permissions, visibility gating, participant lifecycle, auditing.

When this project started, the goal for its structure was explicitly **to learn and apply ports-and-adapters properly on a real codebase** — with the boundaries enforced automatically rather than left to discipline — rather than to solve a pain already felt on a previous layered Spring app.

## Decision

Organize the backend as a hexagonal (ports & adapters) architecture with three top-level layers:

- **domain** — the core: models, port interfaces, services / use-cases, validators, enums. No Spring-web or persistence types.
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

- **Boundaries are a build-time guarantee.** A change that makes the REST layer reach into persistence, or puts a `@Service` in the wrong package, fails the build.
- **The domain is testable in isolation.** Use-cases depend on port interfaces, so they can be unit-tested with in-memory fakes — no Spring context, no database.
- **Framework churn is contained.** Swapping the web or persistence adapter (see [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)) touches infrastructure, not the core.
- **Naming conventions make the codebase navigable.** A `*Port` is always a boundary; a `*Service` is always a use-case.

### Negative

- **A lot of ceremony.** Every controller is an interface plus an implementation; every boundary is a port plus an adapter; every entity needs a mapper to and from a domain model. For a CRUD endpoint this is pure overhead.
- **The ArchUnit test is itself a maintenance surface.** Legitimate refactors sometimes require updating the rules.
- **Indirection cost.** Controller → port → service → adapter is more hops than a flat MVC app.

## Retrospective

Having built and lived with it, the honest assessment is that **hexagonal + ArchUnit is over-engineered for this codebase**. Registry has few external systems to adapt to — one database, one OIDC provider — so the port/adapter indirection multiplies code (interface + impl per controller, port + adapter + mapper per boundary) without buying the flexibility the pattern is meant to provide. The gain does not clearly justify the volume of code at this size.

It is kept because it is in place, consistent, and enforced — not because it would be chosen again for a project of this shape. A simpler layered structure would very likely have been the better call here.
