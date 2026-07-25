# ADR 007 — Keep the inverted `in` / `out` adapter naming

## Status

Accepted

## Context

The backend is a hexagonal architecture ([ADR 001](/registry/technical/adr/001-hexagonal-architecture)), and hexagonal literature has a well-established vocabulary for the two sides of the hexagon. The **driving / inbound** side is what calls *into* the application — typically the REST/API layer, the thing an outside actor uses to drive the domain. The **driven / outbound** side is what the application calls *out to* — the database, external identity providers, message brokers. Almost every book, article, and diagram uses those terms that way.

This codebase does not. Its `infrastructure` package is split into `in` and `out`, and the mapping is **inverted** relative to the textbook:

- `infrastructure/in` holds the **persistence and identity-provider adapters** — read as "data coming *in* to the domain".
- `infrastructure/out` holds the **REST API** — read as "the surface facing *out* to callers".

Internally this is self-consistent and, once you know the rule, unambiguous: `in` is where data enters the core, `out` is what the world sees. But it is the exact opposite of what a developer arriving from any hexagonal tutorial expects, and that mismatch is a real, repeatable source of confusion. Every ArchUnit rule ([ADR 001](/registry/technical/adr/001-hexagonal-architecture)) and every adapter package name already encodes this convention.

The question this ADR settles is not "which naming is correct in the abstract" — the textbook one is — but "do we rename, or do we document and keep".

## Decision

**Keep the existing `in` / `out` convention, and document it prominently.** We do not rename to `inbound` / `outbound` or `driving` / `driven`.

The convention is fixed and stated plainly: in this codebase, `infrastructure/in` = adapters that feed data *into* the domain (persistence, identity), `infrastructure/out` = adapters that face *out* to callers (the REST API). This is the inverse of standard hexagonal terminology, and that inversion is called out on purpose so nobody has to rediscover it by surprise.

## Consequences

### Positive

- **Zero churn.** Renaming would touch every adapter package, every import, and the ArchUnit rules that pin adapters to their packages. Keeping the names costs nothing and risks no regression in a large mechanical change.
- **The codebase stays internally consistent.** There is exactly one convention in use, applied uniformly. A half-finished rename would be worse than either consistent choice.
- **The rule is simple once stated.** "`in` = into the domain, `out` = out to the world" is a one-sentence mental model that, taught up front, is easy to hold.

### Negative

- **It contradicts the literature every new contributor has read.** Anyone who learned hexagonal architecture from the standard sources will read `in` as "the REST inbound side" and be exactly wrong. This is genuine cognitive friction and an onboarding cost we are choosing to pay rather than remove.
- **Documentation has to carry the weight.** Because the names fight intuition, the convention only stays clear as long as it is documented and the documentation is found. An undocumented inverted convention is a trap; this ADR is the mitigation.
- **It weakens the vocabulary bridge to external material.** Discussions, diagrams, and examples from outside the project need a mental translation step before they map onto this codebase.

### Why not rename to `inbound` / `outbound` (or `driving` / `driven`)

The textbook naming is objectively clearer to newcomers and would erase the friction described above — this is the honest counter-argument, and it is a good one. It was rejected only for cost and risk: the rename is a wide, mechanical change across every adapter package and the ArchUnit rules that reference them, delivering no behavioural change and carrying real merge and regression risk for a codebase already shipping. That trade may not hold forever. A future ADR that **supersedes this one** to adopt standard hexagonal naming is a legitimate and expected outcome; this decision documents the convention and the reason it survives *today*, not a claim that inverted naming is better.
