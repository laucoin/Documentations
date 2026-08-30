# Container Registry

The reason Atlas exists. A hosted provider's free storage limits made publishing container images impractical, so Atlas hosts its own registry — while source code deliberately stays where it is.

## Behaviour rules

1. **Images here, code elsewhere.** The registry stores container images. Source code remains on the maintainer's existing hosted provider, and continuous integration continues to run there.
2. **Publishing is automated, consuming is open or authenticated.** Continuous integration pushes with a token it holds as a secret. Packages marked public may be pulled by anyone; everything else requires a token.
3. **One token per consumer.** Continuous integration, the workstation and any other machine each hold their own token, revocable without disturbing the others.
4. **No browser sign-in is ever required.** This endpoint is one of the three named exceptions to the gate, because container tooling cannot complete a portal login.
5. **Storage is capped and cleaned.** Image layers live on their own volume with a hard limit. A weekly cleanup keeps the ten most recent tags of each package and removes untagged layers. Anything currently deployed is never removed.
6. **Egress is watched.** Public packages are served from a home connection, so unusual outbound volume raises an alert.
7. **Repository features stay available but unused.** Git hosting over SSH remains enabled on its own port so a repository can be created later without reconfiguration, but no code is expected there.

## Scenarios

```gherkin
Feature: Registry

  Scenario: Publishing from continuous integration
    Given a workflow holds a push token
    When it pushes an image
    Then the image is stored and immediately available to pull

  Scenario: A revoked token
    Given a consumer's token has been revoked
    When that consumer attempts to pull
    Then the pull is refused
    And every other consumer is unaffected

  Scenario: Anonymous access to a public package
    Given a package is marked public
    When an anonymous client pulls it
    Then it succeeds

  Scenario: Anonymous access to a private package
    Given a package is not marked public
    When an anonymous client pulls it
    Then it is refused

  Scenario: Cleanup preserves what is running
    Given a package has twenty tags and one of the oldest is currently deployed
    When the weekly cleanup runs
    Then the deployed tag is retained

  Scenario: The volume is filling
    Given the registry volume passes eighty-five percent
    Then the maintainer is notified immediately
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Push an image | Yes, by token | No | No | No |
| Pull a private package | Yes, by token | No | Yes, by token | No |
| Pull a public package | Yes | Yes | Yes | Yes |
| Administer the registry | Yes, behind the gate | No | No | No |
| Change cleanup rules | Through the repository only | No | No | No |

## Accepted risks

- **Public packages are served anonymously from a residential connection.** Convenient for sharing, but it is bandwidth anyone can consume. Mitigated by rate limiting and egress alerting, not prevented.
