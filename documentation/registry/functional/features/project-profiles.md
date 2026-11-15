---
title: 'Feature: Members and profiles'
description: 'Invite and manage a project’s members, reply to one’s invitations and join a project as support.'
---

# Feature: Members and profiles

## 1. Overview

- **Goal:** A profile is a user's membership of a project: _this person accesses this project, with this role, during this window_. Administrators build the team; each user manages their own invitations. Since only an accepted profile within its window grants rights, the profile is the switch for access over time.
- **Who uses it:** RP_A manages members; RP_C views the list (without blocked profiles); RP_P has no access to it; each user manages their invitations; R_A can join a project as support.
- **Option required:** none.

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| RP_A | Invite, read, update, block, unblock, delete | Within the limit of their role level; last-permanent-administrator safeguard. |
| RP_C | Read | Does not see blocked profiles; no actions. |
| RP_P | — | No access to the member list. |
| Any signed-in user | Read their profiles, accept / decline an invitation, leave a project | Accept or decline only from the "invited" state. |
| R_A | Join as support | **One-hour** administrator profile, on any project. |

## 3. Business rules

- **Inviting is a bulk action**: one or more users or email addresses, **one** role, an optional access window → one "invited" profile per target.
- **Search by exact email.** The user to invite is found by their exact address (case-insensitive, 0 or 1 result), never by a name fragment. Since any signed-in user can create a project, and therefore invite, a broader search would let anyone indirectly extract the list of all the platform's users. This search is rate-limited (30 per minute and per user).
- **Inviting an unknown address** (feature that can be enabled): an account is pre-created and attached to the person on their first sign-in, if the identity provider certifies their email.
- **No overlap**: a user cannot have two invited or accepted profiles whose windows overlap on the same project.
- **Access window** optional, independent of the project's dates; without a window, the profile is permanent. The start must be strictly before the end.
- **Role ceiling**: one only invites, changes, blocks and deletes roles of a level equal to or lower than one's own (administrator 0 > coordinator 10 > participant 20).
- **Last permanent administrator**: removing, blocking, demoting or adding an end date to the last RP_A without an end date is refused. A temporary (support) administrator does not count.
- **Blocking** removes all rights without deleting the profile; unblocking restores it.
- **Support access**: an accepted RP_A profile, valid for one hour from its creation, recorded like any membership. Its purpose is to **leave a trace** of the intervention; it stays visible in the member list after expiry.

## 4. Screens

### 4.1 A project's "Members" list {#members-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- **Filters** [RP_A, RP_C]: text (user), date/time, status, availability; [RP_A] blocked / not blocked.
- [RP_A] The "Invite" button opens the invitation form.
- **Each row** [RP_A, RP_C] shows:
  - the avatar, green for the signed-in user's profile;
  - the favorite star, if the profile can be favorited (the signed-in user's);
  - the name;
  - the access range;
  - the role tag.
- [RP_A] A blocked profile is grayed out and carries the "Blocked" tag (an RP_C does not see blocked profiles).
- [RP_A, RP_C] For a profile awaiting a reply:
  - if the invitation targets the signed-in user, the "Decline" (danger) and "Accept" (success) buttons are shown, each with confirmation;
  - otherwise, a message indicates that the user's reply is awaited.
- **Actions menu** [RP_A]: "Edit" (prefilled form), "Block" if not blocked, "Unblock" if blocked, "Delete" — each with confirmation, except "Edit".

### 4.2 My invitations

Each user finds their pending invitations in "My account" and on the [application home](/registry/functional/screens#application-home), with the same "Accept" / "Decline" buttons and their confirmation.

### 4.3 Invitation form {#invitation-form}

[RP_A] Step 3 of project creation, and from the member list. Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **At least one user or email address** is required.
- **Role** required: RP_A, RP_C or RP_P.
- **Access start and end** optional (they can fall outside the project's period).
- **When editing**, only the role and the access window can be changed; demoting an RP_A requires that they are not the last RP_A without an access end.
