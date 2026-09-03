# Feature: Project Profiles (Membership)

## 1. Overview

- **Goal:** A profile is a user's membership of one project — the link that says *this person may access this event, in this role, during this window*. The feature has two sides that share one entity: administrators build and maintain their event's staff list, and every user manages their own invitations and memberships. Because only an `ACCEPTED` profile inside its access window grants permissions, profiles are also the switch that turns project-scoped access on and off over time.
- **Who uses it:** `PROJECT_ADMINISTRATOR` manages the member list; `PROJECT_COORDINATOR` can view it; every signed-in user manages their own profiles; a platform `USER_ADMINISTRATOR` (holding `REGISTRY_PROFILE_C`) can mint a **support profile** — a self-expiring administrator access whose real purpose is to leave an auditable trace of the intervention.
- **Option required:** None — always available. Membership is part of the core.

## 2. Roles & Permissions

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) and [Domain Model → Profile](/registry/functional/domain-model#profile).

### Admin side — managing a project's members (`/projects/{projectId}/profiles`)

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `PROJECT_ADMINISTRATOR` | **C R U D** + block/unblock | Full membership control (`REGISTRY_PROJECT_PROFILE_C/R/U/D`); searches users and assignable roles via `REGISTRY_PROJECT_PROFILE_METADATA_R`. |
| `PROJECT_COORDINATOR` | **R** | Read-only (`REGISTRY_PROJECT_PROFILE_R`): can see who is in the event, cannot invite, edit, block or remove. |
| `PROJECT_PARTICIPANT` | — | No access to the member list. |

### Self side — managing my own memberships (`/users/profiles`)

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| Any authenticated `USER` | **R** own · accept/reject · leave (**D** own) | List my profiles; accept or reject an invitation (only from `INVITED`); delete my own profile to leave a project. |
| `USER_ADMINISTRATOR` (global) | **C** support | May create a temporary **1-hour** "support" administrator profile on any project (`REGISTRY_PROFILE_C`). |

## 3. Business rules

- **Inviting is a batch action.** Choose one or more users, **one** role, and an optional access window → the system creates an `INVITED` profile for each selected user.
- **Editing a member** changes their **role** and/or their **access window**.
- **Access window is optional.** A profile with no window is **permanent**. When both `start` and `end` are set, `start` must be **before** `end` (`@StartBeforeEnd`).
- **Role ceiling.** A user may only assign roles **at or below their own level** — administrator (0) > coordinator (10) > participant (20). A coordinator can never mint an administrator.
- **Last-permanent-administrator safety.** The system refuses to remove or demote the **last permanent** `PROJECT_ADMINISTRATOR` — the last level-0 profile with **no end date**. A temporary administrator (one with an end date, e.g. a support profile) does not count toward this safeguard. A project can never be left with only expiring administrators.
- **Accept/reject is constrained.** A user may only accept or reject a profile while it is `INVITED`, and the new value must be `ACCEPTED` or `REJECTED` (`@ProfileAcceptOrReject`).
- **Permissions require an accepted, in-window profile.** Only an `ACCEPTED` profile whose current moment sits inside its access window grants any project permission. `INVITED`, `REJECTED` and `BLOCKED` profiles grant nothing.
- **Support access is about traceability, not gate-keeping.** A `USER_ADMINISTRATOR` can already read *any* project at any moment (global `REGISTRY_PROJECT_R`) and can mint a support profile whenever they choose — so the profile is not what *grants* the ability to intervene. Its point is to **leave an auditable trace**: it is a full `PROJECT_ADMINISTRATOR` profile, recorded like any other membership (who, when), that **auto-expires after one hour** so the elevated write access never lingers. It stays visible on the member list afterwards as the record that the intervention happened.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: An administrator invites several users in one action
  Given I am the PROJECT_ADMINISTRATOR of a project
  When I invite users "alice" and "bob" as PROJECT_PARTICIPANT for the window 2026-07-10 to 2026-07-24
  Then a profile is created for each user with status INVITED
  And neither user yet holds any permission on the project
```

```gherkin
Scenario: A coordinator cannot manage membership
  Given I am a PROJECT_COORDINATOR of a project
  When I list the project's members
  Then I can read the member list
  But I cannot invite, edit, block or remove any member
```

```gherkin
Scenario: A user accepts an invitation and gains access
  Given the current date is 2026-09-02
  And I have an INVITED profile on a project, valid from 2026-08-15 to 2026-12-20
  When I accept the invitation
  Then my profile status becomes ACCEPTED
  And I hold my role's permissions, because 2026-09-02 sits inside the access window
```

```gherkin
Scenario: Accepting is only allowed from the INVITED status
  Given my profile on a project is already ACCEPTED
  When I try to accept it again
  Then the request is rejected by the @ProfileAcceptOrReject validator
```

```gherkin
Scenario: A coordinator cannot promote someone above their own level
  Given I am a PROJECT_COORDINATOR (level 10)
  When I try to assign the PROJECT_ADMINISTRATOR (level 0) role to a member
  Then the request is refused because the target role is above my level
```

```gherkin
Scenario: The last permanent administrator cannot be removed
  Given I am the only PROJECT_ADMINISTRATOR of a project, with no end date on my profile
  When I try to remove my own profile or demote it to PROJECT_COORDINATOR
  Then the request is refused to avoid orphaning the project
```

```gherkin
Scenario: A temporary support administrator does not block demoting the permanent one
  Given a project has one permanent PROJECT_ADMINISTRATOR and a temporary support PROJECT_ADMINISTRATOR (with an end date)
  When the permanent administrator tries to demote their own profile to PROJECT_COORDINATOR
  Then the request is still refused
  Because the temporary support profile does not count as a permanent administrator
```

```gherkin
Scenario: A blocked member loses access without losing the profile
  Given a member holds an ACCEPTED profile on my project
  When I block that profile
  Then its status becomes BLOCKED
  And the member retains no permission on the project until I unblock it
```

```gherkin
Scenario: Platform staff mints temporary support access
  Given I am a global USER_ADMINISTRATOR with no profile on project C
  When I create a support profile on project C
  Then I receive a PROJECT_ADMINISTRATOR profile that expires after one hour
  And the profile is recorded on project C's member list as a trace of the intervention
  And that record remains visible after the profile has expired
```

## 5. API surface

The endpoints backing this feature — their paths, methods and the permission each one requires — are specified in [Technical → API Reference](/registry/technical/api-reference), and kept there only so the transport contract never drifts from this spec. The authority for each action is in §2; the rules it must satisfy are in §3.
