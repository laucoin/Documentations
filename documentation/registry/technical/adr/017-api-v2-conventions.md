# ADR 017 — API v2: endpoint naming, query conventions, and v1 sunset

## Status

Accepted — first spec of the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan) (Track A · A1). Reshapes the [API Reference](/registry/technical/api-reference); does not change the backend stack ([ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)) or the security model ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth), [ADR 005](/registry/technical/adr/005-db-driven-project-rbac)).

## Context

The v1 REST contract (`/api/v1`) grew feature by feature and accumulated inconsistencies that a fresh client should not have to absorb. The migration rewrites the frontend from scratch on Nuxt, and that new client will consume the API from day one — so this is the moment to fix the contract rather than carry the debt forward. The brief is explicit: **non-backward-compatible changes must land as a new version**, not mutate v1 in place.

The recurring problems in v1:

- **Values baked into the path** — `POST /profiles/{id}/accept/{accepted}` (a boolean) and `PATCH /alerts/{id}/status/{status}` (an enum). These are not resources; each value is a separate URL variant that is awkward to validate and document.
- **RPC-style state verbs with inconsistent methods** — `/{id}/block`·`/unblock` and `/{id}/disable`·`/enable` appear on eight-plus resources, sometimes as `PATCH`, and sit next to genuine field updates that are also `PATCH`.
- **Search modeled as path segments** — eight `…/search/{something}` endpoints. Several are not "search this collection" but "find the entities *eligible to be linked here*" (users invitable to a project, participants linkable to a movement, movements a message can attach to), so their scoping is meaningful and must be preserved.
- **Ad-hoc query parameters** — only `offset`/`limit`, with no agreed grammar for sorting, filtering, or free-text search. The new frontend needs a single predictable contract.

One structural fact shapes the sunset strategy: **Registry's API has exactly one first-party client** (the frontend being rewritten). There is no third-party integrator to protect, so v1 can be retired as soon as the new client is fully live, rather than kept alive for a long public-deprecation window.

## Decision

Introduce **`/api/v2`** as a clean break, governed by the conventions below. `/api/v1` is **frozen** (no new features, no changes) and **deprecated for removal**.

### 1 — Versioning

- Version lives in the **URI path** (`/api/v2/…`) — continuing the v1 scheme. It is the most discoverable option for a single SPA client and for Swagger, and it lets v1 and v2 run side by side during the transition.
- v2 is **additive-safe going forward**: within v2, only backward-compatible changes are allowed. The next breaking change would be v3.

### 2 — Resource & path naming

- **Plural noun collections**, hierarchical under their owner: `/api/v2/projects/{projectId}/participants/{id}`.
- Path segments are **lowercase**; multi-word segments use **kebab-case** (`assignable-users`, `participants-and-groups`).
- **JSON bodies and query parameters use `camelCase`** — consistent with the JSON payloads and the TypeScript client.

### 3 — State transitions: one endpoint, one functional action

Every state transition is its **own explicit endpoint**, with the intent fully expressed in the URL and **no redundant body** restating it. There is **no toggle-by-body** (`{ "blocked": true }` against a `/block` route) and **no value-in-path** (`/accept/{accepted}`, `/status/{status}`). Side-effecting transitions use **`POST`**.

