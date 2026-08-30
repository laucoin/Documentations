# Feature: Projects

> A project is the whole world. Every participant, group, movement, vehicle, activity, communication and alert in Registry belongs to exactly one, and can never be seen from another.

Creating a project is also the only way into the platform: any signed-in user can create one, and doing so makes them its administrator on the spot. There is no waiting for an invitation, no request queue.

**Who this is for:** anyone who organises an event and needs to know who is on site.

## Who can do what

| Role | May do | Limits |
| ---- | ------ | ------ |
| Global `USER` | **Create** a project; read the options available at creation | Becomes `PROJECT_ADMINISTRATOR` of what they create |
| Global `USER_ADMINISTRATOR` | Create; **read any project**, including ones they hold no profile on | Reading is the only cross-project power — no writing |
| `PROJECT_ADMINISTRATOR` | Read · Update · Disable · Enable · **Delete** | This project only |
| `PROJECT_COORDINATOR` | Read | This project only |
| `PROJECT_PARTICIPANT` | Read | This project only |

Listing projects returns what *you* can see: your own projects through your profiles, plus — for a global administrator who asks for them — projects they hold no profile on.

## Three things fixed at creation

A project carries a name, a date range, and a set of options. The name is required and capped at 150 characters; the rest is where the design lives.

### The date range constrains everything

Every availability window, every movement, every communication and every alert must fall **inside the project's dates**. That makes the range the project's spine — and it is why narrowing it later is a guarded operation.

```gherkin
Scenario: Refusing an end date before the begin date
  When I create a project whose end date precedes its begin date
  Then the project is rejected

Scenario: Refusing to narrow the dates under existing content
  Given the project already contains a movement dated on its last day
  When I shorten the project to end a day earlier
  Then the update is rejected because existing elements would fall outside the range
```

Widening the range is always allowed — nothing can fall outside a bigger box.

### Options are the project's feature switches

| Option | Unlocks | Requires |
| ------ | ------- | -------- |
| `VEHICLE` | Vehicles, vehicle presence, drivers on movements | — |
| `ACTIVITY` | Activities, activities as movement reasons | — |
| `COMMUNICATION` | Communications on movements | `ACTIVITY` |
| `ALERT` | Alerts and their communications | `ACTIVITY` and `COMMUNICATION` |

An option that is off makes its feature unreachable **for everyone on the project, including its administrator**. Options are checked *before* permissions, so no role can talk its way past one.

```gherkin
Scenario: Refusing an option whose prerequisites are missing
  When I create a project with the ALERT option but without ACTIVITY and COMMUNICATION
  Then the project is rejected and the missing options are named

Scenario: Denying a feature whose option is off
  Given the project does not have the VEHICLE option
  When its administrator lists the project's vehicles
  Then the request is denied
```

### The creator becomes the administrator

Creating a project also creates a profile: `PROJECT_ADMINISTRATOR`, already `ACCEPTED`, for the creator. If they had no selected profile, this one becomes it, so they land straight inside the project they just made.

```gherkin
Scenario: Creating a project
  Given I am signed in
  When I create a project with a name, a date range and its options
  Then the project is created
  And I hold an accepted PROJECT_ADMINISTRATOR profile on it
  And it becomes my selected profile if I had none
```

## Disabling, deleting, and the difference

Disabling a project is a **graceful shutdown**, not a deletion — and its effect on access is unusually sharp:

| Role on a disabled project | What is left |
| -------------------------- | ------------ |
| `PROJECT_ADMINISTRATOR` | Read, update and delete **the project itself** — nothing inside it, and its options no longer apply |
| Everyone else | Nothing. The project vanishes from their world |

That is exactly enough to re-open the project or delete it for good, and nothing more. Deleting removes the project and everything that hangs off it in one cascade — participants, groups, movements, vehicles, activities, communications, alerts and profiles.

```gherkin
Scenario: Disabling a project
  Given I am its administrator
  When I disable the project
  Then coordinators and participants lose all access to it
  And I retain only the ability to read, re-enable or delete it

Scenario: Re-enabling a project
  Given a disabled project
  When its administrator enables it
  Then every accepted profile regains its usual access

Scenario: Deleting a project
  Given I am its administrator
  When I delete the project
  Then the project and all of its content are permanently removed
```

## Related

- [Roles & Permissions](/registry/functional/roles-and-permissions) — how options gate permissions
- [Project Profiles](/registry/functional/features/project-profiles) — getting other people in
- [Data Retention](/registry/functional/features/data-retention) — how dormant projects are purged
