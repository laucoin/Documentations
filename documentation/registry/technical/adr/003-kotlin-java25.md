# ADR 003 — Kotlin on the JVM with a Java 25 toolchain

## Status

Accepted

## Context

The backend needs a JVM language — the ecosystem (Spring Boot, Reactor, R2DBC from [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)) is JVM-based and non-negotiable for this project. The remaining choice is which language to write against it.

Two properties matter most here. First, **null-safety**: a registry manipulates a lot of optional data (unfilled participant fields, absent options), and NullPointerExceptions are the classic runtime failure of plain-Java Spring code. Second, **clean interop with the reactive model**: the code composes Reactor types constantly and, where useful, bridges to coroutines, so the language should make that ergonomic rather than fight it.

## Decision

Write the backend in **Kotlin** on the JVM:

- **Kotlin 2.x**, **JVM toolchain 25**, **Spring Boot 3.5.x**, **Gradle Kotlin DSL**;
- the compiler runs in **strict null-safety mode** (JSR-305 strict), so platform types from Java libraries are treated conservatively.

## Consequences

### Positive

- **Compile-time null-safety.** Nullability is in the type system, so the whole class of NullPointerException bugs common to Java Spring code is caught at compile time — directly valuable for a data-heavy registry full of optional fields.
- **Concise domain models.** `data class`es give value semantics, `copy`, and destructuring for free, which keeps the domain models and DTOs of [ADR 001](/registry/technical/adr/001-hexagonal-architecture) small and readable.
- **First-class reactive/coroutine interop.** Kotlin bridges cleanly to Reactor and offers coroutines where they read better, matching the reactive stack of [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc).
- **Strong Spring support.** Spring Boot ships first-class Kotlin support (the Kotlin DSLs, `kotlin-spring` compiler plugin, dedicated documentation), so the framework is not fighting the language.
- **Expressive DSLs.** The language is well-suited to the small internal DSLs used for configuration and test setup.

### Negative

- **Kotlin + Spring reflection edge cases.** Spring's reflection and proxying occasionally interact awkwardly with Kotlin features (final-by-default classes, nullability of injected generics, `data class` proxying), producing errors that are non-obvious to diagnose.
- **Team must know Kotlin.** Contributors comfortable only in Java face a learning curve; the null-safety and coroutine models in particular take time to internalize.
- **Java 25 is very recent.** A cutting-edge toolchain means CI images, IDEs, and downstream tooling may lag; toolchain availability on build and developer machines must be managed deliberately.
- **Two-language mental model at the edges.** Interop with plain-Java libraries surfaces platform types and occasional friction, even with strict JSR-305 mode narrowing the gap.

### Why not plain Java

Modern Java (records, sealed types, pattern matching, and increasingly good null tooling) closes much of the historical gap and avoids the extra language entirely. It is the lower-risk default and the larger talent pool. We chose Kotlin because compile-time null-safety is a language guarantee rather than an add-on, its data classes and reactive interop fit this codebase's shape more tightly, and Spring treats Kotlin as a first-class citizen. The cost is a learning curve and occasional reflection friction, which we accepted for the day-to-day safety and concision.

### Why an aggressive Java 25 toolchain rather than an older LTS

Pinning to an older LTS (e.g. 21) would be the conservative, maximally-compatible choice. We opted for the Java 25 toolchain to run on current runtime and GC improvements and to avoid a near-term migration, accepting that recency means occasional lag in surrounding tooling. Because the toolchain is declared through Gradle, moving it is a configuration change rather than a code change if the recency proves painful.
