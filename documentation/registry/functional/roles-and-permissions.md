---
title: 'Roles and permissions'
description: 'The functional security baseline: authentication, application and project roles, options and access matrices.'
---

# Roles and permissions

This is Registry's security baseline. Every feature page refers to it, and no feature can be defined without stating what each role can do with it. The page describes the authentication boundary, the two independent permission planes, the roles of each plane, and the rules that shape access over time.

> **Source of truth.** Roles and their permissions are stored as **data** in the database and loaded into memory when the backend starts. The matrices below reflect that content in business terms; the technical enforcement is described in [Technical → Security](/registry/technical/security).

## Legend {#legend}

This legend is used throughout the functional documentation.

| Abbreviation | Meaning |
| --- | --- |
| **R_A** | `USER_ADMINISTRATOR` application role |
| **R_U** | `USER` application role |
| **RP_A** | `PROJECT_ADMINISTRATOR` project role |
| **RP_C** | `PROJECT_COORDINATOR` project role |
| **RP_P** | `PROJECT_PARTICIPANT` project role |
| **O_V** | `VEHICLE` project option required |
| **O_A** | `ACTIVITY` project option required |
| **O_C** | `COMMUNICATION` project option required |
| **O_E** | `ALERT` project option required |

When no option is stated, no option is required.

## Authentication model {#authentication-model}

Registry is **private**. Authentication is delegated to an external **identity provider (SSO)** — there is no Registry-specific password.

- Every screen and every action requires a signed-in user, **except** the sign-in screen, the terms of use, the privacy policy and the public labels (lists of values).
- On first sign-in, Registry **creates the account automatically** with the `USER` role. An account created in advance (for example by an email invitation) is attached to the person on their first sign-in, provided the provider certifies their email address.
- A **blocked** account is refused, and a **deleted** account disappears for good (see [Users](/registry/functional/features/users)).

## Two permission planes {#two-permission-planes}

| Plane | Question it answers | Examples |
| --- | --- | --- |
| **Global (application)** | What can this user do across the whole platform? | Manage accounts; create a project. |
| **Per project** | What can this user do _in this specific project_? | Record a movement in project X. |

A project permission is always tied to **a single** project: holding it in one project grants nothing in another. This is what lets many independent projects coexist on the same platform.

## Application roles

| Role | Level | Who holds it | Purpose |
| --- | --- | --- | --- |
| **`USER_ADMINISTRATOR`** (R_A) | 0 | The platform team | Administer accounts, read all projects, join a project as support, run purges. |
| **`USER`** (R_U) | 9000 | Everyone, by default | Create projects and work in them according to their profiles. |

A lower level means more power. A non-human technical account (`SERVICE_ACCOUNT`) carries the `USER_ADMINISTRATOR` role to run purges; it cannot be assigned to a person.

### Global access matrix {#global-access-matrix}

| Capability | R_A | R_U |
| --- | :-: | :-: |
| View the user directory | ✓ | — |
| Change a user's application role | ✓ | — |
| Block / unblock a user | ✓ | — |
| Delete a user | ✓ | — |
| Export a user's (GDPR) data | ✓ | — |
| **Create a project** | ✓ | ✓ |
| See all projects, including without a profile | ✓ | — |
| Join a project as support | ✓ | — |
| Run retention purges | ✓ | — |
| Manage one's preferences, export and delete one's own account | ✓ | ✓ |

**Any signed-in user can create a project** and automatically becomes its administrator (RP_A): teams get started without involving the platform team.

## Project roles

Assigned per project when a user is invited (or when they create the project).

| Role | Level | What it is for |
| --- | --- | --- |
| **`PROJECT_ADMINISTRATOR`** (RP_A) | 0 | Full control of the project, including its members, its settings and permanent deletions. |
| **`PROJECT_COORDINATOR`** (RP_C) | 10 | Runs operations: participants, groups, movements, vehicles, activities, communications, alerts; restores deleted items and views histories. Views the member list without managing it. |
| **`PROJECT_PARTICIPANT`** (RP_P) | 20 | Field team: registers people, records check-ins/check-outs, communicates and handles alerts. Has no access to vehicles, the activity list, members or histories. |

### Project access matrix {#project-access-matrix}

