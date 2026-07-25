# API Reference

The backend exposes a versioned REST API under **`/api/v2`**. All responses are reactive JSON. Every call requires a bearer JWT except the four public authentication endpoints. Project-scoped endpoints live under `/api/v2/projects/{projectId}/…` and are guarded by a project-scoped permission — often combined with an **option gate** when the resource belongs to an optional module.

The v2 contract follows the conventions in [ADR 017](/registry/technical/adr/017-api-v2-conventions): every state transition is its **own `POST` endpoint** (one endpoint, one functional action, no toggle-by-body and no value-in-path), pickers are **named eligibility sub-collections** searched with `?q=`, and lists share one query grammar. **v1 (`/api/v1`) is frozen and deprecated** — its responses carry `Deprecation`/`Sunset` headers and it is removed once this frontend is fully cut over.

> **Notation.** The *Permission* column names the authority required. `hasAuthority('X')` denotes a **global** permission; a bare project permission (e.g. `MOVEMENT_C`) denotes a **project-scoped** check `hasPermission(projectId, 'REGISTRY_PROJECT_MOVEMENT_C')`. *Option* marks endpoints additionally gated by a project option. See [Security](/registry/technical/security) for enforcement and [Roles & Permissions](/registry/functional/roles-and-permissions) for who holds each.

> **List query grammar.** Every collection accepts `page` (0-based) + `size` (bounded 1–200), `sort=field,-otherField` (leading `-` = descending), flat filter params (`?status=ACCEPTED`), and free-text `?q=` (trigram-backed). JSON bodies and query params are `camelCase`.

When the backend runs with API docs enabled, an interactive OpenAPI/Swagger UI is served with the same security scheme (OAuth2) and grouped by the domains below.

## Authentication — `/api/v2/authentication`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/login/uri?redirectUri=` | Build the provider login URL | **public** |
| GET | `/logout/uri?redirectUri=` | Build the provider logout URL | **public** |
| POST | `/token` | Exchange an authorization code for tokens | **public** |
| POST | `/token/refresh` | Refresh tokens | **public** |
| GET | `/user/current` | Current user, authorities and preferences | authenticated |

## Users — `/api/v2/users` *(global)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/?q=&page=&size=&sort=` | Search / list users | `REGISTRY_USER_R` |
| GET | `/{id}` | Get a user | `REGISTRY_USER_R` |
| GET | `/roles` | Assignable user roles | `REGISTRY_USER_METADATA_R` |
| PATCH | `/{id}/role` | Change a user's global role (body: `role`) | `REGISTRY_USER_U` |
| POST | `/{id}/block` · `/{id}/unblock` | Block / unblock an account | `REGISTRY_USER_U` |
| POST | `/{id}/anonymize` | Anonymize (GDPR purge) another user | `REGISTRY_USER_D` |
| POST | `/anonymize` | Anonymize the caller's own account | authenticated |
| DELETE | `/{id}` | Delete a user | `REGISTRY_USER_D` |

> **v1 → v2:** `PATCH …/block` → `POST …/block`; `PATCH …/unblock` → `POST …/unblock`; `PATCH …/impersonate` → `POST …/anonymize` (renamed for accuracy — it never was impersonation); `PATCH /impersonate` → `POST /anonymize`.

## Preferences — `/api/v2/users/preferences` *(self)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| POST | `/theme` | Set theme (body: `theme` ∈ `SYSTEM`/`LIGHT`/`DARK`) | authenticated |
| POST | `/language` | Set language (body: `language` ∈ `en`/`fr`) | authenticated |
| POST | `/select-profile` | Select the active profile (body: exactly one of `profileId` \| `projectId`) | authenticated |

> **v1 → v2:** the two selectors (`/profile/select` by id and `/projects/{projectId}/profile/select` by project) collapse into one action — `select the active profile` — whose body carries either identifier.

## My profiles — `/api/v2/users/profiles` *(self)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/?page=&size=` | List the caller's project profiles | authenticated |
| POST | `/{id}/accept` · `/{id}/reject` | Accept / reject an invitation (from `INVITED`) | authenticated |
| POST | `/{projectId}/support` | Create a 1-hour support administrator profile | `REGISTRY_PROFILE_C` |
| DELETE | `/{id}` | Leave a project (blocked if last administrator) | authenticated |

