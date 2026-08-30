# Feature: Groups

> Teams, tents, dormitories, minibus loads. A group is a named set of participants that lets you move fifteen people
> with one gesture instead of fifteen — and lets you say "the red team is here until Thursday" once, rather than on every
> member.

**Who this is for:** everyone with a profile. Groups are working tools, not configuration.

## Who can do what

| Role                    | May do                                                                                                | Limits            |
|-------------------------|-------------------------------------------------------------------------------------------------------|-------------------|
| `PROJECT_ADMINISTRATOR` | Create · Read · Update · add and remove members · Disable · Enable · **Delete** · search participants | This project only |
| `PROJECT_COORDINATOR`   | Create · Read · Update · add and remove members · Disable · Enable · search participants              | Cannot delete     |
| `PROJECT_PARTICIPANT`   | Create · Read · Update · add and remove members · Disable · Enable · search participants              | Cannot delete     |

Groups are the most evenly shared feature in the product: every role can create and reshape them, and only the
administrator can destroy one.

## What a group carries

A name — required, capped at 150 characters — and an optional **availability window** that must sit inside the project's
own dates. That window is the group's most interesting property, because it flows down.

### Availability flows to members

A participant with **no window of their own** inherits from the visible groups they belong to: the **earliest start**
and the **latest end** among them. Put the red team in a group available Monday to Friday, and every member without a
personal window is available Monday to Friday too.

That makes groups the natural place to express "this cohort is here for this stretch", rather than repeating dates on
fifty participants.

```gherkin
Scenario: Refusing a window outside the project
  When I give a group an availability window ending after the project ends
  Then the group is rejected

Scenario: A member inheriting the group's window
  Given a participant has no availability window of their own
  And they belong to a visible group available Monday to Friday
  Then they read as available Monday to Friday
```

## Membership

Members are added when the group is created, and any time afterwards. Three rules apply, and they all come down to
keeping the graph honest:

- Every member must be a participant **of the same project**.
- Every member must be **visible** — you cannot add a disabled participant.
- A participant already in the group cannot be added twice.

Adding members in bulk reports what actually happened, rather than failing wholesale on one duplicate.

```gherkin
Scenario: Adding members to an existing group
  Given a group and several visible participants of the same project
  When I add them to the group
  Then the group's membership grows and the result reports what was added

Scenario: Refusing a participant from another project
  When I add a participant that belongs to a different project
  Then the request is rejected

Scenario: Refusing a disabled participant
  When I add a participant who has been disabled
  Then the request is rejected

Scenario: Refusing a duplicate member
  Given a participant is already in the group
  When I add them again
  Then the request is rejected
```

::: tip Reshaping a group never rewrites history
Movements do not link back to the group — they store its **name**,
copied onto each line at the moment they were recorded. Add someone to the red team today and yesterday's movements are
untouched; remove someone and they still appear on the trips they actually went on.
See [Movements](/registry/functional/features/movements#moving-a-whole-group-at-once).
:::

## A group is never empty

The rule that shapes the whole feature: **the last member cannot be removed.** Not by removing them from the group, not
by disabling them, not by deleting them.

An empty group would be a container that silently stops conferring availability on anyone, and a participant who quietly
lost their inherited window. Registry refuses the situation outright — if the group has served its purpose, delete the
group.

```gherkin
Scenario: Refusing to remove the last member
  Given a group with a single member
  When I remove that member
  Then the request is rejected

Scenario: Refusing to disable the last member
  Given a participant is the only member of a group
  When I try to disable that participant
  Then the request is rejected

Scenario: Deleting the group instead
  Given a group I no longer need
  When its administrator deletes it
  Then the group and its membership are removed and the participants remain
```

## Reading a group

The list is searched by fuzzy text on the name, and filtered by visibility, presence and a point in time. A group's
**members** are read as their own paginated list, with the full participant filters available — presence status, adult
or minor, type, visibility — which makes "who from the red team is currently out?" a single question.

## Disabling and deleting

Disabling hides the group from day-to-day lists. Because inheritance only follows **visible** groups, disabling one also
withdraws the availability it was conferring on members who had no window of their own — worth knowing before you hide a
group mid-event.

Deleting removes the group and its membership; the participants themselves are untouched.

## Related

- [Participants](/registry/functional/features/participants) — the people in the group, and their own windows
- [Movements](/registry/functional/features/movements) — moving a whole group in one gesture
- [Data Retention](/registry/functional/features/data-retention) — how empty and unused groups are purged
