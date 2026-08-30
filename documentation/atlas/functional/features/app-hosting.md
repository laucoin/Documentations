# Application Hosting

Atlas is not only infrastructure — it runs the maintainer's own projects. This is what the [registry](/atlas/functional/features/registry) exists to feed.

## Behaviour rules

1. **An application is just another declared service.** It is described in the repository like anything else: a name, an image version, and what it needs.
2. **Four things can be requested.** A private database, a public HTTPS route, protection by the gate, and persistent storage or an object-storage bucket. An application takes only what it declares.
3. **Deployment is deliberate.** Continuous integration builds and publishes an image; the maintainer updates its version in the repository and converges. There is no automated path from a merge into production, and none is wanted.
4. **One instance per application.** An application is either a production deployment or a staging deployment of one of the maintainer's projects — never both at once, and never two copies of the same thing.
5. **Staging is never public.** An application declared as staging is always behind the gate, whatever else it declares.
6. **Isolation is per application.** Each has its own identity, its own private network with its own database, its own storage. One application cannot reach another's data.
7. **Its data is protected like any other.** Databases, volumes and buckets are included in the nightly backup automatically, without per-application work.

## Scenarios

```gherkin
Feature: Application hosting

  Scenario: Onboarding
    Given a new application is declared with a database, storage and gate protection
    When the maintainer converges
    Then it is reachable at its own address over HTTPS
    And it has its own database on a private network
    And it has its own storage volume
    And unauthenticated visitors are sent to the sign-on portal

  Scenario: Promoting a version
    Given a new image digest has been published
    When the maintainer updates the version and converges with that application's tag
    Then only that application is restarted

  Scenario: A staging application
    Given an application is declared as staging
    When an anonymous visitor opens its address
    Then they are sent to the sign-on portal

  Scenario: A public application
    Given an application is declared public
    When an anonymous visitor opens its address
    Then they reach it without signing in

  Scenario: One application cannot reach another
    Given two applications each have their own database
    When one attempts to reach the other's database
    Then the connection is refused

  Scenario: Backups without extra work
    Given an application has a database and a bucket
    When the nightly backup runs
    Then both are captured without any application-specific configuration
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Declare or remove an application | Through the repository only | No | No | No |
| Deploy a new version | Yes | No | No | No |
| Use a household-facing application | Yes | Yes | No | No |
| Use a public application | Yes | Yes | Yes | Yes |
| Use a staging application | Yes | No | No | No |
