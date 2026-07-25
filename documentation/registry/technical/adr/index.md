# Architecture Decision Records

Each ADR captures one significant technical decision — its context, what was decided, and the trade-offs accepted. They are listed here in causal order: the foundational choices first, then the ones that build on them.

| ADR | Decision | Theme |
| --- | -------- | ----- |
| [001](/registry/technical/adr/001-hexagonal-architecture) | Hexagonal (ports & adapters) architecture, enforced by ArchUnit | Backend structure |
| [002](/registry/technical/adr/002-reactive-webflux-r2dbc) | Reactive stack: Spring WebFlux + R2DBC | Backend runtime |
| [003](/registry/technical/adr/003-kotlin-java25) | Kotlin on the JVM with a Java 25 toolchain | Language |
| [004](/registry/technical/adr/004-oidc-resource-server-auth) | Delegated authentication via OIDC (resource server + confidential client) | Security |
| [005](/registry/technical/adr/005-db-driven-project-rbac) | Database-driven, project-scoped RBAC via a custom `PermissionEvaluator` | Authorization |
| [006](/registry/technical/adr/006-flyway-trigram-search) | PostgreSQL with Flyway migrations and `pg_trgm` trigram search | Persistence |
| [007](/registry/technical/adr/007-inverted-adapter-naming) | Keeping (and documenting) the inverted `in`/`out` adapter naming | Convention |
| [008](/registry/technical/adr/008-frontend-runtime-config) | Frontend runtime configuration injection (one immutable image) | Frontend delivery |
| [009](/registry/technical/adr/009-ngxs-state-management) | NGXS for frontend state management | Frontend state |
| [010](/registry/technical/adr/010-container-delivery-semantic-release) | Distroless container delivery with semantic-release | Build & release |
| [011](/registry/technical/adr/011-vue-nuxt-frontend) | Frontend framework: Vue 3 on Nuxt (replacing Angular) | Frontend framework |
| [012](/registry/technical/adr/012-ssr-rendering) | Rendering strategy: server-side rendering on Nuxt | Frontend rendering |
| [013](/registry/technical/adr/013-ant-design-vue) | Design system: Ant Design Vue (replacing PrimeNG) | Frontend UI |
| [014](/registry/technical/adr/014-pinia-state-management) | Frontend state: Pinia + facades (supersedes 009) | Frontend state |
| [015](/registry/technical/adr/015-accessibility) | Accessibility: WCAG 2.2 AA (formalizable to EN 301 549 / EAA) | Accessibility |
| [017](/registry/technical/adr/017-api-v2-conventions) | API v2 naming, query conventions, and v1 sunset | API contract |
| [018](/registry/technical/adr/018-backend-caching-db) | Backend caching (Caffeine in-process) and database optimization | Performance |
| [019](/registry/technical/adr/019-backend-security-hardening) | Backend security hardening: rate limiting, session/token policy, audit logging | Security |
| [020](/registry/technical/adr/020-frontend-observability) | Frontend observability: OpenTelemetry → Prometheus/Grafana | Observability |
| [021](/registry/technical/adr/021-test-strategy-parity) | Test strategy and Angular→Vue parity (Playwright) | Quality |
| [022](/registry/technical/adr/022-ssr-auth-bff) | Full BFF: Nuxt OIDC client, Spring private resource server (amends 004) | Security |
| [023](/registry/technical/adr/023-nuxt-runtime-config) | Runtime configuration on Nuxt (revises 008) | Frontend delivery |
| [024](/registry/technical/adr/024-frontend-security-headers) | Frontend-tier security: CSP, cookies, CSRF, headers | Security |

> **Migration ADRs — review outcome** (see the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan)). The frontend rewrite is **committed**: ADRs 011/012/013/014/022/023 were promoted to **Accepted** (the Phase-0 spike now *de-risks* implementation rather than gating the decision). **024** is **Accepted** with a committed CSP baseline (strict `script-src` nonce; pragmatic `style-src`, upgradeable to fully-strict if the spike shows AntD styles can be nonced). **All 13 migration ADRs (011–015, 017–024) are now Accepted.** **ADR 016 (frontend data/caching) was removed**; the data layer is Nuxt built-ins, folded into implementation. Supersessions/revisions: 009→014 (Pinia), 008→023 (Nuxt runtime config), 004 amended by 022 (full-BFF auth); 024 is the frontend half of the security work in 019.

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
