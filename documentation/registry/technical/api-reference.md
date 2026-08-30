# API Reference

`/api/v1` — the only version. Every endpoint below is listed with the **exact authorisation rule** the backend applies, because that rule is the contract as much as the URL is.

::: tip The live contract
When `registry.feature.documentation.enabled` is on, springdoc publishes the generated OpenAPI at `/api-docs` and Swagger UI at `/swagger-ui.html`. This page is the readable companion; the generated document is authoritative on payload shapes.
:::

## Conventions

| Aspect | Rule |
| ------ | ---- |
| Base path | `/api/v1`, plural nouns, nested for ownership: `/projects/{projectId}/activities` |
| Authentication | `Authorization: Bearer <token>` on everything except the four public endpoints |
| Language | `Accept-Language` selects `en` or `fr` for error messages |
| Pagination | `pageNumber` (≥ 0, default 0) and `pageSize` (1–200, default 20), returning a `PageModel` |
| Search endpoints | `/search/**` return a **capped list**, not a page — they feed pickers |
| Text search | `textSearched`, trigram similarity, typo-tolerant |
| Dates | ISO-8601 date-time on `*DateTimeSearched` parameters |
| Verbs | `GET` read · `POST` create · `PATCH` partial update · `DELETE` remove |
| State changes | `PATCH /{id}/disable`, `/{id}/enable`, `/{id}/block`, `/{id}/unblock` |
| Errors | i18n message keys, shaped by `RegistryControllerAdvice`; never stack traces |

Notation below: `hasAuthority(X)` is a global permission; `hasPermission(id, X)` is scoped to that project.

## Authentication

`/api/v1/authentication` — the only public surface.

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/login/uri?redirectUri=` | **Public** |
| `GET` | `/logout/uri?redirectUri=` | **Public** |
| `POST` | `/token` | **Public** — exchanges an authorization code |
| `POST` | `/token/refresh` | **Public** — exchanges a refresh token |
| `GET` | `/user/current` | Authenticated |

The backend holds the OIDC client secret and performs both exchanges server-side; the browser never calls the provider's token endpoint.

## Projects

`/api/v1/projects`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | Authenticated — returns the caller's projects. `withProfile=false` is honoured only with `REGISTRY_PROJECT_R` |
| `GET` | `/options` | `hasAuthority(REGISTRY_PROJECT_METADATA_R)` |
| `GET` | `/{id}` | `hasAuthority(REGISTRY_PROJECT_R)` **or** `hasPermission(#id, REGISTRY_PROJECT_R)` |
| `POST` | `/` | `hasAuthority(REGISTRY_PROJECT_C)` |
| `PATCH` | `/{id}` | `hasPermission(#id, REGISTRY_PROJECT_U)` |
| `PATCH` | `/{id}/disable` | `hasPermission(#id, REGISTRY_PROJECT_U)` |
| `PATCH` | `/{id}/enable` | `hasPermission(#id, REGISTRY_PROJECT_U)` |
| `DELETE` | `/{id}` | `hasPermission(#id, REGISTRY_PROJECT_D)` |

Filters on the list: `textSearched`, `visibilitySearched`, `withProfile`, `dateTimeSearched`.

`GET /{id}` is the one place where the global and project planes are combined with an **or** — a platform administrator may read any project, but still cannot write to one.

## Project profiles

`/api/v1/projects/{projectId}/profiles`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_R)` |
| `GET` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_R)` |
| `GET` | `/search/users` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_METADATA_R)` |
| `GET` | `/roles` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_METADATA_R)` |
| `POST` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_C)` |
| `PATCH` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_U)` |
| `PATCH` | `/{id}/block` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_U)` |
| `PATCH` | `/{id}/unblock` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_U)` |
| `DELETE` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_PROFILE_D)` |

Filters: `textSearched`, `availabilitySearched`, `statusSearched`, `dateTimeSearched`.

`POST /` invites **several users at once** and returns `CreatedProjectProfilesReaderDto` — who was created, and who was skipped for an overlapping profile.

## The caller's own profiles

`/api/v1/users/profiles` — no permission annotation; every operation is scoped to the caller.

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | Authenticated — the caller's own profiles |
| `POST` | `/{id}/accept/{accepted}` | Authenticated — answer an invitation. Only an `INVITED` profile can be answered |
| `POST` | `/{projectId}/support` | `hasAuthority(REGISTRY_PROFILE_C)` — a one-hour administrator profile |
| `DELETE` | `/{id}` | Authenticated — remove one's own profile |

## Participants

`/api/v1/projects/{projectId}/participants`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_R)` |
| `GET` | `/birthday` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_R)` |
| `GET` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_R)` |
| `GET` | `/{id}/movements` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_HISTORY_R)` |
| `GET` | `/search/users` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_METADATA_R)` |
| `GET` | `/search/groups` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_METADATA_R)` |
| `POST` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_C)` |
| `PATCH` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_U)` |
| `PATCH` | `/{id}/disable` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_U)` |
| `PATCH` | `/{id}/enable` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_U)` |
| `DELETE` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_PARTICIPANT_D)` |

