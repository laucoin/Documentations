# Roles & Permissions

This is the security baseline for Registry. Every feature page references it, and no feature may be defined without stating what each role can do with it. It describes the authentication boundary, the two independent permission planes, the roles on each plane, and the rules that shape access over time.

> **Source of truth.** Roles and their permissions are stored as **data** in the database and loaded into memory when the backend starts. The seed migrations (`V1_0_1`, `V1_1_1`, `V1_2_1`, …) are authoritative; the matrices below reflect that seed data in business terms.

## Authentication model

Registry is **protected / private**. Authentication is delegated to an external **OIDC identity provider** — there is no built-in password store. Practically:

- Every screen and every API call requires a signed-in user, **except** the handful of authentication endpoints themselves (obtaining a login/logout URL, exchanging an authorization code for tokens, and refreshing tokens). API documentation and health endpoints are public only when explicitly enabled for an environment.
- A user's identity comes from the provider. On first sign-in, Registry **provisions the account automatically** with the default global role and links it to the provider identity.
- A **blocked** account (globally disabled) is refused at sign-in, and an **anonymized** account can never sign in again (see [Users](/registry/functional/features/users)).

## Two permission planes

Authorization is split into two planes that combine on every request.

| Plane | Question it answers | Examples |
| ----- | ------------------- | -------- |
| **Global** | What may this user do across the whole platform, independent of any event? | Manage user accounts; create a project. |
| **Project-scoped** | What may this user do *inside this specific event*? | Record a movement in project X; delete a group in project X. |

A project-scoped permission is always bound to **one** project. Holding a permission in one event grants nothing in another — this is what makes Registry multi-tenant. Under the hood, a project permission is the pair *(project, permission)*; the [technical documentation](/registry/technical/security) explains how that is enforced.

## Global roles

| Role | Level | Who holds it | Purpose |
| ---- | ----- | ------------ | ------- |
| **`USER_ADMINISTRATOR`** | 0 | Platform staff | Administer every user account; also allowed to read/create projects and grant support access. |
| **`USER`** | 9000 | Everyone, by default | The role each new account receives. Can create projects and read project metadata. Nothing else at the global level. |
| **`SERVICE_ACCOUNT`** | — | The system itself | A non-human account that runs the scheduled data-retention jobs. Not assignable to people. |

Lower level means more powerful. Exactly **one** level-0 global role exists.

### Global access matrix

| Capability | `USER_ADMINISTRATOR` | `USER` |
| ---------- | :---: | :---: |
| View the user directory & user metadata (roles) | ✓ | — |
| Change a user's global role | ✓ | — |
| Block / unblock a user | ✓ | — |
| Anonymize (purge) another user | ✓ | — |
| **Create a project** | ✓ | ✓ |
| Read *any* project globally | ✓ | — |
| Read project metadata (available options) | ✓ | ✓ |
| Grant "support" access to a project | ✓ | — |
| Run data-retention purge jobs | ✓ | *service account only* |
| Anonymize **their own** account | ✓ | ✓ |

The important onboarding consequence: **any signed-in user can create a project**, and the creator automatically becomes its `PROJECT_ADMINISTRATOR`. That is how ordinary users get project-scoped power without a platform administrator being involved.

## Project roles

Assigned per project when a user is invited (or when they create the project). Every project-scoped resource is governed by these three roles.

| Role | Level | What it is for |
| ---- | ----- | -------------- |
| **`PROJECT_ADMINISTRATOR`** | 0 | Full control of one event, including its membership. The creator gets this automatically. |
| **`PROJECT_COORDINATOR`** | 10 | Runs the event's operations end to end, but cannot manage membership or delete the event. |
| **`PROJECT_PARTICIPANT`** | 20 | Ground-level staff: register people and record movements, with limited edit rights. |

