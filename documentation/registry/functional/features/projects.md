# Feature: Projects

## 1. Overview

- **Goal:** A project is the event a user came to Registry to manage — a camp, a trip, a gathering — and the tenant boundary that owns everything else. Creating one gives a user a private workspace with a name, an optional start and end, and a set of optional modules they turn on; from there they invite staff, register people, and track presence. Because any signed-in user can create a project and instantly becomes its administrator, teams get running without a platform operator in the loop.
- **Who uses it:** Every signed-in user can create a project. Once created, its settings (name, dates, options, enable/disable, delete) are owned solely by its `PROJECT_ADMINISTRATOR`; the `PROJECT_COORDINATOR` and `PROJECT_PARTICIPANT` are read-only on the project itself while running its day-to-day operations. For support, it is also visible to a global `USER_ADMINISTRATOR`.
- **Option required:** None — always available. Projects are the core; options are configured *on* a project rather than gating access to it.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Project](/registry/functional/domain-model#project) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `USER` (global) | **C** | Any signed-in user may create a project (`REGISTRY_PROJECT_C`); the creator automatically becomes its `PROJECT_ADMINISTRATOR`. Also reads project metadata (available options). |
| `USER_ADMINISTRATOR` (global) | **R** | May read *any* project on the platform (`REGISTRY_PROJECT_R` global), independent of a profile — used for support. |
| `PROJECT_ADMINISTRATOR` | **R U D** + enable/disable | Scoped to the project (`REGISTRY_PROJECT_R/U/D`). Only role with any write access to the project itself — including enable/disable and delete. |
| `PROJECT_COORDINATOR` | **R** | Scoped to the project (`REGISTRY_PROJECT_R`). No `REGISTRY_PROJECT_U`: cannot update, enable/disable or delete. Read-only on project settings, despite running its operations. |
| `PROJECT_PARTICIPANT` | **R** | Scoped to the project (`REGISTRY_PROJECT_R`). Read-only on project settings. |

## 3. Business rules

- **Name** is required and at most **150 characters**.
- **`begin`** and **`end`** are optional; each, if set, is a date with an optional time. When both are set, `begin` must be **strictly before** `end` (`@StartBeforeEnd`). With neither set, the project is permanently available.
- **Enabled options** are a subset of `VEHICLE`, `ACTIVITY`, `COMMUNICATION`, `ALERT`, subject to dependencies (`@ProjectOptionDependencies`): `COMMUNICATION` requires `ACTIVITY`; `ALERT` requires `ACTIVITY` **and** `COMMUNICATION`. A request that breaks a dependency is rejected with error `PROJECT_OPTIONS_MISSING`, listing the missing options.
- **Availability is derived, not stored.** A project is `AVAILABLE` when the current moment is within the `begin`–`end` window, otherwise `UNAVAILABLE`. A project with no `begin`/`end` is permanently `AVAILABLE`.
- **Disabling is a soft, reversible action** (`visibility = false`). While a project is disabled, non-administrators lose **all** authority on it; the administrator keeps only read, re-enable and delete. See [Roles & Permissions → Visibility gating](/registry/functional/roles-and-permissions#rules-that-shape-access-over-time).
- **The project list is scoped to the caller.** A user sees only the projects they hold a profile on; a global `USER_ADMINISTRATOR` sees them all.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: Any signed-in user creates a project and becomes its administrator
  Given I am a signed-in user
  And the current date is 2026-09-02
  When I create a project named "Summer Gathering 2026" beginning 2026-07-10 and ending 2026-07-24
  Then the project is created with derived status UNAVAILABLE, because 2026-09-02 is past its end date
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

The endpoints backing this feature — their paths, methods and the permission each one requires — are specified in [Technical → API Reference](/registry/technical/api-reference), and kept there only so the transport contract never drifts from this spec. The authority for each action is in §2; the rules it must satisfy are in §3.
