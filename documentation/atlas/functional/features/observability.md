# Observability

Knowing what the node is doing, and being told when it stops. Sized for one person who will read a notification on their phone and nothing more.

## Behaviour rules

1. **Four things are watched.** The health of the host, the behaviour of each container, the content of the logs, and whether each published address actually answers from the outside.
2. **Probing goes through the front door.** Endpoint checks traverse the full path — proxy, gate and application — so a working process behind a broken route is still reported as broken. Certificate expiry is checked with them.
3. **Two tiers of alert, and only two.** Immediate notification for a host down, a volume above eighty-five percent, a failed backup, a certificate expiring within seven days, a published service failing for more than five minutes, or repeated authentication failures. Everything else waits for a daily summary.
4. **Alerts arrive where they will be seen.** Notifications are delivered to the maintainer's phone through the home automation companion app.
5. **Everything is declared.** Dashboards, data sources and alert rules are files in the repository. Changes made through the interface are drift and will be replaced on the next converge.
6. **Metrics for a year, logs for a month.** Long enough to compare a season against the one before; long enough to investigate anything worth investigating.
7. **Noise is a defect.** An alert that fires without requiring action is treated as a bug in the rule, not as background.

## Scenarios

```gherkin
Feature: Observability

  Scenario: A service process is running but its route is broken
    Given a service's container is healthy
    And its published address returns an error
    When the endpoint check runs
    Then the service is reported as failing

  Scenario: A volume crosses the threshold
    Given a volume passes eighty-five percent usage
    Then an immediate notification is sent naming the volume

  Scenario: A container restarts once
    Given a container restarted and recovered
    Then no immediate notification is sent
    And the event appears in the daily summary

  Scenario: A dashboard is edited in the interface
    Given someone changes a dashboard through the interface
    When the maintainer next converges
    Then the declared version is restored

  Scenario: The node loses power
    Given the node is unreachable
    Then no notification is sent, because the alerting stack ran on that node
```

## Permissions

| Action | `admin` | Everyone else |
| ------ | ------- | ------------- |
| View dashboards | Yes, behind the gate | No |
| Receive alerts | Yes | No |
| Change dashboards or rules | Through the repository only | No |

## Accepted risks

- **Self-hosted monitoring cannot report its own death.** A total host failure is silent. An external watchdog was offered and declined; the outage is discovered by noticing something does not work.
