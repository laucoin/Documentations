# API Reference

The backend exposes a versioned REST API under `/api/v1`. All responses are reactive JSON. Every call requires a bearer JWT except the four public authentication endpoints. Project-scoped endpoints live under `/api/v1/projects/{projectId}/…` and are guarded by a project-scoped permission — often combined with an **option gate** when the resource belongs to an optional module.

> **Notation.** The *Permission* column names the authority required. `hasAuthority('X')` denotes a **global** permission; a bare project permission (e.g. `MOVEMENT_C`) denotes a **project-scoped** check `hasPermission(projectId, 'REGISTRY_PROJECT_MOVEMENT_C')`. *Option* marks endpoints additionally gated by a project option. See [Security](./security) for how these are enforced and [Roles & Permissions](../functional/roles-and-permissions) for who holds each.

When the backend runs with API docs enabled, an interactive OpenAPI/Swagger UI is served with the same security scheme (OAuth2) and grouped by the domains below.

## Authentication — `/api/v1/authentication`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/login/uri?redirectUri=` | Build the provider login URL | **public** |
| GET | `/logout/uri?redirectUri=` | Build the provider logout URL | **public** |
| POST | `/token` | Exchange an authorization code for tokens | **public** |
| POST | `/token/refresh` | Refresh tokens | **public** |
| GET | `/user/current` | Current user, authorities and preferences | authenticated |

## Users — `/api/v1/users` *(global)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` | Search / list users (paged) | `REGISTRY_USER_R` |
| GET | `/{id}` | Get a user | `REGISTRY_USER_R` |
| GET | `/roles` | Assignable user roles | `REGISTRY_USER_METADATA_R` |
| PATCH | `/{id}/role` | Change a user's global role | `REGISTRY_USER_U` |
| PATCH | `/{id}/block` · `/{id}/unblock` | Block / unblock an account | `REGISTRY_USER_U` |
| PATCH | `/{id}/impersonate` | Anonymize (GDPR purge) another user | `REGISTRY_USER_D` |
| PATCH | `/impersonate` | Anonymize the caller's own account | authenticated |
| DELETE | `/{id}` | Delete a user | `REGISTRY_USER_D` |

## Preferences — `/api/v1/users/preferences` *(self)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| POST | `/theme` | Set theme (`SYSTEM`/`LIGHT`/`DARK`) | authenticated |
| POST | `/language` | Set language (`en`/`fr`) | authenticated |
| POST | `/profile/select` | Select active profile by id | authenticated |
| POST | `/projects/{projectId}/profile/select` | Select active profile by project | authenticated |

## My profiles — `/api/v1/users/profiles` *(self)*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` | List the caller's project profiles (paged) | authenticated |
| POST | `/{id}/accept/{accepted}` | Accept / reject an invitation (from `INVITED`) | authenticated |
| POST | `/{projectId}/support` | Create a 1-hour support administrator profile | `REGISTRY_PROFILE_C` |
| DELETE | `/{id}` | Leave a project (blocked if last administrator) | authenticated |

## Projects — `/api/v1/projects`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` | List projects visible to the caller | authenticated |
| GET | `/{id}` | Get a project | `REGISTRY_PROJECT_R` (global or scoped) |
| GET | `/options` | Available option modules | `REGISTRY_PROJECT_METADATA_R` |
| POST | `/` | Create a project (creator becomes admin) | `REGISTRY_PROJECT_C` |
| PATCH | `/{id}` | Update a project | `PROJECT_U` |
| PATCH | `/{id}/disable` · `/{id}/enable` | Disable / enable (soft) | `PROJECT_U` |
| DELETE | `/{id}` | Delete a project | `PROJECT_D` |

## Project profiles (membership) — `/api/v1/projects/{projectId}/profiles`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get members | `PROFILE_R` |
| GET | `/search/users` | Search assignable users | `PROFILE_METADATA_R` |
| GET | `/roles` | Assignable project roles | `PROFILE_METADATA_R` |
| POST | `/` | Invite one or more users | `PROFILE_C` |
| PATCH | `/{id}` | Update role / access window | `PROFILE_U` |
| PATCH | `/{id}/block` · `/{id}/unblock` | Block / unblock a member | `PROFILE_U` |
| DELETE | `/{id}` | Remove a member | `PROFILE_D` |

## Participants — `/api/v1/projects/{projectId}/participants`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get participants | `PARTICIPANT_R` |
| GET | `/birthday` | Today's birthdays | `PARTICIPANT_R` |
| GET | `/search/users` · `/search/groups` | Search for linking | `PARTICIPANT_METADATA_R` |
| GET | `/{id}/movements` | A participant's movement history | `PARTICIPANT_HISTORY_R` |
| POST | `/` | Create a participant | `PARTICIPANT_C` |
| PATCH | `/{id}` · `/{id}/disable` · `/{id}/enable` | Update / disable / enable | `PARTICIPANT_U` |
| DELETE | `/{id}` | Delete a participant | `PARTICIPANT_D` |

