# Feature: Groups

## 1. Overview

- **Goal:** A group is a named set of participants — a team, a unit, a tent — used to **move and count people together**. Instead of picking a dozen names one by one, staff select the group and a movement expands to its current members. Registry also tracks how many of a group's members are inside versus outside, turning the headcount into something teams can read at their own level of organization.
- **Who uses it:** `PROJECT_ADMINISTRATOR` and `PROJECT_COORDINATOR` create and maintain groups, including their membership; `PROJECT_PARTICIPANT` (check-in staff) can create and read them.
- **Option required:** None — always available. Groups are part of the core.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) and [Domain Model → Group](/registry/functional/domain-model#group).

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + add/remove members | Full control, scoped to the project (`REGISTRY_...GROUP_C/R/U/D`). |
| `PROJECT_COORDINATOR` | **C R U D** + add/remove members | Same operational rights as the administrator for groups. |
| `PROJECT_PARTICIPANT` | **C R** | Create and read groups; cannot edit membership, disable or delete. |

## 3. Business rules

- **Name** identifies the group.
- **Members.** A group holds **at least one** member; members are chosen from the project's participants via multi-select.
- **Availability window.** `start` must be **before** `end` (`@StartBeforeEnd`).
- **Expansion in movements.** Selecting a group in a movement expands to its **current** members at that moment — later membership changes do not rewrite past movements. See [Domain Model → Movement](/registry/functional/domain-model#movement-the-core-record).
- **Inside/outside counts.** Registry tracks how many members are currently inside versus outside, derived from their movements.
- **Disabling is a soft, reversible action.** A disabled group is hidden but can be re-enabled.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A coordinator creates a group with members
  Given I am a PROJECT_COORDINATOR on a project
  And the participants "Ana", "Ben" and "Cora" are registered
  When I create a group "Tent 1" with those three members
  Then the group is created with three members
```

```gherkin
Scenario: A group must have at least one member
  Given I am creating a group
  When I submit the group with no members
  Then the request is rejected because a group requires at least one member
```

```gherkin
Scenario: The availability start must be before its end
  Given I am creating a group
  When I set the availability start after its end
  Then the request is rejected by the @StartBeforeEnd validator
```

```gherkin
Scenario: Selecting a group in a movement expands to its current members
  Given the group "Tent 1" currently has members "Ana", "Ben" and "Cora"
  When staff record a movement selecting the group "Tent 1"
  Then the movement includes Ana, Ben and Cora
```

```gherkin
Scenario: A participant can create and read but not edit membership
  Given I am a PROJECT_PARTICIPANT on a project
  When I add or remove a member on an existing group
  Then the action is refused
  But I can still create a new group and read existing ones
```

```gherkin
Scenario: An administrator adds and removes members
  Given I am the PROJECT_ADMINISTRATOR of a project
  And the group "Tent 1" has members "Ana" and "Ben"
  When I add "Cora" and remove "Ben"
  Then the group's members become "Ana" and "Cora"
```

```gherkin
Scenario: Registry reports a group's inside/outside split
  Given the group "Tent 1" has three members, two of whom are currently on site
  When I read the group
  Then it reports two members inside and one outside
```

## 5. API surface

Project-scoped endpoints live under `/api/v2/projects/{projectId}/groups/...`, secured by the holder's project-scoped permission. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `GET` | `/groups` | List groups | scoped `REGISTRY_PROJECT_GROUP_R` |
| `GET` | `/groups/{id}` | Read a single group | scoped `REGISTRY_PROJECT_GROUP_R` |
| `GET` | `/groups/{id}/members` | List a group's members | scoped `REGISTRY_PROJECT_GROUP_R` |
| `GET` | `/groups/assignable-participants?q=` | Search participants to add | scoped `REGISTRY_PROJECT_GROUP_METADATA_R` |
| `POST` | `/groups` | Create a group | scoped `REGISTRY_PROJECT_GROUP_C` |
| `PATCH` | `/groups/{id}` | Update a group | scoped `REGISTRY_PROJECT_GROUP_U` |
| `POST` | `/groups/{id}/members` | Add members to a group | scoped `REGISTRY_PROJECT_GROUP_U` |
| `DELETE` | `/groups/{id}/members/{memberId}` | Remove a member from a group | scoped `REGISTRY_PROJECT_GROUP_U` |
| `POST` | `/groups/{id}/disable` | Soft-disable a group | scoped `REGISTRY_PROJECT_GROUP_U` |
| `POST` | `/groups/{id}/enable` | Re-enable a group | scoped `REGISTRY_PROJECT_GROUP_U` |
| `DELETE` | `/groups/{id}` | Delete a group | scoped `REGISTRY_PROJECT_GROUP_D` |
