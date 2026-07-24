# Workflows

These are the end-to-end journeys Registry exists to support. Each is written from the actor's point of view, with the product doing the work behind the scenes. Where a step depends on a permission, the [Roles & Permissions](./roles-and-permissions) matrix governs it.

## W1 — Signing in for the first time

1. A user opens Registry and is not signed in, so the app sends them to the central identity provider's login screen.
2. They authenticate there and are redirected back. Registry exchanges the returned code for a session.
3. Because this is their first visit, Registry **creates their account automatically** with the default `USER` role and remembers their identity for next time.
4. They land on the list of projects they can access — empty, for a brand-new user, with a prompt to create one or check their invitations.

**Why this matters**: one login screen, no Registry-specific password, and zero manual account creation.

## W2 — Creating and configuring an event

1. Any signed-in user clicks **Create project** and gives it a name and a start/end date-time.
2. On the second step they choose the optional modules — vehicles, activities, communications, alerts — respecting dependencies (alerts pull in communications and activities).
3. On save, Registry makes the creator the project's **administrator** and drops them straight into the event.

**Why this matters**: getting from "I need to run an event" to "I'm administering it" takes one form and no approval.

## W3 — Inviting staff

1. The administrator opens **Configuration → Profiles** and invites one or more users, choosing a **role** (coordinator, participant, or co-administrator) and an **access window**.
2. Each invitee sees the invitation under **My invitations** and accepts or declines it.
3. On acceptance, the invitee gains the granted role on that project and can select it as their active event.

**Why this matters**: the organizer delegates precisely — the right people, the right power, only for the right dates.

## W4 — Registering participants and organizing groups

1. A coordinator opens **Configuration → Participants** and adds people — name, birthday, availability window, optionally linked to a user account.
2. They open **Configuration → Groups**, create groups (teams, units, tents) and assign participants to them.
3. From then on, a group can be moved and counted as a unit.

**Why this matters**: the roster is set up once, and groups make every later headcount and movement faster.

## W5 — Recording a movement (the core loop)

1. A staff member opens **Movements → Record** and sets the time (defaulting to now), the **direction** (`IN`/`OUT`), and whether this concerns **registered** participants or **guests**.
2. They pick the people — individual participants or whole groups, which expand to their members — and choose a **reason** or an **activity** to justify the move.
3. If the event tracks vehicles and the people are registered, they attach vehicles and assign drivers on a third step.
4. On save, the dashboard headcount updates immediately: those people are now *in* or *out*.

**Why this matters**: this is the action the whole product is built around — it must be quick, and it must keep the live count honest.

## W6 — Checking a guest in and out

1. A guest arrives. A staff member records an `IN` movement with content type **guest**, entering the visitor's name and birthday (guests are created on arrival) and a reason such as *visit* or *logistics*.
2. The dashboard's guest count goes up.
3. When the guest leaves, a staff member records an `OUT` movement referencing that existing guest, and the count goes back down.

**Why this matters**: visitors are counted without being enrolled as full participants, so the "who is on site" number is always complete.

## W7 — Watching the live picture

1. Anyone with access to the event opens **Project home**.
2. The dashboard shows present vs absent participants (split registered/guest and majors/minors), vehicle presence if enabled, and today's **birthdays**.
3. Lists of in-progress movements — with and without a linked activity — let staff reverse a check-in/out in one click if it was a mistake.
4. If the event has alerts enabled, an **active-alerts** banner surfaces anything currently in progress.

**Why this matters**: a single screen answers "who is here right now, and is anything wrong?"

## W8 — Raising and resolving an alert

1. While discussing a movement, a staff member escalates a message into an **alert** — giving it a title.
2. The alert appears on the **Alerts** page in status *in progress*, with a running "since" timer, and on the dashboard banner.
3. The team discusses it in the alert's own communication thread and, when handled, marks it **resolved** (or **canceled** if it was a false alarm), stopping the timer.

**Why this matters**: incidents get a visible owner, a clock, and a paper trail instead of being lost in chat.

## W9 — Administering users (platform)

1. A platform administrator opens the **Users** directory.
2. They change a user's global role, block a departed or compromised account, or — on a data-deletion request — **anonymize** it.
3. Registry refuses any action that would remove the last platform administrator, and a blocked or anonymized user can no longer sign in.

**Why this matters**: account hygiene and data-protection obligations are handled with safe, auditable, reversible-where-appropriate controls.

## W10 — Personal preferences

1. Any user opens **Settings**.
2. They switch **language** (English or French) and **theme** (system, light, or dark); the choice is saved to their account and follows them to any device.
3. They can also switch which project profile is active, or leave a project they no longer help with.

**Why this matters**: the tool adapts to the person, and their context travels with their account rather than their browser.