### Project access matrix

Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. A dash means no access. Rows marked *(option)* only apply when the project has that module enabled (see [Project options](#project-options-gating)).

| Resource | `PROJECT_ADMINISTRATOR` | `PROJECT_COORDINATOR` | `PROJECT_PARTICIPANT` |
| -------- | :---: | :---: | :---: |
| Project settings (name, dates, options, enable/disable) | R U D | R | R |
| Members / profiles (invite, edit, block, remove) | C R U D | R | — |
| Participants | C R U D | C R U D | C R |
| Groups | C R U D | C R U D | C R |
| Movements (check-in / check-out) | C R U D | C R U D | C R |
| Vehicles *(option)* | C R U D | C R U D | — ¹ |
| Activities *(option)* | C R U D | C R U D | — ¹ |
| Communications *(option)* | C R U D | C R U D | C R |
| Alerts *(option)* | C R U D | C R U D | C R |
| Live presence dashboard | R | R | R |

*History* is a separate capability — the ability to view a resource's own movement history — and is listed on its own row below rather than folded into a resource's CRUD, for readability. It is **always read-only**: history is a derived view of movements already recorded, not an editable resource in its own right, so there is no create/update/delete operation on it for any role.

| History of | `PROJECT_ADMINISTRATOR` | `PROJECT_COORDINATOR` | `PROJECT_PARTICIPANT` |
| ---------- | :---: | :---: | :---: |
| Participant movements | R | R | — |
| Vehicle movements *(option)* | R | R | — |
| Activity movements *(option)* | R | R | — |

¹ A participant has no direct read access to the vehicle or activity registries, but may still select an *eligible* vehicle or activity while recording a movement, via the movement's own scoped search — see [Movements → API surface](/registry/functional/features/movements#5-api-surface).

Reading between the lines:

- **Only the administrator manages membership.** Coordinators can see who is in the event but cannot invite, edit, block or remove members. Participants cannot see the member list at all.
- **Only the administrator changes the project itself.** Coordinators are read-only on project settings — they cannot rename it, change its dates or options, enable/disable it, or delete it.
- **Coordinators run everything else.** Their operational rights match the administrator's for participants, groups, movements and the optional modules.
- **Participants are check-in staff.** They create and read the operational resources they need (people, groups, movements, communications, alerts) but do not edit or delete them, do not see movement history, and have no standing access to vehicles or activities beyond selecting one inside a movement.

## Project options (gating)

Four **optional modules** are enabled per project. A module that is off is invisible and its API is closed — regardless of a user's role. Modules also have dependencies:

| Option | Adds | Requires |
| ------ | ---- | -------- |
| **`VEHICLE`** | Track vehicles and their presence; assign them in movements | — |
| **`ACTIVITY`** | Plan activities with capacity limits; use them as a movement reason | — |
| **`COMMUNICATION`** | Attach messages to movements and alerts | `ACTIVITY` |
| **`ALERT`** | Raise and manage incidents | `ACTIVITY` + `COMMUNICATION` |

So enabling alerts implies enabling communications and activities. The core — projects, profiles, participants, groups, movements and the dashboard — is always present.

## Rules that shape access over time

- **Profile lifecycle.** A membership (profile) moves through `INVITED` → `ACCEPTED` or `REJECTED`, and can be `BLOCKED`. Only an `ACCEPTED` profile grants any project permission.
- **Access window is optional.** Each profile *may* carry a start/end access window. Outside that window the profile is *unavailable* and grants nothing, even if accepted. A profile with **no window is permanent** — it never expires on its own.
- **Visibility gating (disabled events).** When a project is disabled (made invisible), non-administrators lose **all** authority on it. The administrator keeps only the ability to read, re-enable or delete the project — everything inside stays locked until it is re-enabled.
- **Role-level safety.** A user may only assign roles at or below their own level, and the system refuses to remove or demote the **last permanent** level-0 administrator — the last one with **no end date** — of a project *or* of the platform. A temporary administrator (one with an end date, e.g. a support profile) never counts toward this safeguard, so it can never be used to strand an event with only expiring administrators. You can never orphan an event or lock everyone out of it for good.
- **Support access.** A platform administrator can mint a temporary, one-hour administrator profile on any project ("support" / assistance profile) to intervene without permanently joining it. Being temporary, it never blocks — and is never protected by — the last-permanent-administrator safeguard above.

## Adding a new role (reciprocity rule)

If a new role is ever introduced — on either plane — it must be defined against **every existing feature** before it ships. Concretely: add a column to the [global](#global-access-matrix) or [project](#project-access-matrix) matrix here, and add a row for the new role to the *Roles & Permissions* table on **each** page under [Features](/registry/functional/features/projects). A role with an undefined permission for any feature is not a valid role.
