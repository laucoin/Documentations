# Feature: Alerts

## 1. Overview

- **Goal:** An alert is an **incident** the team needs to act on — a title, a timestamp, and a status. Alerts are typically **raised from a movement's discussion thread**: a note about a problem is escalated into a tracked item, then followed to resolution. Each alert carries its own [communication](/registry/functional/features/communications) thread and a live *"in progress since"* timer, so anyone can see what is open, for how long, and what has been said about it. The status lifecycle records whether the incident is being handled, has been dealt with, or was called off.
- **Who uses it:** Everyone on the project. All three roles raise, read, edit and change the status of alerts — including resolving one; only `PROJECT_ADMINISTRATOR` can permanently remove one.
- **Option required:** `ALERT`. The module is enabled per project and requires both `ACTIVITY` and `COMMUNICATION` (see [Roles & Permissions → Project options](/registry/functional/roles-and-permissions#project-options-gating)). While the option is off, every endpoint below is closed regardless of role.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. Status changes are an **U**pdate. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Alert](/registry/functional/domain-model#alert-option) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + status changes | Scoped to the project. Only role that can permanently delete an alert; also raises, edits, resolves/cancels/reopens and disables/enables. Requires the `ALERT` option. |
| `PROJECT_COORDINATOR` | **C R U** + status changes | Scoped to the project. Raises, edits, resolves/cancels/reopens and disables/enables an alert, same as the administrator — but cannot delete. Requires the `ALERT` option. |
| `PROJECT_PARTICIPANT` | **C R U** + status changes | Scoped to the project. Raises, reads (with threads), edits, resolves/cancels/reopens and disables/enables an alert — same floor as the coordinator — but cannot delete. Requires the `ALERT` option. |

## 3. Business rules

- **Title ≤ 50 characters.** A longer title is rejected.
- **Timestamped.** Each alert carries a creation timestamp; the dashboard derives a live *"in progress since"* duration from it while the status is `IN_PROGRESS`.
- **Status lifecycle.** An alert is `IN_PROGRESS`, `RESOLVED` or `CANCELED`. From `IN_PROGRESS` it can be **resolved** (→ `RESOLVED`) or **canceled** (→ `CANCELED`); a closed alert can be **reopened** (→ `IN_PROGRESS`). See [Domain Model → Alert status](/registry/functional/domain-model#status-vocabulary).
- **Own discussion thread.** Every alert has an attached [communication](/registry/functional/features/communications) thread; alerts are commonly escalated from a movement's thread.
- **Disabling is a soft, reversible action, open to all three roles.** Disabling hides an alert without deleting it; it can be re-enabled. Deletion is permanent and **administrator only**.
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
Scenario: A participant resolves an alert, but cannot delete it
  Given I am a PROJECT_PARTICIPANT on a project with the ALERT option enabled
  And an alert is IN_PROGRESS
  When I change its status to RESOLVED
  Then the alert's status becomes RESOLVED
  And the "in progress since" timer stops
  When I then attempt to delete that alert
  Then the request is refused for lack of permission
```

```gherkin
Scenario: The feature is closed when the option is disabled
  Given I am a PROJECT_ADMINISTRATOR on a project with the ALERT option disabled
  When I attempt to list the project's alerts
  Then the request is refused because the option is not enabled
```

## 5. API surface

The endpoints backing this feature — their paths, methods and the permission each one requires — are specified in [Technical → API Reference](/registry/technical/api-reference), and kept there only so the transport contract never drifts from this spec. The authority for each action is in §2; the rules it must satisfy are in §3.
