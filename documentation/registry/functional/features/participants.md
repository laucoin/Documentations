# Feature: Participants

## 1. Overview

- **Goal:** A participant is a person taking part in the event — the unit Registry counts, moves and displays on the live headcount. Staff register each person once, with a name, a birthday and an availability window, and mark them as *registered* (enrolled) or a *guest* (visitor). From there the dashboard derives who is present, splits majors from minors, and highlights today's birthdays, all without anyone maintaining a status by hand.
- **Who uses it:** All three roles register, read and edit participants; `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR` additionally review movement history, and only `PROJECT_ADMINISTRATOR` can permanently delete one.
- **Option required:** None — always available. Participants are part of the core.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete — plus *History* (view a participant's movement history). See [Roles & Permissions](/registry/functional/roles-and-permissions) and [Domain Model → Participant](/registry/functional/domain-model#participant).

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + History | Only role that can permanently delete a participant — and only while that participant has **no movement history** (see §3); also registers, edits and views movement history (`REGISTRY_...PARTICIPANT_C/R/U/D`, `REGISTRY_PROJECT_PARTICIPANT_HISTORY_R`). |
| `PROJECT_COORDINATOR` | **C R U** + History | Registers, edits, disables/enables and views movement history, same as the administrator — but cannot delete a participant. |
| `PROJECT_PARTICIPANT` | **C R U** | Registers, reads, edits and disables/enables participants — same floor as the coordinator — but cannot delete one or view movement history. |

## 3. Business rules

- **`firstName` and `lastName`** identify the participant.
- **`birthday` is required** and **cannot be in the future** (`@PastOrPresent`).
- **Availability window is optional.** With no window of its own, a participant inherits their group's window (union across all groups they belong to, if several), falling back to the project's if that's also unset — see [Domain Model → Availability windows](/registry/functional/domain-model#availability-windows-priority-and-date-resolution). When both `start` and `end` are set, `start` must be **before** `end` (`@StartBeforeEnd`). **When the participant defines no window, belongs to no group, and the project itself defines no window, there is nothing left to inherit and the participant is permanently available** — until a `DEFINITIVE_DEPARTURE` movement, which ends their participation for good independently of any window.
- **Type.** Each participant is `REGISTERED` or `GUEST`. A `REGISTERED` participant's normal state is *present* (they generate `OUT` movements when leaving); a `GUEST`'s normal state is *off-site* (they generate `IN` movements when arriving). See [Domain Model → Participant](/registry/functional/domain-model#participant).
- **Optional user link.** A participant may or may not be linked to a real user account; **most are not**. Linking pre-fills the participant's name from the account and **locks** the name fields.
- **Disabling is a soft, reversible action.** A disabled participant is hidden but can be re-enabled.
- **A participant with history cannot be deleted — by anyone.** Once a participant appears in **any** movement, deleting them would rewrite the headcount history, so the request is refused for every role, `PROJECT_ADMINISTRATOR` included. `DELETE` exists only to remove a participant registered by mistake, before they have any movement. To take an active participant out of circulation, **disable** them (or record a `DEFINITIVE_DEPARTURE`).
- **Derived presence.** Presence status (`IN` / `OUT` / `UNAVAILABLE`) is computed from the participant's latest movement and their availability window — it is never set directly. **With no movement yet recorded, the participant is `OUT`** — *not yet arrived* — whatever their type. A `REGISTERED` participant's "normal state is *present*" describes how movements are justified (leaving needs a reason, returning does not), not a presence the system assumes before the first `IN`.
- **Derived age split.** Major vs minor is computed from `birthday`, driving the dashboard "majors vs minors" panel and the today's-birthdays panel.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: Check-in staff register a new participant
  Given I am a PROJECT_PARTICIPANT on a project
  When I register "Jordan Lee" born 2010-05-04 as a REGISTERED participant
  Then the participant is created
  And their normal state is "present" — leaving will later require a justification
  And their derived presence is OUT until their first check-in — not yet arrived
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
Scenario: A participant who already has movement history cannot be deleted
  Given I am the PROJECT_ADMINISTRATOR of a project
  And a participant "Jordan Lee" who appears in at least one recorded movement
  When I attempt to delete Jordan Lee
  Then the request is refused to preserve the movement history
  And disabling the participant is offered instead
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

The endpoints backing this feature — their paths, methods and the permission each one requires — are specified in [Technical → API Reference](/registry/technical/api-reference), and kept there only so the transport contract never drifts from this spec. The authority for each action is in §2; the rules it must satisfy are in §3.