| v1 | v2 |
| -- | -- |
| `PATCH /users/{id}/block` · `/unblock` | `POST /users/{id}/block` · `POST /users/{id}/unblock` |
| `PATCH /projects/{id}/disable` · `/enable` | `POST /projects/{id}/disable` · `POST /projects/{id}/enable` |
| `POST /profiles/{id}/accept/{accepted}` | `POST /profiles/{id}/accept` · `POST /profiles/{id}/reject` |
| `PATCH /alerts/{id}/status/{status}` | one verb per transition (e.g. `POST /alerts/{id}/resolve`), the exact set derived from the [Alerts](/registry/functional/features/alerts) spec |
| `PATCH /users/{id}/impersonate` | `POST /users/{id}/anonymize` (and `POST /users/anonymize` for the caller's own account) |
| `POST /users/preferences/theme` · `/language` · `/profile/select` | `POST /users/preferences/theme` · `/language` · `/select-profile` — each one action, body carries only the *value* being set, never the action name |

**Exemption.** Actions that carry genuine domain data — creating a movement, posting a message, inviting users, updating fields — still take a request body. That is real payload, not duplicated intent, and is unaffected by the no-redundant-body rule. Plain field edits remain `PATCH /{id}` with the changed fields.

### 4 — Search and pickers: named eligibility sub-collections

Each v1 `search/*` endpoint becomes a **scoped sub-collection** whose name states the eligibility relationship, searched with **`?q=`** and paged/sorted like any list.

| v1 | v2 |
| -- | -- |
| `profiles/search/users` | `profiles/assignable-users?q=` |
| `participants/search/users` · `/groups` | `participants/linkable-users?q=` · `linkable-groups?q=` |
| `movements/search/reasons` | `movements/reasons?q=` |
| `movements/search/participants-and-groups` | `movements/eligible-participants-and-groups?q=` |
| `movements/search/vehicles` | `movements/eligible-vehicles?q=` |
| `groups/search/participants` | `groups/assignable-participants?q=` |
| `communications/search/movements` · `/alerts` | `communications/attachable-movements?q=` · `attachable-alerts?q=` |

The `assignable-` / `linkable-` / `eligible-` / `attachable-` prefixes carry the "…to *this* project/participant/movement" scoping that a bare `?q=` on the base collection cannot express.

### 5 — Query-parameter grammar

Uniform across every list and picker endpoint:

- **Pagination** — `page` (0-based) and `size`, replacing `offset`/`limit`. `size` stays bounded (1–200) as today; the response keeps the existing page envelope (`content`, total count, page metadata).
- **Sorting** — `sort=field,-otherField`; a leading `-` means descending. Repeatable / comma-separated for multi-key sort.
- **Filtering** — flat, typed params: `?status=ACCEPTED&enabled=true`.
- **Free-text search** — `?q=` on collections and pickers, backed by the existing `pg_trgm` trigram index ([ADR 006](/registry/technical/adr/006-flyway-trigram-search)).

### 6 — Deprecation & sunset policy for v1

- Every v1 response carries **`Deprecation: true`** and a **`Sunset: <http-date>`** header ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)), plus a `Link` header pointing at the v2 migration docs.
- v1 is **frozen**: bug-for-bug stable, no new endpoints, no behavioural change.
- **Removal criterion is usage, not calendar.** Because the only client is first-party, v1 is removed once the Nuxt frontend is fully cut over in production and **v1 traffic has dropped to zero**, confirmed via the existing Actuator/Micrometer metrics. No prolonged public-deprecation window is owed.

## Consequences

### Security

- **One endpoint per action maps 1:1 to one authority.** Each transition keeps its own `@PreAuthorize` (e.g. `USER_U` on `/block`), so authorization stays as fine-grained as v1 — finer than a single coarse `PATCH` would allow — and there is no way to smuggle a privileged state change through a general update body.
- **No auth change.** v2 reuses the same OAuth2 resource-server + confidential-client scheme ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)) and the project-scoped `PermissionEvaluator` ([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)). Deprecation headers do not relax any check; v1 stays fully guarded until deletion.
- Explicit, typed query params (bounded `size`, enumerated filter values) narrow the input surface versus free-form paths.

### Performance & scalability

- `page`/`size` maps directly onto the existing count-plus-page query model — no new access pattern.
- Named sub-collections are **independently cacheable** and individually filterable, which pairs with the frontend data-caching layer and the backend caching work ([ADR 018](/registry/technical/migration-plan/2026-07-25-plan)).
- `?q=`, `sort`, and `filter` push down into SQL over the `pg_trgm` index rather than being filtered in the app.

### Pros

- A single, predictable contract: uniform paging/sort/filter/search everywhere, one convention for state changes, unambiguous URLs.
- The clean break is **free of retrofit cost** — the new frontend never learns the v1 shape, and the old frontend never has to change.
- Aggressive, usage-based sunset keeps exactly two contract versions alive and no longer.

### Cons / trade-offs

- **More endpoints.** "One action, one endpoint" multiplies state routes (`/block` + `/unblock` rather than one toggle). Accepted deliberately: explicitness and per-action authorization are worth more here than endpoint count.
- **Dual maintenance during the window.** v1 and v2 controllers coexist until cutover; both must stay green. Bounded by the single-client sunset.
- **A full re-document.** The [API Reference](/registry/technical/api-reference) is rewritten for v2 and the OpenAPI groups regenerated.

### Why not media-type / header versioning

Cleaner URLs, but harder to browse, test, and cache, and it offers no real benefit for a single first-party SPA. Overkill here.

### Why not state-as-field `PATCH`

Modelling transitions as `PATCH /{id}` with `{ "enabled": false }` is more "RESTful-pure" and yields fewer endpoints, but it collapses distinct actions behind one route and one authority, and it reintroduces exactly the endpoint/body intent duplication this decision rejects. Explicit action endpoints were chosen instead.

### Why not `?q=` on the base collection / cursor pagination

`?q=` on base collections cannot express the "eligible-to-link-*here*" scoping several pickers require. Cursor pagination buys stable deep paging over shifting data, but forfeits random page access and adds backend complexity that Registry's bounded admin lists do not need.
