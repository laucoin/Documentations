# Storage Isolation

Atlas runs on a single four-terabyte drive. Isolation is therefore **logical, not physical**: it cannot survive a disk failure, and it is not meant to. Its purpose is narrower and still valuable — no single dataset may grow until it takes down the host.

## Behaviour rules

1. **Each concern gets its own volume.** The operating system, system logs, container storage, application data, container image layers and object storage are separate logical volumes with their own size limits.
2. **A volume that fills affects only itself.** A log burst, a runaway registry or an unbounded database fills its own volume and stops there. The root filesystem cannot be starved by any of them.
3. **Declared volumes are never destroyed.** A volume named in the repository is reconciled in place. If it already exists, it is kept and its data is preserved.
4. **Growth is automatic; shrinking is refused.** A volume whose declared size is larger than its current size is extended without interruption. A declared size smaller than the current one stops the converge with an explicit error rather than risking data.
5. **Only undeclared volumes may be reclaimed.** Space held by a volume that the repository does not know about may be recovered to satisfy a declared one.
6. **Storage changes are never routine.** They live in a separate playbook that must be invoked deliberately and cannot run as part of a normal converge.
7. **Usage is watched.** Every volume is measured continuously, and passing eighty-five percent raises an immediate notification.

## Allocation

| Volume | Purpose | Notes |
| ------ | ------- | ----- |
| System | The operating system | Deliberately small; nothing else may write here |
| Logs | System and service logs | Capped and rotated, so a logging loop cannot spread |
| Container runtime | Images and layers of running services | Separate from the registry's stored artefacts |
| Application data | Databases, service state, hosted application data | The dataset that matters most for backups |
| Registry artefacts | Published container image layers | The largest and fastest-growing volume; cleanup is enforced |
| Object storage | Encrypted backups, application buckets, the peer's allowance | Split by quota between Atlas and the peer |
| Free space | Unallocated | Held back deliberately so any volume can grow later |

## Scenarios

```gherkin
Feature: Storage isolation

  Scenario: A service floods its logs
    Given a service begins writing logs without limit
    When its log volume reaches capacity
    Then the root filesystem still has free space
    And every other service continues to run

  Scenario: A declared volume already exists
    Given a data volume from a previous installation exists with its data
    When the maintainer converges
    Then the volume is kept
    And its contents are unchanged

  Scenario: A volume needs to be larger
    Given a declared size is raised in the repository
    When the maintainer converges
    Then the volume is extended without unmounting it
    And no data is lost

  Scenario: A volume would have to shrink
    Given a declared size is lowered below the current size
    When the maintainer converges
    Then the converge stops with an explicit error
    And nothing is modified

  Scenario: A volume is filling up
    Given a volume passes eighty-five percent usage
    Then the maintainer is notified immediately, naming the volume
```

## Permissions

| Action | `admin` | Everyone else |
| ------ | ------- | ------------- |
| View volume usage | Yes | No |
| Change declared sizes | Through the repository only | No |
| Run the storage playbook | Yes, deliberately | No |

## Accepted risks

- **One disk means no redundancy.** A drive failure loses every volume simultaneously, including the backups stored on it. This is the largest open risk in Atlas and is closed only when the [peer replica](/atlas/functional/features/object-storage) is enabled.
