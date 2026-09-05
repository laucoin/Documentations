# Architecture Decision Records

Each ADR captures one significant technical decision — its context, what was decided, and the trade-offs accepted. They describe the system **as it is built**. Where a decision has proved questionable in hindsight, that is recorded in a **Retrospective** section rather than hidden.

| ADR | Decision | Theme | Status |
| --- | -------- | ----- | ------ |
| [001](/registry/technical/adr/001-hexagonal-architecture) | Hexagonal (ports & adapters) architecture, enforced by ArchUnit | Backend structure | <Badge type="tip" text="Accepted" /> |
| [002](/registry/technical/adr/002-reactive-webflux-r2dbc) | Reactive stack: Spring WebFlux + R2DBC | Backend runtime | <Badge type="tip" text="Accepted" /> |
| [003](/registry/technical/adr/003-kotlin-java25) | Kotlin on the JVM, Java 25 toolchain | Language | <Badge type="tip" text="Accepted" /> |
| [004](/registry/technical/adr/004-oidc-resource-server-auth) | Delegated authentication via OIDC (resource server + confidential client) | Security | <Badge type="tip" text="Accepted" /> |
| [005](/registry/technical/adr/005-db-driven-project-rbac) | Database-driven, project-scoped RBAC via a custom `PermissionEvaluator` | Authorization | <Badge type="tip" text="Accepted" /> |
| [006](/registry/technical/adr/006-flyway-trigram-search) | PostgreSQL with Flyway migrations and `pg_trgm` trigram search | Persistence | <Badge type="tip" text="Accepted" /> |
| [007](/registry/technical/adr/007-frontend-runtime-config) | Frontend runtime configuration injection (one immutable image) | Frontend delivery | <Badge type="tip" text="Accepted" /> |
| [008](/registry/technical/adr/008-ngxs-state-management) | NGXS for frontend state management | Frontend state | <Badge type="tip" text="Accepted" /> |
| [009](/registry/technical/adr/009-container-delivery-semantic-release) | Distroless container delivery with semantic-release | Build & release | <Badge type="tip" text="Accepted" /> |
| [011](/registry/technical/adr/011-scheduled-retention-purges) | Retention purges as scheduled, permission-gated endpoints | Data protection | <Badge type="tip" text="Accepted" /> |
| [012](/registry/technical/adr/012-primeng-runtime-theming) | PrimeNG runtime theming | Frontend styling | <Badge type="tip" text="Accepted" /> |
| [013](/registry/technical/adr/013-cookie-session-transport) | Session tokens in HttpOnly cookies, with CSRF protection | Security | <Badge type="warning" text="Proposed" /> |

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
Positive and negative trade-offs, and why the alternatives were rejected.

## Retrospective   (optional)
How the decision has held up in practice, including regrets.
```

The **Status** badge uses one of:

| Badge | Meaning |
| ----- | ------- |
| <Badge type="tip" text="Accepted" /> | Decided and in effect |
| <Badge type="warning" text="Proposed" /> | Drafted, not yet decided |
| <Badge type="danger" text="Rejected" /> | Considered and turned down |
| <Badge type="info" text="Superseded by ADR NNN" /> | Replaced by a later ADR (or `Deprecated`) |
