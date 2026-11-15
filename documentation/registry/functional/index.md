---
title: 'Functional documentation'
description: 'What Registry does, for whom, and how the functional documentation is organized.'
---

# Functional documentation

Registry is a web application for **managing the people present at an event**. An organizer creates an event, invites the team that will help run it, registers the people taking part, optionally organizes them into groups, then keeps a live record of who is physically on site and who has left. Everything here is described from the user's point of view — what the product does, who uses it, and the rules that govern each feature. The engineering behind it lives in the [technical documentation](/registry/technical/).

## What Registry is, in one paragraph

Registry replaces the paper attendance sheet ("who is here right now?") with a shared, real-time system. Users sign in once through a central identity provider and land on the list of events they have access to. Inside an event, they manage **participants**, sort them into **groups**, and record **movements** — the check-ins and check-outs that move a participant _inside_ or _outside_ the site. A dashboard turns those movements into a live headcount: how many participants are present, how many are out, how many guests are on site, and which vehicles are there. Four optional modules — **vehicles**, **activities**, **communications** and **alerts** — extend an event only when the organizer enables them. Access is governed end to end by a fine-grained permission model specific to each event.

## Key concepts

| Concept          | What it means for a user                                                                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**      | An event to manage — a camp, a trip, a gathering. It optionally has a start and an end, and a set of optional modules the organizer enables. Without dates, it is permanent. Everything else lives inside a project.                                                                      |
| **Profile**      | A person's membership of a project: which event they can access, with which role, and during which optional access window. A profile without a window is permanent — and a registered profile does not necessarily cover the whole event.                                                 |
| **Participant**  | Someone taking part in the event. Either _registered_ (enrolled, normally present) or _guest_ (a visitor, normally off site). Their availability window is optional and independent of the project's.                                                                                     |
| **Group**        | A named set of participants — a team, a unit, a tent — used to move and count people together.                                                                                                                                                                                           |
| **Movement**     | The core record: a check-in (`IN`) or a check-out (`OUT`) that changes who is present.                                                                                                                                                                                                    |
| **Presence**     | The live status derived from movements: each participant and each vehicle is _inside_, _outside_ or _unavailable_.                                                                                                                                                                        |
| **Availability** | The theoretical window during which an item (participant, group, activity, vehicle) can generate movements — in practice its "registration" period. It differs from presence: an item can be _available_ but currently _outside_, or _unavailable_ whatever its last recorded movement. |

## Scope and out of scope

| In scope                                                                             | Out of scope                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------- |
| Real-time tracking of participant presence at an event                               | Payroll, invoicing or payment processing    |
| Multi-event, multi-tenant use — many independent projects on a single deployment     | A single hard-coded event                   |
| Fine-grained, per-project roles and permissions                                      | Anonymous or public write access            |
| Optional modules (vehicles, activities, communications, alerts) enabled per project  | Modules that cannot be disabled             |
| Authentication delegated to an external identity provider (OIDC)                     | A built-in username/password store          |
| GDPR-compliant data retention, deletion, export and access traceability              | Long-term archiving or an analytics warehouse |

## Documentation map

| Page                                                                 | Purpose                                                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [Personas](/registry/functional/personas)                            | Who uses Registry and what each of them needs                                                             |
| [Roles and permissions](/registry/functional/roles-and-permissions)  | The security baseline: authentication, the two permission planes, the roles and the full access matrix    |
| [Domain model](/registry/functional/domain-model)                    | The business vocabulary — each entity, its relationships, and the status values that drive presence       |
| [Screens and common behaviors](/registry/functional/screens)         | The cross-cutting screens, the home page, the drawers, the shared behaviors of lists and forms            |
| [Features](/registry/functional/features/projects)                   | One page per feature: rights, business rules and screens (lists and forms)                                |
