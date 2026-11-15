---
title: 'Personas'
description: 'The people who use Registry and the people it records, with what each of them needs.'
---

# Personas

Registry serves two very different kinds of people: the small number who **administer the platform and run events**, and the far larger number who are simply **the subjects of the record** — the participants and guests being counted. Only the first group signs in. This page describes the human roles; the exact permissions attached to each are in [Roles and permissions](/registry/functional/roles-and-permissions).

## Platform administrator

The person who looks after user accounts for the whole deployment, across all events.

- **Maps to**: the global `USER_ADMINISTRATOR` role.
- **Goals**: keep the user directory clean; grant or revoke access; block a compromised account or that of someone who has left; honor data deletion requests.
- **What they do**: search users, change a user's global role, block/unblock accounts, export or delete a user's data on request (GDPR), and **join a project as support** (a one-hour, traced administrator profile that expires) to troubleshoot without joining it permanently. They do **not** run events day to day, unless they also hold a project role.
- **What Registry owes them**: a single directory of everyone who can sign in, and safe, reversible controls that never let them lock out the last administrator.

## Event organizer (project administrator)

The person who owns a specific event and is fully responsible for it.

- **Maps to**: the `PROJECT_ADMINISTRATOR` project role on that project (a project's creator gets it automatically).
- **Goals**: set the event up, decide which optional modules are needed, invite the right people into the team, and keep the final say on everything that happens in it.
- **What they do**: create and configure the project, invite and manage the other members (assign roles, set access windows, block or remove them), and manage all the event's resources — participants, groups, movements, vehicles, activities, communications and alerts.
- **What Registry owes them**: full control over their own event, isolated from all others, with safeguards that prevent them from accidentally removing the event's last permanent administrator.

## Coordinator

An experienced team member who runs the event's operations but does not manage who else has access.

- **Maps to**: the `PROJECT_COORDINATOR` project role.
- **Goals**: keep the day-to-day record accurate — register people, organize groups, record movements, manage vehicles, activities, communications and alerts.
- **What they do**: create, edit, delete (soft delete) and **restore** participants, groups, check-ins/check-outs, vehicles, activities, communications and alerts, and view histories. They **view** the member list without managing it (and without seeing blocked profiles), cannot edit the project itself, and **cannot permanently delete**: that is reserved for the administrator.
- **What Registry owes them**: everything needed to keep the live record correct, without the responsibility (or the risk) of member administration.

## Team member (project participant role)

A field helper whose job is mostly to note who comes in and who goes out.

- **Maps to**: the `PROJECT_PARTICIPANT` project role.
- **Goals**: record check-ins and check-outs quickly and reliably; see who is present.
- **What they do**: create, read, edit and delete (soft delete) participants, groups, check-ins/check-outs and — when enabled — communications and alerts (including resolving them). They pick an activity as a reason and assign a vehicle in a check-out, but **cannot access** the vehicle, activity or member lists, do not view histories, can neither see nor restore deleted items, and never permanently delete anything.
- **What Registry owes them**: a fast, forgiving check-in/check-out flow, and a clear view of the current headcount.

## Invited user

Anyone who has been sent an invitation to join an event and has not accepted it yet.

- **Maps to**: a project profile with status `INVITED`, held by any signed-in user.
- **Goals**: understand what they have been invited to, then accept or decline.
- **What they do**: view their pending invitations and accept or reject each one. On acceptance, they take on the project role the invitation carried.
- **What Registry owes them**: a clear list of pending invitations and a one-click accept/decline.

## The subjects of the record — not users

These people appear **in** the system but do not sign in to it.

- **Registered participant** — a person enrolled in the event, normally present. Their availability window is optional and need not cover the whole event — a registered participant is not required to be present from start to finish. They can optionally be linked to a real user account, but this is not mandatory.
- **Guest** — a visitor who comes on site temporarily (a parent, a partner organization, a supplier). Guests are created on arrival and counted separately from registered participants.

Registry exists to answer, at any moment, _"who is here right now?"_ for precisely these people — while only trusted team members hold an account.
