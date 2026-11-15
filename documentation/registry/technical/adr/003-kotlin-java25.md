---
title: 'ADR 003 — Kotlin on the JVM, Java 25 toolchain'
description: 'Why the backend is written in Kotlin on a Java 25 toolchain.'
---

# ADR 003 — Kotlin on the JVM, Java 25 toolchain

## Status

<Badge type="tip" text="Accepted" />

## Context

The ecosystem is fixed and JVM-based (Spring Boot, Reactor, R2DBC — [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)). The open choices are the JVM language and the toolchain version.

## Decision

Write the backend in **Kotlin** (2.x) on a **Java 25 toolchain**, with the Gradle Kotlin DSL and Spring Boot 4.x.

### Why Kotlin

- **Null safety in the type system.** Nullability is expressed and checked at compile time, so the class of `NullPointerException` bugs common in plain-Java Spring code is caught by the compiler — useful for a registry full of optional fields.
- **Less verbose than Java.** `data class`es (value semantics, `copy`, destructuring), expressions rather than statements, and the absence of getter/setter boilerplate keep the domain models, DTOs and mappers small.

Kotlin has no "LTS" line — it ships feature releases roughly every six months — so the project simply tracks a recent 2.x.

### Why the Java 25 toolchain

**Java 25 is the current LTS** (September 2025, successor of 21), so it is the natural baseline rather than an aggressive choice. The toolchain is declared through Gradle, so moving it later is a configuration change, not a code change.

## Consequences

### Positive

- **Compile-time null safety** removes a whole class of bugs before runtime.
- **Concise code.** Data classes and expression syntax keep the boilerplate of [ADR 001](/registry/technical/adr/001-hexagonal-architecture)'s ports and adapters as small as that structure allows.
- **First-class Spring + Reactor support.** Spring Boot provides Kotlin DSLs and the `kotlin-spring` compiler plugin; Kotlin plugs cleanly into the Reactor types of [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc).
- **On a supported LTS.** Java 25 receives long-term updates; no runtime migration is due in the short term.

### Negative

- **Kotlin + Spring reflection edge cases.** Final-by-default classes, the nullability of injected generics and the proxying of `data class`es sometimes interact awkwardly with Spring's reflection/proxying, producing non-obvious errors.
- **Contributors must know Kotlin.** Java-only contributors face a learning curve, mainly around null safety.
- **Recent LTS, lagging tooling.** Even as an LTS, Java 25 is recent enough that some CI images, IDE plugins and downstream tools lag behind for a while.

### Why not plain Java

Modern Java (records, sealed types, pattern matching) closes much of the historical gap and avoids a second language. Kotlin was chosen because its null safety is a language guarantee rather than optional tooling, and because it is noticeably less verbose for the shape of this codebase. The cost is the learning curve and occasional friction with reflection.