Filters: `textSearched`, `isMajor`, `typeSearched`, `visibilitySearched`, `statusSearched`, `dateTimeSearched`.

Note the separate **`_HISTORY_R`** permission on `/{id}/movements` — that is the line the `PROJECT_PARTICIPANT` role does not cross.

## Groups

`/api/v1/projects/{projectId}/groups`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_R)` |
| `GET` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_R)` |
| `GET` | `/{id}/members` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_R)` |
| `GET` | `/search/participants` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_METADATA_R)` |
| `POST` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_C)` |
| `PATCH` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_U)` |
| `PATCH` | `/{id}/members` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_U)` |
| `PATCH` | `/{id}/disable` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_U)` |
| `PATCH` | `/{id}/enable` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_U)` |
| `DELETE` | `/{id}/members/{memberId}` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_U)` |
| `DELETE` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_GROUP_D)` |

`/{id}/members` accepts the full participant filter set, so "who from this group is currently out?" is one request.

## Movements

`/api/v1/projects/{projectId}/movements`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_R)` |
| `GET` | `/contents?movementIds=` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_R)` |
| `GET` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_R)` |
| `GET` | `/participants/status` | `hasPermission(#projectId, REGISTRY_PROJECT_R)` |
| `GET` | `/vehicles/status` | `OPTION_VEHICLE` **and** `hasPermission(#projectId, REGISTRY_PROJECT_R)` |
| `GET` | `/{id}/communications` | `OPTION_COMMUNICATION` **and** `REGISTRY_PROJECT_MOVEMENT_COMMUNICATION_R` |
| `GET` | `/search/reasons` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_METADATA_R)` |
| `GET` | `/search/participants-and-groups` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_METADATA_R)` |
| `GET` | `/search/vehicles` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_METADATA_R)` |
| `POST` | `/` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_C)` |
| `POST` | `/guests` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_C)` |
| `PATCH` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_U)` |
| `PATCH` | `/guests/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_U)` |
| `PATCH` | `/{id}/disable` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_U)` |
| `PATCH` | `/{id}/enable` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_U)` |
| `DELETE` | `/{id}` | `hasPermission(#projectId, REGISTRY_PROJECT_MOVEMENT_D)` |

Registered and guest movements have **separate create and update endpoints**, because their payloads differ: `ParticipantMovementWriterDto` references existing participants (with optional `vehicleId` and `poolName` per line), while `GuestMovementWriterDto` carries guest identities on an entrance and existing guest references on an exit.

Filters: `currentMovements`, `linkedToActivity`, `visibilitySearched`, `typeSearched`, `startDateTimeSearched`, `endDateTimeSearched`. `currentMovements=true` means a registered participant still outside, or a guest still inside.

