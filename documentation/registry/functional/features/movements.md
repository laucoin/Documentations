---
title: 'Feature: Check-ins and check-outs (movements)'
description: 'Record check-ins and check-outs of registered participants and guests, and keep the effective presence dates.'
---

# Feature: Check-ins and check-outs (movements)

## 1. Overview

- **Goal:** A movement is Registry's core record — a **check-in** or a **check-out** that changes who is physically present. It brings participants in or out (picked one by one or by group), optionally records the vehicles used, and says _why_: a **reason** or an **activity**. The project home reads these movements to answer "who is here right now?".
- **Who uses it:** all three project roles record, correct and delete; RP_A and RP_C restore; RP_A permanently deletes.
- **Option required:** none. Vehicles require O_V, activities as a reason require O_A.

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| RP_A | Create, read, update, delete, restore, permanently delete | — |
| RP_C | Create, read, update, delete, restore | Sees deleted movements. |
| RP_P | Create, read, update, delete | Does not see deleted movements. |
| All | Read live headcounts | On the project home. |

The histories of a participant, a vehicle or an activity are reserved for RP_A and RP_C.

## 3. Business rules {#3-business-rules}

### Date and type

- **Date and time** required, "now" by default, within the project's period. A movement can be backdated but **never dated in the future** (a 2-minute tolerance absorbs clock skew between devices).
- **Type** required: check-in or check-out. An edit can change neither the type nor the nature of the content (registered / guests).

### Reason or activity

- A **registered check-out** requires a reason **or** an O_A activity, never both. A **registered check-in** has no reason: it simply brings back to the normal state.
- A **guest check-in** requires a reason; a **guest check-out** has none.
- Each reason is only valid for a given direction and type:

| Reason | Applies to | Type |
| --- | --- | --- |
| Shopping, medical, definitive departure, other | Registered participants leaving | Check-out |
| Emergency, logistics, partner activity, visit | Guests arriving | Check-in |

- O_A The activities available at the movement's date appear among a check-out's reasons.

### Content

- At least one participant. Selecting a group adds its current members, labeled with the group's name; members can then be removed one by one, or the whole group.
- **Offered participants**: by default, those whose **planned** or **effective** presence dates contain the movement's date (bounds included). A toggle, off by default, broadens the search to **all** the project's participants.
- O_V **Vehicles**: only for registered participants; each added vehicle requires an adult **driver**, chosen among the movement's participants.
- Recording the same direction as the current state (a check-out for someone already out) is not blocking.

### Effective presence dates {#effective-dates}

For each participant, Registry keeps an **effective arrival** and an **effective departure**, updated transparently for the user:

- A participant's **first check-in**: their effective arrival takes the movement's date.
- **Check-in backdated** before their effective arrival: the effective arrival is moved back to that date.
- **Definitive check-out**: their effective departure takes the movement's date. This is refused if the participant already has movements **after** that date (for example a backdated definitive check-out).
- **Participant already gone** included in a movement (broadened search case), when the movement's date is **after** their effective departure:
  - if the movement is not a definitive check-out, the effective departure is **removed** (they came back);
  - if it is a definitive check-out, the effective departure is **updated**;
  - in other cases, it is **unchanged**.
- These dates are also recomputed when a movement is edited, deleted or restored.

### History and corrections

- Movements are _log_-type items: each change **keeps the previous version**.
- A registered participant's **definitive departure** is edited, deleted and restored like any other movement. So is a **guest check-out**, with one caveat: only its **date** can be changed — a guest has only one arrival and one departure, changing who left would make no sense (delete the check-out and record a new one).
- In every case, a definitive departure (created, edited or restored) cannot be placed **before** another movement of its participants, and the effective dates are recomputed.
- Symmetrically, a **guest check-in** cannot end up **after** the departure of one of its guests: neither by pushing its date back, nor by restoring it while a check-out was recorded before it.
- An edit cannot remove guests from a guest check-in, nor move a check-out's date after communications attached to it.
- **Deletion** soft and reversible (with confirmation); permanent deletion reserved for RP_A.

## 4. Screens

### 4.1 "Check-ins & check-outs" list {#movements-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- **Filters** [RP_A, RP_C, RP_P]: from / to (date and time), type (check-in or check-out); [RP_A, RP_C] deleted / not deleted.
- **Each row** [RP_A, RP_C, RP_P] shows the type, the timestamp, the reason or activity, the number of participants (a click opens the [participants drawer](/registry/functional/screens#participants-drawer)) and the number of vehicles (a click opens the vehicles drawer).
- [RP_A, RP_C] A deleted movement is grayed out and carries the "Deleted" tag.
- **Actions menu**: [RP_A, RP_C, RP_P] "Edit" (prefilled form), "Delete" (if not deleted); [RP_A, RP_C] "Restore" (if deleted); [RP_A] "Permanently delete" — deletions and restoration with confirmation.
- [RP_A, RP_C, RP_P] The "Registered check-in/check-out" and "Guest check-in/check-out" buttons lead to the forms.

The **histories** of a [participant](/registry/functional/features/participants#participant-history), a [vehicle](/registry/functional/features/vehicles#vehicle-history) or an [activity](/registry/functional/features/activities#activity-history) reuse this list, restricted to the item's movements.

### 4.2 Registered movement form (3 steps) {#registered-form}

[RP_A, RP_C, RP_P] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

1. **Information**: date and time (now by default, not in the future), type.
2. **Content**: at least one participant (or group), broadened search toggle, reason required for a check-out — O_A with the available activities.
3. O_V **Vehicles**: each added vehicle requires a driver, and can be removed.

Navigation: "Cancel" at step 1, "Previous" and "Next" afterwards, "Submit" at the last step. From the project home (today's arrivals and departures, "Bring back"), the form opens **prefilled at step 2**.

### 4.3 Guest movement form {#guest-form}

[RP_A, RP_C, RP_P]

- **Information**: same fields and same rules as for a registered participant.
- **Check-in**: at least one guest, entered on arrival — first name and last name required (150 characters maximum), date of birth required — and a reason.
- **Check-out**: at least one guest already created, present and without a definitive check-out. When editing, the list of leaving guests is **locked** — only the date can be corrected — and a message suggests deleting the check-out to record a new one.
