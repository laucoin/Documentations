# Home Automation

The one capability on Atlas the household actually notices. It controls lighting and switches, senses the home's environment, tracks presence and security, and measures energy use.

## Behaviour rules

1. **The house works when Atlas does not.** Local control must not depend on the internet, the gate, or any other Atlas service. A wall switch works during an outage.
2. **Devices talk over their own radio.** A dedicated coordinator handles the home's low-power devices through a separate bridge, so the radio network keeps running when the automation application restarts.
3. **One identity, no extra password.** This is the third named exception to the gate: because its companion app and inbound webhooks cannot follow a portal redirect, the identity provider is integrated inside the application itself. A household member signs in with the same account they use everywhere else.
4. **A local recovery account exists.** One administrative account authenticates locally, so a failed integration update can never lock the household out of their own home.
5. **Recent history lives here, long history lives in metrics.** The application keeps a short window of detailed history for its own interface; the measurements worth keeping for years are copied into the metrics store, where a year of energy data can be compared against the year before.
6. **Household members control the home, not the platform.** They reach automation and the dashboard, nothing operational.
7. **It carries the alerts.** Notifications from the rest of Atlas are delivered through this application's companion app.

## Scenarios

```gherkin
Feature: Home automation

  Scenario: Local control during an internet outage
    Given the household's internet connection is down
    When a wall switch is pressed
    Then the light responds
    And scheduled automations continue to run

  Scenario: The automation application restarts
    Given the application is restarting
    When it comes back
    Then devices are still paired
    And the radio network did not need to be rebuilt

  Scenario: A household member signs in on a new phone
    Given they have an account and a registered second factor
    When they sign in to the companion app
    Then they authenticate with their single identity
    And they are not asked for a separate password

  Scenario: An integration update breaks sign-in
    Given the identity integration fails after an update
    When the maintainer signs in with the local recovery account
    Then they reach the application and can roll the update back

  Scenario: Energy comparison across years
    Given more than a year of measurements has been collected
    When the maintainer opens the energy dashboard
    Then the same month of the previous year is available
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Control devices | Yes | Yes | No | No |
| View history and energy | Yes | Yes | No | No |
| Change automations and integrations | Yes | No | No | No |
| Use the local recovery account | Yes | No | No | No |

## Accepted risks

- **Sign-in depends on a community-maintained integration.** The alternative was a separate password for every household member, judged worse. The integration is pinned to a reviewed version, and the local recovery account is the fallback.
- **This application is reachable from the internet without the gate in front of it.** It is protected by its own authentication with a second factor, tight rate limiting and failure banning.