## Vehicles — requires `OPTION_VEHICLE`

`/api/v1/projects/{projectId}/vehicles`. **Every** endpoint carries the option gate *and* its permission.

| Method | Path | Permission (on top of `OPTION_VEHICLE`) |
| ------ | ---- | --------------------------------------- |
| `GET` | `/` | `REGISTRY_PROJECT_VEHICLE_R` |
| `GET` | `/{id}` | `REGISTRY_PROJECT_VEHICLE_R` |
| `GET` | `/{id}/movements` | `REGISTRY_PROJECT_VEHICLE_HISTORY_R` |
| `POST` | `/` | `REGISTRY_PROJECT_VEHICLE_C` |
| `PATCH` | `/{id}` · `/{id}/disable` · `/{id}/enable` | `REGISTRY_PROJECT_VEHICLE_U` |
| `DELETE` | `/{id}` | `REGISTRY_PROJECT_VEHICLE_D` |

## Activities — requires `OPTION_ACTIVITY`

`/api/v1/projects/{projectId}/activities`

| Method | Path | Permission (on top of `OPTION_ACTIVITY`) |
| ------ | ---- | ---------------------------------------- |
| `GET` | `/` | `REGISTRY_PROJECT_ACTIVITY_R` |
| `GET` | `/{id}` | `REGISTRY_PROJECT_ACTIVITY_R` |
| `GET` | `/{id}/movements` | `REGISTRY_PROJECT_ACTIVITY_HISTORY_R` |
| `POST` | `/` | `REGISTRY_PROJECT_ACTIVITY_C` |
| `PATCH` | `/{id}` · `/{id}/disable` · `/{id}/enable` | `REGISTRY_PROJECT_ACTIVITY_U` |
| `DELETE` | `/{id}` | `REGISTRY_PROJECT_ACTIVITY_D` |

## Communications — requires `OPTION_COMMUNICATION`

`/api/v1/projects/{projectId}/communications`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | `OPTION_COMMUNICATION` + `REGISTRY_PROJECT_COMMUNICATION_R` |
| `GET` | `/{id}` | `OPTION_COMMUNICATION` + `REGISTRY_PROJECT_COMMUNICATION_R` |
| `GET` | `/search/movements` | `OPTION_COMMUNICATION` + `REGISTRY_PROJECT_COMMUNICATION_METADATA_R` |
| `GET` | `/search/alerts` | `OPTION_ALERT` + `REGISTRY_PROJECT_COMMUNICATION_METADATA_R` |
| `POST` | `/` | `OPTION_COMMUNICATION` + `REGISTRY_PROJECT_COMMUNICATION_C` |
| `PATCH` | `/{id}` · `/{id}/disable` · `/{id}/enable` | `OPTION_COMMUNICATION` + `REGISTRY_PROJECT_COMMUNICATION_U` |
| `DELETE` | `/{id}` | `OPTION_COMMUNICATION` + `REGISTRY_PROJECT_COMMUNICATION_D` |

::: tip The alert picker is gated on `ALERT`, not `COMMUNICATION`
`/search/alerts` returns alerts, so it carries the `ALERT` option rather than its controller's usual `COMMUNICATION` one. Because the option chain makes `ALERT` imply `COMMUNICATION`, that is the stricter of the two — and it matches the option the service checks when a communication is actually attached to an alert.
:::

`/search/movements` returns only movements that can legally receive a communication: `OUT`, of registered participants, visible.

## Alerts — requires `OPTION_ALERT`

`/api/v1/projects/{projectId}/alerts`

