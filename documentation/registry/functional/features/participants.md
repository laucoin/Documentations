# Feature: Participants

## 1. Overview

- **Goal:** A participant is a person taking part in the event — the unit Registry counts, moves and displays on the live headcount. Staff register each person once, with a name, a birthday and an availability window, and mark them as *registered* (enrolled) or a *guest* (visitor). From there the dashboard derives who is present, splits majors from minors, and highlights today's birthdays, all without anyone maintaining a status by hand.
- **Who uses it:** All three roles register, read and edit participants; `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR` additionally review movement history, and only `PROJECT_ADMINISTRATOR` can permanently delete one.
- **Option required:** None — always available. Participants are part of the core.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete — plus *History* (view a participant's movement history). See [Roles & Permissions](/registry/functional/roles-and-permissions) and [Domain Model → Participant](/registry/functional/domain-model#participant).

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + History | Only role that can permanently delete a participant; also registers, edits and views movement history (`REGISTRY_...PARTICIPANT_C/R/U/D`, `REGISTRY_PROJECT_PARTICIPANT_HISTORY_R`). |
| `PROJECT_COORDINATOR` | **C R U** + History | Registers, edits, disables/enables and views movement history, same as the administrator — but cannot delete a participant. |
| `PROJECT_PARTICIPANT` | **C R U** | Registers, reads, edits and disables/enables participants — same floor as the coordinator — but cannot delete one or view movement history. |

## 3. Business rules

- **`firstName` and `lastName`** identify the participant.
- **`birthday` is required** and **cannot be in the future** (`@PastOrPresent`).
- **Availability window is optional.** With no window of its own, a participant inherits their group's window (union across all groups they belong to, if several), falling back to the project's if that's also unset — see [Domain Model → Availability windows](/registry/functional/domain-model#availability-windows-priority-and-date-resolution). When both `start` and `end` are set, `start` must be **before** `end` (`@StartBeforeEnd`).
- **Type.** Each participant is `REGISTERED` or `GUEST`. A `REGISTERED` participant's normal state is *present* (they generate `OUT` movements when leaving); a `GUEST`'s normal state is *off-site* (they generate `IN` movements when arriving). See [Domain Model → Participant](/registry/functional/domain-model#participant).
- **Optional user link.** A participant may or may not be linked to a real user account; **most are not**. Linking pre-fills the participant's name from the account and **locks** the name fields.
- **Disabling is a soft, reversible action.** A disabled participant is hidden but can be re-enabled.
- **Derived presence.** Presence status (`IN` / `OUT` / `UNAVAILABLE`) is computed from the participant's latest movement and their availability window — it is never set directly.
- **Derived age split.** Major vs minor is computed from `birthday`, driving the dashboard "majors vs minors" panel and the today's-birthdays panel.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: Check-in staff register a new participant
  Given I am a PROJECT_PARTICIPANT on a project
  When I register "Jordan Lee" born 2010-05-04 as a REGISTERED participant
  Then the participant is created
  And their normal presence state is present
```

```gherkin
Scenario: A birthday in the future is rejected
  Given I am registering a participant
  When I set the birthday to a date after today
  Then the request is rejected by the @PastOrPresent validator
  And no participant is created
```

```gherkin
Scenario: A missing birthday is rejected
  Given I am registering a participant
  When I submit without a birthday
  Then the request is rejected because birthday is required
```

```gherkin
Scenario: The availability start must be before its end
  Given I am registering a participant
  When I set the availability start after its end
  Then the request is rejected by the @StartBeforeEnd validator
```

```gherkin
Scenario: Linking a participant to a user locks the name
  Given I am editing a participant
  When I link the participant to a user account
  Then the first and last name are pre-filled from the account
  And the name fields become read-only
```

```gherkin
Scenario: A participant can edit a participant but not delete one
  Given I am a PROJECT_PARTICIPANT on a project
  And an existing participant "Jordan Lee"
  When I correct Jordan Lee's birthday
  Then the update is accepted
  When I then attempt to delete Jordan Lee
  Then the request is refused for lack of REGISTRY_PROJECT_PARTICIPANT_D
```

```gherkin
Scenario: A coordinator cannot delete a participant either
  Given I am a PROJECT_COORDINATOR on a project
  And an existing participant "Jordan Lee"
  When I attempt to delete Jordan Lee
  Then the request is refused for lack of REGISTRY_PROJECT_PARTICIPANT_D
```

```gherkin
Scenario: A coordinator reviews a participant's movement history
  Given I am a PROJECT_COORDINATOR on a project
  When I open a participant's movement history
  Then I see their past check-in and check-out movements
```

```gherkin
Scenario: Today's-birthdays panel lists participants born on this day
  Given several participants are registered with various birthdays
  When the dashboard requests today's birthdays
  Then it returns only the participants whose birthday falls on today's date
```

## 5. API surface

Project-scoped endpoints live under `/api/v2/projects/{projectId}/participants/...`, secured by the holder's project-scoped permission. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/participants` | List participants | scoped `REGISTRY_PROJECT_PARTICIPANT_R` |
| `GET` | `/participants/birthdays` | List participants whose birthday is today | scoped `REGISTRY_PROJECT_PARTICIPANT_R` |
| `GET` | `/participants/{id}` | Read a single participant | scoped `REGISTRY_PROJECT_PARTICIPANT_R` |
| `GET` | `/participants/linkable-users?q=` | Search users to link | scoped `REGISTRY_PROJECT_PARTICIPANT_METADATA_R` |
| `GET` | `/participants/linkable-groups?q=` | Search groups to join | scoped `REGISTRY_PROJECT_PARTICIPANT_METADATA_R` |
| `GET` | `/participants/{id}/movements` | Read a participant's movement history | scoped `REGISTRY_PROJECT_PARTICIPANT_HISTORY_R` |
| `POST` | `/participants` | Register a participant | scoped `REGISTRY_PROJECT_PARTICIPANT_C` |
| `PATCH` | `/participants/{id}` | Update a participant | scoped `REGISTRY_PROJECT_PARTICIPANT_U` |
| `POST` | `/participants/{id}/disable` | Soft-disable a participant | scoped `REGISTRY_PROJECT_PARTICIPANT_U` |
| `POST` | `/participants/{id}/enable` | Re-enable a participant | scoped `REGISTRY_PROJECT_PARTICIPANT_U` |
| `DELETE` | `/participants/{id}` | Delete a participant | scoped `REGISTRY_PROJECT_PARTICIPANT_D` |