Action legend: **C** create · **R** read · **U** update · **S** delete (soft delete, reversible) · **Re** restore and see deleted items · **D** permanently delete · **H** view movement history. A dash means no access.

| Resource | RP_A | RP_C | RP_P |
| --- | :-: | :-: | :-: |
| Project (settings, options) | R U S Re D | R | R |
| Members (profiles) | C R U S Re D | R (without blocked profiles) | — |
| Participants | C R U S Re D H + GDPR export | C R U S Re H | C R U S |
| Groups | C R U S Re D | C R U S Re | C R U S |
| Check-ins & check-outs | C R U S Re D | C R U S Re | C R U S |
| O_V Vehicles | C R U S Re D H | C R U S Re H | — |
| O_A Activities | C R U S Re D H | C R U S Re H | — ¹ |
| O_C Communications | C R U S Re D | C R U S Re | C R U S |
| O_E Alerts | C R U S Re D | C R U S Re | C R U S |
| Project home and live headcounts | R | R | R |

¹ The participant does not view the activity list, but sees the available activities among a check-out's reasons and can pick one. Likewise, they can assign a vehicle to a movement ("vehicles" step) without accessing the vehicle list.

For **members**, the soft delete is called "block" and the restore "unblock".

Reading between the lines:

- **Only the administrator manages members and the project itself** (rename, change dates or options, delete, restore).
- **Permanent deletion is reserved for the administrator**, for all resources.
- **Deleting is open to everyone, restoring is not.** A deleted item is grayed out and marked "Deleted"; only the administrator and the coordinator can display it (visibility filter) and restore it. The participant never sees deleted items.
- **Vehicles and activities are the leadership's territory** (administrator and coordinator).
- **Histories** (of a participant, a vehicle, an activity) are reserved for the administrator and the coordinator, and always read-only.
- **A participant's GDPR export** is reserved for the project administrator; the user linked to a participant can also export that participant's data. So that this link does not become a workaround, only the administrator and the coordinator change the linked user of an existing participant; the participant can only remove their own link.

## Project options {#project-options-gating}

Four **optional modules** are enabled per project. A disabled module is invisible and closed, whatever the role. **Disabling a module deletes no data**: everything reappears when it is re-enabled.

| Option | Brings | Requires |
| --- | --- | --- |
| **`VEHICLE`** (O_V) | Vehicles, their presence and their assignment in movements | — |
| **`ACTIVITY`** (O_A) | Planned activities, usable as a check-out reason | — |
| **`COMMUNICATION`** (O_C) | Messages attached to check-outs and alerts | `ACTIVITY` |
| **`ALERT`** (O_E) | Incident reporting and tracking | `COMMUNICATION` (hence `ACTIVITY`) |

The core — projects, members, participants, groups, check-ins/check-outs and the project home — is always present.

## Rules that shape access over time {#rules-that-shape-access-over-time}

- **Profile lifecycle.** A profile moves from `INVITED` to `ACCEPTED` or `REJECTED`, and can be `BLOCKED`. Only an `ACCEPTED` profile grants permissions.
- **Optional access window.** Outside its start/end window, a profile grants nothing, even when accepted. Without a window, it is **permanent**. This window is independent of the project's dates (a project can be prepared before it opens or wrapped up after it ends).
- **No overlap.** A user cannot have two invited or accepted profiles whose windows overlap on the same project.
- **Deleted project.** Non-administrators lose **all** authority over a deleted project; the administrator keeps only read, restore and permanent deletion.
- **Role ceiling.** One can only assign, change, block or delete roles of a level equal to or lower than one's own.
- **Last administrator.** The system refuses to remove, block, demote or delete the platform's last administrator, and a project's last **permanent** administrator (with no access end date). A temporary administrator (support profile) never counts.
- **Support access.** A platform administrator can join any project as support: a temporary, traced administrator profile that expires on its own (see [Members and profiles](/registry/functional/features/project-profiles)).

## Adding a new role (reciprocity rule)

If a new role is ever introduced, it must be defined against **every existing feature** before it ships: a column in the [global](#global-access-matrix) or [project](#project-access-matrix) matrix, and a row in the _Roles and permissions_ table of **every** [Features](/registry/functional/features/projects) page. A role whose permission is undefined for a feature is not a valid role.
