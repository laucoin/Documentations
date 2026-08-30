# Identity & Single Sign-On

The gate. One identity for every person, one sign-in for every service, and a second factor that is never optional.

## Behaviour rules

1. **One identity per person.** Accounts are declared in the repository. There is no self-service registration and no shared household account.
2. **Two factors, always.** Every human session requires a second factor. A security key or passkey is preferred; a time-based code is the fallback for devices where that is impractical.
3. **Sign in once.** Where an application can accept an external identity provider, it does — so the person arrives already signed in, under their own name, with their permissions applied. Only where that is impossible does the gate merely stand in front of the application.
4. **Permissions are per service.** Each service declares which roles may reach it. This is enforced even though only one person holds the administrative role today.
5. **The gate fails closed.** If it cannot be reached, gated requests are refused. An outage never becomes an exposure.
6. **Failures are throttled and banned.** Repeated failures lock the account temporarily and block the source address.
7. **Email leaves through a relay.** Enrolment and reset messages are sent through an external provider, so delivery does not depend on the node's reputation.
8. **Sessions survive restarts.** A service restart does not sign everybody out.

## The three services that do not use the gate

Named individually so the exception can never quietly widen:

| Service | Why | Instead |
| ------- | --- | ------- |
| [Registry](/atlas/functional/features/registry) | Container tooling cannot complete a browser sign-in | Per-consumer tokens |
| [Code quality](/atlas/functional/features/code-quality), analysis interface only | Unattended automation cannot answer a prompt | Analysis tokens; its human interface still uses the gate |
| [Home automation](/atlas/functional/features/home-automation) | Its companion app and webhooks cannot follow a portal redirect | The identity provider is integrated *inside* the application |

## Scenarios

```gherkin
Feature: Identity

  Scenario: Enrolling a second factor
    Given a new account has been created by a converge
    When the person follows their enrolment link
    Then they register a second factor
    And they cannot reach any service until they have done so

  Scenario: Password without a second factor
    Given a person provides a correct password
    When they do not provide a second factor
    Then they are not signed in

  Scenario: Signing in to an application that accepts the provider
    Given a person signs in at the gate
    When they open such an application
    Then they arrive signed in under their own identity
    And they are not asked for a second set of credentials

  Scenario: Repeated failures
    Given several failed attempts on one account in a short window
    When another attempt is made
    Then it is refused for a defined period

  Scenario: The gate is down
    Given the sign-on service is not running
    When anyone opens a gated service
    Then the request is refused rather than passed through
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Sign in | Yes | Yes | Yes | No |
| Manage own second factor | Yes | Yes | Yes | No |
| Create or remove accounts | Through the repository only | No | No | No |
| Change which roles reach a service | Through the repository only | No | No | No |

## Accepted risks

- **The gate is a single point of failure** for every service behind it. Recovery is over SSH, using the runbook in the technical documentation. Failing open was considered and rejected outright.
