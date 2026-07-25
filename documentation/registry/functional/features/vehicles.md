# Feature: Vehicles

## 1. Overview

- **Goal:** A vehicle is a car, van or bus available to the event. Registering it lets staff record — inside a [movement](/registry/functional/features/movements) — who travelled in which vehicle and in which carpool, and derives a live **presence status** (`IN` / `OUT`) from the vehicle's latest movement. That status feeds the **vehicle-presence card** on the dashboard, so a coordinator can see at a glance which vehicles are on site and which are out.
- **Who uses it:** `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR` maintain the vehicle fleet and review each vehicle's movement history. `PROJECT_PARTICIPANT` has **no access** to vehicle management (though they may assign an existing vehicle while recording a movement).
- **Option required:** **`VEHICLE`.** Every vehicle endpoint is gated by this option — if it is off, the whole feature is closed regardless of role.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete — plus *History* (a vehicle's movement history). See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Vehicle](/registry/functional/domain-model#vehicle-option) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + History | Full control of vehicles (`REGISTRY_PROJECT_VEHICLE_C/R/U/D`, `REGISTRY_PROJECT_VEHICLE_HISTORY_R`). Requires the `VEHICLE` option. |
| `PROJECT_COORDINATOR` | **C R U D** + History | Same rights as the administrator (`REGISTRY_PROJECT_VEHICLE_C/R/U/D`, `REGISTRY_PROJECT_VEHICLE_HISTORY_R`). Requires the `VEHICLE` option. |
| `PROJECT_PARTICIPANT` | — | No access to vehicle management. May still assign an existing vehicle within a movement. |

> **Option gating first.** All rows above assume the project has the `VEHICLE` option enabled. With the option off, the API is closed for every role — see [Roles & Permissions → Project options](/registry/functional/roles-and-permissions#project-options-gating).

## 3. Business rules

- **Identity fields.** A vehicle has a **licence plate** (formatted like `aa-999-aa`), a **brand** and a **model**.
- **Availability window.** The availability **start must be before the end** (`@StartBeforeEnd`).
- **Presence is derived, not stored.** A vehicle is `IN` or `OUT` depending on its **latest movement**; with no movement it is off-site. This status drives the dashboard vehicle-presence card.
- **Assigned inside movements.** A vehicle is never "used" on its own — it is assigned to participants **inside a movement**, with an optional **carpool / pool label**, and only on `REGISTERED` content (see [Movements → Business rules](/registry/functional/features/movements#3-business-rules)).
- **Disabling is soft and reversible.** A vehicle can be disabled (hidden from selection) and later re-enabled without losing its history.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A coordinator registers a vehicle
  Given the project has the VEHICLE option enabled
  And I hold the PROJECT_COORDINATOR role
  When I create a vehicle with plate "AA-123-BB", brand "Renault", model "Trafic"
  And an availability window from 2026-07-10 to 2026-07-24
  Then the vehicle is created
  And it is available for assignment in movements
```

```gherkin
Scenario: The availability start must be before the end
  Given the project has the VEHICLE option enabled
  When I create a vehicle whose availability starts 2026-07-24 and ends 2026-07-10
  Then the request is rejected by the @StartBeforeEnd validator
  And no vehicle is created
```

```gherkin
Scenario: Vehicle presence is derived from its latest movement
  Given a registered vehicle "AA-123-BB"
  When its latest movement is an OUT
  Then the dashboard shows "AA-123-BB" as OUT
  When a later IN movement carries it back
  Then the dashboard shows "AA-123-BB" as IN
```

```gherkin
Scenario: The feature is closed when the VEHICLE option is off
  Given the project does not have the VEHICLE option enabled
  When I attempt to list vehicles
  Then the request is refused because the feature is closed
  Regardless of my role
```

```gherkin
Scenario: A participant cannot manage vehicles
  Given the project has the VEHICLE option enabled
  And I hold the PROJECT_PARTICIPANT role
  When I attempt to create a vehicle
  Then the request is refused for lack of REGISTRY_PROJECT_VEHICLE_C
```

```gherkin
Scenario: Disabling a vehicle hides it without losing history
  Given a registered vehicle "AA-123-BB" with recorded movements
  When I disable it
  Then it is no longer offered for assignment in new movements
  And its movement history remains readable
  When I enable it again
  Then it can be assigned once more
```

```gherkin
Scenario: A coordinator reviews a vehicle's movement history
  Given a registered vehicle "AA-123-BB" that has carried participants
  When I open its movement history
  Then I see each movement it was assigned to, with direction and timestamp
```

## 5. API surface

REST endpoints backing this feature. All project-scoped endpoints live under `/api/v2/projects/{projectId}/...` and **require the `VEHICLE` option**. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/vehicles` | List vehicles | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_R` |
| `GET` | `/vehicles/{id}` | Read a single vehicle | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_R` |
| `GET` | `/vehicles/{id}/movements` | Read the vehicle's movement history | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_HISTORY_R` |
| `POST` | `/vehicles` | Register a vehicle | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_C` |
| `PATCH` | `/vehicles/{id}` | Update a vehicle | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_U` |
| `POST` | `/vehicles/{id}/disable` | Soft-disable a vehicle | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_U` |
| `POST` | `/vehicles/{id}/enable` | Re-enable a disabled vehicle | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_U` |
| `DELETE` | `/vehicles/{id}` | Permanently delete a vehicle | `VEHICLE` option + `REGISTRY_PROJECT_VEHICLE_D` |
