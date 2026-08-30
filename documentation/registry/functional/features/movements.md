# Feature: Movements

> Eight o'clock. A minibus pulls out of the camp with six teenagers and a driver, heading for the supermarket. Twenty
> minutes later a supplier's van arrives at the gate. By nine, someone will ask the only question that matters: **who is
on site right now?**

Movements are how Registry answers it. Every entry and every exit is recorded as a dated event, and **presence is never
stored — it is derived**. The dashboard, the counters, the vehicle board: all of it is read back out of the movement
log. Delete the log and you delete the truth; that is why so many of the rules below are about protecting it.

**Who this is for:** everyone holding a profile on the project. Recording movements is the platform's daily gesture, not
an administrator's chore.

## Who can do what

| Role                                                               | May do                                                                      | Limits                                           |
|--------------------------------------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------------|
| `PROJECT_ADMINISTRATOR`                                            | Create · Read · Update · **Delete** · search · read attached communications | This project only                                |
| `PROJECT_COORDINATOR`                                              | Create · Read · Update · **Delete** · search · read attached communications | This project only                                |
| `PROJECT_PARTICIPANT`                                              | Create · Read · Update · search · read attached communications              | This project only — **no deletion**              |
| Global `USER_ADMINISTRATOR` with no profile here                   | Nothing                                                                     | The global plane grants nothing inside a project |
| Anyone whose profile is not accepted, or outside its access window | Nothing                                                                     | Rights are recomputed on every request           |

Deleting a movement is the one place where a coordinator is trusted as much as an administrator — correcting a mistyped
check-in at seven in the morning is routine work, not governance.

Two reads carry an extra gate on top of the permission: a movement's **communications** require the project's
`COMMUNICATION` option, and **vehicle presence** requires `VEHICLE`. Full model
in [Roles & Permissions](/registry/functional/roles-and-permissions).

```gherkin
Scenario: Denying deletion to a project participant
  Given I hold the PROJECT_PARTICIPANT role on the project
  When I try to delete a movement
  Then the request is denied

Scenario: Denying access once an access window has closed
  Given my profile on the project had an access window that has now closed
  When I try to list the project's movements
  Then the request is denied
```

## Insiders and outsiders are mirror images

A movement's **content type** is either `REGISTERED` or `GUEST`, and that single choice flips the meaning of everything
else.

|                           | Registered participants          | Guests                                                                 |
|---------------------------|----------------------------------|------------------------------------------------------------------------|
| Who                       | People registered in the project | Outsiders — emergency services, suppliers, visitors, partner animators |
| Where they are by default | On site                          | Elsewhere                                                              |
| `IN` means                | They came back                   | They arrived                                                           |
| `OUT` means               | They left                        | They went home                                                         |
| How they enter the system | Registered beforehand            | Captured on the entrance itself                                        |

Read the table diagonally and the design falls out: the interesting direction is **registered people leaving** and
**guests arriving**. Those are the two moments that need an explanation — and, as the next section shows, the only two
that Registry insists on justifying.

Guests are created by the entrance that brings them in. They leave by being named, not re-described:

```gherkin
Scenario: Recording the arrival of visitors
  Given the project has visitors arriving from outside
  When I record an IN movement with the reason VISIT and the visitors' identities
  Then guest records are created for them
  And they are counted among the guests present

Scenario: Refusing to invent guests on their way out
  When I record an OUT movement of guests and supply new identities instead of existing ones
  Then the movement is rejected, because a guest who leaves must first have arrived
```

## Moving a whole group at once

Picking a **group** when recording a movement is the single most common gesture at a busy gate: one selection instead of
fifteen. What Registry stores, though, is not a link to the group — it is a **snapshot of it**.

Choosing a group expands it into one content line per member, and stamps each line with the **group's name**.
Participants picked individually carry no name. When the movement is read back, lines sharing a name are re-grouped for
display, so the movement shows *"the red team (8) plus Léa and Marc"* rather than ten anonymous rows. Removing the group
from a movement removes every line that carries its name.

The consequence is the point:

|                                              | A stored link to the group               | The name, copied onto each line      |
|----------------------------------------------|------------------------------------------|--------------------------------------|
| Members change afterwards                    | The movement silently rewrites itself    | The movement keeps who actually went |
| A member leaves the group                    | They vanish from a movement they were on | They stay, correctly                 |
| The group is deleted                         | The movement loses its shape             | The movement is unaffected           |
| Membership must be re-checked when recording | Yes                                      | No                                   |

So a movement records **who moved, and under which banner, at that moment** — not who is in that group today. It is a
deliberate denormalisation: history stays true, and recording a movement never has to re-validate that everyone selected
is still a member.

::: tip Nothing enforces the name
The field is free text, and Registry does not verify that a line's participants really
belong to a group of that name. The name is a label the interface writes, not a reference it resolves — which is exactly
what makes the snapshot immune to later edits.
:::

```gherkin
Scenario: Recording a movement for a whole group
  Given the red team has eight members
  When I select the red team while recording an OUT movement
  Then the movement carries eight lines, each labelled with the team's name

Scenario: The snapshot surviving a membership change
  Given a movement was recorded for the red team
  When a member is later removed from the red team
  Then the movement still shows them as having gone

Scenario: Mixing a group and individuals
  When I select the red team and two other participants
  Then the movement groups the team's lines together and shows the other two on their own
```

## Why are they leaving?

A movement may carry a **reason** or an **activity** — never both, never neither where one is required. Each reason is
bound to one direction and one content type, so the vocabulary can never contradict the event:

