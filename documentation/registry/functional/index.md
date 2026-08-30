# Functional Documentation

Registry is described here from the point of view of the people who use it — what the platform does, who may do what,
and the rules that govern each behaviour. The engineering behind it lives in
the [Technical Documentation](/registry/technical/).

## What Registry is, in one paragraph

Registry is a **multi-tenant presence platform**. A user creates a **project** — an event, a camp, a gathering — and
becomes its administrator. Inside that project they register **participants**, arrange them into **groups**, and invite
other users through **profiles** that carry a project role and an access window. Day to day, the project team records
**movements**: a check-out when registered participants leave the site, a check-in when they come back, and the mirror
case for **guests** who arrive from outside. From those movements Registry derives, at any instant, who is present, who
is out, and who is not yet available — for people and, optionally, for **vehicles**. Four capabilities are **optional
per project** and switched on individually: vehicles, activities, communications and alerts. Everything is behind SSO,
and every single action is gated by a permission attached to the user's role *in that specific project*.

## Core concepts

| Concept                 | What it means to the user                                                                                                                                              |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Project**             | The tenant. Everything — participants, groups, movements, vehicles, activities, communications, alerts — belongs to exactly one project and is invisible outside it.   |
| **Project option**      | A capability enabled per project: `VEHICLE`, `ACTIVITY`, `COMMUNICATION`, `ALERT`. A disabled option makes its whole feature unreachable, whatever the user's role.    |
| **Profile**             | The link between a user and a project. It carries a **project role**, a **status** (invited, accepted, rejected, blocked) and an optional **access window**.           |
| **Selected profile**    | The profile a user is currently working through. It decides which project the application operates on.                                                                 |
| **Participant**         | A person tracked inside a project. **Registered** participants belong to the project; **guests** are outsiders recorded only through the movement that brings them in. |
| **Group**               | A named set of participants inside a project, used to move several people in one gesture.                                                                              |
| **Movement**            | A dated `IN` or `OUT` event covering participants — optionally with a vehicle, a reason, or an activity. Movements are the only source of presence.                    |
| **Presence status**     | Derived per participant and per vehicle: `IN` (present), `OUT` (away), `UNAVAILABLE` (outside its availability window).                                                |
| **Activity**            | An optional named occupation with a duration and a participant range, usable as the reason of a movement.                                                              |
| **Communication**       | An optional timestamped message attached to a movement or to an alert.                                                                                                 |
| **Alert**               | An optional incident opened on a project, tracked through `IN_PROGRESS` → `RESOLVED` / `CANCELED`, with communications attached.                                       |
| **Availability window** | The date/time range during which a participant, group, vehicle or activity exists for the project. Outside it, the element is `UNAVAILABLE`.                           |
| **Visibility**          | The soft-disable flag carried by nearly every record. Disabled records stay in history but drop out of day-to-day lists.                                               |

## Two permission planes

Registry has **two distinct role systems**, and the difference matters throughout this documentation:

- **User roles** are global and platform-wide (`USER_ADMINISTRATOR`, `USER`). They govern account administration and the
  right to create a project.
- **Project roles** are per-project (`PROJECT_ADMINISTRATOR`, `PROJECT_COORDINATOR`, `PROJECT_PARTICIPANT`) and are
  carried by a profile. They govern everything inside a project.

Holding a global role grants **nothing** inside a project, and holding a project role grants nothing in another project.
The full model is the security baseline for every feature page.

## Scope and non-goals

| In scope                                                | Out of scope                                              |
|---------------------------------------------------------|-----------------------------------------------------------|
| Multi-tenant projects with strict per-project isolation | Cross-project reporting or a global participant directory |
| Presence derived from recorded movements                | Automatic presence capture (badges, GPS, RFID)            |
| Registered participants and one-off guests              | Public self-registration by participants themselves       |
| Per-project roles with an access window                 | Delegated per-record ownership or attribute-based rules   |
| Optional capabilities enabled per project               | A per-user feature-flag system                            |
| Federated sign-in through an external identity provider | Local accounts, passwords or self-service password reset  |
| Scheduled retention purges of stale data                | Long-term archival or export of purged data               |
| French and English interfaces                           | Per-project custom terminology or translations            |

## Documentation map

| Page                                                              | Purpose                                                                                                              |
|-------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| [Personas](/registry/functional/personas)                         | The postures people adopt — organiser, coordinator, gatekeeper, platform administrator — and what each needs         |
| [Roles & Permissions](/registry/functional/roles-and-permissions) | The security baseline: authentication boundary, both permission planes, the full permission matrix, option gating    |
| [Domain Model](/registry/functional/domain-model)                 | Entities, relationships, lifecycles, and the two ideas — visibility and availability windows — that recur everywhere |
| [Workflows](/registry/functional/workflows)                       | End-to-end journeys, from first sign-in to the nightly retention pass                                                |

### Features

| Feature                                                            | What it covers                                                                |
|--------------------------------------------------------------------|-------------------------------------------------------------------------------|
| [Projects](/registry/functional/features/projects)                 | The tenant: dates, options, and the three ways a project can end              |
| [Project Profiles](/registry/functional/features/project-profiles) | Granting access: invitations, roles, access windows, support profiles         |
| [Participants](/registry/functional/features/participants)         | The people the project is responsible for, registered and guest               |
| [Groups](/registry/functional/features/groups)                     | Organising participants, and how group availability flows to members          |
| [Movements](/registry/functional/features/movements)               | The core: check-ins, check-outs, reasons, guests, and how presence is derived |
| [Vehicles](/registry/functional/features/vehicles)                 | Optional — vehicles, drivers and vehicle presence                             |
| [Activities](/registry/functional/features/activities)             | Optional — the programme, and activities as movement reasons                  |
| [Communications](/registry/functional/features/communications)     | Optional — timestamped notes pinned to a movement or an alert                 |
| [Alerts](/registry/functional/features/alerts)                     | Optional — incidents, their lifecycle, and their thread                       |
| [Users](/registry/functional/features/users)                       | The global plane: roles, blocking, anonymisation, deletion                    |
| [Preferences](/registry/functional/features/preferences)           | Theme, language, and the selected profile that sets your project context      |
| [Data Retention](/registry/functional/features/data-retention)     | The nightly sweeps, their order, and dry runs                                 |
