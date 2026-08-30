# ADR 010 — Container delivery with Semantic Release

## Status

Accepted

## Context

Registry is two applications released independently, each needing a version, an image and a changelog. Hand-maintained
version numbers drift, get bumped in the wrong direction, or are forgotten entirely — and the changelog is written from
memory after the fact, if at all.

Both applications also need to run somewhere with a small attack surface, since one holds personal data about minors and
the other is the public entry point.

## Decision

Ship each side as a **container image**, and let **Semantic Release** derive every version from the commit history.

**Images.** The backend builds with a multi-stage Dockerfile — Gradle on JDK 25 to build, then
`gcr.io/distroless/java25-debian13:nonroot` to run, exposing 8081. The frontend copies `dist/browser` into
`nginxinc/nginx-unprivileged`, serving on 8080. The backend's boot JAR is built with `isPreserveFileTimestamps = false`
and `isReproducibleFileOrder = true` so the artefact is reproducible.

**Versioning.** Merging to `main` publishes a DEV image; Semantic Release then reads the Conventional Commit messages,
computes the next version, tags it, and the release image is built and published. A retention job prunes old images.
Commit messages are therefore **mandatory input to the release**, not documentation.

**Pipeline.** A pull request runs the build and tests and publishes a branch-tagged image for review; Dependency Review
blocks vulnerable dependencies; CodeQL runs static analysis on pull requests, pushes to `main` and on a schedule.
Closing a pull request deletes its branch image. A `*-hotfix-*` tag branched from a release tag builds an isolated image
outside the Semantic Release flow.

## Rationale & best practices

- **Security:** distroless has no shell and no package manager, so the backend's runtime attack surface is close to the
  JVM alone; both images run as non-root. CodeQL and Dependency Review gate every change.
- **Reproducibility:** the version is a function of the commit history, so it can never be skipped, duplicated or
  applied backwards. The changelog is generated from the same source.
- **Reviewability:** a branch-tagged image per pull request means a change can be run before it is merged.

## Consequences

- **Pros:** versions and changelogs are automatic and consistent across both repositories. Minimal, non-root runtime
  images. Every change passes build, tests, dependency review and static analysis before merge. Rollback is a tag
  change.
- **Cons / trade-offs:** **badly written commit messages silently produce wrong versions** — a breaking change described
  as `fix` ships as a patch. Conventional Commits become mandatory for every contributor, enforced by hooks rather than
  by the pipeline. Distroless has no shell, so debugging a running container needs a separate tooling image. The
  pipeline is several coupled workflows, and the hotfix path deliberately sits outside the versioning scheme, which is a
  hole in the "version is derived" guarantee.
- **Alternatives rejected:** manual versioning with a hand-written changelog (full control, reliably neglected); Spring
  Boot's `bootBuildImage` with buildpacks (less Dockerfile to maintain, larger images and less control over the runtime
  base); an Alpine JRE base for the backend (a shell for debugging, at the cost of a package manager and a larger attack
  surface).
