# Backup & Recovery

What is protected, how often, and what it takes to bring it back. The target is plain: **lose no more than a day, and be running again within a weekend.**

## Behaviour rules

1. **Nightly, encrypted, deduplicated.** One scheduled run each night writes an encrypted snapshot into [object storage](/atlas/functional/features/object-storage). Only changed data is stored.
2. **Databases are dumped, never copied.** A file-level copy of a running database is not a backup. Each database produces a consistent dump first.
3. **Image layers are excluded.** Published container images are rebuildable by continuous integration. Backing up hundreds of gigabytes of derived artefacts onto the same disk buys nothing.
4. **History is kept in depth.** Seven daily, four weekly and six monthly snapshots. The six months matter: the most common disaster is not hardware failure but noticing weeks later that something has been quietly wrong.
5. **Failure is loud.** A backup that fails, or has not succeeded in forty-eight hours, raises an immediate notification.
6. **Integrity is verified weekly**, by reading a portion of the stored data back and checking it, so silent corruption is found before it is needed.
7. **A restore is rehearsed quarterly.** The maintainer restores one database to a scratch location and confirms it opens. An untested backup is a hypothesis.
8. **Two secrets are everything.** The repository decryption key and the backup password. Without them nothing can be recovered, and no amount of stored data changes that.

## What is protected

| Protected | Not protected |
| --------- | ------------- |
| Every database, as a consistent dump | Published container image layers |
| Home automation configuration and history | Container images of running services |
| Identity data, including second-factor registrations | Anything reproducible by a converge |
| Metrics and dashboards | Operating system packages |
| Certificates and service configuration | |
| Hosted application data and buckets | |

## Scenarios

```gherkin
Feature: Backup

  Scenario: The nightly run
    When the scheduled backup runs
    Then every protected dataset is captured
    And each database is captured as a consistent dump
    And image layers are excluded

  Scenario: A failed run
    Given the backup exits with an error
    Then the maintainer is notified immediately

  Scenario: Silence
    Given no backup has succeeded for forty-eight hours
    Then the maintainer is notified immediately

  Scenario: Corruption in stored data
    Given the weekly integrity check finds damaged data
    Then the maintainer is notified immediately

  Scenario: Restoring one database
    Given a database is corrupted
    When the maintainer restores the most recent snapshot
    Then at most twenty-four hours of data is lost
    And the service starts against the restored data

  Scenario: Rebuilding from nothing
    Given the drive has failed and been replaced
    And the maintainer holds both secrets
    When they reinstall, prepare storage, converge and restore
    Then every service returns to its declared state

  Scenario: Both secrets are lost
    Given the maintainer cannot produce the backup password
    Then no data can be recovered, and this is accepted
```

## Permissions

| Action | `admin` | Everyone else |
| ------ | ------- | ------------- |
| Run or restore a backup | Yes | No |
| Change schedule or retention | Through the repository only | No |
| Hold the backup password | Yes | No |

## Accepted risks

- **Backups sit on the same drive as their source** until the peer replica is enabled.
- **Both recovery secrets live in one password manager.** An offline copy was offered and declined. Losing access to that manager means losing the ability to restore.
