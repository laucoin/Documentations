# API Reference

The backend exposes a single REST API under **`/api/v1`** (`registry.server.prefix` = `/api`, version in the path). Responses are reactive JSON. Every call requires an authenticated session — the `registry_token` cookie, or an
`Authorization: Bearer` header for non-browser callers — except the four public authentication endpoints. Mutating
calls made with the cookie also require an `X-XSRF-TOKEN` header. Project-scoped endpoints live under `/api/v1/projects/{projectId}/…` and are guarded by a project-scoped permission — combined with an **option gate** when the resource belongs to an optional module.

## Conventions

The contract grew feature by feature and applies these conventions unevenly:

- **Versioning** — one version, `/api/v1`, in the path. There is no `/api/v2`.
- **Paths** — plural nouns, nested under their owner (`/projects/{projectId}/participants/{id}`); lowercase, kebab-case segments. Global resources sit directly under `/api/v1` (`/users`, `/metadata`, `/purge`).
- **Verbs** — `GET` read, `POST` create, `PATCH` field edit **and** state transition, `DELETE` remove. State transitions are their own endpoints (`PATCH /{id}/disable|enable|block|unblock`), each with its own `@PreAuthorize`.
- **Bodies / params** — `camelCase` JSON. Pagination and filtering are query params (see below).
- **Errors** — `RegistryControllerAdvice` returns a localized `ErrorDto` (HTTP status, stable `code`, i18n `title`/`message`); language from `Accept-Language` (`en` default, `fr`).
- **Known irregularities (frozen — one first-party client, not worth a breaking change):** two transitions carry the value in the path — `POST /projects/{projectId}/profiles/{id}/accept/{accepted}` (boolean) and `PATCH /projects/{projectId}/alerts/{id}/status/{status}` (enum); the account-anonymisation endpoints are named `impersonate`.

> **Notation.** The *Permission* column names the authority required. `REGISTRY_USER_R` (and other `REGISTRY_*` names without a `PROJECT_` project segment) is a **global** check, `hasAuthority('…')`. A name shown as `PROJECT_MOVEMENT_C` is the project-scoped check `hasPermission(projectId, 'REGISTRY_PROJECT_MOVEMENT_C')`. *option `X`* marks an endpoint additionally gated by `hasPermission(projectId, 'REGISTRY_PROJECT_OPTION_X')`. See [Security](/registry/technical/security) for enforcement and [Roles & Permissions](/registry/functional/roles-and-permissions) for who holds each.

> **List query grammar.** List endpoints accept `pageNumber` (≥ 0, default 0) and `pageSize` (1–200, default 20), returning a page envelope (`content` + page metadata). Free-text search is `textSearched` (trigram-backed, [ADR 006](/registry/technical/adr/006-flyway-trigram-search)); other filters are flat typed params per endpoint (`visibilitySearched`, `withProfile`, `availabilitySearched`, `dateTimeSearched`, …). There is no general `sort` parameter. `/search/*` picker endpoints return a **capped list** (configured maximum, default 10), not a page. Bodies and query params are `camelCase`.

When `registry.feature.documentation.enabled` is true, springdoc serves the generated OpenAPI at `/api-docs` and Swagger UI at `/swagger-ui.html` (also at the root). The generated document is authoritative on payload shapes.

## Authentication — `/api/v1/authentication`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/login/uri?redirectUri=` | Build the provider login URL | **public** |
| `GET` | `/logout/uri?redirectUri=` | Build the provider logout URL | **public** |
| `POST` | `/token` | Exchange an authorization code; sets the session cookies | **public** |
| `POST` | `/token/refresh` | Renew the session from the refresh cookie | **public** |
| `GET` | `/user/current` | Current user, authorities and preferences | authenticated |