> **v1 → v2:** `POST /{id}/accept/{accepted}` (boolean in path) splits into two explicit actions — `POST /{id}/accept` and `POST /{id}/reject`.

## Projects — `/api/v2/projects`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/?q=&page=&size=&sort=` | List projects visible to the caller | authenticated |
| GET | `/{id}` | Get a project | `REGISTRY_PROJECT_R` (global or scoped) |
| GET | `/options` | Available option modules | `REGISTRY_PROJECT_METADATA_R` |
| POST | `/` | Create a project (creator becomes admin) | `REGISTRY_PROJECT_C` |
| PATCH | `/{id}` | Update a project | `PROJECT_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable (soft) | `PROJECT_U` |
| DELETE | `/{id}` | Delete a project | `PROJECT_D` |

## Project profiles (membership) — `/api/v2/projects/{projectId}/profiles`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get members | `PROFILE_R` |
| GET | `/assignable-users?q=` | Search users assignable to this project | `PROFILE_METADATA_R` |
| GET | `/roles` | Assignable project roles | `PROFILE_METADATA_R` |
| POST | `/` | Invite one or more users | `PROFILE_C` |
| PATCH | `/{id}` | Update role / access window | `PROFILE_U` |
| POST | `/{id}/block` · `/{id}/unblock` | Block / unblock a member | `PROFILE_U` |
| DELETE | `/{id}` | Remove a member | `PROFILE_D` |

> **v1 → v2:** `GET …/search/users` → `GET …/assignable-users?q=`; `PATCH …/block`·`/unblock` → `POST …/block`·`/unblock`.

## Participants — `/api/v2/projects/{projectId}/participants`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get participants | `PARTICIPANT_R` |
| GET | `/birthdays` | Today's birthdays | `PARTICIPANT_R` |
| GET | `/linkable-users?q=` · `/linkable-groups?q=` | Search users / groups linkable to a participant | `PARTICIPANT_METADATA_R` |
| GET | `/{id}/movements` | A participant's movement history | `PARTICIPANT_HISTORY_R` |
| POST | `/` | Create a participant | `PARTICIPANT_C` |
| PATCH | `/{id}` | Update | `PARTICIPANT_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `PARTICIPANT_U` |
| DELETE | `/{id}` | Delete a participant | `PARTICIPANT_D` |

> **v1 → v2:** `GET …/search/users`·`/search/groups` → `linkable-users`·`linkable-groups`; `/birthday` → `/birthdays`; `PATCH …/disable`·`/enable` → `POST` verbs.

## Groups — `/api/v2/projects/{projectId}/groups`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` · `/{id}/members` | List / get / list members | `GROUP_R` |
| GET | `/assignable-participants?q=` | Search participants addable to a group | `GROUP_METADATA_R` |
| POST | `/` | Create a group | `GROUP_C` |
| PATCH | `/{id}` | Update | `GROUP_U` |
| POST | `/{id}/members` | Add members (body: `participantIds`) | `GROUP_U` |
| DELETE | `/{id}/members/{memberId}` | Remove a member | `GROUP_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `GROUP_U` |
| DELETE | `/{id}` | Delete a group | `GROUP_D` |

> **v1 → v2:** `GET …/search/participants` → `/assignable-participants?q=`; adding members becomes `POST …/members` (was `PATCH …/members`); `PATCH …/disable`·`/enable` → `POST` verbs.

## Movements — `/api/v2/projects/{projectId}/movements`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/contents` · `/{id}` | List / list with content / get | `MOVEMENT_R` |
| GET | `/reasons?q=` · `/eligible-participants-and-groups?q=` · `/eligible-vehicles?q=` | Pickers for the movement form | `MOVEMENT_METADATA_R` |
| GET | `/participants/status` | Live participant headcount | `REGISTRY_PROJECT_R` |
| GET | `/vehicles/status` | Live vehicle presence | `REGISTRY_PROJECT_R` · *option `VEHICLE`* |
| GET | `/{id}/communications` | Movement discussion thread | `MOVEMENT_COMMUNICATION_R` · *option `COMMUNICATION`* |
| POST | `/` · `/guests` | Record a movement / a guest movement | `MOVEMENT_C` |
| PATCH | `/{id}` · `/guests/{id}` | Update / update guest movement | `MOVEMENT_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `MOVEMENT_U` |
| DELETE | `/{id}` | Delete a movement | `MOVEMENT_D` |

> **v1 → v2:** `GET …/search/reasons`·`/search/participants-and-groups`·`/search/vehicles` → `/reasons`·`/eligible-participants-and-groups`·`/eligible-vehicles` (each `?q=`); `PATCH …/disable`·`/enable` → `POST` verbs.

## Vehicles — `/api/v2/projects/{projectId}/vehicles` · *option `VEHICLE`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get vehicles | `VEHICLE_R` |
| GET | `/{id}/movements` | A vehicle's movement history | `VEHICLE_HISTORY_R` |
| POST | `/` | Create a vehicle | `VEHICLE_C` |
| PATCH | `/{id}` | Update | `VEHICLE_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `VEHICLE_U` |
| DELETE | `/{id}` | Delete a vehicle | `VEHICLE_D` |

