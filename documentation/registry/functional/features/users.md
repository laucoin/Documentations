---
title: 'Feature: Users'
description: 'Administer the user directory: role, blocking, GDPR export and deletion.'
---

# Feature: Users

## 1. Overview

- **Goal:** Users form the directory of people who can sign in — the only entity that does not live in a project. The platform team adjusts the application role there, blocks accounts, exports or deletes personal data. Each user can also export and delete their own account.
- **Who uses it:** R_A administers the directory; R_U has no access to it but manages their own account.
- **Option required:** none (global feature).

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| R_A | Read the directory, change the role, block, unblock, delete, GDPR export | Never on their own account via the directory; last-administrator safeguard. |
| R_U, R_A | Export and delete their own account | From "My account". |

Accounts are not created here: they are created **automatically on first sign-in**, with the R_U role (see [Roles and permissions](/registry/functional/roles-and-permissions#authentication-model)).

## 3. Business rules

- **Blocking** is reversible: a blocked account is refused on every request; unblocking restores access.
- **Deletion** is real and permanent: the account and its personal data disappear; the participants linked to it stay in their project, unlinked, and their messages show "Deleted user".
- **Last administrator**: the last R_A cannot be demoted, blocked or deleted, and a project's last permanent administrator cannot be deleted or blocked.
- **Role ceiling**: one can only assign a role of a level equal to or lower than one's own.
- **GDPR export**: all the data held on the user, including their participations. The confirmation reminds that the file must be permanently deleted after it is sent to the requesting user. Each export is **traced** (the requester, never the content) and limited to 5 per hour and per user — see [Audit and traceability](/registry/functional/features/audit).
- **Inactivity**: an account with no sign-in for 12 months (by default) is purged automatically, unless it is the last administrator (see [Data retention](/registry/functional/features/data-retention)).

## 4. Screens

### 4.1 "Users" list [R_A] {#users-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- An R_U who opens this page is sent back to the home page; the backend refuses their requests anyway.
- **Filters**: text, visibility (blocked / not blocked).
- **Each row** shows the name (truncated with "…"), the last sign-in (if any) and the application role.
- A blocked user is grayed out and carries the "Blocked" tag.
- **Actions menu**:
  - "Change role": dialog with a dropdown prefilled with the current role;
  - "GDPR export", with confirmation;
  - "Block" if not blocked, "Unblock" if blocked, with confirmation;
  - "Delete", with confirmation.

### 4.2 User form (role) [R_A]

- The role (R_A or R_U) is required.
- Demoting an R_A requires that they are not the last one.
