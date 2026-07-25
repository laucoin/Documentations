# Feature: Activities

## 1. Overview

- **Goal:** An activity is a planned outing or event within the event — a hike, a workshop, a visit. It has a **name**, a **description**, a **duration** and an **allowed-participants range** (minimum / maximum). Beyond planning, an activity can be used as the **justification of a [movement](/registry/functional/features/movements)**: selecting it as the movement's "reason" ties an outing to exactly the people who went on it, so the record shows not just that participants left, but *what they left for*.
- **Who uses it:** `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR` plan activities and review each activity's movement history. `PROJECT_PARTICIPANT` has **no access** to activity management (though they may select an existing activity while recording a movement).
- **Option required:** **`ACTIVITY`.** Every activity endpoint is gated by this option — if it is off, the whole feature is closed regardless of role.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete — plus *History* (an activity's movement history). See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Activity](/registry/functional/domain-model#activity-option) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + History | Full control of activities (`REGISTRY_PROJECT_ACTIVITY_C/R/U/D`, `REGISTRY_PROJECT_ACTIVITY_HISTORY_R`). Requires the `ACTIVITY` option. |
| `PROJECT_COORDINATOR` | **C R U D** + History | Same rights as the administrator (`REGISTRY_PROJECT_ACTIVITY_C/R/U/D`, `REGISTRY_PROJECT_ACTIVITY_HISTORY_R`). Requires the `ACTIVITY` option. |
| `PROJECT_PARTICIPANT` | — | No access to activity management. May still select an existing activity as a movement's justification. |

> **Option gating first.** All rows above assume the project has the `ACTIVITY` option enabled. With the option off, the API is closed for every role — see [Roles & Permissions → Project options](/registry/functional/roles-and-permissions#project-options-gating).

## 3. Business rules

- **Name and description.** An activity has a required **name** and a **description** of at most **2000 characters**.
- **Duration and availability.** It carries a **duration** and an availability window whose **start must be before the end** (`@StartBeforeEnd`).
- **Allowed-participants range** (`@MinUpperMax`). The **minimum must be less than or equal to the maximum**, and the **minimum must be at least 1**.
- **Used as a movement justification.** Selecting an activity in a movement is **mutually exclusive with a free reason** (`@BothCannotBeDefined`) — a movement is justified by an activity *or* a reason, never both. See [Movements → Business rules](/registry/functional/features/movements#3-business-rules).
- **Disabling is soft and reversible.** An activity can be disabled (hidden from selection) and later re-enabled without losing its history.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A coordinator plans an activity
  Given the project has the ACTIVITY option enabled
  And I hold the PROJECT_COORDINATOR role
  When I create an activity "Mountain Hike" with a description under 2000 characters
  And an allowed-participants range of minimum 4 and maximum 12
  Then the activity is created
  And it can be selected as a movement justification
```

```gherkin
Scenario: The minimum must not exceed the maximum
  Given the project has the ACTIVITY option enabled
  When I create an activity with minimum 10 and maximum 4
  Then the request is rejected by the @MinUpperMax validator
  And no activity is created
```

```gherkin
Scenario: The minimum must be at least one
  Given the project has the ACTIVITY option enabled
  When I create an activity with minimum 0
  Then the request is rejected
  Because the allowed-participants minimum must be at least 1
```

```gherkin
Scenario: The availability start must be before the end
  Given the project has the ACTIVITY option enabled
  When I create an activity whose availability starts 2026-07-24 and ends 2026-07-10
  Then the request is rejected by the @StartBeforeEnd validator
```

```gherkin
Scenario: An activity justifies a movement instead of a reason
  Given the project has the ACTIVITY option enabled
  And an activity "Mountain Hike"
  When I record an OUT movement for registered participants justified by "Mountain Hike"
  And I supply no free reason
  Then the movement is accepted
  And the movement appears in the activity's movement history
```

```gherkin
Scenario: An activity and a free reason cannot both justify a movement
  Given the project has the ACTIVITY option enabled
  When I record a movement carrying both the activity "Mountain Hike" and reason SHOPPING
  Then the request is rejected by the @BothCannotBeDefined validator
```

```gherkin
Scenario: The feature is closed when the ACTIVITY option is off
  Given the project does not have the ACTIVITY option enabled
  When I attempt to list activities
  Then the request is refused because the feature is closed
  Regardless of my role
```

```gherkin
Scenario: A participant cannot manage activities
  Given the project has the ACTIVITY option enabled
  And I hold the PROJECT_PARTICIPANT role
  When I attempt to create an activity
  Then the request is refused for lack of REGISTRY_PROJECT_ACTIVITY_C
```

```gherkin
Scenario: Disabling an activity hides it without losing history
  Given an activity "Mountain Hike" used to justify past movements
  When I disable it
  Then it is no longer offered as a movement justification
  And its movement history remains readable
  When I enable it again
  Then it can be selected once more
```

## 5. API surface

REST endpoints backing this feature. All project-scoped endpoints live under `/api/v2/projects/{projectId}/...` and **require the `ACTIVITY` option**. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/activities` | List activities | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_R` |
| `GET` | `/activities/{id}` | Read a single activity | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_R` |
| `GET` | `/activities/{id}/movements` | Read the activity's movement history | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_HISTORY_R` |
| `POST` | `/activities` | Plan an activity | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_C` |
| `PATCH` | `/activities/{id}` | Update an activity | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_U` |
| `POST` | `/activities/{id}/disable` | Soft-disable an activity | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_U` |
| `POST` | `/activities/{id}/enable` | Re-enable a disabled activity | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_U` |
| `DELETE` | `/activities/{id}` | Permanently delete an activity | `ACTIVITY` option + `REGISTRY_PROJECT_ACTIVITY_D` |
