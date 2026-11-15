---
title: 'Feature: Vehicles'
description: 'Manage the vehicle fleet, assign vehicles to check-outs and track their use.'
---

# Feature: Vehicles

## 1. Overview

- **Goal:** A vehicle is a car, a van or a bus available to the event. It is assigned, with its driver, to registered check-outs; its presence (inside / outside) follows from that and feeds the vehicle status on the project home.
- **Who uses it:** RP_A and RP_C manage the fleet and view the histories; RP_A permanently deletes. RP_P has no access to the list, but assigns vehicles in movements.
- **Option required:** **O_V `VEHICLE`.** With the option disabled, the feature is closed to everyone (the data is kept).

## 2. Roles and permissions

| Role | Permitted actions                                                  | Conditions / scope                                                  |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| RP_A | Create, read, update, delete, restore, permanently delete, history | Permanent deletion only without any recorded movement.              |
| RP_C | Create, read, update, delete, restore, history                     | —                                                                   |
| RP_P | —                                                                  | Can only pick an available vehicle at a movement's "vehicles" step. |

## 3. Business rules

- **License plate** required (not blank), 20 characters maximum; **make** and **model** required, 150 characters maximum.
- **Availability** optional, within the project's period; without dates, the vehicle is permanently available.
- **Presence derived** from its last movement; without any movement, it is off site.
- **Assignment** only in a registered check-out or check-in, with an adult driver; never for guests.
- **Deletion** soft and reversible; a deleted vehicle is no longer offered in movements. Permanent deletion is refused if it has been used in a movement.

## 4. Screens

### 4.1 "Vehicles" list {#vehicles-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors). Everything is reserved for RP_A and RP_C.

- **Filters**: text, date/time, status; deleted / not deleted.
- The "Create" button opens the creation form.
- **Each row** shows the plate, the make and the model (truncated with "…"), the availability range, the status, and the "Movement history" primary button.
- A deleted vehicle is grayed out and carries the "Deleted" tag.
- **Actions menu**: "Edit", "Delete" (if not deleted), "Restore" (if deleted), [RP_A] "Permanently delete" — deletions and restoration with confirmation.

### 4.2 A vehicle's check-in/check-out history {#vehicle-history}

[RP_A, RP_C]

- The header recalls the vehicle's identity, truncated with "…".
- Same filters, rows and actions as the ["Check-ins & check-outs" list](/registry/functional/features/movements#movements-list), restricted to the vehicle's movements.
- **Statistics** above the list:
  - **planned timeline**: the project's duration with the vehicle's availability range(s);
  - **actual timeline**: the project's duration with the ranges when the vehicle was out;
  - the vehicle's **usage percentage**.

### 4.3 Vehicle form

[RP_A, RP_C] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **License plate**: required, 20 characters maximum.
- **Make**, **model**: required, 150 characters maximum.
- **Availability start** and **end**: optional.
