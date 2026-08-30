# Feature: Vehicles

> The minibus left at 08:00 with Sophie driving. Is it back? Registry answers that the same way it answers the question
> for people — by reading the movement log.

Vehicles are an **optional capability**: the project must have the `VEHICLE` option, or the whole feature is unreachable
for everyone, administrator included.

**Who this is for:** administrators and coordinators. Vehicles are project configuration, not gate work.

## Who can do what

| Role                    | May do                                                                    | Limits                             |
|-------------------------|---------------------------------------------------------------------------|------------------------------------|
| `PROJECT_ADMINISTRATOR` | Create · Read · Update · Disable · Enable · **Delete** · read **history** | Requires the `VEHICLE` option      |
| `PROJECT_COORDINATOR`   | Create · Read · Update · Disable · Enable · read **history**              | Requires the option; cannot delete |
| `PROJECT_PARTICIPANT`   | **Nothing**                                                               | No vehicle permission at all       |

::: warning The participant role has no vehicle rights whatsoever
A gatekeeper can *attach* a vehicle to a movement they
are recording — that is a movement permission — but cannot list, read, create or edit the vehicles themselves.
:::

```gherkin
Scenario: Denying vehicles when the option is off
  Given the project does not have the VEHICLE option
  When its administrator lists the vehicles
  Then the request is denied

Scenario: Denying vehicles to a project participant
  Given the project has the VEHICLE option
  And I hold the PROJECT_PARTICIPANT role
  When I list the vehicles
  Then the request is denied
```

## What a vehicle carries

A **licence plate** (up to 20 characters), a **brand** and a **model** — all three required — plus an optional
availability window that must sit inside the project's dates. Searching matches fuzzily across plate, brand and model,
so "Renault", "AB-123" and "Trafic" all find the same van.

Plates are **not** enforced unique: two projects can hold the same vehicle, and even within one project Registry does
not object to a duplicate.

```gherkin
Scenario: Adding a vehicle
  Given the project has the VEHICLE option
  When I add a vehicle with its plate, brand and model
  Then the vehicle is available to the project

Scenario: Refusing a window outside the project
  When I give a vehicle an availability window that starts before the project does
  Then the request is rejected
```

## Presence, drivers and history

A vehicle's presence is derived exactly like a person's: **the latest visible movement it appears in.** An `IN` movement
means it is on site, an `OUT` movement means it is away, no movement at all means it has not been checked in.

When someone is attached to a vehicle on a movement line, they are its **driver** for that trip — and drivers must be
**adults**. The dashboard shows vehicles present and away as its own pair of counters, alongside the people.

Each vehicle also has a **history**: every movement it appears in, filterable by direction, dates, visibility and
whether the movement was tied to an activity.

```gherkin
Scenario: Reading a vehicle as away
  Given the minibus's latest visible movement is an OUT movement
  Then it reads as away

Scenario: Refusing a minor as a driver
  When I record a movement attaching a participant under eighteen to a vehicle
  Then the movement is rejected
```

## Disabling and deleting

Disabling hides a vehicle from day-to-day lists and stops it being selectable for new movements, without disturbing the
history it already appears in — the tool for the van that went to the garage mid-event.

Deleting is permanent, administrator-only, and refused for **any vehicle that appears in a movement**. As with
participants, the movement log is protected before the thing it references.

```gherkin
Scenario: Refusing to delete a vehicle with a movement
  Given a vehicle appears in at least one movement
  When I try to delete it
  Then the request is rejected

Scenario: Denying deletion to a coordinator
  Given I hold the PROJECT_COORDINATOR role
  When I try to delete a vehicle
  Then the request is denied
```

## Related

- [Movements](/registry/functional/features/movements) — attaching vehicles and drivers
- [Projects](/registry/functional/features/projects) — enabling the `VEHICLE` option
