---
title: 'Screens and common behaviors'
description: 'The cross-cutting screens, the home pages, the drawers and the behaviors shared by lists and forms.'
---

# Screens and common behaviors

This page describes what cuts across features: the screens outside any project, the application home, a project's home, the drawers, and the shared behaviors of lists and forms. The lists and forms specific to each resource are described in the [Features](/registry/functional/features/projects) pages.

The abbreviations (R_A, RP_C, O_V…) are those of the [legend](/registry/functional/roles-and-permissions#legend).

## 1. Cross-cutting screens {#transverse-screens}

### 1.1 Sign-in screen

- Redirects to the identity provider's (SSO) sign-in page.
- If the redirect to the SSO fails, the user is sent to the [global error screen](#global-error) with a suitable error.
- The terms of use and the privacy policy can be viewed without signing in.
- The support link is offered if it is set in the configuration.

### 1.2 Pages available once signed in (footer)

[R_A, R_U] Access to the documentation, support, terms of use and privacy policy.

### 1.3 Global error screen {#global-error}

For any global blocking error (backend unavailable, SSO failure, error while fetching the current user…):

- a generic unavailability message is shown;
- the message returned by the backend is shown alongside it;
- the "Retry" button reloads the page.

## 2. Behaviors shared by pages {#common-page-behaviors}

Apart from the [cross-cutting screens](#transverse-screens), the terms of use and the privacy policy, every page starts with a page title (`sgdf-page-title`).

## 3. Application home {#application-home}

[R_A, R_U] Data refreshes automatically according to the user's [refresh mode](/registry/functional/features/preferences).

### Favorites

- The widget shows at most 3 favorites; this is not a limit on the number of favorites.
- Each favorite shows: the colored star; the name, truncated with "…" if too long; the number of participants and groups; the status, computed against the project's start and end; the dates, with the last update.
- Clicking the star removes the project from favorites; clicking elsewhere on the card opens the project home.
- "See all", at the top right of the widget, leads to the project list filtered on favorites (URL parameters).

### Invitations awaiting a reply

- The widget shows at most 3 invitations; this is not a limit on the number of pending invitations.
- Each invitation shows: the project name; the proposed role; the duration, if access is time-limited; an "Accept" button (success) and a "Decline" button (neutral, outline).
- Accepting or declining goes through a confirmation dialog.
- "See all", at the bottom of the widget, leads to the invitation list.

### Projects needing attention

- The widget shows at most 5 projects; this is not a limit on the number of projects with alerts.
- Projects with the O_E option enabled and alerts in progress, by descending number of alerts.
- A click opens the project home.

### Quick access

A grid of shortcuts to the main areas of the application:

- **My projects**: the user's [project list](/registry/functional/features/projects#projects-list).
- **My account**: their [preferences](/registry/functional/features/preferences), their pending invitations, the export and deletion of their data.
- **Users** [R_A]: the [account directory](/registry/functional/features/users#users-list).
- **Documentation** and **Support**: the documentation and the request tracker, opened in a new tab; each only appears if its address is configured.

A shortcut to a page the user cannot access is not shown.

### Create a project

The "Create a project" button leads to the [creation form](/registry/functional/features/projects#project-form).

## 4. Project home {#project-home}

Data refreshes automatically according to the user's refresh mode.

| Block                                                        | Roles            | Content                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Favorite star                                                | RP_A, RP_C, RP_P | Before the project name in the title; a click adds to or removes from favorites, without navigating.                                                                                                        |
| Participant status                                           | RP_A, RP_C, RP_P | Three numbers: registered present, registered absent, guests present.                                                                                                                                       |
| O_V Vehicle status                                           | RP_A, RP_C, RP_P | Two numbers: present and absent.                                                                                                                                                                            |
| Presences to regularize                                      | RP_A, RP_C       | Participants whose planned departure date has passed and who have no effective definitive check-out.                                                                                                        |
| O_E Open alerts                                              | RP_A, RP_C, RP_P | Title (or placeholder text), time since creation, time since the last associated communication (if any); "Communicate" opens the [communications drawer](#communications-drawer).                           |
| Today's arrivals                                             | RP_A, RP_C, RP_P | Participants and groups whose planned arrival is today. A click opens the movement form **at step 2**, prefilled: timestamp now, type check-in, people concerned (the group's members, or the participant). |
| Today's departures                                           | RP_A, RP_C, RP_P | Participants and groups whose planned departure is today. A click opens the form at step 2, prefilled: now, check-out, people concerned, reason "definitive departure".                                     |
| Today's birthdays                                            | RP_A, RP_C       | Participants whose birthday it is, who have arrived and have not yet definitively left.                                                                                                                     |
| O_A Operational tracking: activities in progress             | RP_A, RP_C, RP_P | Check-outs linked to an activity that are still the **last movement** of at least one participant. See the details below.                                                                                   |
| Operational tracking: other check-ins/check-outs in progress | RP_A, RP_C, RP_P | Same behavior: for movements not linked to an activity if O_A is enabled, otherwise for all of them. The row shows the reason instead of the activity name.                                                 |
| Buttons                                                      | RP_A, RP_C, RP_P | "+ Registered check-in/check-out", "+ Guest check-in/check-out", and O_E "New alert".                                                                                                                       |

Each operational tracking row shows:

- "Check-out" and the activity name (or the reason);
- the movement's timestamp;
- O_C the time elapsed since the last communication, if there was one;
- the number of participants for whom it is still the last movement — a click opens the [participants drawer](#participants-drawer);
- O_C the "Communication details" button, which opens the communications drawer;
- the "Bring back" button, which opens the form at step 2, prefilled: now, check-in, the participants for whom it is still the last movement.

## 5. Drawers {#drawers}

### 5.1 O_C Communications drawer {#communications-drawer}

[RP_A, RP_C, RP_P]

- A **conversational chat** display (WhatsApp-style): the most recent message at the bottom, with older ones loaded progressively upwards.
- Sending on a click of the send button, or with Cmd/Ctrl + Enter depending on the system.
- A communication linked to a check-out that is itself associated with an activity has **the activity as its author**; without that link, the author is the user who wrote it.
- If the author has been deleted, the message shows "Deleted user".
- A communication can be linked to an existing alert or **create** one. It then also appears in the alert, and, seen in an activity's thread, it is shown linked to the alert (like a reply to a message).

### 5.2 Movement participants drawer {#participants-drawer}

[RP_A, RP_C, RP_P]

- "All", "Minors", "Adults" tabs (shown if not empty), plus one tab per group.
- If there is at least one group, an "Independent" tab lists the participants added without a group.
- A participant responsible for a vehicle shows the vehicle's information on their row.

### 5.3 O_V Movement vehicles drawer

[RP_A, RP_C, RP_P] The list of vehicles and their driver.

## 6. Behaviors shared by lists {#common-list-behaviors}

- **Progressive loading** on scroll (no numbered pagination), with an indicator for the next batch.
- **Search without a button**: it triggers when a filter changes (after a short delay) and is forced with the Enter key. The text field only triggers the automatic search from a few characters (3 by default), or when it is cleared.
- A button **resets** the filters; active filters are shown.
- Search, filter and sort parameters are **carried into the URL** when the search runs (a filtered list can be shared or reloaded).
- An **empty list** shows a suitable message, with a create button if the user has the right to create.
- A **loading error** shows a friendly message enriched with the backend's message.
- The **visibility** filter (deleted / not deleted, blocked / not blocked) is only offered to authorized profiles. Deleted or blocked items are grayed out and carry a "Deleted" / "Blocked" tag.
- Each row has an **actions menu** (three dots) and, depending on rights, a **primary action button**.
- Names that are too long are truncated with "…".

The lists of each resource:

| List                                                                | Page                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| My projects · Project settings                                      | [Projects](/registry/functional/features/projects)                     |
| Users                                                               | [Users](/registry/functional/features/users)                           |
| Check-ins & check-outs · Histories (participant, vehicle, activity) | [Movements](/registry/functional/features/movements)                   |
| Alerts                                                              | [Alerts](/registry/functional/features/alerts)                         |
| Participants · A participant's history                              | [Participants](/registry/functional/features/participants)             |
| Groups · A group's participants                                     | [Groups](/registry/functional/features/groups)                         |
| Vehicles · A vehicle's history                                      | [Vehicles](/registry/functional/features/vehicles)                     |
| Activities · An activity's history                                  | [Activities](/registry/functional/features/activities)                 |
| Members                                                             | [Members and profiles](/registry/functional/features/project-profiles) |

## 7. Behaviors shared by forms {#common-form-behaviors}

- Each validation error shows a suitable message **under the field concerned** (`sgdf-field-error`).
- When editing, all fields are **prefilled**.
- For any item attached to a project, there is **no project field**: the value is the current project.
- **Dates and times**:
  - the date can be entered without the time; the time requires the date;
  - the start must be **strictly before** the end;
  - dates stay within the project's period when it is set, **except for profiles**;
  - a date entered without a time is interpreted as 00:00 for a start and 23:59:59 for an end (see [date without a time](/registry/functional/domain-model#date-without-time)).
- **_Log_-type items** (alerts, check-ins/check-outs, communications): any change **versions the previous version** — nothing that was entered is lost.

### Submission

Shared by forms and by dialogs triggered by an action (deletion confirmation, invitation acceptance…):

- **While sending**, loading is shown on the submit button, in the form or the dialog itself. That button is disabled to prevent a double submission; the rest of the interface remains usable. Cancel aborts the request.
- **On success**, the form or the dialog closes.
- **On failure**:
  - it stays open, with a friendly message enriched with the backend's message shown **inside it** (no notification);
  - the entered data is kept: the user corrects and retries without starting over;
  - the message disappears on the next submission or on closing.

## 8. Presence and availability {#presence-and-availability}

The priority rules between the dates of a participant, their groups and the other items are described in [Domain model → Availability windows](/registry/functional/domain-model#availability-windows-priority-and-date-resolution).
