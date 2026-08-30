# Feature: Participants

> A participant is a person the project is responsible for. Eighty teenagers at a camp, forty volunteers at a festival,
> the supplier who came through the gate at 11:04 — all of them are participants, in one of two flavours.

**Who this is for:** everyone with a profile. Registering people is the second-most-common gesture in the product, after
recording their movements.

## Who can do what

| Role                    | May do                                                                                              | Limits                                 |
|-------------------------|-----------------------------------------------------------------------------------------------------|----------------------------------------|
| `PROJECT_ADMINISTRATOR` | Create · Read · Update · Disable · Enable · **Delete** · read **history** · search users and groups | This project only                      |
| `PROJECT_COORDINATOR`   | Create · Read · Update · Disable · Enable · read **history** · search users and groups              | Cannot delete                          |
| `PROJECT_PARTICIPANT`   | Create · Read · Update · Disable · Enable · search users and groups                                 | **Cannot read history**, cannot delete |

Movement history is the line between the coordinator and the participant role: the gatekeeper records what is happening
now, but does not get to review where someone has been.

## Registered people and guests

|                        | `REGISTERED`                                 | `GUEST`                                         |
|------------------------|----------------------------------------------|-------------------------------------------------|
| Who                    | Someone the project expects                  | An outsider passing through                     |
| Created by             | Registering them, before or during the event | The **entrance movement** that brings them in   |
| Baseline               | On site                                      | Elsewhere                                       |
| Lives beyond the visit | Yes                                          | Effectively no — their story ends at their exit |

Guests are never created through this feature; they arrive attached to a movement.
See [Movements](/registry/functional/features/movements).

## What a participant carries

A first name, a last name and a **birthday** — all required. The birthday is not decoration: it drives the adult/minor
split on the dashboard and the rule that only adults may drive.

```gherkin
Scenario: Refusing a birthday in the future
  When I register a participant with a birthday in the future
  Then the participant is rejected

Scenario: Registering a participant
  Given I hold a profile on the project
  When I register a participant with a first name, last name and birthday
  Then the participant is created in this project
```

### Availability windows

A participant's window says when they are part of the event. Outside it they read as `UNAVAILABLE` — neither present nor
absent, simply not part of today's count.

Three rules govern it:

- The window must sit **inside the project's date range**.
- A start without an end, or an end without a start, is fine; a **time without its date** is not.
- A participant with **no window of their own inherits from their groups** — the earliest start and the latest end among
  the visible groups they belong to. With no window and no group, they read as unavailable.

```gherkin
Scenario: Refusing a window outside the project
  When I give a participant an availability window that starts before the project does
  Then the update is rejected

Scenario: Inheriting availability from a group
  Given a participant has no availability window of their own
  And they belong to a group available for the whole event
  Then they read as available for the whole event
```

### Linking to a user account

A participant may be linked to a platform user — the person is both a registered attendee and someone who signs in. **At
most one participant per user, per project**; the same person cannot be registered twice.

```gherkin
Scenario: Refusing a second participant for the same user
  Given a participant in this project is already linked to that user
  When I link a second participant to them
  Then the request is rejected
```

## Editing someone who already has a history

Names, birthday, groups, linked user and availability can all be corrected — but the availability window is checked
against the movements already recorded.

You may shorten or move a window **only within the bounds of what already happened**. If a participant has a movement on
Friday, their window cannot be pulled back to Thursday: the movement would fall outside the period they were supposedly
present. Registry names the offending movement in the error, and the way out is to delete that movement first.

```gherkin
Scenario: Refusing a window that strands an existing movement
  Given a participant has a movement recorded on the last day of their window
  When I shorten their window to end before that movement
  Then the update is rejected and the conflicting movement is named
```

## Reading a participant

Beyond the list and the detail, two reads are worth naming:

- **Birthdays** — who is celebrating during the event. A small feature that matters enormously at a summer camp.
- **Movement history** — every movement the participant appears in, filterable by direction, dates, visibility and
  whether it was tied to an activity. Administrators and coordinators only.

Lists are searched by fuzzy text on names and can be filtered by presence status, type, adult or minor, and a point in
time.

## Disabling and deleting

Disabling hides someone from day-to-day lists without touching history — the tool for the person who cancelled at the
last minute. Deleting is permanent and heavily guarded:

| Guard                                                                             | Why                                                                 |
|-----------------------------------------------------------------------------------|---------------------------------------------------------------------|
| A participant with **any movement** cannot be deleted                             | Deleting them would rewrite the presence record                     |
| A participant who is the **last member of a group** cannot be deleted or disabled | Groups are never allowed to become empty — delete the group instead |

```gherkin
Scenario: Refusing to delete a participant with a movement
  Given a participant appears in at least one movement
  When I try to delete them
  Then the request is rejected

Scenario: Refusing to disable the last member of a group
  Given a participant is the only member of a group
  When I try to disable them
  Then the request is rejected

Scenario: Denying deletion to a coordinator
  Given I hold the PROJECT_COORDINATOR role
  When I try to delete a participant
  Then the request is denied
```

## Related

- [Movements](/registry/functional/features/movements) — where presence comes from, and where guests are born
- [Groups](/registry/functional/features/groups) — organising participants, and inherited availability
- [Data Retention](/registry/functional/features/data-retention) — how unused participants are purged
