---
title: 'ADR 007 — Runtime configuration injection for the frontend'
description: 'Why the frontend loads its configuration at runtime, for an immutable image.'
---

# ADR 007 — Runtime configuration injection for the frontend

## Status

<Badge type="tip" text="Accepted" />

## Context

The Angular SPA must run in several environments — local development, staging, production — that differ in ways the code should not care about: the backend URL, whether production optimizations are on, the paths that bypass authentication, and a set of behavior choices (application identity, notification durations, available languages).

Angular's default answer is build-time `environment.ts` files: the environment is chosen at `ng build` time and the values are compiled into the bundle. The consequence is that "the staging bundle" and "the production bundle" are _different build artifacts_. You cannot take the exact bytes tested in staging and promote them to production — you rebuild, and a rebuilt artifact is, strictly speaking, not the one you tested.

We want the opposite property: **a single built image, promoted unchanged from one environment to the next**, with environment-specific values supplied at deployment. This also keeps backend URLs and environment flags out of the compiled bundle, where they have no business being.

## Decision

The SPA loads its configuration **at runtime, before Angular bootstraps**, from two JSON files served with the application:

- **`settings/config.json`** — behavior: application identity and support links, notification durations, available languages. The theme is no longer configured here ([ADR 014](/registry/technical/adr/014-sgdf-ui-design-system)).
- **`settings/env.json`** — environment wiring: the backend URL, the production flag, the unauthenticated paths and the hosting provider shown on the legal pages.

The application first fetches both files, then bootstraps with those values already in hand. The repository only ships **placeholder** versions of these files; the concrete files are **injected per environment at deployment**. The built container image therefore contains no environment-specific value — it is environment-agnostic, and configuration becomes a deployment concern rather than a build concern.

## Consequences

### Positive

- **One image targets every environment.** The same built artifact runs in dev, staging and prod; only the injected JSON differs. What was tested is literally what is promoted — no rebuild between environments. This fits directly with the immutable image delivery model of [ADR 009](/registry/technical/adr/009-container-delivery-semantic-release).
- **12-factor configuration.** Configuration lives in the environment, not in the code. Backend URLs and environment flags are never baked into the JavaScript bundle.
- **Behavior is reconfigurable without a release.** Languages, notification durations and application identity are data: changing them for an environment is a configuration change, not a code change with a rebuild.
- **Clean separation of concerns.** `env.json` (wiring) and `config.json` (behavior) are two files with distinct audiences — an operator adjusts one, a designer the other.

### Negative

- **Configuration errors show up at runtime, not at compile time.** A malformed `env.json` or a wrong backend URL is not caught by the compiler; it fails when a user loads the application. Compile-time safety is traded for deployment-time flexibility, and the injected files require their own validation discipline.
- **An extra round trip at startup.** The application must fetch two files before it can bootstrap, which adds a little startup latency and a hard dependency on those files being served correctly.
- **The files' presence must be guaranteed.** Since bootstrap depends on them, a deployment that forgets to inject the concrete files — or that serves the placeholders — is broken. The delivery pipeline must make their presence a non-optional step.

### Why not build-time `environment.ts` files

Angular's native approach is simpler to reason about and offers compile-time checking of the values. But it fundamentally requires **one build per environment**: the environment's identity is compiled in, so the staging and production artifacts are different builds, and the "promote what you tested" property is lost. For a system that ships immutable container images ([ADR 009](/registry/technical/adr/009-container-delivery-semantic-release)), that is the wrong trade-off — we accept the runtime failure modes and an extra fetch in exchange for a single, environment-agnostic artifact.
