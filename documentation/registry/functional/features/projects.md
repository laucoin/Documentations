# Feature: Projects

## 1. Overview

- **Goal:** A project is the event a user came to Registry to manage — a camp, a trip, a gathering — and the tenant boundary that owns everything else. Creating one gives a user a private workspace with a name, a start and an end, and a set of optional modules they turn on; from there they invite staff, register people, and track presence. Because any signed-in user can create a project and instantly becomes its administrator, teams get running without a platform operator in the loop.
- **Who uses it:** Every signed-in user can create a project. Once created, it is run by its `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR`, read by its `PROJECT_PARTICIPANT`, and — for support — visible to a global `USER_ADMINISTRATOR`.
- **Option required:** None — always available. Projects are the core; options are configured *on* a project rather than gating access to it.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](../roles-and-permissions) for the full model, and [Domain Model → Project](../domain-model#project) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `USER` (global) | **C** | Any signed-in user may create a project (`REGISTRY_PROJECT_C`); the creator automatically becomes its `PROJECT_ADMINISTRATOR`. Also reads project metadata (available options). |
| `USER_ADMINISTRATOR` (global) | **R** | May read *any* project on the platform (`REGISTRY_PROJECT_R` global), independent of a profile — used for support. |
| `PROJECT_ADMINISTRATOR` | **R U D** + enable/disable | Scoped to the project (`REGISTRY_PROJECT_R/U/D`). Only role that may delete a project. |
| `PROJECT_COORDINATOR` | **R U** + enable/disable | Scoped to the project (`REGISTRY_PROJECT_R/U`). Cannot delete. |
| `PROJECT_PARTICIPANT` | **R** | Scoped to the project (`REGISTRY_PROJECT_R`). Read-only on project settings. |

## 3. Business rules

- **Name** is required and at most **150 characters**.
- **`begin`** and **`end`** are each a date with an optional time; `begin` must be **strictly before** `end` (`@StartBeforeEnd`).
- **Enabled options** are a subset of `VEHICLE`, `ACTIVITY`, `COMMUNICATION`, `ALERT`, subject to dependencies (`@ProjectOptionDependencies`): `COMMUNICATION` requires `ACTIVITY`; `ALERT` requires `ACTIVITY` **and** `COMMUNICATION`. A request that breaks a dependency is rejected with error `PROJECT_OPTIONS_MISSING`, listing the missing options.
- **Availability is derived, not stored.** A project is `AVAILABLE` when the current moment is within the `begin`–`end` window, otherwise `UNAVAILABLE`.
- **Disabling is a soft, reversible action** (`visibility = false`). While a project is disabled, non-administrators lose **all** authority on it; the administrator keeps only read, re-enable and delete. See [Roles & Permissions → Visibility gating](../roles-and-permissions#rules-that-shape-access-over-time).
- **The project list is scoped to the caller.** A user sees only the projects they hold a profile on; a global `USER_ADMINISTRATOR` sees them all.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: Any signed-in user creates a project and becomes its administrator
  Given I am a signed-in user
  When I create a project named "Summer Gathering 2026" beginning 2026-07-10 and ending 2026-07-24
  Then the project is created with derived status UNAVAILABLE
  And I am granted a PROJECT_ADMINISTRATOR profile on it
  And the project appears in my project list
```

```gherkin
Scenario: The begin date must be strictly before the end date
  Given I am creating a project
  When I set begin to 2026-07-24 and end to 2026-07-10
  Then the request is rejected by the @StartBeforeEnd validator
  And no project is created
```

```gherkin
Scenario: Enabling ALERT without its dependencies is rejected
  Given I am creating a project
  When I enable the ALERT option without enabling ACTIVITY and COMMUNICATION
  Then the request is rejected with error PROJECT_OPTIONS_MISSING
  And the error lists ACTIVITY and COMMUNICATION as missing
```

```gherkin
Scenario: Enabling COMMUNICATION pulls in ACTIVITY as a requirement
  Given I am editing a project that has no options enabled
  When I enable COMMUNICATION and ACTIVITY together
  Then the update succeeds
  And both options are enabled on the project
```

```gherkin
Scenario: Disabling a project freezes it for non-administrators
  Given I am the PROJECT_ADMINISTRATOR of an enabled project
  And a PROJECT_COORDINATOR has access to it
  When I disable the project
  Then its visibility becomes false
  And the coordinator loses all authority on the project
  And I retain only the ability to read, re-enable or delete it
```

```gherkin
Scenario: The project list only shows projects I have a profile on
  Given I hold profiles on project A and project B
  And project C exists but I have no profile on it
  When I list my projects
  Then I see project A and project B
  And I do not see project C
```

```gherkin
Scenario: A platform administrator can read any project for support
  Given I am a global USER_ADMINISTRATOR
  And I hold no profile on project C
  When I read project C by its identifier
  Then the project is returned
```

## 5. API surface

REST endpoints backing this feature. Project-scoped endpoints live under `/api/v1/projects/{projectId}/...` and are secured by the holder's project-scoped permission. See [Technical → API Reference](../../technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/projects` | List the projects the caller can access | Authenticated (scoped to caller's profiles) |
| `GET` | `/projects/{id}` | Read a single project | `REGISTRY_PROJECT_R` (global or scoped) |
| `GET` | `/projects/options` | Read available options (metadata) | `REGISTRY_PROJECT_METADATA_R` |
| `POST` | `/projects` | Create a project (creator becomes administrator) | `REGISTRY_PROJECT_C` (global) |
| `PATCH` | `/projects/{id}` | Update name, dates or options | scoped `REGISTRY_PROJECT_U` |
| `PATCH` | `/projects/{id}/disable` | Soft-disable (hide) the project | scoped `REGISTRY_PROJECT_U` |
| `PATCH` | `/projects/{id}/enable` | Re-enable a disabled project | scoped `REGISTRY_PROJECT_U` |
| `DELETE` | `/projects/{id}` | Permanently delete the project | scoped `REGISTRY_PROJECT_D` |
