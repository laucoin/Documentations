# ADR 007 — Adapter packages named from the domain's point of view

## Status

Accepted

## Context

Hexagonal architecture needs names for its two adapter sides. The common vocabulary — *driving* / *driven*, *primary* / *secondary*, *inbound* / *outbound* — is not consistently applied across the industry, and the `inbound` / `outbound` pair is the most ambiguous of the three: it only means anything once you fix a reference point, and different codebases fix it differently.

## Decision

Name the adapter packages **from the domain's point of view**:

| Package | Contains | Rationale |
| ------- | -------- | --------- |
| `infrastructure/in` | `postgres`, `keycloak` | What the domain reaches **into** |
| `infrastructure/out` | `api` (controllers, DTOs, mappers) | How the world reaches the domain, and what goes **out** to callers |

This inverts the more common convention, where the HTTP layer is *inbound* and the database is *outbound*. The ArchUnit rule that `infrastructure.out` must not depend on `infrastructure.in` enforces the direction regardless of which names are used.

## Rationale & best practices

- **A single reference point:** every package name is read from the domain outwards, consistently. There is no second convention to remember.
- **Enforced regardless:** the dependency direction is guaranteed by ArchUnit, so a misread of the names cannot produce a wrong dependency — the build fails.

## Consequences

- **Pros:** internally consistent once the reference point is known. The domain, which is the thing worth centring the vocabulary on, is what the vocabulary is centred on.
- **Cons / trade-offs:** **this is the single most confusing thing in the codebase for a newcomer.** Anyone arriving with hexagonal experience will read `infrastructure/out/api` as an outbound HTTP client rather than the REST controllers, and will look for the controllers in `in`. The cost is paid by every new contributor, forever, and is not recovered by any technical benefit — the ArchUnit rules would work identically under the conventional naming.
- **Documented mitigation:** the inversion is called out explicitly in the [Backend](/registry/technical/backend) page and in the repository's `AGENTS.md`, because documentation is the only mitigation available short of renaming.
- **Alternatives rejected:** the conventional `inbound` / `outbound` (would match outside expectations, at the cost of renaming packages across the codebase and updating every ArchUnit rule); `driving` / `driven` (unambiguous and reference-point-free, and with hindsight the better choice had it been made first).
