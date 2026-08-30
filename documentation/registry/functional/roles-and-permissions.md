# Roles & Permissions

This page is the **security baseline** for the whole platform. Every feature page states its access matrix in the terms
defined here, and no feature may grant an action that this page does not describe.

## 1. Authentication boundary

Registry is **fully protected**. There is no anonymous surface: every operation requires a signed-in user, with exactly
four exceptions that exist only to make signing in possible.

| Surface                                   | Authentication                                      |
|-------------------------------------------|-----------------------------------------------------|
| Build the provider login URL              | Public                                              |
| Build the provider logout URL             | Public                                              |
| Exchange an authorization code for tokens | Public                                              |
| Exchange a refresh token for new tokens   | Public                                              |
| Everything else                           | Authenticated — and additionally permission-checked |

Identity is **federated**: Registry never stores passwords and never authenticates anyone itself. An external OpenID
Connect provider does that, and Registry consumes the resulting token.

### Account provisioning

Accounts are created by signing in, not by an administrator:

- On first sign-in, Registry looks the user up by the provider's subject identifier. If no account exists, it looks for
  one with the same **email address**. If none exists either, an account is created automatically and given the
  **default global role** (`USER`).
- If an account already exists, its first name, last name and email are refreshed from the token on every sign-in — the
  identity provider is the source of truth for personal data.
- If more than one account already carries that email, sign-in is refused rather than guessing.

### Sign-in refusals

| Situation                                      | Outcome                                                 |
|------------------------------------------------|---------------------------------------------------------|
| The token carries no subject or no email claim | Sign-in refused                                         |
| The account is **blocked** (made invisible)    | Sign-in refused — the account exists but cannot be used |
| The account has been **anonymised**            | Sign-in refused — the identity was deliberately severed |
| Several accounts share the token's email       | Sign-in refused                                         |

## 2. Two permission planes

Registry carries **two independent role systems**. This is the single most important thing to understand about its
authorisation model.

|            | Global plane                                                          | Project plane                                                         |
|------------|-----------------------------------------------------------------------|-----------------------------------------------------------------------|
| Carried by | The user account (`role` column)                                      | A **profile** — one per user per project                              |
| Scope      | The whole platform                                                    | Exactly one project                                                   |
| Roles      | `USER_ADMINISTRATOR`, `USER`                                          | `PROJECT_ADMINISTRATOR`, `PROJECT_COORDINATOR`, `PROJECT_PARTICIPANT` |
| Governs    | Account administration, the right to create a project, retention jobs | Everything inside a project                                           |

**A global role grants nothing inside a project.** A `USER_ADMINISTRATOR` who holds no profile on a project cannot read
that project's participants, groups or movements. Conversely, a `PROJECT_ADMINISTRATOR` has no authority whatsoever over
any other project. Project isolation is the platform's core guarantee, and neither plane can override the other.

The only bridge between the planes is deliberate and narrow: a global `USER_ADMINISTRATOR` may create a **support
profile** for themselves on any project — a real, auditable, one-hour-long project profile. Support access is therefore
always visible as a profile, never as an invisible super-user.

### Role levels

Both planes rank roles by a numeric **level**, where **lower means more powerful** and level `0` is the most powerful
role of its plane. Exactly one level-`0` role may exist per plane.

| Plane   | Role                    | Level |
|---------|-------------------------|-------|
| Global  | `USER_ADMINISTRATOR`    | 0     |
| Global  | `USER`                  | 9000  |
| Project | `PROJECT_ADMINISTRATOR` | 0     |
| Project | `PROJECT_COORDINATOR`   | 10    |
| Project | `PROJECT_PARTICIPANT`   | 20    |

The level drives one rule used everywhere: **you may only assign your own role or a weaker one.** A coordinator can
invite a participant or another coordinator, never an administrator. The same rule governs editing an existing profile
or an existing user's global role.

## 3. Global roles and permissions

