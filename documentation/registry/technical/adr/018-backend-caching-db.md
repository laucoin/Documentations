# ADR 018 — Backend caching and database optimization

## Status

Accepted — Track A · A2 of the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan). Stays within the reactive constraints of [ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc); pairs with the frontend's data-caching layer.

## Context

The backend is fully reactive ([ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)): WebFlux with hand-written R2DBC SQL, `PageModel` assembled from a `count` + a page query, and `pg_trgm` trigram search ([ADR 006](/registry/technical/adr/006-flyway-trigram-search)). There is **no caching layer** today (the RBAC permission map is loaded in-memory at startup, but nothing else is cached).

Two cost centres stand out. First, a small set of **read-mostly reference data** — localized metadata/label lookups, the project-option catalog, assignable global/project roles, and the RBAC permission map — is read on nearly every request but changes rarely, yet is re-fetched from the database repeatedly. Second, the **`count` query on hot paginated lists** doubles the round-trips and can dominate cost on large tables.

The goal is to cut database round-trips and query cost **without** blocking the event loop and **without** weakening multi-tenant isolation.

## Decision

### 1 — Cache topology: Caffeine, in-process

Use **Caffeine as an in-process (per-replica) cache**. No new infrastructure. Cache access is **reactive-safe** — a `CacheMono` / Caffeine `AsyncCache` wrapper — **not** Spring's blocking `@Cacheable`, which does not compose with `Mono`/`Flux`.

### 2 — What is cached (and what is not)

- **Cached:** read-mostly, non-tenant-sensitive **reference data** only — localized metadata/labels, the option catalog, assignable roles, and the RBAC permission map ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)).
- **Not cached:** tenant-scoped mutable domain data (participants, movements, profiles, alerts…). Those reads are optimized at the query/index layer instead, so there is no risk of serving stale or cross-tenant data from a cache.

### 3 — Freshness: short TTL + local eviction

Cached entries carry a **short TTL** and are **explicitly evicted on the writes that change them** (e.g. a role/permission change evicts the RBAC entry). Because caches are per-replica, an eviction on one replica does not reach the others, so a change propagates across the fleet within the **TTL window** — bounded, seconds-scale staleness, accepted as the trade-off for zero shared infrastructure.

### 4 — HTTP caching

Emit **`ETag` + `Cache-Control`** on cacheable `GET` responses (metadata, options, roles) so the Nuxt BFF and browsers can revalidate cheaply (`304 Not Modified`) instead of re-fetching bodies.

### 5 — Database optimization

A review-and-fix pass, not a redesign:

- **Indexing** — composite indexes covering the columns the [API v2](/registry/technical/api-reference) filter/sort/search params hit; retain `pg_trgm` GIN indexes for `?q=`.
- **Count cost** — on hot lists, cache or estimate the total where exactness is not required (or defer it), rather than paying a full `count` on every page request.
- **No duplicated / N+1 queries** — compose the existing reusable join/visibility SQL fragments so a list is one query, verified with `EXPLAIN ANALYZE`.
- **R2DBC pool** — size the connection pool to the event-loop and database capacity, with prepared-statement caching. The startup-only Flyway/JDBC connection ([ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)) is unaffected.

## Consequences

### Positive

- **Fewer round-trips on the hottest reads** — reference lookups are served from memory, and cacheable GETs revalidate with `304` instead of re-sending bodies.
- **Cheaper hot-list queries** — indexing plus taming the `count` cost cuts the dominant paginated-list overhead.
- **No new infrastructure and reactive-safe** — Caffeine is in-process and non-blocking; nothing new to operate.
- **Isolation preserved** — only non-tenant reference data is cached, so staleness and cross-tenant leakage are structurally avoided.

### Negative

- **Per-replica staleness.** Without shared invalidation, a reference change (e.g. a role edit) may take up to the TTL to be reflected on every replica. Acceptable for read-mostly data, but real.
- **More cache-management code** — TTLs and eviction hooks to write and keep correct as cached data evolves.
- **Index and tuning burden** — new indexes add write cost and maintenance; pool and count strategies need calibration.

### Why not Redis / a distributed cache

A shared cache would give cross-replica invalidation and exact, immediate consistency, but at the cost of a new infrastructure dependency to run and secure. The cached data is read-mostly reference data where short-TTL per-replica staleness is fine, so distributed invalidation is not worth it here. If the system later needs cross-replica cache consistency **or** global (not per-replica) rate limiting, revisit — a single shared Redis would serve both (see [ADR 019](/registry/technical/adr/019-backend-security-hardening)).

### Why not cache tenant domain data

Caching participants/movements/profiles would risk serving stale or, worse, cross-tenant data, and the isolation model ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)) is not worth putting at risk for a read that query and index optimization can already make fast.