## Groups — `/api/v1/projects/{projectId}/groups`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` · `/{id}/members` | List / get / list members | `GROUP_R` |
| GET | `/search/participants` | Search participants to add | `GROUP_METADATA_R` |
| POST | `/` | Create a group | `GROUP_C` |
| PATCH | `/{id}` · `/{id}/members` | Update / add members | `GROUP_U` |
| DELETE | `/{id}/members/{memberId}` | Remove a member | `GROUP_U` |
| PATCH | `/{id}/disable` · `/{id}/enable` | Disable / enable | `GROUP_U` |
| DELETE | `/{id}` | Delete a group | `GROUP_D` |

## Movements — `/api/v1/projects/{projectId}/movements`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/contents` · `/{id}` | List / list with content / get | `MOVEMENT_R` |
| GET | `/search/reasons` · `/search/participants-and-groups` · `/search/vehicles` | Pickers for the movement form | `MOVEMENT_METADATA_R` |
| GET | `/participants/status` | Live participant headcount | `REGISTRY_PROJECT_R` |
| GET | `/vehicles/status` | Live vehicle presence | `REGISTRY_PROJECT_R` · *option `VEHICLE`* |
| GET | `/{id}/communications` | Movement discussion thread | `MOVEMENT_COMMUNICATION_R` · *option `COMMUNICATION`* |
| POST | `/` · `/guests` | Record a movement / a guest movement | `MOVEMENT_C` |
| PATCH | `/{id}` · `/guests/{id}` · `/{id}/disable` · `/{id}/enable` | Update / disable / enable | `MOVEMENT_U` |
| DELETE | `/{id}` | Delete a movement | `MOVEMENT_D` |

## Vehicles — `/api/v1/projects/{projectId}/vehicles` · *option `VEHICLE`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get vehicles | `VEHICLE_R` |
| GET | `/{id}/movements` | A vehicle's movement history | `VEHICLE_HISTORY_R` |
| POST | `/` | Create a vehicle | `VEHICLE_C` |
| PATCH | `/{id}` · `/{id}/disable` · `/{id}/enable` | Update / disable / enable | `VEHICLE_U` |
| DELETE | `/{id}` | Delete a vehicle | `VEHICLE_D` |

## Activities — `/api/v1/projects/{projectId}/activities` · *option `ACTIVITY`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get activities | `ACTIVITY_R` |
| GET | `/{id}/movements` | An activity's movement history | `ACTIVITY_HISTORY_R` |
| POST | `/` | Create an activity | `ACTIVITY_C` |
| PATCH | `/{id}` · `/{id}/disable` · `/{id}/enable` | Update / disable / enable | `ACTIVITY_U` |
| DELETE | `/{id}` | Delete an activity | `ACTIVITY_D` |

## Communications — `/api/v1/projects/{projectId}/communications` · *option `COMMUNICATION`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get communications | `COMMUNICATION_R` |
| GET | `/search/movements` · `/search/alerts` | Pickers to attach a message | `COMMUNICATION_METADATA_R` |
| POST | `/` | Post a message | `COMMUNICATION_C` |
| PATCH | `/{id}` · `/{id}/disable` · `/{id}/enable` | Update / disable / enable | `COMMUNICATION_U` |
| DELETE | `/{id}` | Delete a message | `COMMUNICATION_D` |

## Alerts — `/api/v1/projects/{projectId}/alerts` · *option `ALERT`*

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| GET | `/` · `/{id}` | List / get alerts | `ALERT_R` |
| GET | `/{id}/communications` | Alert discussion thread | `ALERT_COMMUNICATION_R` |
| POST | `/` | Raise an alert | `ALERT_C` |
| PATCH | `/{id}` · `/{id}/status/{status}` | Update / change status | `ALERT_U` |
| PATCH | `/{id}/disable` · `/{id}/enable` | Disable / enable | `ALERT_U` |
| DELETE | `/{id}` | Delete an alert | `ALERT_D` |

## Metadata — `/api/v1/metadata`

Localized label lookups for the frontend (`presences/status`, `availabilities/status`, `profiles/status`, `movements/types`, `participants/types`, `alerts/status`). Authenticated; no special permission.

## Purge (scheduled jobs) — `/api/v1/purge`

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| POST | `/users` · `/projects` · `/projects/contents` · `/projects/configurations` | Data-retention purges | `REGISTRY_JOB_C` |

These are invoked by the system's `SERVICE_ACCOUNT` on a cron schedule; a platform administrator also holds `REGISTRY_JOB_C`.
