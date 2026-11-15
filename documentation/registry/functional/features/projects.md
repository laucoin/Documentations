---
title: 'Feature: Projects'
description: 'Create and configure a project, its dates and options, and browse the project list.'
---

# Feature: Projects

## 1. Overview

- **Goal:** A project is the event a user comes to manage — a camp, a trip, a gathering — and the boundary that contains everything else. It has a name, an optional start and end, and optional modules. Any signed-in user can create one and immediately becomes its administrator.
- **Who uses it:** any signed-in user (creation); RP_A for settings; RP_C and RP_P read-only; R_A for support.
- **Option required:** none — options are configured _on_ a project.

## 2. Roles and permissions

See the [legend](/registry/functional/roles-and-permissions#legend) and the [full matrix](/registry/functional/roles-and-permissions#project-access-matrix).

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| R_U, R_A | Create | The creator becomes the project's RP_A. At most 10 creations per hour and per user. |
| R_A | Read all projects, join as support | Sees all projects ("with profile" filter), even without a profile. |
| RP_A | Read, update, delete, restore, permanently delete | Only role that can edit the project itself. |
| RP_C, RP_P | Read | Read-only access to settings; they run day-to-day operations. |
| All | Add / remove favorites | On a project they can read. |

## 3. Business rules

- **Name** required (not blank), 150 characters maximum.
- **Start and end** optional, each a date with an optional time; the start must be strictly before the end. Without dates, the project is permanent.
- **Changing the dates** is refused if existing items (participants, groups, vehicles, activities, movements…) would fall outside the new period.
- **Options**: `VEHICLE` and `ACTIVITY` are independent; `COMMUNICATION` requires `ACTIVITY`; `ALERT` requires `COMMUNICATION` (hence `ACTIVITY`). The backend refuses an incomplete combination by listing the missing options.
- **Status** derived, never stored: upcoming, in progress or finished according to the start and end.
- **Soft delete**: the project is grayed out, carries the "Deleted" tag and can no longer be joined. Non-administrators lose all authority over it; RP_A keeps only read, restore and permanent deletion.
- **Favorites** are personal: not shared, they disappear with the user or the project.

## 4. Screens

### 4.1 "My projects" list {#projects-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- **Filters** [R_A, R_U]: text, date/time (projects active at that instant), favorite.
- **Additional filter** [R_A, RP_A]: deleted / not deleted.
- **Additional filter** [R_A]: "with profile", on by default.
- **Each row** [R_A, R_U] shows:
  - the favorite star (toggles without navigating);
  - the name, truncated with "…";
  - the dates;
  - the status tag;
  - an "Options" button if more than one option is enabled;
  - a "Join" button if the user has a valid profile;
  - [R_A] without a profile, the "Create support" button;
  - [R_A, RP_A] a deleted project is grayed out, tagged "Deleted", and a click opens a dialog explaining that it cannot be joined.
- **Actions menu**:
  - [R_A] "Join as support", with confirmation;
  - [RP_A] "Edit" if the project is not deleted: opens the prefilled form;
  - [RP_A] "Delete" if the project is not deleted, with confirmation;
  - [RP_A] "Restore" if the project is deleted, with confirmation;
  - [RP_A] "Permanently delete", with confirmation.
- [R_A, R_U] The "Create" button leads to the creation form.

### 4.2 Project settings {#project-configuration}

- [RP_A, RP_C, RP_P] Shows the project's information.
- [RP_A] Project edit button.
- One **tile per section**, with a counter, leading to the matching list: [RP_A, RP_C, RP_P] participants, groups, members; [RP_A, RP_C] O_V vehicles and O_A activities.
- [RP_A] **Danger zone**: (soft) deletion and permanent deletion of the project.

### 4.3 Project form (creation and editing) {#project-form}

[R_A, R_U] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **Name**: required (not blank), 150 characters maximum.
- **Start date and time**, **end date and time**: optional, subject to the date rules.
- **Options**: dependency constraints above, returned by the backend.
- **3-step stepper**: at step 2 of 3, the project is created and the user becomes its RP_A; step 3 is the [invitation form](/registry/functional/features/project-profiles#invitation-form).
- When editing, the form is identical.
