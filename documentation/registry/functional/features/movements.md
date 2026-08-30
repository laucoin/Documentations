# Feature: Movements

## 1. Overview

- **Goal:** A movement is the core record of Registry — a **check-in (`IN`)** or **check-out (`OUT`)** event that changes who is physically present. Recording movements is how the paper attendance sheet becomes a live headcount: each movement moves a set of participants in or out, optionally records the vehicle they travelled in, and captures *why* — either a free **reason** or a linked **activity**, except when the movement simply returns someone to their normal state. The [live presence dashboard](#5-api-surface) reads those movements to answer, at any moment, "who is here right now?".
- **Who uses it:** Front-line check-in staff (`PROJECT_PARTICIPANT`) record and read movements at the gate; `PROJECT_COORDINATOR` and `PROJECT_ADMINISTRATOR` additionally correct and remove them. The dashboard is read by all three roles.
- **Option required:** None — movements are part of the always-present core. Two enrichments are gated, though: attaching a **vehicle** needs the `VEHICLE` option, and justifying a movement with an **activity** needs the `ACTIVITY` option.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → Movement](/registry/functional/domain-model#movement-the-core-record) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** | Full control of movements in the project (`REGISTRY_PROJECT_MOVEMENT_C/R/U/D`). Only administrators and coordinators may edit, disable/enable or delete. |
| `PROJECT_COORDINATOR` | **C R U D** | Same operational rights as the administrator (`REGISTRY_PROJECT_MOVEMENT_C/R/U/D`). |
| `PROJECT_PARTICIPANT` | **C R** | Records and reads movements (`REGISTRY_PROJECT_MOVEMENT_C/R`), but cannot edit, disable or delete them. |
| All project roles | **R** dashboard | The live presence dashboard (`REGISTRY_PROJECT_R`) is readable by every role. The vehicles-status card additionally requires the `VEHICLE` option. |

## 3. Business rules

All rules below are **enforced by validators** at write time; a request that breaks one is rejected and no movement is recorded.

- **Reason ⊻ activity are mutually exclusive** (`@BothCannotBeDefined`). A registered movement is justified by a free **reason** *or* a linked **activity**, never both, and — outside the assumed-direction cases below — never neither.
- **Reason / direction / type coherence** (`@MovementReason`):
  - A **guest** with **no reason** must be `OUT` (leaving).
  - A **registered** participant with **no reason and no activity** must be `IN` (returning).
  - Otherwise, either an **activity** is present, or the chosen **reason's own direction and participant-type must match** the movement. The pairings are fixed: `SHOPPING`, `MEDICAL`, `DEFINITIVE_DEPARTURE`, `OTHER` are `OUT` for registered participants; `EMERGENCY`, `LOGISTICS`, `PARTNER_ANIMATION`, `VISIT` are `IN` for guests. See [Domain Model → How reasons pair with direction and type](/registry/functional/domain-model#how-reasons-pair-with-direction-and-type).
- **Guest movement content** (`@MovementGuestContent`). For a guest movement:
  - if direction is `IN`, a **non-empty list of new guests** (first name, last name, birthday) is provided and the existing-participant list is empty — guests are **created on arrival**;
  - if direction is `OUT`, it references **existing guest participants** and the new-guest list is empty.
- **A time cannot be given without a date** (`@DateDefinedForTime`). The timestamp defaults to "now"; if a time is supplied, its date must be supplied too.
- **Direction and content type are locked on edit.** A movement's direction (`IN`/`OUT`) and content type (`REGISTERED`/`GUEST`) cannot be changed after creation — only its other fields may be corrected.
- **Definitive departure is terminal.** The `DEFINITIVE_DEPARTURE` reason (an `OUT` for a registered participant) marks that participant as **gone for good** — the state a guest reaches automatically on every `OUT`, without needing a dedicated reason.
- **Vehicles require the `VEHICLE` option and registered content.** A vehicle may be attached only when the project has the `VEHICLE` option enabled **and** the movement content is `REGISTERED`; drivers are chosen among the selected adult / major participants.
- **Pool label snapshots the originating group.** When a movement is recorded by expanding a group, each resulting participant entry carries a **pool label** — the group's name (in full or in part) as it stood at that moment. It is independent of the `VEHICLE` option and of any vehicle assignment: it exists purely so later changes to the group's membership never need to be reconciled against past movements.
- **Movements can be reversed.** A mistaken check-in or check-out is undone from the dashboard by recording the **opposite movement**, restoring the previous presence state.

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
  And "Sam Doe" is counted as off-site
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
Scenario: A vehicle is attached to a registered movement
  Given the project has the VEHICLE option enabled
  And a registered participant "Alex" who is a major
  When I record an OUT movement for "Alex" assigned to vehicle "AA-123-BB"
  Then the movement is accepted
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
Scenario: A participant may only create and read, not delete
  Given I hold the PROJECT_PARTICIPANT role
  When I attempt to delete an existing movement
  Then the request is refused for lack of REGISTRY_PROJECT_MOVEMENT_D
```

```gherkin
Scenario: The live headcount reflects recorded movements
  Given movements have been recorded during the day
  When I open the participants-status card
  Then I see the count of present minors, present majors, absent participants and guests on site
```

## 5. API surface

REST endpoints backing this feature. All project-scoped endpoints live under `/api/v2/projects/{projectId}/...`. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/movements` | List movements | `REGISTRY_PROJECT_MOVEMENT_R` |
| `GET` | `/movements/contents` | List movement contents | `REGISTRY_PROJECT_MOVEMENT_R` |
| `GET` | `/movements/{id}` | Read a single movement | `REGISTRY_PROJECT_MOVEMENT_R` |
| `GET` | `/movements/reasons?q=` | Search selectable reasons (metadata) | `REGISTRY_PROJECT_MOVEMENT_METADATA_R` |
| `GET` | `/movements/eligible-participants-and-groups?q=` | Search participants and groups to move (metadata) | `REGISTRY_PROJECT_MOVEMENT_METADATA_R` |
| `GET` | `/movements/eligible-vehicles?q=` | Search assignable vehicles (metadata) | `REGISTRY_PROJECT_MOVEMENT_METADATA_R` |
| `GET` | `/movements/eligible-activities?q=` | Search selectable activities to justify a movement (metadata) | `REGISTRY_PROJECT_MOVEMENT_METADATA_R` |
| `GET` | `/movements/{id}/communications` | Read the movement's discussion thread | `COMMUNICATION` option + `REGISTRY_PROJECT_MOVEMENT_COMMUNICATION_R` |
| `GET` | `/movements/participants/status` | Live headcount: present minors / majors, absent, guests on site | `REGISTRY_PROJECT_R` |
| `GET` | `/movements/vehicles/status` | Live vehicle presence (present / absent) | `VEHICLE` option + `REGISTRY_PROJECT_R` |
| `POST` | `/movements` | Record a registered movement | `REGISTRY_PROJECT_MOVEMENT_C` |
| `POST` | `/movements/guests` | Record a guest movement (creating guests on arrival) | `REGISTRY_PROJECT_MOVEMENT_C` |
| `PATCH` | `/movements/{id}` | Correct a registered movement | `REGISTRY_PROJECT_MOVEMENT_U` |
| `PATCH` | `/movements/guests/{id}` | Correct a guest movement | `REGISTRY_PROJECT_MOVEMENT_U` |
| `POST` | `/movements/{id}/disable` | Soft-disable a movement | `REGISTRY_PROJECT_MOVEMENT_U` |
| `POST` | `/movements/{id}/enable` | Re-enable a disabled movement | `REGISTRY_PROJECT_MOVEMENT_U` |
| `DELETE` | `/movements/{id}` | Permanently delete a movement | `REGISTRY_PROJECT_MOVEMENT_D` |
