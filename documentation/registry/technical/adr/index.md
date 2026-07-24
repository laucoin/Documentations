# Architecture Decision Records

Each ADR captures one significant technical decision — its context, what was decided, and the trade-offs accepted. They are listed here in causal order: the foundational choices first, then the ones that build on them.

| ADR | Decision | Theme |
| --- | -------- | ----- |
| [001](./001-hexagonal-architecture) | Hexagonal (ports & adapters) architecture, enforced by ArchUnit | Backend structure |
| [002](./002-reactive-webflux-r2dbc) | Reactive stack: Spring WebFlux + R2DBC | Backend runtime |
| [003](./003-kotlin-java25) | Kotlin on the JVM with a Java 25 toolchain | Language |
| [004](./004-oidc-resource-server-auth) | Delegated authentication via OIDC (resource server + confidential client) | Security |
| [005](./005-db-driven-project-rbac) | Database-driven, project-scoped RBAC via a custom `PermissionEvaluator` | Authorization |
| [006](./006-flyway-trigram-search) | PostgreSQL with Flyway migrations and `pg_trgm` trigram search | Persistence |
| [007](./007-inverted-adapter-naming) | Keeping (and documenting) the inverted `in`/`out` adapter naming | Convention |
| [008](./008-frontend-runtime-config) | Frontend runtime configuration injection (one immutable image) | Frontend delivery |
| [009](./009-ngxs-state-management) | NGXS for frontend state management | Frontend state |
| [010](./010-container-delivery-semantic-release) | Distroless container delivery with semantic-release | Build & release |

## Format

Every record follows the same shape:

```markdown
# ADR NNN — Title

## Status
Accepted | Superseded by ADR NNN | Deprecated

## Context
What problem or constraint triggered this decision?

## Decision
What was decided?

## Consequences
Positive and negative trade-offs, and why the alternatives were rejected.
```
