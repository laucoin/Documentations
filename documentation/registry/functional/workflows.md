# Workflows

These are the end-to-end journeys Registry exists to support, each expressed as a **Gherkin scenario spanning multiple features** — unlike the scenarios under [Features](/registry/functional/features/projects), which each test one rule of one feature in isolation, these trace a full actor journey the way an end-to-end test would. Where a step depends on a permission, the [Roles & Permissions](/registry/functional/roles-and-permissions) matrix governs it.

## W1 — Signing in for the first time

*One login screen, no Registry-specific password, and zero manual account creation.*

```gherkin
Scenario: A new user signs in for the first time and lands on an empty project list
  Given I have never signed in to Registry before
  When I authenticate through the central identity provider and am redirected back
  Then my account is created automatically with the default USER role
  And I land on my project list, which is empty
  And I am prompted to create a project or check my invitations
```

## W2 — Creating and configuring an event

*Getting from "I need to run an event" to "I'm administering it" takes one form and no approval.*

```gherkin
Scenario: A signed-in user creates a project and starts administering it
  Given I am a signed-in user
  When I create a project named "Summer Gathering 2026" (dates are optional; I set them here)
  And I enable the ACTIVITY and COMMUNICATION options together, respecting their dependency
  Then the project is created
  And I am granted a PROJECT_ADMINISTRATOR profile on it
  And I land directly inside the event I just created
```

## W3 — Inviting staff

*The organizer delegates precisely — the right people, the right power, only for the right dates.*

```gherkin
Scenario: An administrator invites staff with a role and an optional access window
  Given I am the PROJECT_ADMINISTRATOR of a project
  When I invite users "alice" and "bob" as PROJECT_COORDINATOR
  And I set an access window narrower than the project's own — a profile's dates are independent of the project's
  Then an INVITED profile is created for each, with no permission yet
  When "alice" accepts her invitation
  Then she gains the PROJECT_COORDINATOR role and can select this project as her active one
```

## W4 — Registering participants and organizing groups

*The roster is set up once, and groups make every later headcount and movement faster.*

```gherkin
Scenario: Participants without their own dates inherit their group's availability
  Given I am a PROJECT_COORDINATOR on a project
  When I register participants "Ana", "Ben" and "Cora" with no availability window of their own
  And I create a group "Tent 1" containing all three, with its own availability window
  Then each participant's availability falls back to Tent 1's window
  When I later select the group "Tent 1" in a movement
  Then it expands to its current members
```

## W5 — Recording a movement (the core loop)

*This is the action the whole product is built around — it must be quick, and it must keep the live count honest.*

```gherkin
Scenario: A registered participant leaves and must be justified
  Given I am signed in with movement-create permission on the project
  And a registered participant "Alex" is currently IN
  When I record an OUT movement for "Alex"
  Then I must provide either a reason or a linked activity to justify it
  And, if the VEHICLE option is enabled, I may attach a vehicle and its driver
  And on save, the dashboard headcount updates immediately
```

```gherkin
Scenario: A registered participant returns to their normal state with nothing to justify
  Given a registered participant "Alex" is currently OUT
  When I record an IN movement for "Alex"
  Then there is no reason or activity field to fill in — the movement simply restores their normal presence
  And on save, "Alex" is counted as present again
```

*Recording a movement in the same direction as the current state is not blocking — it's allowed, it just doesn't change anything: an `OUT` for someone already `OUT`, or an `IN` for someone already `IN`, is accepted the same as any other movement.*

## W6 — Checking a guest in and out

*Visitors are counted without being enrolled as full participants, so the "who is on site" number is always complete.*

```gherkin
Scenario: A guest arrives and later leaves for good
  Given no guest named "Sam Doe" exists yet
  When I record an IN movement of content type GUEST, entering "Sam Doe"'s name and birthday, justified by reason VISIT
  Then "Sam Doe" is created and counted as present
  When I later record an OUT movement referencing "Sam Doe", with nothing to justify it
  Then "Sam Doe" is counted as off-site — definitively, since a guest's departure is always final
```

## W7 — Watching the live picture

*A single screen answers "who is here right now, and is anything wrong?"*

```gherkin
Scenario: Anyone on the project reads the live dashboard
  Given I hold any of the three project roles
  When I open the project's home page
  Then I see present vs absent participants, split registered/guest and majors/minors
  And, if VEHICLE is enabled, vehicle presence
  And today's birthdays
  And, if ALERT is enabled, a banner of alerts currently in progress
  And I can reverse a mistaken check-in/out in one click from the in-progress movements list
```

## W8 — Raising and resolving an alert

*Incidents get a visible owner, a clock, and a paper trail instead of being lost in chat.*

```gherkin
Scenario: An incident is escalated from a discussion and resolved
  Given the ALERT option is enabled and a movement's discussion thread contains a message about a problem
  When I escalate that message into an alert titled "Missing participant at checkpoint"
  Then the alert appears IN_PROGRESS, with a running "since" timer and its own communication thread
  When the team discusses it there and any of the three project roles marks it RESOLVED — resolving isn't reserved to the coordinator or administrator
  Then the timer stops
```

## W9 — Administering users (platform)

*Account hygiene and data-protection obligations are handled with safe, auditable, reversible-where-appropriate controls.*

```gherkin
Scenario: Platform staff manage the account directory
  Given I am a global USER_ADMINISTRATOR
  When I change a user's global role, block a departed account, or anonymize one on a data-deletion request
  Then the action succeeds
  But an attempt to remove or demote the last platform administrator is refused
  And a blocked or anonymized user can no longer sign in
```

## W10 — Personal preferences

*The tool adapts to the person, and their context travels with their account rather than their browser.*

```gherkin
Scenario: A user adapts Registry to themselves
  Given I am any signed-in user
  When I open Settings and switch my language and theme
  Then the choice is saved to my account and follows me to any device
  When I switch my active project profile, or leave a project I no longer help with
  Then that choice takes effect immediately
```
