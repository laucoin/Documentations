---
title: 'Feature: Alerts'
description: 'Report, track and resolve incidents, with their communication thread and statistics.'
---

# Feature: Alerts

## 1. Overview

- **Goal:** An alert is an **incident** the team must act on: a title, a timestamp, a status and its own [communication](/registry/functional/features/communications) thread. Everyone sees what is open, for how long, and what has been said about it. Statistics then measure the team's responsiveness.
- **Who uses it:** all three project roles report, edit, resolve, cancel and delete; RP_A and RP_C restore; RP_A permanently deletes.
- **Option required:** **O_E `ALERT`**, which requires O_C and O_A.

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| RP_A | Create, read, update, resolve, cancel, delete, restore, permanently delete | — |
| RP_C | Create, read, update, resolve, cancel, delete, restore | Sees deleted alerts. |
| RP_P | Create, read, update, resolve, cancel, delete | Does not see deleted alerts. |

## 3. Business rules

- **Creation**: the "New alert" button opens the communication form in alert mode — **title** required (not blank, 50 characters maximum) and **message** required (not blank, 250 characters maximum).
- **Status**: in progress, resolved or canceled. From "in progress", one can **resolve** or **cancel**, each time with confirmation. Only an in-progress alert can be edited.
- **Criticality**: it increases with the age of an in-progress alert (reinforced after 6 h, high after 18 h by default).
- **Displayed durations**: since creation and, while it is in progress, since the last associated communication.
- **History**: _log_-type item — each change and each status change keeps the previous version.
- **Deletion** soft and reversible. Permanent deletion is refused while communications are attached to it.
- **Application home**: projects with alerts in progress are highlighted, by descending number of alerts.

## 4. Screens

### 4.1 "Alerts" list {#alerts-list}

Shared behaviors: see [Lists](/registry/functional/screens#common-list-behaviors).

- **Statistics** above the list:
  - **average resolution time** of an alert;
  - **real alert rate**: the share of resolved alerts among resolved or canceled alerts.
- **Filters** [RP_A, RP_C, RP_P]: text, status, from / to; [RP_A, RP_C] visibility.
- **Each row** [RP_A, RP_C, RP_P] shows:
  - the title, or placeholder text, truncated with "…";
  - the status;
  - the time since creation;
  - the time since the last communication, if the alert is in progress;
  - O_C the "Communicate" button, which opens the communications drawer.
- [RP_A, RP_C] A deleted alert is grayed out and carries the "Deleted" tag.
- **Actions menu**:
  - [RP_A, RP_C, RP_P] "Resolve" and "Cancel" if the alert is in progress, with confirmation;
  - [RP_A, RP_C, RP_P] "Delete" if not deleted, with confirmation;
  - [RP_A, RP_C] "Restore" if deleted, with confirmation;
  - [RP_A] "Permanently delete", with confirmation.
