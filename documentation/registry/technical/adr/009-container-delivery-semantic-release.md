---
title: 'ADR 009 — Container delivery: distroless JVM image, semantic-release to a registry'
description: 'Why the services ship as minimal containers versioned by semantic-release.'
---

# ADR 009 — Container delivery: distroless JVM image, semantic-release to a registry

## Status

<Badge type="tip" text="Accepted" />

## Context

Both repositories — the Kotlin/Spring Boot backend and the Angular frontend — need a delivery story that answers three questions: how the version number is decided, how the artifact is built, and where it is published. We want as little of that as possible to be human work.

Commits already follow [Conventional Commits](https://www.conventionalcommits.org/), which carry enough information to _derive_ the version, the changelog and the tag automatically, instead of a person maintaining them by hand.

On the artifact side, the backend runs on the JVM. The naive Dockerfile builds the runtime on a full JDK image running as root — a big image with a shell, a package manager and a large attack surface, none of which a running service needs. The frontend is a static bundle that needs an HTTP server; the naive choice is an off-the-shelf nginx image with the default configuration and root privileges.

## Decision

Publish **hardened, minimal container images** and automate versioning with **semantic-release**, through a shared CI action.

The main driver of the image choice is a **small attack surface**: the runtime must carry only what the service needs to run, and run without privileges.

**Versioning.** On the `main` branch, semantic-release reads the Conventional Commits since the last release and derives the next version (breaking changes are flagged by the Conventional Commits preset's `!` marker), generates the changelog and creates the git tag — no human version bookkeeping. This applies to both repositories.

**Publishing.** Each repository is built and published as a container image to **GHCR**, through a shared, **registry-agnostic** `docker-publish` CI action. A retention policy keeps the **last 5 releases**. There is no separate hotfix path: the tag-based hotfix workflow was removed, and a fix ships as an ordinary release from `main`. The action is deliberately registry-agnostic — GHCR is the current target, not a hard dependency.

**Backend image.** A multi-stage build whose runtime stage is a **distroless Java 25** image running as **non-root**, shipping the JVM jar. (The README mentions GraalVM native compilation as an option; that is _not_ what CI ships — CI ships the JVM jar.)

**Frontend image.** The built static bundle, served by an **unprivileged nginx** configured with SPA fallback and hardening headers.

## Consequences

### Positive

- **Nobody owns the version number.** semantic-release turns commit history into version, changelog and tag deterministically. No release meeting, and no drift between what the tag says and what changed.
- **Minimal attack surface and image size.** A distroless runtime has no shell or package manager, so a compromised process has much less to work with, and the image is smaller to store and pull.
- **Non-root by default, everywhere.** Both images run without privileges — the backend on distroless, the frontend on an unprivileged nginx — which is the right default for a network-exposed service.
- **Registry portability.** Since the publish action is registry-agnostic, leaving GHCR is a configuration change in a single shared action, not a rewrite of each repository's pipeline.
- **Immutable, promotable artifacts.** The images carry nothing environment-specific — the frontend takes its configuration at runtime ([ADR 007](/registry/technical/adr/007-frontend-runtime-config)) — so the exact image that was tested is the one promoted from one environment to the next.

### Negative

- **Releases depend on commit discipline.** semantic-release only works if commit messages follow the convention. A sloppy or non-conventional history produces wrong or missing version bumps, so the whole team must hold the line on commit format.
- **The release job needs a privileged token.** To push tags and releases despite branch protection, the pipeline runs with a token able to bypass those protections — a real, if bounded, piece of trust that must be guarded.
- **Distroless is harder to debug.** No shell means no `kubectl exec` into a running container to poke around; diagnosis relies on logs, metrics and reproducing the problem elsewhere. That is the deliberate cost of a smaller surface.
- **Shipping the JVM, not a native binary.** The JVM jar has a slower cold start and a larger memory footprint than a GraalVM native image. For a long-running service this is acceptable, but it is a real cost we choose.

### Why not a GraalVM native image for the backend

A native image would start faster and use less memory — genuinely attractive for a service, and the reason the option is still mentioned in the README. It was ruled out _for now_ for build complexity and compatibility reasons: native compilation adds build time, requires reflection/resource configuration for the framework and its dependencies, and is more fragile to keep green in CI. The JVM jar on distroless is the pragmatic choice today. Adopting the native image is a clear candidate for a **future ADR** that will supersede this part of the decision once the build cost is judged worth the runtime gain.