| Permission                    | What it allows                                       | `USER_ADMINISTRATOR` | `USER` |
|-------------------------------|------------------------------------------------------|:--------------------:|:------:|
| `REGISTRY_USER_R`             | Read the user directory                              |          ✅          |   ❌   |
| `REGISTRY_USER_METADATA_R`    | Read the roles assignable to others                  |          ✅          |   ❌   |
| `REGISTRY_USER_U`             | Change a user's global role, block, unblock          |          ✅          |   ❌   |
| `REGISTRY_USER_D`             | Anonymise or delete a user account                   |          ✅          |   ❌   |
| `REGISTRY_PROJECT_C`          | Create a project                                     |          ✅          |   ✅   |
| `REGISTRY_PROJECT_R`          | Read **any** project, including ones with no profile |          ✅          |   ❌   |
| `REGISTRY_PROJECT_METADATA_R` | Read the project options available at creation       |          ✅          |   ✅   |
| `REGISTRY_PROFILE_C`          | Create a support profile on any project              |          ✅          |   ❌   |
| `REGISTRY_JOB_C`              | Trigger the retention purge jobs                     |          ✅          |   ❌   |

Every authenticated user is at least a `USER`, so **anyone can create a project** — and becomes its administrator by
doing so. That is the intended entry path into the platform.

Two operations are available to **every** authenticated user regardless of global role, because they act only on the
caller's own account: listing and answering their own project invitations, and anonymising themselves.

## 4. Project roles and permissions

The three project roles form a ladder. Read the matrix as: *"holding this role on this project grants this permission on
that project, and on no other."*

Legend: **A** = `PROJECT_ADMINISTRATOR`, **C** = `PROJECT_COORDINATOR`, **P** = `PROJECT_PARTICIPANT`.

### Project itself

| Permission           | What it allows                          | A  | C  | P  |
|----------------------|-----------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_R` | Read the project                        | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_U` | Edit the project, disable it, enable it | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_D` | Delete the project and everything in it | ✅ | ❌ | ❌ |

### Profiles

| Permission                            | What it allows                                | A  | C  | P  |
|---------------------------------------|-----------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_PROFILE_C`          | Invite users to the project                   | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_PROFILE_R`          | List the project's profiles                   | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_PROFILE_U`          | Edit a profile, block it, unblock it          | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_PROFILE_D`          | Remove a profile                              | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_PROFILE_METADATA_R` | Search users to invite, list assignable roles | ✅ | ❌ | ❌ |

### Participants

| Permission                                | What it allows                              | A  | C  | P  |
|-------------------------------------------|---------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_PARTICIPANT_C`          | Register a participant                      | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_PARTICIPANT_R`          | List and read participants, read birthdays  | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_PARTICIPANT_HISTORY_R`  | Read a participant's movement history       | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_PARTICIPANT_U`          | Edit a participant, disable, enable         | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_PARTICIPANT_D`          | Delete a participant                        | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_PARTICIPANT_METADATA_R` | Search users to link, search groups to join | ✅ | ✅ | ✅ |

### Groups

| Permission                          | What it allows                                       | A  | C  | P  |
|-------------------------------------|------------------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_GROUP_C`          | Create a group                                       | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_GROUP_R`          | List and read groups and their members               | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_GROUP_U`          | Edit a group, add or remove members, disable, enable | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_GROUP_D`          | Delete a group                                       | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_GROUP_METADATA_R` | Search participants to add to a group                | ✅ | ✅ | ✅ |

### Movements

| Permission                                  | What it allows                                                   | A  | C  | P  |
|---------------------------------------------|------------------------------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_MOVEMENT_C`               | Record a movement, including guest movements                     | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_MOVEMENT_R`               | List and read movements and their content, read presence status  | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_MOVEMENT_U`               | Edit a movement, disable, enable                                 | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_MOVEMENT_D`               | Delete a movement                                                | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_MOVEMENT_METADATA_R`      | Search reasons, participants, groups and vehicles for a movement | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_MOVEMENT_COMMUNICATION_R` | Read the communications attached to a movement                   | ✅ | ✅ | ✅ |

### Vehicles — requires the `VEHICLE` option

| Permission                           | What it allows                                       | A  | C  | P  |
|--------------------------------------|------------------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_VEHICLE_C`         | Add a vehicle                                        | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_VEHICLE_R`         | List and read vehicles, read vehicle presence status | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_VEHICLE_HISTORY_R` | Read a vehicle's movement history                    | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_VEHICLE_U`         | Edit a vehicle, disable, enable                      | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_VEHICLE_D`         | Delete a vehicle                                     | ✅ | ❌ | ❌ |

### Activities — requires the `ACTIVITY` option

| Permission                            | What it allows                      | A  | C  | P  |
|---------------------------------------|-------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_ACTIVITY_C`         | Create an activity                  | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_ACTIVITY_R`         | List and read activities            | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_ACTIVITY_HISTORY_R` | Read an activity's movement history | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_ACTIVITY_U`         | Edit an activity, disable, enable   | ✅ | ✅ | ❌ |
| `REGISTRY_PROJECT_ACTIVITY_D`         | Delete an activity                  | ✅ | ❌ | ❌ |

