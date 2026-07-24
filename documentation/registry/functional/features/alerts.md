# Feature: Alerts

## 1. Overview

- **Goal:** An alert is an **incident** the team needs to act on — a title, a timestamp, and a status. Alerts are typically **raised from a movement's discussion thread**: a note about a problem is escalated into a tracked item, then followed to resolution. Each alert carries its own [communication](./communications) thread and a live *"in progress since"* timer, so anyone can see what is open, for how long, and what has been said about it. The status lifecycle records whether the incident is being handled, has been dealt with, or was called off.
- **Who uses it:** Everyone on the project. `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR` raise, edit, change the status of, and remove alerts; `PROJECT_PARTICIPANT` — the ground staff — raise and read them.
- **Option required:** `ALERT`. The module is enabled per project and requires both `ACTIVITY` and `COMMUNICATION` (see [Roles & Permissions → Project options](../roles-and-permissions#project-options-gating)). While the option is off, every endpoint below is closed regardless of role.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. Status changes are an **U**pdate. See [Roles & Permissions](../roles-and-permissions) for the full model, and [Domain Model → Alert](../domain-model#alert-option) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + status changes | Scoped to the project. Full control: raise, edit, resolve/cancel/reopen, disable/enable and delete any alert. Requires the `ALERT` option. |
| `PROJECT_COORDINATOR` | **C R U D** + status changes | Scoped to the project. Same operational rights as the administrator on alerts. Requires the `ALERT` option. |
| `PROJECT_PARTICIPANT` | **C R** | Scoped to the project. May raise alerts and read them (with their threads), but cannot edit, change status, disable or delete them. Requires the `ALERT` option. |

## 3. Business rules

- **Title ≤ 50 characters.** A longer title is rejected.
- **Timestamped.** Each alert carries a creation timestamp; the dashboard derives a live *"in progress since"* duration from it while the status is `IN_PROGRESS`.
- **Status lifecycle.** An alert is `IN_PROGRESS`, `RESOLVED` or `CANCELED`. From `IN_PROGRESS` it can be **resolved** (→ `RESOLVED`) or **canceled** (→ `CANCELED`); a closed alert can be **reopened** (→ `IN_PROGRESS`). See [Domain Model → Alert status](../domain-model#status-vocabulary).
- **Own discussion thread.** Every alert has an attached [communication](./communications) thread; alerts are commonly escalated from a movement's thread.
- **Disabling is a soft, reversible action.** Disabling hides an alert without deleting it; it can be re-enabled. Deletion is permanent and administrator/coordinator only.
- **Gated by the option.** If the `ALERT` option is disabled on the project, the whole feature is invisible and its API is closed.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A participant raises an alert from a movement thread
  Given I am a PROJECT_PARTICIPANT on a project with the ALERT option enabled
  And a movement thread contains a message reporting a problem
  When I raise an alert titled "Missing participant at checkpoint"
  Then the alert is created with status IN_PROGRESS and a timestamp
  And it has its own communication thread
```

```gherkin
Scenario: An alert title longer than 50 characters is rejected
  Given I am a PROJECT_COORDINATOR on a project with the ALERT option enabled
  When I raise an alert with a 51-character title
  Then the request is rejected for exceeding the maximum length
  And no alert is created
```

```gherkin
Scenario: A coordinator resolves an alert
  Given I am a PROJECT_COORDINATOR on a project with the ALERT option enabled
  And an alert is IN_PROGRESS
  When I change its status to RESOLVED
  Then the alert's status becomes RESOLVED
  And the "in progress since" timer stops
```

```gherkin
Scenario: A resolved alert can be reopened
  Given I am a PROJECT_ADMINISTRATOR on a project with the ALERT option enabled
  And an alert is RESOLVED
  When I change its status to IN_PROGRESS
  Then the alert is reopened with status IN_PROGRESS
```

```gherkin
Scenario: A participant cannot change an alert's status
  Given I am a PROJECT_PARTICIPANT on a project with the ALERT option enabled
  And an alert is IN_PROGRESS
  When I attempt to change its status to RESOLVED
  Then the request is refused for lack of permission
  And the alert stays IN_PROGRESS
```

```gherkin
Scenario: The feature is closed when the option is disabled
  Given I am a PROJECT_ADMINISTRATOR on a project with the ALERT option disabled
  When I attempt to list the project's alerts
  Then the request is refused because the option is not enabled
```

## 5. API surface

REST endpoints backing this feature, all under `/api/v1/projects/{projectId}/alerts` and **gated by the `ALERT` option**. See [Technical → API Reference](../../technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/alerts` | List the project's alerts | `REGISTRY_PROJECT_ALERT_R` |
| `GET` | `/alerts/{id}` | Read a single alert | `REGISTRY_PROJECT_ALERT_R` |
| `GET` | `/alerts/{id}/communications` | Read an alert's discussion thread | `REGISTRY_PROJECT_ALERT_COMMUNICATION_R` |
| `POST` | `/alerts` | Raise a new alert | `REGISTRY_PROJECT_ALERT_C` |
| `PATCH` | `/alerts/{id}` | Edit an alert (e.g. its title) | `REGISTRY_PROJECT_ALERT_U` |
| `PATCH` | `/alerts/{id}/status/{status}` | Change status (resolve / cancel / reopen) | `REGISTRY_PROJECT_ALERT_U` |
| `PATCH` | `/alerts/{id}/disable` | Soft-disable (hide) an alert | `REGISTRY_PROJECT_ALERT_U` |
| `PATCH` | `/alerts/{id}/enable` | Re-enable a hidden alert | `REGISTRY_PROJECT_ALERT_U` |
| `DELETE` | `/alerts/{id}` | Permanently delete an alert | `REGISTRY_PROJECT_ALERT_D` |
