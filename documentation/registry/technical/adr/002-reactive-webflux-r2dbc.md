# ADR 002 — Reactive stack: Spring WebFlux + R2DBC

## Status

<Badge type="tip" text="Accepted" />

## Context

The backend needs a web layer and a data-access layer. The choice is between the blocking stack (Spring MVC + JPA/JDBC) and the reactive stack (WebFlux + R2DBC).

## Decision

Build the backend on a **fully non-blocking reactive stack**:

- **Spring WebFlux** (Reactor `Mono`/`Flux`) for the web layer;
- **R2DBC** with the reactive Postgres driver for data access;
- **reactive transactions** via `TransactionalOperator`;
- **programmatic reactive auditing**.

One deliberate exception: **Flyway runs its migrations over a JDBC connection on boot**, because R2DBC does not manage schema. The application therefore opens **two connections to the same database** — the R2DBC pool for runtime traffic, and a JDBC connection used once at startup for Flyway.

### Why the reactive stack

- **Author preference.** It is the style this codebase's author prefers to write; the composition model (`flatMap`, error operators, uniform `Mono`/`Flux` across web, data, transactions and auditing) reads well to them.
- **Readability.** Once fluent in it, the pipeline style is judged clearer than imperative service code with try/catch and manual transaction boundaries.
- **Performance headroom.** A small event-loop pool serving many in-flight requests, rather than a thread parked per request, is expected to use resources more efficiently under load.

This choice is enabled by the port/adapter boundaries in [ADR 001](/registry/technical/adr/001-hexagonal-architecture): reactive types are an infrastructure concern that the domain sees through its ports.

## Consequences

### Positive

- **Consistent programming model.** Web, data, transactions, and auditing all speak Reactor, so composition is uniform.
- **Efficient thread use under concurrency.** No thread parked per request; backpressure propagates from the HTTP layer down to R2DBC.
- **Non-blocking on the request path.** The one JDBC use (Flyway) is startup-only, so nothing blocks the event loop in normal operation.

### Negative

- **Reactive code is harder to debug.** Stack traces are fragmented across operator boundaries, and a single accidental blocking call silently degrades the whole event loop.
- **Smaller ecosystem.** Fewer libraries assume reactive types; some otherwise-obvious dependencies block and cannot be used on the request path.
- **No JPA conveniences.** R2DBC has no entity manager, lazy loading, or dirty tracking, so queries are **hand-written SQL** and mapping is explicit — more code and more places to make a mistake.
- **The JDBC-for-Flyway split is a wrinkle.** Two drivers and two connection configs point at the same database; the JDBC details must be kept in sync with the R2DBC ones.

### Why not blocking Spring MVC + JPA/JDBC

The blocking stack is more productive for most applications: JPA removes most hand-written SQL, the ecosystem is larger, and debugging is straightforward. It was not chosen here because the reactive stack is the author's preference and is judged to read better and scale better; the cost paid for that is the higher authoring and debugging effort of R2DBC and hand-written SQL.

### Why not virtual threads on the blocking stack

Virtual threads make blocking code cheap to scale and would address thread-exhaustion without reactive's authoring pain. They were not adopted because the reactive model was already the preferred one here; virtual threads remain a reasonable reconsideration point if the reactive costs prove too high.