| Method | Path | Permission (on top of `OPTION_ALERT`) |
| ------ | ---- | ------------------------------------- |
| `GET` | `/` | `REGISTRY_PROJECT_ALERT_R` |
| `GET` | `/{id}` | `REGISTRY_PROJECT_ALERT_R` |
| `GET` | `/{id}/communications` | `REGISTRY_PROJECT_ALERT_COMMUNICATION_R` |
| `POST` | `/` | `REGISTRY_PROJECT_ALERT_C` |
| `PATCH` | `/{id}` · `/{id}/status/{status}` · `/{id}/disable` · `/{id}/enable` | `REGISTRY_PROJECT_ALERT_U` |
| `DELETE` | `/{id}` | `REGISTRY_PROJECT_ALERT_D` |

`PATCH /{id}` only succeeds while the alert is `IN_PROGRESS`; `PATCH /{id}/status/{status}` is the transition endpoint and takes `IN_PROGRESS`, `RESOLVED` or `CANCELED`.

## Users

`/api/v1/users`

| Method | Path | Authorisation |
| ------ | ---- | ------------- |
| `GET` | `/` | `hasAuthority(REGISTRY_USER_R)` |
| `GET` | `/{id}` | `hasAuthority(REGISTRY_USER_R)` |
| `GET` | `/roles` | `hasAuthority(REGISTRY_USER_METADATA_R)` |
| `PATCH` | `/{id}/role?role=` | `hasAuthority(REGISTRY_USER_U)` |
| `PATCH` | `/{id}/block` | `hasAuthority(REGISTRY_USER_U)` |
| `PATCH` | `/{id}/unblock` | `hasAuthority(REGISTRY_USER_U)` |
| `PATCH` | `/{id}/impersonate` | `hasAuthority(REGISTRY_USER_D)` |
| `PATCH` | `/impersonate` | Authenticated — acts on the caller |
| `DELETE` | `/{id}` | `hasAuthority(REGISTRY_USER_D)` |

::: warning `impersonate` anonymises; it does not impersonate
Both `impersonate` endpoints **anonymise** the target account: names and email are replaced with random values, the birthday is cleared, the account is flagged and future sign-in is refused. There is no identity-assumption feature in Registry. The name is misleading and the behaviour is the one documented in [Users](/registry/functional/features/users).
:::

## Preferences

`/api/v1/users/preferences` — no permission annotations; every operation acts on the caller's own row.

| Method | Path | Notes |
| ------ | ---- | ----- |
| `POST` | `/theme?theme=` | `SYSTEM`, `LIGHT` or `DARK` |
| `POST` | `/language?language=` | Matched leniently — `fr-FR` selects `fr` |
| `POST` | `/profile/select?profileId=` | Omit the parameter to clear the selection |
| `POST` | `/projects/{projectId}/profile/select` | Select by project rather than by profile |

## Metadata

`/api/v1/metadata` — authenticated, no specific permission. Enum label lists for the UI.

| Method | Path |
| ------ | ---- |
| `GET` | `/presences/status` · `/availabilities/status` · `/profiles/status` |
| `GET` | `/movements/types` · `/participants/types` · `/alerts/status` |

## Retention jobs

`/api/v1/purge` — every endpoint requires `hasAuthority(REGISTRY_JOB_C)`.

| Method | Path | Removes |
| ------ | ---- | ------- |
| `POST` | `/users` | Accounts with no sign-in since the threshold |
| `POST` | `/projects` | Projects untouched since the threshold |
| `POST` | `/projects/contents` | Movements, communications and alerts |
| `POST` | `/projects/configurations` | Vehicles, activities, groups and participants |

Both parameters are optional: `dateThreshold` overrides the configured default, and **`dryRun` defaults to `true`** — a call with no parameters reports what would go and deletes nothing.

Content must be purged before configuration: participants, vehicles and activities refuse deletion while a movement references them.

## Related

- [Security](/registry/technical/security) — how these authorisation expressions are evaluated
- [Roles & Permissions](/registry/functional/roles-and-permissions) — which role holds which permission
- [Backend](/registry/technical/backend) — the controller-interface pattern behind this surface