### Communications — requires the `COMMUNICATION` option

| Permission                                  | What it allows                                           | A  | C  | P  |
|---------------------------------------------|----------------------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_COMMUNICATION_C`          | Post a communication                                     | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_COMMUNICATION_R`          | List and read communications                             | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_COMMUNICATION_U`          | Edit a communication, disable, enable                    | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_COMMUNICATION_D`          | Delete a communication                                   | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_COMMUNICATION_METADATA_R` | Search movements and alerts to attach a communication to | ✅ | ✅ | ✅ |

### Alerts — requires the `ALERT` option

| Permission                               | What it allows                                    | A  | C  | P  |
|------------------------------------------|---------------------------------------------------|:--:|:--:|:--:|
| `REGISTRY_PROJECT_ALERT_C`               | Open an alert                                     | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_ALERT_R`               | List and read alerts                              | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_ALERT_U`               | Edit an alert, change its status, disable, enable | ✅ | ✅ | ✅ |
| `REGISTRY_PROJECT_ALERT_D`               | Delete an alert                                   | ✅ | ❌ | ❌ |
| `REGISTRY_PROJECT_ALERT_COMMUNICATION_R` | Read the communications attached to an alert      | ✅ | ✅ | ✅ |

### Reading the ladder

Two patterns run through the whole matrix and are worth naming:

- **Deletion is an administrator act.** Across every feature, `_D` belongs to the administrator alone — with one
  deliberate exception: a coordinator may delete a *movement*, because correcting a mistyped check-in is routine
  operational work.
- **The participant role is an operator, not a curator.** It can register people, group them and record their comings
  and goings, but it cannot see history, cannot touch the project's configuration of vehicles or activities, and cannot
  see who else has access.

## 5. Project options gating

Four capabilities are enabled **per project**: `VEHICLE`, `ACTIVITY`, `COMMUNICATION` and `ALERT`. An option is a gate
placed *in front of* the permission check, not a permission itself.

Consequences:

- If the option is off, the feature is unreachable **for everyone on that project**, including its administrator.
- Options have **dependencies**, and enabling an option without its prerequisites is rejected:

| Option          | Requires                       |
|-----------------|--------------------------------|
| `VEHICLE`       | —                              |
| `ACTIVITY`      | —                              |
| `COMMUNICATION` | `ACTIVITY`                     |
| `ALERT`         | `ACTIVITY` and `COMMUNICATION` |

- A handful of endpoints are gated by an option *without* being part of that option's own feature — reading a movement's
  communications needs `COMMUNICATION`, and reading vehicle presence status needs `VEHICLE`.

## 6. How access is actually computed

A user's effective rights are recomputed **on every request**, from the token, not from anything the client sends. The
chain is:

1. The token is validated against the identity provider.
2. The matching account is loaded; blocked and anonymised accounts are rejected outright.
3. The account's **global role** contributes its global permissions.
4. Each of the user's **profiles** contributes its project permissions, *scoped to that project's identifier* — but only
   profiles that are **`ACCEPTED`** and **currently inside their access window** are considered at all.
5. Each visible project contributes its **enabled options**, also scoped to that project.

This produces two consequences worth stating explicitly:

- **An invitation grants nothing until it is accepted.** A profile in `INVITED`, `REJECTED` or `BLOCKED` status
  contributes no rights.
- **An access window is enforced continuously, not just at sign-in.** A profile whose window has not opened yet, or has
  already closed, contributes no rights — a user granted access "for the weekend" silently loses it on Monday.

### Disabled projects

Disabling a project is a graceful shutdown, not a deletion:

| Role on a disabled project | What remains                                                                                                                                 |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `PROJECT_ADMINISTRATOR`    | Only read, update and delete **of the project itself** — everything inside it becomes unreachable, and the project's options no longer apply |
| Any other project role     | Nothing at all — the project disappears from the user's world                                                                                |

This lets an administrator re-enable or delete a wound-down project without leaving its data reachable in the meantime.

## 7. Reciprocity rule

Adding a role to either plane is not a local change. A new role must have its permissions defined **across every
existing feature** before it is introduced, and every feature page's access matrix must be updated in the same change. A
feature with an undefined column for a role is a specification defect, not an implicit "no".
