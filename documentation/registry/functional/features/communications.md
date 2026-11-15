---
title: 'Feature: Communications'
description: 'The messages attached to check-outs and alerts, displayed as a conversation.'
---

# Feature: Communications

## 1. Overview

- **Goal:** A communication is a short timestamped message attached to a **check-out** or an **alert**. The messages of a given target form its thread, displayed as a conversation: the team follows an ongoing check-out ("back in ten minutes") or an incident there, without a separate messaging tool. A message can also **create an alert**.
- **Who uses it:** all three project roles write, correct and delete; RP_A and RP_C restore; RP_A permanently deletes.
- **Option required:** **O_C `COMMUNICATION`**, which requires O_A. Links to alerts require O_E.

## 2. Roles and permissions

| Role | Permitted actions | Conditions / scope |
| --- | --- | --- |
| RP_A | Create, read, update, delete, restore, permanently delete | — |
| RP_C | Create, read, update, delete, restore | — |
| RP_P | Create, read, update, delete | Does not see deleted messages. |

## 3. Business rules

- **Message** required (not blank), 250 characters maximum.
- **Attachment**: to a **registered check-out** (optionally linked to an activity) and/or to an existing O_E **alert**, or creation of a **new O_E alert**, in which case a **title** is required (not blank, 50 characters maximum). A message is always attached to at least one of the two.
- **Chronology**: a message cannot be dated before the check-out or alert it is attached to.
- **Displayed author**: for a message attached to a check-out linked to an activity, the **activity** is the displayed author; otherwise it is the user who wrote it. The real author is always kept. A deleted author is shown as "Deleted user".
- **Link with an alert**: the message also appears in the alert's thread; seen in an activity's thread, it is shown linked to the alert, like a reply.
- **History**: _log_-type item — each change keeps the previous version.
- **Deletion** soft and reversible; permanent deletion reserved for RP_A.

## 4. Screens

### 4.1 Communications drawer

Described in [Screens → Communications drawer](/registry/functional/screens#communications-drawer): chat from oldest (top) to most recent (bottom), progressive loading upwards, sending with the button or with Cmd/Ctrl + Enter.

It opens from the operational tracking on the project home ("Communication details"), and from the open alerts and the alert list ("Communicate").

### 4.2 Communication form

[RP_A, RP_C, RP_P] Shared rules: see [Forms](/registry/functional/screens#common-form-behaviors).

- **Message**: required, 250 characters maximum.
- **Title**: required when creating an alert, 50 characters maximum.
- **Link** to a check-out (and its activity) and/or an alert.
- Sending with the button, or Cmd/Ctrl + Enter.