## Activities — `/api/v2/projects/{projectId}/activities` · *option `ACTIVITY`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get activities | `ACTIVITY_R` |
| GET | `/{id}/movements` | An activity's movement history | `ACTIVITY_HISTORY_R` |
| POST | `/` | Create an activity | `ACTIVITY_C` |
| PATCH | `/{id}` | Update | `ACTIVITY_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `ACTIVITY_U` |
| DELETE | `/{id}` | Delete an activity | `ACTIVITY_D` |

## Communications — `/api/v2/projects/{projectId}/communications` · *option `COMMUNICATION`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get communications | `COMMUNICATION_R` |
| GET | `/attachable-movements?q=` · `/attachable-alerts?q=` | Pickers to attach a message | `COMMUNICATION_METADATA_R` |
| POST | `/` | Post a message | `COMMUNICATION_C` |
| PATCH | `/{id}` | Update | `COMMUNICATION_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `COMMUNICATION_U` |
| DELETE | `/{id}` | Delete a message | `COMMUNICATION_D` |

> **v1 → v2:** `GET …/search/movements`·`/search/alerts` → `/attachable-movements`·`/attachable-alerts` (each `?q=`); `PATCH …/disable`·`/enable` → `POST` verbs.

## Alerts — `/api/v2/projects/{projectId}/alerts` · *option `ALERT`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get alerts | `ALERT_R` |
| GET | `/{id}/communications` | Alert discussion thread | `ALERT_COMMUNICATION_R` |
| POST | `/` | Raise an alert | `ALERT_C` |
| PATCH | `/{id}` | Update | `ALERT_U` |
| POST | `/{id}/resolve` · `/{id}/cancel` · `/{id}/reopen` | Status transitions (`IN_PROGRESS` ⇄ `RESOLVED`/`CANCELED`) | `ALERT_U` |
| POST | `/{id}/disable` · `/{id}/enable` | Disable / enable | `ALERT_U` |
| DELETE | `/{id}` | Delete an alert | `ALERT_D` |

> **v1 → v2:** `PATCH …/status/{status}` (enum in path) splits into one verb per transition — `POST …/resolve`, `POST …/cancel`, `POST …/reopen`; `PATCH …/disable`·`/enable` → `POST` verbs.

## Metadata — `/api/v2/metadata`

Localized label lookups for the frontend (`presences/status`, `availabilities/status`, `profiles/status`, `movements/types`, `participants/types`, `alerts/status`). Authenticated; no special permission.

## Purge (scheduled jobs) — `/api/v2/purge`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| POST | `/users` · `/projects` · `/projects/contents` · `/projects/configurations` | Data-retention purges | `REGISTRY_JOB_C` |

These are invoked by the system's `SERVICE_ACCOUNT` on a cron schedule; a platform administrator also holds `REGISTRY_JOB_C`.

## Deprecated — `/api/v1`

The v1 contract remains available, **frozen**, during the migration. Every v1 response carries `Deprecation: true`, a `Sunset` date, and a `Link` to this reference ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)). v1 is removed once the Nuxt frontend is fully cut over in production and v1 traffic reaches zero — see [ADR 017](/registry/technical/adr/017-api-v2-conventions).
