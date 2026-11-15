---
title: 'Feature: Groups'
description: 'Group participants to move them, count them and give them shared dates.'
---

# Feature: Groups

## 1. Overview

- **Goal:** A group is a named set of participants — a team, a unit, a tent — to **move and count people together**. Instead of ticking a dozen names, one selects the group in a movement and it expands into its members. Its dates also serve as default dates for its members.
- **Who uses it:** all three project roles create, edit, delete and manage members; RP_A and RP_C restore; RP_A permanently deletes.
- **Option required:** none.

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| RP_A | Create, read, update, manage members, delete, restore, permanently delete | — |
| RP_C | Create, read, update, manage members, delete, restore | Sees deleted groups. |
| RP_P | Create, read, update, manage members, delete | Does not see deleted groups. |

## 3. Business rules

- **Name** required, 150 characters maximum.
- **Members**: a group can have **zero, one or several participants** — it can be created empty and its last member can be removed. **Guests are excluded** from groups.
- **Availability dates** optional; without dates, the group is permanently available. They apply to members who have no dates of their own (see [Availability windows](/registry/functional/domain-model#availability-windows-priority-and-date-resolution)).
- **Expansion in a movement**: selecting a group adds its **current** members, recorded one by one; each receives the group's name as a **pool label**. This label is plain text, not a link to the group: Registry does not check that a pool's participants really belong to the group — that would be costly for no benefit, an inconsistency there having no consequence (see [Domain model](/registry/functional/domain-model#movement-the-core-record)).
- **Counters**: the group's headcount, with the present · absent breakdown.
- **Deleting a group only removes the grouping**: its participants stay registered with all their history.

## 4. Screens

### 4.1 "Groups" list {#groups-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- **Filters** [RP_A, RP_C, RP_P]: text, date/time, presence; [RP_A, RP_C] deleted / not deleted.
- [RP_A, RP_C, RP_P] The "Create" button opens the creation form.
- **Each row** [RP_A, RP_C, RP_P] shows:
  - the name, truncated with "…";
  - the headcount, with the breakdown (inside · outside);
  - the availability range;
  - the primary button, which leads to the group's members.
- [RP_A, RP_C] A deleted group is grayed out and carries the "Deleted" tag.
- **Actions menu**: [RP_A, RP_C, RP_P] "Edit", "Delete" (if not deleted); [RP_A, RP_C] "Restore" (if deleted); [RP_A] "Permanently delete" — deletions and restoration with confirmation.

### 4.2 A group's participants {#group-members}

- [RP_A, RP_C, RP_P] The header recalls the group, truncated with "…".
- **Filters** [RP_A, RP_C, RP_P]: text, status; [RP_A, RP_C] deleted / not deleted.
- [RP_A, RP_C, RP_P] "Add members" lets you select existing participants.
- [RP_A, RP_C, RP_P] "Create a member" opens the [participant form](/registry/functional/features/participants#participant-form) in a panel; the created participant is attached to the group.
- The rows are those of the [participant list](/registry/functional/features/participants#participants-list), plus the [RP_A, RP_C, RP_P] "Remove from group" action, with confirmation.

### 4.3 Group form {#group-form}

[RP_A, RP_C, RP_P] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **Name**: required, 150 characters maximum.
- **Participants**: optional (a group can be created empty), no guests.
- **Availability start** and **end**: optional.

### 4.4 Adding members

- At least one participant must be selected.
- No guests; a participant who is already a member is not offered.
