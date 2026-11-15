---
title: 'ADR 002 — Reactive stack: Spring WebFlux + R2DBC'
description: 'Why the backend is reactive end to end, with Spring WebFlux and R2DBC.'
---

# ADR 002 — Reactive stack: Spring WebFlux + R2DBC

## Status

<Badge type="tip" text="Accepted" />

## Context

The backend needs a web layer and a data access layer. The choice is between the blocking stack (Spring MVC + JPA/JDBC) and the reactive stack (WebFlux + R2DBC).

## Decision

Build the backend on a **fully non-blocking reactive stack**:

- **Spring WebFlux** (Reactor `Mono`/`Flux`) for the web layer;
- **R2DBC** with the reactive Postgres driver for data access;
- **reactive transactions** via `TransactionalOperator`;
- **programmatic reactive auditing**.

One deliberate exception: **Flyway runs its migrations over a JDBC connection at startup**, because R2DBC does not handle schema management. The application therefore opens **two connections to the same database** — the R2DBC pool for runtime traffic, and a JDBC connection used once at startup for Flyway.

### Why the reactive stack

- **Author preference.** It is the style the author of this codebase prefers to write; in their view, the composition model (`flatMap`, error operators, uniform `Mono`/`Flux` across web, data, transactions and auditing) reads well.
- **Readability.** Once comfortable, the pipeline style is considered clearer than imperative service code with try/catch and manual transaction boundaries.
- **Performance headroom.** A small pool of event loops serving many in-flight requests, rather than one blocked thread per request, should use resources more efficiently under load.

This choice is made possible by the port/adapter boundaries of [ADR 001](/registry/technical/adr/001-hexagonal-architecture): reactive types are an infrastructure concern the domain sees through its ports.

## Consequences

### Positive

- **Consistent programming model.** Web, data, transactions and auditing all speak Reactor, so composition is uniform.
- **Efficient thread use under concurrency.** No blocked thread per request; backpressure propagates from the HTTP layer down to R2DBC.
- **Non-blocking on the request path.** The only use of JDBC (Flyway) happens only at startup, so nothing blocks the event loop during normal operation.

### Negative

- **Reactive code is harder to debug.** Stack traces are fragmented by operator boundaries, and a single accidental blocking call silently degrades the whole event loop.
- **Smaller ecosystem.** Fewer libraries assume reactive types; some otherwise obvious dependencies block and cannot be used on the request path.
- **No JPA conveniences.** R2DBC has no entity manager, lazy loading or change tracking: queries are therefore **hand-written SQL** and mapping is explicit — more code and more places to get it wrong.
- **The JDBC split for Flyway is a rough edge.** Two drivers and two connection configurations point to the same database; the JDBC details must be kept in sync with the R2DBC ones.

### Why not blocking Spring MVC + JPA/JDBC

The blocking stack is more productive for most applications: JPA removes most of the manual SQL, the ecosystem is larger and debugging is straightforward. It was not chosen here because the reactive stack is the author's preference and is considered more readable and more scalable; the price paid is the extra effort of writing and debugging R2DBC and manual SQL.

### Why not virtual threads on the blocking stack

Virtual threads make blocking code cheap to scale and would address thread exhaustion without the pain of writing reactive code. They were not adopted because the reactive model was already the preferred one here; virtual threads remain a reasonable point to revisit if the costs of reactive code turn out to be too high.
