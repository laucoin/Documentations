# ADR 009 — Container delivery: distroless JVM image, semantic-release to a registry

## Status

<Badge type="tip" text="Accepted" />

## Context

Both repositories — the Kotlin/Spring Boot backend and the Angular frontend — need a delivery story that answers three questions: how a version number is decided, how the artifact is built, and where it is published. We want as little of that as possible to be a human's job.

The commits already follow [Conventional Commits](https://www.conventionalcommits.org/), which carry enough information to *derive* the version, changelog, and tag automatically instead of a person maintaining them by hand.

On the artifact side, the backend runs on the JVM. The naive Dockerfile bases the runtime on a full JDK image running as root — a large image with a shell, a package manager, and a broad attack surface, none of which a running service needs. The frontend is a static bundle that needs an HTTP server; the naive choice there is an off-the-shelf nginx image with default config and root privileges.

## Decision

Publish **hardened, minimal container images** and automate versioning with **semantic-release**, through a shared CI action.

The primary driver for the image choice is a **small attack surface**: the runtime should carry only what the service needs to run, and run unprivileged.

**Versioning.** On the `main` branch, semantic-release reads the Conventional Commits since the last release and derives the next version, generates the changelog, and creates the git tag — no human version bookkeeping. This runs for both repos.

**Publishing.** Each repo is built and published as a container image to **GHCR**, through a shared, **registry-agnostic `docker-publish` CI action**. A retention policy keeps the **last 5 releases**. The action is deliberately registry-agnostic — GHCR is today's target, not a hard dependency.

**Backend image.** A multi-stage build whose runtime stage is a **distroless Java 25** image running as **non-root**, shipping the JVM jar. (The README references GraalVM native-image compilation as an option; that is *not* what CI ships — CI ships the JVM jar.)

**Frontend image.** The built static bundle served by an **unprivileged nginx** configured with SPA fallback and hardening headers.

## Consequences

### Positive

- **No human owns the version number.** semantic-release turns commit history into the version, changelog, and tag deterministically. There is no release meeting and no drift between what the tag says and what changed.
- **Minimal attack surface and image size.** A distroless runtime has no shell and no package manager, so a compromised process has far less to work with, and the image is smaller to store and pull.
- **Non-root by default, everywhere.** Both images run unprivileged — the backend on distroless, the frontend on an unprivileged nginx — which is the right default for a service that faces the network.
- **Registry portability.** Because the publish action is registry-agnostic, moving off GHCR is a configuration change in one shared action, not a rewrite of each repo's pipeline.
- **Immutable, promotable artifacts.** The images carry no environment specifics — the frontend takes its config at runtime ([ADR 007](/registry/technical/adr/007-frontend-runtime-config)) — so the exact image that was tested is the one promoted across environments.

### Negative

- **Releases depend on commit discipline.** semantic-release only works if commit messages follow the convention. A sloppy or non-conventional history produces wrong or missing version bumps, so the whole team has to hold the line on commit format.
- **The release job needs a privileged token.** To push tags and releases past branch protection, the pipeline runs with a token that can bypass those protections — a real, if bounded, piece of trust that has to be guarded.
- **Distroless is harder to debug.** No shell means no `kubectl exec` into a running container to poke around; diagnosis relies on logs, metrics, and reproducing issues elsewhere. That is the deliberate cost of the smaller surface.
- **Shipping the JVM, not a native binary.** The JVM jar has a slower cold start and a larger memory footprint than a GraalVM native image would. For a long-running service this is acceptable, but it is a real cost we are choosing.

### Why not GraalVM native image for the backend

A native image would start faster and use less memory — genuinely attractive for a service, and the reason the option is kept alive in the README. It was rejected *for now* on build complexity and compatibility: native-image compilation adds build time, needs reflection/resource configuration for the framework and its dependencies, and is more fragile to keep green in CI. The JVM jar on distroless is the pragmatic choice today. Adopting native image is a clear candidate for a **future ADR** that supersedes this part of the decision once the build cost is judged worth the runtime gain.
