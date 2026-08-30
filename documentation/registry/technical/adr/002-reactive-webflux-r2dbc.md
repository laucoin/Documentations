# ADR 002 — Reactive stack: WebFlux and R2DBC

## Status

Accepted

## Context

Registry's load profile is bursty and IO-bound. Nothing it does is computationally expensive: every request is a handful of database round-trips wrapped in validation. The bursts are real, though — a camp's whole team hits the movement screen in the same five minutes at each departure and each return, and the dashboard is polled continuously while people are out.

A thread-per-request model spends most of its threads blocked on the database during exactly those bursts, so capacity is bounded by the thread pool rather than by any real resource.

## Decision

Build the backend **fully reactive**: Spring WebFlux with `Mono` and `Flux` end to end, and **R2DBC** for database access so the reactive chain is never broken by a blocking driver.

The discipline this imposes is absolute and is documented as such: no `.block()`, no `Thread.sleep`, no blocking IO on a request path. Compose with `map` / `flatMap` / `switchIfEmpty` and the helpers in `domain/extension/ReactiveExt.kt`, choosing `flatMap` for concurrency and `concatMap` when order matters. Filtering, sorting and pagination are pushed into SQL. Multi-step writes are wrapped with `transactionalOperator::transactional`.

## Rationale & best practices

- **Performance:** a small event-loop pool absorbs concurrent IO-bound requests that would otherwise need a large thread pool, which matters for a service sized to run in a modest container.
- **Consistency:** WebFlux with a blocking JDBC driver is the worst of both worlds. R2DBC keeps the chain intact.
- **Bounded work:** every collection endpoint is paginated with an enforced maximum page size, so no request can pull an unbounded result set into memory.

## Consequences

- **Pros:** high concurrency on few threads; back-pressure is native; streaming responses are natural.
- **Cons / trade-offs:** **one blocking call anywhere stalls the event loop for everyone** — the failure mode is severe and non-obvious. Stack traces are harder to read, debugging is harder, and reactive composition has a genuine learning curve. R2DBC's ecosystem is thinner than JDBC's: no reactive Flyway (migrations run over JDBC at boot), and complex queries are hand-written SQL rather than derived.
- **Mitigation:** `StepVerifier` is used throughout the test suite so reactive flows are asserted rather than hoped at.
- **Alternatives rejected:** Spring MVC with JDBC (simpler and better tooled, but thread-bound under exactly the bursts this system sees); WebFlux with JDBC on a bounded elastic scheduler (keeps the blocking cost while adding reactive complexity).
