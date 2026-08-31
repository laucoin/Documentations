# Feature: Communications

## 1. Overview

- **Goal:** A communication is a short, timestamped message pinned to an operational event — a movement or an alert. Together, the messages on one target form its **discussion thread**: the running commentary staff use to coordinate around a check-in/out or an incident. A message written on a movement can be **escalated into an alert**, turning a passing note into a tracked incident. Communications keep the "who said what, and when" beside the record it concerns instead of in a separate chat.
- **Who uses it:** Everyone on the project. All three roles write, read, correct and disable/enable messages; only `PROJECT_ADMINISTRATOR` can permanently remove one.
- **Option required:** `COMMUNICATION`. The module is enabled per project and itself requires `ACTIVITY` (see [Roles & Permissions → Project options](/registry/functional/roles-and-permissions#project-options-gating)). While the option is off, every endpoint below is closed regardless of role.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Communication](/registry/functional/domain-model#communication-option) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** | Scoped to the project. Only role that can permanently delete a message; also posts, edits and disables/enables. Requires the `COMMUNICATION` option. |
| `PROJECT_COORDINATOR` | **C R U** | Scoped to the project. Posts, edits and disables/enables messages, same as the administrator — but cannot delete. Requires the `COMMUNICATION` option. |
| `PROJECT_PARTICIPANT` | **C R U** | Scoped to the project. Posts, reads, edits and disables/enables messages — same floor as the coordinator — but cannot delete. Requires the `COMMUNICATION` option. |

## 3. Business rules

- **A message must have a target.** Every communication references a **movement and/or an alert** — at least one of the two (`@AtLeastOneIsDefined`). A message with neither target is rejected.
- **Message length ≤ 250 characters.** Longer text is rejected.
- **Timestamped.** Each message carries a timestamp; a thread is read in chronological order.
- **Escalation.** A message in a movement thread can be turned into an [alert](/registry/functional/features/alerts), which then carries its own thread. The original message stays on the movement.
- **Disabling is a soft, reversible action, open to all three roles.** Disabling hides a message without deleting it; it can be re-enabled. Deletion is permanent and **administrator only**.
- **Gated by the option.** If the `COMMUNICATION` option is disabled on the project, the whole feature is invisible and its API is closed.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A participant posts a message on a movement thread
  Given I am a PROJECT_PARTICIPANT on a project with the COMMUNICATION option enabled
  And a movement has been recorded
  When I post the message "Bus running 15 minutes late" on that movement
  Then the communication is created with a timestamp
  And it appears in the movement's discussion thread
```

```gherkin
Scenario: A message with no target is rejected
  Given I am a PROJECT_COORDINATOR on a project with the COMMUNICATION option enabled
  When I post a communication that references neither a movement nor an alert
  Then the request is rejected by the @AtLeastOneIsDefined validator
  And no communication is created
```

```gherkin
Scenario: A message longer than 250 characters is rejected
  Given I am a PROJECT_PARTICIPANT on a project with the COMMUNICATION option enabled
  When I post a message of 251 characters on a movement
  Then the request is rejected for exceeding the maximum length
  And no communication is created
```

```gherkin
Scenario: A participant can edit and disable a message, but not delete it
  Given I am a PROJECT_PARTICIPANT on a project with the COMMUNICATION option enabled
  And a message exists in a thread
  When I correct a typo in that message
  Then the update is accepted
  When I disable that message
  Then it is hidden from the thread, and I can re-enable it later
  When I attempt to delete that message
  Then the request is refused for lack of permission
  And the message remains in the thread
```

```gherkin
Scenario: A coordinator disables a message reversibly, but cannot delete it either
  Given I am a PROJECT_COORDINATOR on a project with the COMMUNICATION option enabled
  And a message exists in a thread
  When I disable that message
  Then the message is hidden from the thread
  And I can re-enable it later to restore it
  When I attempt to delete that message
  Then the request is refused for lack of permission
```

```gherkin
Scenario: The feature is closed when the option is disabled
  Given I am a PROJECT_ADMINISTRATOR on a project with the COMMUNICATION option disabled
  When I attempt to read a movement's discussion thread
  Then the request is refused because the option is not enabled
```

## 5. API surface

REST endpoints backing this feature, all under `/api/v2/projects/{projectId}/communications` and **gated by the `COMMUNICATION` option**. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/communications` | List communications on the project | `REGISTRY_PROJECT_COMMUNICATION_R` |
| `GET` | `/communications/{id}` | Read a single communication | `REGISTRY_PROJECT_COMMUNICATION_R` |
| `GET` | `/communications/attachable-movements?q=` | Find movements a message can attach to (metadata) | `REGISTRY_PROJECT_COMMUNICATION_METADATA_R` |
| `GET` | `/communications/attachable-alerts?q=` | Find alerts a message can attach to (metadata) | `REGISTRY_PROJECT_COMMUNICATION_METADATA_R` |
| `POST` | `/communications` | Post a message on a movement and/or alert | `REGISTRY_PROJECT_COMMUNICATION_C` |
| `PATCH` | `/communications/{id}` | Edit a message | `REGISTRY_PROJECT_COMMUNICATION_U` |
| `POST` | `/communications/{id}/disable` | Soft-disable (hide) a message | `REGISTRY_PROJECT_COMMUNICATION_U` |
| `POST` | `/communications/{id}/enable` | Re-enable a hidden message | `REGISTRY_PROJECT_COMMUNICATION_U` |
| `DELETE` | `/communications/{id}` | Permanently delete a message | `REGISTRY_PROJECT_COMMUNICATION_D` |
