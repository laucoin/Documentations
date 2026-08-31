# Personas

Registry serves two very different kinds of people: the small number who **administer the platform and run events**, and the much larger number who are merely **the subjects of the record** — the participants and guests being counted. Only the first group signs in. This page describes the human roles; the exact permissions attached to each are in [Roles & Permissions](/registry/functional/roles-and-permissions).

## Platform Administrator

The person who looks after user accounts for the whole deployment, across every event.

- **Maps to**: the global role `USER_ADMINISTRATOR`.
- **Goals**: keep the directory of users clean; grant or revoke access; block a compromised or departed account; honour data-deletion requests.
- **What they do**: search users, change a user's global role, block/unblock accounts, anonymize (purge) a user on request, and mint a temporary **assistance profile** (a one-hour, expiring administrator profile) on any project to help out without permanently joining it. They do **not** run events day-to-day unless they also hold a project role.
- **What Registry owes them**: a single directory of everyone who can sign in, and safe, reversible controls that never let them lock out the last administrator.

## Event Organizer (Project Administrator)

The person who owns a specific event and is fully responsible for it.

- **Maps to**: the project role `PROJECT_ADMINISTRATOR` on that project (the creator of a project gets it automatically).
- **Goals**: set the event up, decide which optional modules it needs, invite the right staff, and retain final say over everything inside it.
- **What they do**: create and configure the project, invite and manage other members (assign roles, set access windows, block or remove them), and manage every resource in the event — participants, groups, movements, vehicles, activities, communications and alerts.
- **What Registry owes them**: complete control of their own event, isolated from every other event, with guard rails that prevent them from accidentally removing the event's last permanent administrator.

## Coordinator

An experienced staff member who runs the event's operations but does not manage who else has access.

- **Maps to**: the project role `PROJECT_COORDINATOR`.
- **Goals**: keep the day-to-day record accurate — register people, organize groups, record movements, manage vehicles, activities, communications and alerts.
- **What they do**: create, edit and disable/enable participants, groups, and the optional modules, plus full control of movements — including deleting one. They **cannot** invite or manage members, cannot modify the project itself, and — outside of movements — **cannot permanently delete** what they manage: only the administrator can delete a participant, group, vehicle, activity, communication or alert.
- **What Registry owes them**: everything they need to keep the live record correct, without the responsibility (or the risk) of membership administration.

## Staff Member (Project Participant-role)

A helper on the ground whose job is mostly to record who comes and goes.

- **Maps to**: the project role `PROJECT_PARTICIPANT`.
- **Goals**: check people in and out quickly and reliably; see who is present.
- **What they do**: create, read, edit and disable/enable participants, groups, movements and — where enabled — communications and alerts (including resolving one); read the project. This floor is the **same as the coordinator's** for these resources — the differences are narrower than the role names suggest: a participant cannot see the member list, cannot view movement history, has no standing access to vehicles or activities (beyond selecting one inside a movement), and can never permanently delete anything.
- **What Registry owes them**: a fast, forgiving check-in/check-out flow and a clear view of the current headcount.

## Invited User

Anyone who has been sent an invitation to join an event but has not yet accepted.

- **Maps to**: a project profile in status `INVITED`, held by any signed-in user.
- **Goals**: understand what they have been invited to and accept or decline it.
- **What they do**: view their pending invitations and accept or reject each one. On acceptance they take on whichever project role the invitation carried.
- **What Registry owes them**: a clear list of pending invitations and a one-click accept/decline.

## The subjects of the record — not users

These people appear **in** the system but do not sign in to it.

- **Registered participant** — a person enrolled in the event, normally present. Their availability window is optional and need not cover the whole event — a registered participant is not required to attend from start to finish. They may optionally be linked to a real user account, but that is not required.
- **Guest** — a visitor who comes on site temporarily (a parent, a partner organization, a supplier). Guests are created on arrival and counted separately from registered participants.

Registry exists to answer, at any moment, *"who is here right now?"* for exactly these people — while only trusted staff ever hold an account.
