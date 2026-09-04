# Feature: Movements

## 1. Overview

- **Goal:** A movement is the core record of Registry — a **check-in (`IN`)** or **check-out (`OUT`)** event that changes who is physically present. Recording movements is how the paper attendance sheet becomes a live headcount: each movement moves a set of participants in or out, optionally records the vehicle they travelled in, and captures *why* — either a free **reason** or a linked **activity**, except when the movement simply returns someone to their normal state. The [live presence dashboard](/registry/technical/api-reference) reads those movements to answer, at any moment, "who is here right now?".
- **Who uses it:** Front-line check-in staff (`PROJECT_PARTICIPANT`) record, read and correct movements at the gate; `PROJECT_COORDINATOR` and `PROJECT_ADMINISTRATOR` can additionally delete them — movements are the one resource where the coordinator keeps delete rights alongside the administrator. The dashboard is read by all three roles.
- **Option required:** None — movements are part of the always-present core. Two enrichments are gated, though: attaching a **vehicle** needs the `VEHICLE` option, and justifying a movement with an **activity** needs the `ACTIVITY` option.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Movement](/registry/functional/domain-model#movement-the-core-record) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** | Full control of movements in the project (`REGISTRY_PROJECT_MOVEMENT_C/R/U/D`). |
| `PROJECT_COORDINATOR` | **C R U D** | Same rights as the administrator, including delete (`REGISTRY_PROJECT_MOVEMENT_C/R/U/D`) — movements are the one resource in the project where the coordinator keeps this. |
| `PROJECT_PARTICIPANT` | **C R U** | Records, reads and corrects movements — including disable/enable — (`REGISTRY_PROJECT_MOVEMENT_C/R/U`), but cannot permanently delete one. |
| All project roles | **R** dashboard | The live presence dashboard (`REGISTRY_PROJECT_R`) is readable by every role. The vehicles-status card additionally requires the `VEHICLE` option. |

## 3. Business rules

All rules below are **enforced by validators** at write time; a request that breaks one is rejected and no movement is recorded.

- **Reason ⊻ activity are mutually exclusive** (`@BothCannotBeDefined`). A registered movement is justified by a free **reason** *or* a linked **activity**, never both, and — outside the assumed-direction cases below — never neither.
- **Reason / direction / type coherence** (`@MovementReason`):
  - A **guest** with **no reason** must be `OUT` (leaving).
  - A **registered** participant with **no reason and no activity** must be `IN` (returning).
  - Otherwise, either an **activity** is present, or the chosen **reason's own direction and participant-type must match** the movement. The pairings are fixed: `SHOPPING`, `MEDICAL`, `DEFINITIVE_DEPARTURE`, `OTHER` are `OUT` for registered participants; `EMERGENCY`, `LOGISTICS`, `PARTNER_ANIMATION`, `VISIT` are `IN` for guests. See [Domain Model → How reasons pair with direction and type](/registry/functional/domain-model#how-reasons-pair-with-direction-and-type). The case of one or more registered participants leaving `OUT` for an **activity** is spelled out in [Activities → Behavioral scenarios](/registry/functional/features/activities#4-behavioral-scenarios-bdd).
- **Guest movement content** (`@MovementGuestContent`). For a guest movement:
  - if direction is `IN`, a **non-empty list of new guests** (first name, last name, birthday) is provided and the existing-participant list is empty — guests are **created on arrival**;
  - if direction is `OUT`, it references **existing guest participants** and the new-guest list is empty.
- **A time cannot be given without a date** (`@DateDefinedForTime`). The timestamp defaults to "now"; if a time is supplied, its date must be supplied too.
- **The timestamp must fall inside the project's date range.** A movement's `dateTime` is rejected with `MOVEMENT_DATETIME_OUT_OF_PROJECT_DATE_RANGE` when it lies outside the project's `begin`–`end` window. There is **no past/future restriction of the movement's own** — it may be back-dated or dated ahead of now, as long as it stays within that window; a project with no `begin`/`end` accepts any timestamp. (On edit, pushing a movement's `dateTime` later cannot leave an attached communication stranded after it — `MOVEMENT_COMMUNICATION_OUT_OF_MOVEMENT_DATETIME`.)
- **Direction and content type are locked on edit.** A movement's direction (`IN`/`OUT`) and content type (`REGISTERED`/`GUEST`) cannot be changed after creation — only its other fields may be corrected.
- **Definitive departure is terminal.** The `DEFINITIVE_DEPARTURE` reason (an `OUT` for a registered participant) marks that participant as **gone for good** — the state a guest reaches automatically on every `OUT`, without needing a dedicated reason.
- **Vehicles require the `VEHICLE` option and registered content.** A vehicle may be attached only when the project has the `VEHICLE` option enabled **and** the movement content is `REGISTERED`; drivers are chosen among the selected adult / major participants.
- **Pool label is optional, and only group expansion sets it.** Each participant entry in a movement *may* carry a **pool label**. It is left empty for a participant picked individually, and set to the **group's name** — as it stood at that moment — for a participant brought in by expanding that group. It is independent of the `VEHICLE` option and of any vehicle assignment; its only purpose is that later changes to a group's membership never have to be reconciled against past movements.
- **Adding a group fills the participant list — you stay in control of it.** Selecting a group is a client-side shortcut: it expands to the group's current members, each pre-tagged with the group's pool label. You can then drop individual members from the movement, or remove the whole group at once, before recording. The request carries the **final list of participant entries**, never a group reference — this is how you move "the whole tent except two" without adding people one by one.
- **Movements can be reversed.** A mistaken check-in or check-out is undone from the dashboard by recording the **opposite movement**, restoring the previous presence state.
- **A movement's direction doesn't have to change anything — and that's not blocking.** Recording an `OUT` for someone already `OUT`, or an `IN` for someone already `IN`, is allowed. It isn't a required transition; it's simply a movement whose starting and ending presence happen to be the same.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A registered participant returns to site (assumed IN)
  Given I am signed in with movement create permission on the project
  And a registered participant "Alex" is currently OUT
  When I record a movement for "Alex" with direction IN, no reason and no activity
  Then the movement is accepted by the @MovementReason validator
  And "Alex" is now counted as present on the dashboard
```

```gherkin
Scenario: A registered participant leaves to go shopping
  Given a registered participant "Alex" is currently IN
  When I record an OUT movement for "Alex" with reason SHOPPING
  Then the movement is accepted
  And "Alex" is counted as absent on the dashboard
```

```gherkin
Scenario: A reason and an activity cannot both justify a movement
  Given the project has the ACTIVITY option enabled
  When I record a registered movement that carries both reason SHOPPING and an activity "Hike"
  Then the request is rejected by the @BothCannotBeDefined validator
  And no movement is recorded
```

```gherkin
Scenario: A reason whose direction contradicts the movement is rejected
  Given a registered participant "Alex"
  When I record an IN movement for "Alex" with reason SHOPPING
  Then the request is rejected by the @MovementReason validator
  Because SHOPPING is an OUT reason for registered participants
```

```gherkin
Scenario: A guest arrives and is created on arrival
  Given the guest content type
  When I record a guest movement with direction IN
  And I supply a new guest "Sam Doe" born 1990-05-02
  And I leave the existing-participant list empty
  Then the movement is accepted by the @MovementGuestContent validator
  And guest "Sam Doe" is created and counted as present
```

```gherkin
Scenario: A guest leaving must reference existing guests, not new ones
  Given guest "Sam Doe" is currently on site
  When I record a guest movement with direction OUT referencing "Sam Doe"
  And the new-guest list is empty
  Then the movement is accepted
  And "Sam Doe" is no longer counted among the guests on site — a guest who leaves is gone for good, not tracked as off-site
```

```gherkin
Scenario: A guest IN with an empty new-guest list is rejected
  When I record a guest movement with direction IN and no new guests
  Then the request is rejected by the @MovementGuestContent validator
```

```gherkin
Scenario: Selecting a group expands to its members
  Given a group "Team Blue" has 6 registered members currently OUT
  When I record an IN movement selecting the group "Team Blue"
  Then all 6 members are moved IN
  And the dashboard headcount increases by 6
```

```gherkin
Scenario: Members from a group can be dropped from the movement before recording
  Given a group "Tent 1" currently has members "Ana", "Ben" and "Cora"
  When I select the group "Tent 1" in a movement
  And I remove "Ben" from the expanded list
  And I record the movement
  Then the movement contains only "Ana" and "Cora"
  And their entries keep the pool label "Tent 1"
  And "Ben" has no entry in the movement
```

```gherkin
Scenario: A vehicle is attached to a registered movement
  Given the project has the VEHICLE option enabled
  And a registered participant "Alex" who is a major
  When I record an OUT movement for "Alex" assigned to vehicle "AA-123-BB"
  Then the movement is accepted
  And "Alex" is counted as absent on the dashboard
  And the vehicle "AA-123-BB" is counted as OUT on the dashboard
```

```gherkin
Scenario: A movement recorded from a group snapshots the group's name as a pool label
  Given the group "Tent 1" currently has members "Ana", "Ben" and "Cora"
  When I record an OUT movement by selecting the group "Tent 1"
  Then each of Ana, Ben and Cora's movement entries carries the pool label "Tent 1"
  And later changes to Tent 1's membership do not alter this recorded movement
```

```gherkin
Scenario: A vehicle cannot be attached to a guest movement
  Given the project has the VEHICLE option enabled
  When I record a guest movement that assigns a vehicle
  Then the request is rejected
  Because vehicles may only be attached to REGISTERED content
```

```gherkin
Scenario: A vehicle cannot be attached when the option is off
  Given the project does not have the VEHICLE option enabled
  When I record a registered movement that assigns a vehicle
  Then the request is rejected
```

```gherkin
Scenario: A time without a date is rejected
  When I record a movement with a time of 14:30 but no date
  Then the request is rejected by the @DateDefinedForTime validator
```

```gherkin
Scenario: A movement timestamp outside the project's date range is rejected
  Given the project runs from 2026-07-10 to 2026-07-24
  When I record a movement dated 2026-08-01
  Then the request is rejected with MOVEMENT_DATETIME_OUT_OF_PROJECT_DATE_RANGE
```

```gherkin
Scenario: A movement may be dated ahead of now, within the project's range
  Given the project runs from 2026-07-10 to 2026-07-24
  And the current date is 2026-07-12
  When I record a movement dated 2026-07-15
  Then the movement is accepted — there is no rule against a future-dated movement
```

```gherkin
Scenario: Direction and content type are locked on edit
  Given an existing OUT movement with REGISTERED content
  When I edit it and try to change its direction to IN
  Then the change to direction and content type is ignored or rejected
  And only the other fields are updated
```

```gherkin
Scenario: A definitive departure marks a registered participant as gone for good
  Given a registered participant "Alex" is currently IN
  When I record an OUT movement for "Alex" with reason DEFINITIVE_DEPARTURE
  Then "Alex" is marked as definitively departed
  And is no longer expected back on site
```

```gherkin
Scenario: A mistaken check-in is reversed from the dashboard
  Given I accidentally recorded an IN movement for "Alex"
  When I reverse it from the dashboard
  Then an opposite OUT movement is recorded
  And "Alex" returns to the presence state before the mistake
```

```gherkin
Scenario: Recording the same direction as the current state is not blocking
  Given a registered participant "Alex" is currently OUT
  When I record another OUT movement for "Alex"
  Then the movement is accepted
  And "Alex" remains OUT — the direction didn't have to change anything
```

```gherkin
Scenario: A participant can correct a movement but not delete it
  Given I hold the PROJECT_PARTICIPANT role
  And a movement I recorded has the wrong timestamp
  When I correct its timestamp
  Then the update is accepted
  When I then attempt to delete that movement
  Then the request is refused for lack of REGISTRY_PROJECT_MOVEMENT_D
```

```gherkin
Scenario: The live headcount reflects recorded movements
  Given movements have been recorded during the day
  When I open the participants-status card
  Then I see the count of present minors, present majors, absent participants and guests on site
```

## 5. API surface

The endpoints backing this feature — their paths, methods and the permission each one requires — are specified in [Technical → API Reference](/registry/technical/api-reference), and kept there only so the transport contract never drifts from this spec. The authority for each action is in §2; the rules it must satisfy are in §3.
