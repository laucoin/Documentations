---
title: 'Feature: Participants'
description: 'Register participants, track their presence and history, and export their data.'
---

# Feature: Participants

## 1. Overview

- **Goal:** A participant is a person taking part in the event — the unit Registry counts and moves. They are **registered** (enrolled, normally present) or a **guest** (visitor, created on arrival). From their planned dates and their movements, Registry derives their presence, separates adults from minors, and flags birthdays and presences to regularize.
- **Who uses it:** all three project roles register, edit and delete; RP_A and RP_C restore and view the history; RP_A permanently deletes and exports.
- **Option required:** none.

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| RP_A | Create, read, update, delete, restore, permanently delete, history, GDPR export | Permanent deletion only without any recorded movement. |
| RP_C | Create, read, update, delete, restore, history | Sees deleted participants. |
| RP_P | Create, read, update, delete | Does not see deleted participants; no history. When editing, does not change the linked user, except to remove their own link. |
| Linked user | GDPR export | For the participant linked to them. |

## 3. Business rules

- **Identity**: first name and last name required (not blank, 150 characters maximum each); date of birth required, not in the future. Age determines the adults / minors split (only an adult can be responsible for a vehicle).
- **Linked user** optional: it prefills the first and last name. Only users with (past, current or future) access to the project are offered, and a user is linked to only one participant per project.
  When editing, only RP_A and RP_C change the linked user (set, replace or remove a link); an RP_P can only remove their own link. Without this rule, an RP_P could link themselves to each participant in turn to export their data, history and deleted items included. On creation, anyone can link a user: a brand-new participant has no past to reveal.
  Linking oneself to one's own participant unlocks, for that user:
  - the **GDPR export** of that participant, from the participant list's actions menu, even without the project's export right. This right applies to **their** participant only: they cannot link themselves to another existing participant to export that participant's data, since only RP_A and RP_C change this link (see above);
  - the **"My groups"** tab of participant tracking, shown first: that participant's groups that have members on site;
  - the inclusion of that participant in the **export of their own data**, from "My account".
- **Groups**: multiple selection, optional (never for a guest).
- **Planned dates** (availability start and end) optional; without dates of their own, the participant refers to their groups (see [Availability windows](/registry/functional/domain-model#availability-windows-priority-and-date-resolution)). They stay within the project's period.
- **Effective dates**: effective arrival (first check-in) and effective departure (definitive check-out), updated automatically by movements (see [Movements](/registry/functional/features/movements#effective-dates)).
- **Presence status** derived, never entered: present, absent, unavailable, or **overdue** (arrived, not definitively left, planned end passed — they then appear in the presences to regularize). Without any movement, a participant is "not yet arrived".
- **Deletion**: soft and reversible. **Permanent deletion** is refused as soon as the participant appears in a movement — the headcount history must never be rewritten; they are then "soft" deleted or their definitive departure is recorded.
- **GDPR export**: all the data held on the participant in the project. The confirmation reminds that the file must be permanently deleted after it is sent to the requesting participant. Each export is traced (who requested it, not its content) and limited to 5 per hour and per user (see [Audit and traceability](/registry/functional/features/audit)).

## 4. Screens

### 4.1 "Participants" list {#participants-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- **Filters** [RP_A, RP_C, RP_P]: text, presence status; [RP_A, RP_C] deleted / not deleted.
- [RP_A, RP_C, RP_P] The "Create" button opens the creation form.
- **Each row** [RP_A, RP_C, RP_P] shows:
  - the avatar and the full name, truncated with "…";
  - the first group and, if there are several, a "+ N others" button that opens the groups drawer;
  - the availability range start → end ("…" if a bound is missing);
  - the presence status;
  - the "Movement history" primary button [RP_A, RP_C].
- [RP_A, RP_C] A deleted participant is grayed out and carries the "Deleted" tag.
- **Actions menu**:
  - [RP_A, RP_C] "Movement history";
  - [RP_A, or the user linked to the participant] "GDPR export", with confirmation;
  - [RP_A, RP_C, RP_P] "Edit": prefilled form;
  - [RP_A, RP_C, RP_P] "Delete" if not deleted, with confirmation;
  - [RP_A, RP_C] "Restore" if deleted, with confirmation;
  - [RP_A] "Permanently delete", with confirmation.

### 4.2 A participant's check-in/check-out history {#participant-history}

[RP_A, RP_C]

- The header recalls the participant's identity, truncated with "…".
- Same filters, rows and actions as the ["Check-ins & check-outs" list](/registry/functional/features/movements#movements-list), restricted to the participant's movements.
- **Statistics** above the list:
  - **planned timeline**: the project's duration with the participant's planned presence range(s);
  - **actual timeline**: the project's duration with the ranges when the participant was out.

### 4.3 Participant form {#participant-form}

[RP_A, RP_C, RP_P] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **First name**, **last name**: required, 150 characters maximum.
- **Date of birth**: required.
- **Linked user**: optional, prefills first and last name; searches among users with access to the project. When editing, the field is locked for RP_P, with help text; they can only clear their own link there.
- **Groups**: optional, multiple selection.
- **Availability start** and **end**: optional.
