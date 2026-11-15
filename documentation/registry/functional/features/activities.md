---
title: 'Feature: Activities'
description: 'Plan activities, use them as a check-out reason and track their statistics.'
---

# Feature: Activities

## 1. Overview

- **Goal:** An activity is a planned outing or session — a hike, a workshop, a visit. It has a name, a description, a duration and a participant range. Chosen as a check-out's reason, it links that check-out to the people who took part, and becomes the author of the messages exchanged about it.
- **Who uses it:** RP_A and RP_C plan activities and view their histories; RP_A permanently deletes. RP_P does not view the list, but picks an activity as a check-out reason.
- **Option required:** **O_A `ACTIVITY`.**

## 2. Roles and permissions

| Role | Permitted actions                                                  | Conditions / scope                                         |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| RP_A | Create, read, update, delete, restore, permanently delete, history | Permanent deletion only without any recorded movement.     |
| RP_C | Create, read, update, delete, restore, history                     | —                                                          |
| RP_P | —                                                                  | Sees the available activities among a check-out's reasons. |

## 3. Business rules

- **Name** required (not blank), 150 characters maximum; **description** optional (not blank if provided), 2000 characters maximum.
- **Duration** optional.
- **Participant range** optional: minimum and maximum are filled in **together**, with minimum ≤ maximum (minimum of at least 1).
- **Availability** optional, within the project's period; without dates, the activity is permanently available. Only the activities available at a check-out's date are offered as a reason.
- **Reason or activity**: a check-out is justified by one or the other, never both.
- **Deletion** soft and reversible; a deleted activity is no longer offered as a reason. Permanent deletion refused if it has been used.

## 4. Screens

### 4.1 "Activities" list {#activities-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors). Reserved for RP_A and RP_C.

- **Filters**: text, date/time, status; deleted / not deleted.
- The "Create" button opens the creation form.
- **Each row** shows the name (truncated with "…"), the duration, the participant range (min–max), the availability range and the "Movement history" primary button.
- A deleted activity is grayed out and carries the "Deleted" tag.
- **Actions menu**: "Edit", "Delete", "Restore", [RP_A] "Permanently delete" — depending on the state, with confirmation.

### 4.2 An activity's check-in/check-out history {#activity-history}

[RP_A, RP_C]

- The header recalls the activity, truncated with "…".
- Same filters, rows and actions as the ["Check-ins & check-outs" list](/registry/functional/features/movements#movements-list), restricted to the activity's movements.
- **Statistics** above the list:
  - **percentage of the project's participants** who took part in the activity at least once;
  - **hours spent out** for this activity: in movement terms (sum of check-out durations) and in participant terms (hours × people).

### 4.3 Activity form

[RP_A, RP_C] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **Name**: required, 150 characters maximum.
- **Description**: optional, 2000 characters maximum.
- **Duration**: optional.
- **Participant range**: optional, min and max together, min ≤ max.
- **Availability start** and **end**: optional.
