# Feature: Communications

> 14:20 — *"Called the group, they're leaving the climbing wall now."*
> 14:55 — *"Back on site, everyone accounted for."*

A communication is a short, timestamped note pinned to something that is unfolding: a group that is out, or an incident
that is open. It is the running commentary that turns a movement log into a story someone can follow afterwards.

Communications require the project's `COMMUNICATION` option, which itself requires `ACTIVITY`.

**Who this is for:** everyone with a profile — the person on the radio is rarely the administrator.

## Who can do what

| Role                    | May do                                                                               | Limits                              |
|-------------------------|--------------------------------------------------------------------------------------|-------------------------------------|
| `PROJECT_ADMINISTRATOR` | Create · Read · Update · Disable · Enable · **Delete** · search movements and alerts | Requires the `COMMUNICATION` option |
| `PROJECT_COORDINATOR`   | Create · Read · Update · Disable · Enable · search movements and alerts              | Cannot delete                       |
| `PROJECT_PARTICIPANT`   | Create · Read · Update · Disable · Enable · search movements and alerts              | Cannot delete                       |

Reading the communications attached to a **movement** additionally requires the `COMMUNICATION` option; reading those
attached to an **alert** requires `ALERT`.

## What a communication carries

A **date and time**, an optional **message** of up to 250 characters, and an attachment: a movement, an alert, or both —
but **never neither**. A communication with nothing to attach to is rejected, because a note floating free of context is
not information.

```gherkin
Scenario: Refusing a communication attached to nothing
  When I post a communication with neither a movement nor an alert
  Then it is rejected

Scenario: Refusing a message that is too long
  When I post a communication whose message exceeds 250 characters
  Then it is rejected

Scenario: Refusing a communication outside the project's dates
  When I post a communication dated after the project ends
  Then it is rejected
```

## What you can attach to

### Movements — but only the ones that are still open questions

Not every movement can carry a communication. It must be:

- **an `OUT` movement** — an exit is the thing that leaves a question hanging; an arrival answers it;
- **of registered participants**, not guests;
- **visible**, and belonging to the same project;
- **dated at or before** the communication itself.

Read those together and the intent is clear: communications track *our own people who are currently away*. Searching for
movements to attach to returns exactly that shortlist.

```gherkin
Scenario: Attaching a note to a group that is out
  Given a group of registered participants left on an OUT movement
  When I post a communication attached to that movement
  Then the communication is recorded against it

Scenario: Refusing to attach to an arrival
  When I attach a communication to an IN movement
  Then it is rejected

Scenario: Refusing to attach to a guest movement
  When I attach a communication to a movement of guests
  Then it is rejected

Scenario: Refusing a note that predates its movement
  When I post a communication dated before the movement it attaches to
  Then it is rejected
```

### Alerts — but only while they are open

An alert can only receive communications while its status is `IN_PROGRESS`. Once it is resolved or cancelled, the
conversation is closed. The alert must also be visible, belong to the same project, and be dated at or before the
communication.

Attaching to an alert additionally requires the caller to hold the project's `ALERT` option — checked explicitly, over
and above the communication permission.

```gherkin
Scenario: Adding to an open incident
  Given an alert is IN_PROGRESS
  When I post a communication attached to it
  Then the communication is recorded against the alert

Scenario: Refusing to add to a closed incident
  Given an alert has been resolved
  When I post a communication attached to it
  Then it is rejected

Scenario: Refusing to attach to an alert without the ALERT option
  Given the project does not have the ALERT option
  When I attach a communication to an alert
  Then the request is denied
```

## Moving things in time

Because a communication is anchored to a moment, time changes are checked from both ends:

- Moving the **communication** earlier than its movement or its alert is rejected.
- Moving the **movement** or the **alert** so that its communications would fall outside it is rejected too.

Neither side can quietly strand the other.

## Disabling and deleting

Disabling hides a communication from the thread while keeping it on record — the way to retract a note that turned out
to be wrong without pretending it was never said. Deletion is administrator-only.

There is one automatic case: the retention pass removes **orphan communications**, those whose movement and alert have
both been purged.

```gherkin
Scenario: Denying deletion to a coordinator
  Given I hold the PROJECT_COORDINATOR role
  When I try to delete a communication
  Then the request is denied
```

## Related

- [Alerts](/registry/functional/features/alerts) — the incident these notes often hang from
- [Movements](/registry/functional/features/movements) — the exits they comment on
- [Data Retention](/registry/functional/features/data-retention) — orphan cleanup
