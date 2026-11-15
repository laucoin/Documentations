---
title: 'Architecture Decision Records'
description: 'Registry’s architecture decisions, their status and their format.'
---

# Architecture Decision Records

Each ADR records a significant technical decision — its context, what was decided, and the trade-offs accepted. They describe the system **as it is built**. When a decision turned out to be questionable in hindsight, this is recorded in a **Retrospective** section rather than hidden.

| ADR | Decision | Theme | Status |
| --- | --- | --- | --- |
| [001](/registry/technical/adr/001-hexagonal-architecture) | Hexagonal architecture (ports and adapters), checked by ArchUnit | Backend structure | <Badge type="tip" text="Accepted" /> |
| [002](/registry/technical/adr/002-reactive-webflux-r2dbc) | Reactive stack: Spring WebFlux + R2DBC | Backend runtime | <Badge type="tip" text="Accepted" /> |
| [003](/registry/technical/adr/003-kotlin-java25) | Kotlin on the JVM, Java 25 toolchain | Language | <Badge type="tip" text="Accepted" /> |
| [004](/registry/technical/adr/004-oidc-resource-server-auth) | Authentication delegated via OIDC (resource server + confidential client) | Security | <Badge type="tip" text="Accepted" /> |
| [005](/registry/technical/adr/005-db-driven-project-rbac) | Database-driven per-project RBAC, through a custom `PermissionEvaluator` | Authorization | <Badge type="tip" text="Accepted" /> |
| [006](/registry/technical/adr/006-flyway-trigram-search) | PostgreSQL with Flyway migrations and `pg_trgm` trigram search | Persistence | <Badge type="tip" text="Accepted" /> |
| [007](/registry/technical/adr/007-frontend-runtime-config) | Frontend configuration injected at runtime (one immutable image) | Frontend delivery | <Badge type="tip" text="Accepted" /> |
| [008](/registry/technical/adr/008-ngxs-state-management) | NGXS for frontend state management | Frontend state | <Badge type="info" text="Superseded by ADR 013" /> |
| [009](/registry/technical/adr/009-container-delivery-semantic-release) | Distroless container delivery with semantic-release | Build and release | <Badge type="tip" text="Accepted" /> |
| [010](/registry/technical/adr/010-scheduled-retention-purges) | Retention purges: internal scheduler plus permission-protected endpoints | Data retention | <Badge type="tip" text="Accepted" /> |
| [011](/registry/technical/adr/011-primeng-runtime-theming) | PrimeNG with runtime theming | Frontend UI | <Badge type="info" text="Superseded by ADR 014" /> |
| [012](/registry/technical/adr/012-per-instance-rate-limit-caffeine) | Per-instance authentication rate limiting with Caffeine, without a shared store | Security | <Badge type="tip" text="Accepted" /> |
| [013](/registry/technical/adr/013-signal-stores-and-facades) | Signal stores behind facades, replacing NGXS | Frontend state | <Badge type="tip" text="Accepted" /> |
| [014](/registry/technical/adr/014-sgdf-ui-design-system) | `@sgdf/ui` design system with Tailwind for layout | Frontend UI | <Badge type="tip" text="Accepted" /> |
| [015](/registry/technical/adr/015-api-v2-uniform-contract) | `/api/v2`: a uniform list, search, sort and error contract | API | <Badge type="tip" text="Accepted" /> |
| [016](/registry/technical/adr/016-optimistic-concurrency-and-row-locks) | Optimistic concurrency with `ETag`/`If-Match`, backed by row locks | Consistency | <Badge type="tip" text="Accepted" /> |
| [017](/registry/technical/adr/017-soft-delete-and-restore-permissions) | Dedicated permissions for soft delete and restore | Authorization | <Badge type="tip" text="Accepted" /> |
| [018](/registry/technical/adr/018-log-history-versioning) | Versioned history of _log_-type items | Consistency | <Badge type="tip" text="Accepted" /> |
| [019](/registry/technical/adr/019-personal-data-access-audit) | Asynchronous audit log of access to personal data | Security | <Badge type="tip" text="Accepted" /> |

## Format

```markdown
# ADR NNN — Title

## Status

<Badge type="tip" text="Accepted" />

## Context

What problem or constraint triggered this decision?

## Decision

What was decided?

## Consequences

Positive and negative trade-offs, and why the alternatives were ruled out.

## Retrospective (optional)

How the decision held up in practice, regrets included.
```

The **Status** badge uses one of the following:

| Badge | Meaning |
| --- | --- |
| <Badge type="tip" text="Accepted" /> | Decided and in force |
| <Badge type="warning" text="Proposed" /> | Drafted, not yet decided |
| <Badge type="danger" text="Rejected" /> | Considered and ruled out |
| <Badge type="info" text="Superseded by ADR NNN" /> | Replaced by a more recent ADR (or `Deprecated`) |
