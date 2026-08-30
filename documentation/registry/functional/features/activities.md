# Feature: Activities

> "Where are the fifteen kids who left at two?" — *"Climbing. Back around five."* An activity turns a bare exit into an answer.

An activity is a named occupation with a duration and a participant range. Its real power is that it can stand **in place of a reason** on a movement: instead of `OTHER`, the movement says *climbing session*, and the activity gains a history of everyone who went.

Activities are an **optional capability** requiring the project's `ACTIVITY` option — which is also the prerequisite for communications and, transitively, alerts. It is the keystone option.

**Who this is for:** administrators and coordinators, who plan the programme.

## Who can do what

| Role | May do | Limits |
| ---- | ------ | ------ |
| `PROJECT_ADMINISTRATOR` | Create · Read · Update · Disable · Enable · **Delete** · read **history** | Requires the `ACTIVITY` option |
| `PROJECT_COORDINATOR` | Create · Read · Update · Disable · Enable · read **history** | Requires the option; cannot delete |
| `PROJECT_PARTICIPANT` | **Nothing** | No activity permission at all |

As with vehicles, the gatekeeper can *select* an activity when recording a movement — a movement permission — but cannot see or shape the activity catalogue.

```gherkin
Scenario: Denying activities when the option is off
  Given the project does not have the ACTIVITY option
  When its administrator lists the activities
  Then the request is denied

Scenario: Denying activities to a project participant
  Given I hold the PROJECT_PARTICIPANT role
  When I list the activities
  Then the request is denied
```

## What an activity carries

| Field | Rule |
| ----- | ---- |
| Name | Required, up to 150 characters |
| Description | Optional, up to 2000 characters |
| Duration | Optional, expressed in a fixed format — a malformed value is rejected |
| Minimum participants | Optional, but not negative |
| Maximum participants | Optional, but not negative, and **not below the minimum** |
| Availability window | Optional, and must sit inside the project's dates |

Search matches fuzzily across the name **and** the description, so an activity can be found by what it is about, not only by what it is called.

```gherkin
Scenario: Creating an activity
  Given the project has the ACTIVITY option
  When I create an activity with a name, a duration and a participant range
  Then the activity is available to the project

Scenario: Refusing an inverted participant range
  When I create an activity whose maximum is below its minimum
  Then the request is rejected

Scenario: Refusing a malformed duration
  When I create an activity with a duration that does not match the expected format
  Then the request is rejected
```

## Using an activity as a movement's reason

On a movement, an activity and a reason are **mutually exclusive** — a movement is justified by one or the other, never both. The activity must belong to the same project and be visible.

Using an activity does more than label the movement: it files that movement into the activity's **history**, so "who went climbing, and when did they get back?" becomes a single read.

```gherkin
Scenario: Recording an exit for an activity
  Given the project has the ACTIVITY option
  When I record an OUT movement whose reason is the climbing activity
  Then the movement is created
  And it appears in that activity's history

Scenario: Refusing both an activity and a reason
  When I record a movement carrying both an activity and the reason MEDICAL
  Then the movement is rejected

Scenario: Refusing a hidden activity
  Given an activity has been disabled
  When I record a movement pointing at it
  Then the movement is rejected
```

## Disabling and deleting

Disabling takes an activity out of circulation — it can no longer be chosen for new movements — while leaving the movements that already reference it intact. It is how a cancelled session stops appearing without erasing the afternoon it did happen.

Deletion is administrator-only and refused for **any activity that appears in a movement**, on the same principle that protects participants and vehicles: the movement log outranks the things it points at.

```gherkin
Scenario: Refusing to delete an activity with a movement
  Given an activity appears in at least one movement
  When I try to delete it
  Then the request is rejected

Scenario: Denying deletion to a coordinator
  Given I hold the PROJECT_COORDINATOR role
  When I try to delete an activity
  Then the request is denied
```

## Related

- [Movements](/registry/functional/features/movements) — reasons, activities, and the rules that bind them
- [Communications](/registry/functional/features/communications) — the option that `ACTIVITY` unlocks
- [Projects](/registry/functional/features/projects) — the option dependency chain
