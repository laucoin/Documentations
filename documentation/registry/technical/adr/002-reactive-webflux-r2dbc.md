# ADR 002 — Reactive stack: Spring WebFlux + R2DBC

## Status

Accepted

## Context

The registry's characteristic workload is many concurrent, short, I/O-bound writes — presence/attendance updates streaming in from many participants and organizers at once, each of which is a small database round-trip. Under a classic blocking model (Spring MVC + JPA/JDBC) every in-flight request holds a thread while it waits on the database, so throughput is bounded by the thread pool and the app spends its threads blocked on I/O rather than doing work.

We wanted end-to-end backpressure and efficient thread use under that concurrency profile, without over-provisioning threads to paper over blocking.

## Decision

Build the backend on a **fully non-blocking reactive stack**:

- **Spring WebFlux** (Reactor `Mono`/`Flux`) for the web layer;
- **R2DBC** with the reactive Postgres driver for data access;
- **reactive transactions** via `TransactionalOperator`;
- **programmatic reactive auditing**.

One deliberate exception: **Flyway runs its migrations over a JDBC connection on boot**, because R2DBC does not manage schema. The application therefore opens **two connections to the same database** — the R2DBC pool for runtime traffic, and a JDBC connection used once at startup for Flyway.

This choice is enabled by the port/adapter boundaries in [ADR 001](/registry/technical/adr/001-hexagonal-architecture): reactive types are an infrastructure concern that the domain sees through its ports.

## Consequences

### Positive

- **Efficient thread use under I/O-bound concurrency.** A small event-loop pool serves many in-flight presence updates without a thread parked per request.
- **End-to-end backpressure.** Reactor propagates demand from the HTTP layer through to R2DBC, so the system degrades gracefully rather than exhausting threads under load.
- **Non-blocking all the way down.** There is no blocking JDBC call on the request path to accidentally stall the event loop (the one JDBC use, Flyway, is startup-only).
- **Consistent programming model.** Web, data, transactions, and auditing all speak Reactor, so composition (`flatMap`, error operators, retries) is uniform.

### Negative

- **Reactive code is harder to write and debug.** Stack traces are fragmented across operator boundaries, and a single accidental blocking call can silently degrade the whole event loop.
- **Smaller ecosystem.** Fewer libraries assume reactive types; some otherwise-obvious dependencies block and cannot be used on the request path.
- **No JPA conveniences.** R2DBC has no entity manager, lazy loading, or dirty tracking, so queries are **hand-written SQL** and mapping is explicit. This is more code and more places to make a mistake.
- **The JDBC-for-Flyway split is a wrinkle.** Two drivers and two connection configs point at the same database; contributors must understand why, and the JDBC connection details must be kept in sync with the R2DBC ones.

### Why not blocking Spring MVC + JPA/JDBC

The blocking stack is more productive: JPA removes most hand-written SQL, the tooling and library ecosystem is vastly larger, and debugging is straightforward. For most CRUD applications it is the right default. We rejected it here because the target workload — high-concurrency, I/O-bound presence writes — is exactly the case where thread-per-request becomes the bottleneck, and because retrofitting reactivity later is far more expensive than starting with it. We accepted the higher authoring cost of R2DBC and hand-written SQL as the price of the concurrency profile we expect.

### Why not virtual threads (Project Loom) on the blocking stack

Virtual threads make blocking code cheap to scale and would sidestep much of reactive's authoring pain. They are a credible alternative for the thread-exhaustion problem. We did not adopt them because they do not by themselves give end-to-end backpressure, the surrounding data stack (JPA/JDBC) still carries its own limits, and at the time of the decision the reactive stack was the more proven end-to-end path for this workload. It remains a reasonable reconsideration point in the future.
