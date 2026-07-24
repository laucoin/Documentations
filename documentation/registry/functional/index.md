# Functional Documentation

Registry is a web application for **managing the people present at an event**. An organizer creates an event, invites staff to help run it, registers the people who take part, optionally organizes them into groups, and then keeps a live record of who is physically on site and who has left. Everything here is described from a user's point of view — what the product does, who uses it, and the rules that govern each feature. The engineering behind it lives in the [Technical Documentation](../technical/).

## What Registry is, in one paragraph

Registry replaces the paper attendance sheet ("who is here right now?") with a shared, real-time system. A user signs in once through a central identity provider and lands on the list of events they can access. Inside an event they manage **participants**, arrange them into **groups**, and record **movements** — the check-in and check-out events that move a participant *in* or *out* of the site. A dashboard turns those movements into a live headcount: how many participants are present, how many are out, how many guests are on site, and which vehicles are here. Four optional modules — **vehicles**, **activities**, **communications** and **alerts** — extend an event only when the organizer enables them. Access is governed end to end by a fine-grained, per-event permission model.

## Core concepts

| Concept | What it means to a user |
| ------- | ----------------------- |
| **Project** | An event to manage — a camp, a trip, a gathering. It has a start and an end, and a set of optional modules the organizer turns on. Everything else lives inside a project. |
| **Profile** | A person's membership of a project: which event they can access, in which role, and during which access window. |
| **Participant** | Someone taking part in the event. Either *registered* (enrolled for the whole event) or a *guest* (a visitor). |
| **Group** | A named set of participants — a team, a unit, a tent — used to move and count people together. |
| **Movement** | The core record: a check-in (`IN`) or check-out (`OUT`) event that changes who is present. |
| **Presence** | The live status derived from movements: each participant and vehicle is *in*, *out*, or *unavailable*. |

## Scope and non-goals

| In scope | Out of scope |
| -------- | ------------ |
| Real-time presence tracking of participants at an event | Payroll, invoicing, or payment processing |
| Multi-event, multi-tenant use — many independent projects on one deployment | A single hard-coded event |
| Fine-grained, per-project roles and permissions | Anonymous or public write access |
| Optional modules (vehicles, activities, communications, alerts) enabled per project | Modules that cannot be turned off |
| Delegated authentication through an external identity provider (OIDC) | A built-in username/password store |
| GDPR-minded data retention and anonymization | Long-term archival or analytics warehousing |

## Documentation map

| Page | Purpose |
| ---- | ------- |
| [Personas](./personas) | Who uses Registry and what each one needs from it |
| [Roles & Permissions](./roles-and-permissions) | The security baseline: authentication, the two permission planes, roles, and the full access matrix |
| [Domain Model](./domain-model) | The business vocabulary — every entity, its relationships, and the status values that drive presence |
| [Workflows](./workflows) | End-to-end journeys, from signing in to recording a movement and handling an alert |
| [Features](./features/projects) | One page per feature, each with its access matrix and BDD scenarios |