| Reason                 | Direction | Applies to |
|------------------------|:---------:|------------|
| `EMERGENCY`            |   `IN`    | Guests     |
| `LOGISTICS`            |   `IN`    | Guests     |
| `PARTNER_ANIMATION`    |   `IN`    | Guests     |
| `VISIT`                |   `IN`    | Guests     |
| `SHOPPING`             |   `OUT`   | Registered |
| `MEDICAL`              |   `OUT`   | Registered |
| `DEFINITIVE_DEPARTURE` |   `OUT`   | Registered |
| `OTHER`                |   `OUT`   | Registered |

::: tip Coming home needs no excuse
A registered `OUT` must be justified; a registered `IN` must not. A guest `IN` must
be justified; a guest `OUT` must not. Registry only ever asks *why* about the direction that changes someone's expected
place.
:::

When the project has the `ACTIVITY` option, an activity can stand in for a reason — *"they're out because they're at the
climbing session"* — which additionally files the movement into that activity's history.

```gherkin
Scenario: Recording a group leaving to go shopping
  Given I hold an accepted profile on the project
  And the participants are visible members of that project
  When I record an OUT movement with the reason SHOPPING for those participants
  Then the movement is created
  And each of those participants reads as OUT

Scenario: Recording the same participants coming back
  Given those participants are currently OUT
  When I record an IN movement for them with no reason
  Then the movement is created
  And each of those participants reads as IN

Scenario: Refusing an exit with no justification
  Given I am recording an OUT movement for registered participants
  When I submit it with neither a reason nor an activity
  Then the movement is rejected

Scenario: Refusing a reason that contradicts the direction
  Given I am recording an IN movement for registered participants
  When I submit it with the reason SHOPPING
  Then the movement is rejected as an incompatible type and reason

Scenario: Refusing both a reason and an activity
  Given the project has the ACTIVITY option
  When I submit a movement carrying both the reason MEDICAL and an activity
  Then the movement is rejected
```

## Wheels and drivers

With the `VEHICLE` option on, any line of a movement can be attached to a vehicle. The person on that line is its
**driver** for this trip, and vehicles gain a presence status of their own, derived exactly like a person's.

One rule is absolute:

```gherkin
Scenario: Refusing a minor as a driver
  Given the project has the VEHICLE option
  When I record a movement attaching a participant under eighteen to a vehicle
  Then the movement is rejected because drivers must be adults
```

## When it happened

A movement must sit **inside the project's own date range** — nothing before the project opens, nothing after it closes.
Everyone and everything it references must belong to the same project and be visible; a movement can never reach across
tenants.

```gherkin
Scenario: Refusing a movement outside the project's dates
  When I record a movement dated after the project's end date
  Then the movement is rejected

Scenario: Refusing to strand an attached communication
  Given a communication is attached to a movement
  When I move that movement to a time that leaves the communication outside it
  Then the edit is rejected
```

## What is written, stays written

A movement is a record of something that happened, so editing it is deliberately narrow. Its date, reason, activity and
content lines can be corrected. Two things cannot:

- **The direction never changes.** An entrance can never become an exit. Recorded backwards? Hide it or delete it, and
  record it again the right way round.
- **The content type never changes.** A movement of registered participants can never become a movement of guests.

And two movements are **terminal** — they close a story, so they are frozen against update, hiding, re-enabling and
deletion:

| Terminal movement             | Why it is frozen                                                                                                                                  |
|-------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| Reason `DEFINITIVE_DEPARTURE` | The person has gone for good; the departure also **shortens their availability window** to that exact moment, so they stop being expected on site |
| Any guest `OUT`               | The visit is over and the guest has left the project's world                                                                                      |

Guests already recorded on an entrance cannot be dropped by a later edit either. If they were let in, they must be let
out.

```gherkin
Scenario: Refusing to reverse the direction of a movement
  Given an IN movement has been recorded
  When I edit it to become an OUT movement
  Then the edit is rejected

Scenario: Freezing a definitive departure
  Given a movement was recorded with the reason DEFINITIVE_DEPARTURE
  When I try to update, hide or delete it
  Then the operation is rejected
  And the participants' availability ends at that movement's date and time

Scenario: Refusing to remove a guest from a recorded entrance
  Given a guest entrance has already been recorded
  When I edit it to drop one of its guests
  Then the edit is rejected
```

## Hiding is not deleting

Disabling a movement hides it from day-to-day lists **and takes it out of the presence computation** — the movement
before it becomes the current one again. That makes hiding the safe way to undo a mistake: reversible, and it leaves the
history intact. Deleting is permanent, and reserved to administrators and coordinators.

```gherkin
Scenario: Hiding a movement restores the previous presence
  Given a participant's latest movement is an OUT movement
  When I disable that movement
  Then the participant's status is derived from their previous movement again
```

## How presence is derived

For any person or vehicle, Registry looks at the **latest visible movement** that mentions them:

| Latest visible movement | Status                     |
|-------------------------|----------------------------|
| An `IN` movement        | `IN` — on site             |
| An `OUT` movement       | `OUT` — away               |
| None at all             | `OUT` — not yet checked in |

Availability then has the last word: anyone outside their availability window reads as `UNAVAILABLE`, whatever their
movement history says. Someone who has not arrived yet, or who has definitively departed, is neither present nor
absent — they are simply not part of today's count.

The project dashboard rolls this up into five live counters — registered adults present, registered adults away,
registered minors present, registered minors away, and guests currently on site — plus, with the `VEHICLE` option,
vehicles present and away. Adulthood is computed from the birthday against today's date, the same way the driver rule
computes it.
