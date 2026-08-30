# Workflows

End-to-end journeys through Atlas, written from the point of view of whoever is living them. Each is expressed as behaviour that can be verified, so that an implementation is either finished or it is not.

## 1. Converging the node

The maintainer has changed something in the repository and wants it applied.

```gherkin
Feature: Applying declared state to the node

  Scenario: Reviewing before applying
    Given the maintainer has committed a change to the repository
    When they run the playbook in check mode
    Then every task that would change the node is listed with its diff
    And nothing on the node has been modified

  Scenario: Applying the change
    Given the maintainer has reviewed the planned diff
    When they run the playbook for real
    Then only the reviewed tasks report a change
    And a service is restarted only if its rendered configuration changed

  Scenario: Proving idempotency
    Given a converge has just completed
    When the maintainer runs the same playbook again immediately
    Then no task reports a change
    And no service is restarted

  Scenario: Converging one service in isolation
    Given the maintainer wants to update only the registry
    When they run the playbook limited to that service's tag
    Then no other service is stopped, restarted or reconfigured
```

## 2. Signing in

A household member opens a service for the first time on a new device.

```gherkin
Feature: Single sign-on with a mandatory second factor

  Scenario: First sign-in on a new device
    Given a household member has an account and a registered second factor
    When they open a gated service
    Then they are redirected to the sign-on portal
    And after providing their password and second factor they reach the service already authenticated
    And they are not asked to sign in again by the service itself

  Scenario: Moving between services
    Given a household member has an active session
    When they open a different gated service
    Then they reach it without any further prompt

  Scenario: Reaching a service they are not permitted to use
    Given a household member has an active session
    When they open an administrative service
    Then they are refused

  Scenario: The gate is unavailable
    Given the sign-on service is not running
    When anyone opens a gated service
    Then the request is refused
    And no gated service is reachable without authentication
```

## 3. Publishing and consuming an image

Continuous integration has built a new image; the maintainer deploys it.

```gherkin
Feature: Container registry

  Scenario: Continuous integration publishes an image
    Given a workflow holds a registry push token
    When it pushes a tagged image
    Then the image is stored
    And no browser-based authentication was required at any point

  Scenario: A stranger pulls a public package
    Given a package is marked public
    When an anonymous client pulls it
    Then the pull succeeds without credentials

  Scenario: A stranger attempts a private package
    Given a package is not marked public
    When an anonymous client pulls it
    Then the pull is refused

  Scenario: Reclaiming space
    Given a package has more than ten tagged versions
    When the weekly cleanup runs
    Then only the ten most recent tags are retained
    And untagged layers are removed
    And no currently deployed image is ever removed
```

## 4. Deploying an application

The maintainer ships a new version of one of their own projects.

```gherkin
Feature: Deploying a hosted application

  Scenario: Promoting a new version
    Given continuous integration has published a new image digest
    When the maintainer updates that application's version in the repository and converges
    Then the application is restarted on the new image
    And no other application is affected

  Scenario: Onboarding a new application
    Given a new application is declared with a name, an image and its needs
    When the maintainer converges
    Then it receives its own database if it asked for one
    And its own storage volume if it asked for one
    And its own object-storage bucket and credential if it asked for one
    And a public HTTPS route under its own subdomain
    And it is placed behind the gate unless it was declared public

  Scenario: A staging application is never public
    Given an application is declared as a staging environment
    When an anonymous visitor opens its address
    Then they are sent to the sign-on portal
```

## 5. Living in the house

A household member interacts with home automation, and the internet is down.

```gherkin
Feature: Home automation

  Scenario: Controlling a light from a phone
    Given a household member is signed in to the companion app
    When they turn on a lamp
    Then the lamp responds

  Scenario: The internet connection is lost
    Given the household's internet connection is down
    When a wall switch is pressed
    Then the light still responds
    And local automations continue to run

  Scenario: Long-term energy history
    Given energy monitoring has been running for more than a year
    When the maintainer opens the energy dashboard
    Then consumption from the same month last year is available for comparison
```

## 6. Being told something is wrong

```gherkin
Feature: Alerting

  Scenario: A volume is filling up
    Given a declared volume passes 85 percent usage
    When the alert rules are next evaluated
    Then the maintainer receives an immediate notification on their phone
    And the notification names the volume and its usage

  Scenario: A public service stops responding
    Given a published service has been failing for more than five minutes
    When the alert rules are next evaluated
    Then the maintainer receives an immediate notification

  Scenario: Something minor happened
    Given a container restarted once and recovered
    When the alert rules are next evaluated
    Then no immediate notification is sent
    And the event appears in the next daily summary

  Scenario: The whole node is down
    Given the node has lost power
    When it fails to respond
    Then no notification is sent, because alerting runs on the node itself
    And the maintainer discovers the outage by other means
```

## 7. Recovering

The disaster the whole design is measured against.

```gherkin
Feature: Recovery

  Scenario: Restoring one service after a bad upgrade
    Given a service has been upgraded and is failing
    When the maintainer pins the previous image version and converges
    Then the service returns to its prior working state
    And its data is untouched

  Scenario: Restoring a database from a snapshot
    Given a database has been corrupted
    When the maintainer restores the most recent nightly snapshot
    Then at most twenty-four hours of data is lost
    And the service starts against the restored database

  Scenario: Rebuilding the node from nothing
    Given the disk has failed and been replaced
    And the maintainer holds the repository decryption key and the backup password
    When they install Debian, prepare the storage layout, converge and restore
    Then every service returns to its declared state
    And data is restored to the last successful backup

  Scenario: The key is lost
    Given the maintainer has lost the backup password
    When they attempt a restore
    Then no data can be recovered
    And this is understood and accepted as the consequence of losing it
```

## 8. Verifying that backups are real

```gherkin
Feature: Backup verification

  Scenario: Nightly protection
    Given the scheduled time has arrived
    When the backup runs
    Then every declared dataset is captured
    And databases are captured as consistent dumps rather than copied files
    And container image layers are excluded

  Scenario: A backup fails
    Given the backup job exits with an error
    When the alert rules are next evaluated
    Then the maintainer receives an immediate notification

  Scenario: Silent corruption
    Given a week has passed
    When the integrity check runs
    Then a portion of the stored data is read back and verified
    And any corruption raises an immediate notification

  Scenario: The quarterly drill
    Given three months have passed since the last drill
    When the maintainer restores one database to a scratch location
    Then it opens and contains the data expected
    And the drill is recorded as completed
```