Neither token endpoint returns a token in its body: both set `registry_token` and `registry_refresh` as `HttpOnly`
cookies and return only the expiry metadata the SPA needs to schedule its renewal. `/token/refresh` reads the
refresh cookie and takes no request body, and — unlike `/token` — requires an `X-XSRF-TOKEN` header. See
[Security → Session transport](/registry/technical/security#session-transport).

## Users — `/api/v1/users` *(global)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` | Search / list users | `REGISTRY_USER_R` |
| `GET` | `/{id}` | Get a user | `REGISTRY_USER_R` |
| `GET` | `/roles` | Assignable global roles | `REGISTRY_USER_METADATA_R` |
| `PATCH` | `/{id}/role` | Change a user's global role (body: `role`) | `REGISTRY_USER_U` |
| `PATCH` | `/{id}/block` · `/{id}/unblock` | Block / unblock an account | `REGISTRY_USER_U` |
| `PATCH` | `/{id}/impersonate` | Anonymise (GDPR scramble + purge) another user | `REGISTRY_USER_D` |
| `PATCH` | `/impersonate` | Anonymise the caller's own account | authenticated |
| `DELETE` | `/{id}` | Delete a user | `REGISTRY_USER_D` |

> `impersonate` is a legacy name for anonymisation — it is not account switching. See [Security → Data protection](/registry/technical/security#data-protection).

## Preferences — `/api/v1/users/preferences` *(self)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `POST` | `/theme` | Set the theme (param: `theme` ∈ `SYSTEM`/`LIGHT`/`DARK`) | authenticated |
| `POST` | `/language` | Set the language (param: `language`, e.g. `en`, `fr`) | authenticated |
| `POST` | `/profile/select` | Select the active profile by profile id | authenticated |
| `POST` | `/projects/{projectId}/profile/select` | Select the active profile by project id | authenticated |

## My profiles — `/api/v1/users/profiles` *(self)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` | List the caller's project profiles | authenticated |
| `POST` | `/{id}/accept/{accepted}` | Accept (`true`) or reject (`false`) an invitation, from `INVITED` | authenticated |
| `POST` | `/{projectId}/support` | Create a 1-hour support administrator profile on the project | `REGISTRY_PROFILE_C` |
| `DELETE` | `/{id}` | Leave a project (refused for the last permanent administrator) | authenticated |

## Projects — `/api/v1/projects`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` | List projects. Default `withProfile=true` (the caller's own); `withProfile=false` lists all and requires global `REGISTRY_PROJECT_R` | authenticated |
| `GET` | `/{id}` | Get a project | global `REGISTRY_PROJECT_R` **or** `PROJECT_R` |
| `GET` | `/options` | Available option modules | `REGISTRY_PROJECT_METADATA_R` |
| `POST` | `/` | Create a project (creator becomes its administrator) | `REGISTRY_PROJECT_C` |
| `PATCH` | `/{id}` | Update name / dates / options | `PROJECT_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_U` |
| `DELETE` | `/{id}` | Delete a project | `PROJECT_D` |

## Project profiles (membership) — `/api/v1/projects/{projectId}/profiles`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` | List / get members | `PROJECT_PROFILE_R` |
| `GET` | `/search/users` | Users assignable to this project | `PROJECT_PROFILE_METADATA_R` |
| `GET` | `/roles` | Assignable project roles | `PROJECT_PROFILE_METADATA_R` |
| `POST` | `/` | Invite one or more users (batch) | `PROJECT_PROFILE_C` |
| `PATCH` | `/{id}` | Update role / access window | `PROJECT_PROFILE_U` |
| `PATCH` | `/{id}/block` · `/{id}/unblock` | Block / unblock a member | `PROJECT_PROFILE_U` |
| `DELETE` | `/{id}` | Remove a member | `PROJECT_PROFILE_D` |

## Participants — `/api/v1/projects/{projectId}/participants`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` | List / get participants | `PROJECT_PARTICIPANT_R` |
| `GET` | `/birthday` | Participants whose birthday is today | `PROJECT_PARTICIPANT_R` |
| `GET` | `/search/users` · `/search/groups` | Users linkable to a participant · groups a participant can join | `PROJECT_PARTICIPANT_METADATA_R` |
| `GET` | `/{id}/movements` | A participant's movement history | `PROJECT_PARTICIPANT_HISTORY_R` |
| `POST` | `/` | Register a participant | `PROJECT_PARTICIPANT_C` |
| `PATCH` | `/{id}` | Update a participant | `PROJECT_PARTICIPANT_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_PARTICIPANT_U` |
| `DELETE` | `/{id}` | Delete a participant | `PROJECT_PARTICIPANT_D` |

## Groups — `/api/v1/projects/{projectId}/groups`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` · `/{id}/members` | List / get / list members | `PROJECT_GROUP_R` |
| `GET` | `/search/participants` | Participants assignable to a group | `PROJECT_GROUP_METADATA_R` |
| `POST` | `/` | Create a group | `PROJECT_GROUP_C` |
| `PATCH` | `/{id}` | Update a group | `PROJECT_GROUP_U` |
| `PATCH` | `/{id}/members` | Add members (body: participant ids) | `PROJECT_GROUP_U` |
| `DELETE` | `/{id}/members/{memberId}` | Remove one member | `PROJECT_GROUP_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_GROUP_U` |
| `DELETE` | `/{id}` | Delete a group | `PROJECT_GROUP_D` |

## Movements — `/api/v1/projects/{projectId}/movements`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/contents` · `/{id}` | List / list with content / get | `PROJECT_MOVEMENT_R` |
| `GET` | `/search/reasons` | Reasons **and** activities usable to justify a movement | `PROJECT_MOVEMENT_METADATA_R` |
| `GET` | `/search/participants-and-groups` · `/search/vehicles` | Entities movable in a movement · assignable vehicles | `PROJECT_MOVEMENT_METADATA_R` |
| `GET` | `/participants/status` | Live participant headcount (present minors/majors, absent, guests on site) | `PROJECT_R` |
| `GET` | `/vehicles/status` | Live vehicle presence | `PROJECT_R` · *option `VEHICLE`* |
| `GET` | `/{id}/communications` | Movement discussion thread | `PROJECT_MOVEMENT_COMMUNICATION_R` · *option `COMMUNICATION`* |
| `POST` | `/` · `/guests` | Record a registered movement / a guest movement | `PROJECT_MOVEMENT_C` |
| `PATCH` | `/{id}` · `/guests/{id}` | Correct a registered / guest movement | `PROJECT_MOVEMENT_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_MOVEMENT_U` |
| `DELETE` | `/{id}` | Delete a movement | `PROJECT_MOVEMENT_D` |

## Vehicles — `/api/v1/projects/{projectId}/vehicles` · *option `VEHICLE`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` | List / get vehicles | `PROJECT_VEHICLE_R` |
| `GET` | `/{id}/movements` | A vehicle's movement history | `PROJECT_VEHICLE_HISTORY_R` |
| `POST` | `/` | Register a vehicle | `PROJECT_VEHICLE_C` |
| `PATCH` | `/{id}` | Update a vehicle | `PROJECT_VEHICLE_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_VEHICLE_U` |
| `DELETE` | `/{id}` | Delete a vehicle | `PROJECT_VEHICLE_D` |

## Activities — `/api/v1/projects/{projectId}/activities` · *option `ACTIVITY`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` | List / get activities | `PROJECT_ACTIVITY_R` |
| `GET` | `/{id}/movements` | An activity's movement history | `PROJECT_ACTIVITY_HISTORY_R` |
| `POST` | `/` | Plan an activity | `PROJECT_ACTIVITY_C` |
| `PATCH` | `/{id}` | Update an activity | `PROJECT_ACTIVITY_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_ACTIVITY_U` |
| `DELETE` | `/{id}` | Delete an activity | `PROJECT_ACTIVITY_D` |

## Communications — `/api/v1/projects/{projectId}/communications` · *option `COMMUNICATION`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` | List / get communications | `PROJECT_COMMUNICATION_R` |
| `GET` | `/search/movements` · `/search/alerts` | Movements / alerts a message can attach to | `PROJECT_COMMUNICATION_METADATA_R` |
| `POST` | `/` | Post a message | `PROJECT_COMMUNICATION_C` |
| `PATCH` | `/{id}` | Edit a message | `PROJECT_COMMUNICATION_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_COMMUNICATION_U` |
| `DELETE` | `/{id}` | Delete a message | `PROJECT_COMMUNICATION_D` |

> The two `/search/*` endpoints check only `PROJECT_COMMUNICATION_METADATA_R` — they are **not** behind the `COMMUNICATION` option gate that every other endpoint here carries.

## Alerts — `/api/v1/projects/{projectId}/alerts` · *option `ALERT`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/` · `/{id}` | List / get alerts | `PROJECT_ALERT_R` |
| `GET` | `/{id}/communications` | Alert discussion thread | `PROJECT_ALERT_COMMUNICATION_R` |
| `POST` | `/` | Raise an alert | `PROJECT_ALERT_C` |
| `PATCH` | `/{id}` | Edit an alert | `PROJECT_ALERT_U` |
| `PATCH` | `/{id}/status/{status}` | Set status (`IN_PROGRESS` / `RESOLVED` / `CANCELED`) — enum in the path | `PROJECT_ALERT_U` |
| `PATCH` | `/{id}/disable` · `/{id}/enable` | Soft disable / enable | `PROJECT_ALERT_U` |
| `DELETE` | `/{id}` | Delete an alert | `PROJECT_ALERT_D` |

## Metadata — `/api/v1/metadata` *(global)*

Localized label lookups for the frontend. Authenticated; no special permission.

| Method | Path |
| ------ | ---- |
| `GET` | `/presences/status` · `/availabilities/status` · `/profiles/status` · `/movements/types` · `/participants/types` · `/alerts/status` |

## Purge (scheduled jobs) — `/api/v1/purge`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `POST` | `/users` · `/projects` · `/projects/contents` · `/projects/configurations` | Data-retention purges past a configurable age threshold | `REGISTRY_JOB_C` |

`REGISTRY_JOB_C` is a global authority carried only by the `USER_ADMINISTRATOR` role (seed `V1_9_0`). There is no in-process scheduler: an external caller invokes these endpoints on the cron schedules in `registry.feature.purge.*`, authenticating as the system's non-human `SERVICE_ACCOUNT` user (provisioned with `USER_ADMINISTRATOR`). Any platform administrator can call them too.
