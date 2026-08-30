# ADR 003 — Kotlin on JVM 25

## Status

Accepted

## Context

The backend is a validation-heavy domain: dozens of rules that check whether a field is present, whether two optional
fields conflict, whether a referenced entity exists and is visible. That is the shape of code where `null` handling
dominates, and where Java's verbosity is felt on every line.

The reactive style chosen in [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc) compounds it: long chains of
operators read badly in Java, and the domain is written almost entirely as such chains.

## Decision

Write the backend in **Kotlin 2.4** targeting a **JVM 25 toolchain**, with `-Xjsr305=strict` so platform types from Java
libraries are treated as nullable rather than trusted.

Kotlin's extension functions are used deliberately as a structuring tool: reactive helpers in
`domain/extension/ReactiveExt.kt`, and validation steps expressed as extensions on `Mono<T>` so a service reads as a
named pipeline — `validateMovementDate` → `validateActivity` → `saveGuestsIfNecessary` → `validateParticipants`.

## Rationale & best practices

- **Security:** null-safety in the type system removes an entire class of runtime failure from code whose whole job is
  checking whether things are present.
- **Maintainability:** `reactor-kotlin-extensions` makes reactive chains legible, and extension functions let each
  validation step be named, ordered and read top to bottom.
- **First-class support:** Spring Boot treats Kotlin as a supported language, so this is not a fringe combination.

## Consequences

- **Pros:** substantially less boilerplate; null-safety enforced at compile time; readable reactive pipelines; full Java
  interoperability.
- **Cons / trade-offs:** a second language toolchain to keep current, and Kotlin compilation is slower than Java's. JVM
  25 is recent enough to constrain where the image can run. Heavy use of extension functions is idiomatic but can hide
  where behaviour is defined from someone new to the codebase.
- **Alternatives rejected:** Java 25 with records (no third-party toolchain, but far more verbose in a null-heavy
  reactive domain); an older LTS JVM (fewer platform improvements for no benefit, since the runtime is a container the
  project controls).
