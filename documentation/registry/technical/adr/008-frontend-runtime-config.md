# ADR 008 — Runtime configuration injection for the frontend

## Status

Accepted

## Context

The Angular SPA has to run in several environments — local development, staging, production — that differ in ways the code should not care about: the backend URL, whether production optimisations are on, which paths bypass auth, and a set of presentation choices (theme tokens, logos, which UI actions are enabled, notification durations, available languages).

The default Angular answer is build-time `environment.ts` files: you pick the environment at `ng build` time and the values are compiled into the bundle. The consequence is that "the staging bundle" and "the production bundle" are *different build artifacts*. You cannot take the exact bytes you tested in staging and promote them to production — you rebuild, and a rebuilt artifact is, strictly, not the one you tested.

We want the opposite property: **one built image, promoted unchanged across environments**, with the environment-specific values supplied at deploy time. That also keeps backend URLs and environment flags out of the compiled bundle entirely, which is where they do not belong.

## Decision

The SPA loads its configuration **at runtime, before Angular bootstraps**, from two JSON files served alongside the app:

- **`settings/config.json`** — presentation and behaviour: theme tokens, logos, enabled UI actions, notification durations, available languages.
- **`settings/env.json`** — environment wiring: the backend URL, the production flag, and the no-auth paths.

The application fetches both files first, then bootstraps with those values already in hand. The repository ships only **placeholder** versions of these files; the concrete files are **injected per environment at deploy time**. The built container image therefore contains no environment-specific values — it is environment-agnostic, and configuration becomes a deployment concern rather than a build concern.

## Consequences

### Positive

- **One image targets every environment.** The same built artifact runs in dev, staging, and prod; only the injected JSON differs. What you tested is literally what you promote — no rebuild between environments. This pairs directly with the immutable-image delivery model in [ADR 010](./010-container-delivery-semantic-release).
- **12-factor configuration.** Config lives in the environment, not in the code. Backend URLs and environment flags are never baked into the JavaScript bundle.
- **Presentation is reconfigurable without a release.** Theme, logos, enabled actions, and languages are data. Retheming or toggling a UI action for one environment is a config change, not a code change and rebuild.
- **Clean separation of concerns.** `env.json` (wiring) and `config.json` (presentation) are separate files with separate audiences — an operator tweaks one, a designer the other.

### Negative

- **Config errors surface at runtime, not build time.** A malformed `env.json` or a wrong backend URL is not caught by the compiler; it fails when a user loads the app. This trades build-time safety for deploy-time flexibility, and it means the injected files need their own validation discipline.
- **An extra round trip on startup.** The app must fetch two files before it can bootstrap, adding a small amount of startup latency and a hard dependency on those files being served correctly.
- **The files must be guaranteed present.** Because bootstrap depends on them, a deployment that forgets to inject the concrete files — or serves the placeholders — is broken. The delivery pipeline has to make their presence a non-optional step.

### Why not build-time `environment.ts` files

The Angular-native approach is simpler to reason about and gives compile-time checking of the values. But it fundamentally requires **one build per environment**: the environment identity is compiled in, so the staging and production artifacts are different builds, and the promote-what-you-tested property is lost. For a system that delivers immutable container images ([ADR 010](./010-container-delivery-semantic-release)), that is the wrong trade — we accept runtime failure modes and an extra fetch in exchange for a single, environment-agnostic artifact.
