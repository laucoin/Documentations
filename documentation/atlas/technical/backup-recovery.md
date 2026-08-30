# Backup & Recovery

**Objectives:** lose at most twenty-four hours of data; be running again within a weekend.

## Design

An encrypted, deduplicating backup tool writes nightly into the local object storage over its S3 interface, using a bucket and key reserved for backups that no application ever holds.

| Aspect | Value |
| ------ | ----- |
| Schedule | Nightly, before the quiet hours end |
| Destination | Local object storage; a peer replica once enabled |
| Encryption | At the backup tool, so contents are never readable by the storage layer |
| Retention | Seven daily, four weekly, six monthly |
| Databases | Consistent dumps taken first; never file-level copies of live data |
| Excluded | Registry image layers |

Six monthly snapshots are deliberate. The most common real disaster is not a dead drive but discovering weeks later that something has been quietly wrong, and deduplication makes the extra history nearly free.

## What is captured

| Captured | Excluded, and why |
| -------- | ----------------- |
| Every service database, as a dump | Registry image layers — rebuildable by continuous integration, and hundreds of gigabytes on the same disk buys no resilience |
| Home automation configuration and history | Container images — pinned and re-pullable |
| Identity data, including second-factor registrations | Operating system packages — reproduced by a converge |
| Metrics and provisioned dashboards | |
| Certificates and rendered service configuration | |
| Hosted application data volumes and buckets | |

## Verification

| Check | Frequency | On failure |
| ----- | --------- | ---------- |
| Job outcome | Every run | Immediate notification |
| No success in 48 hours | Continuous | Immediate notification |
| Integrity, reading a portion of stored data back | Weekly | Immediate notification |
| Full restore drill, by hand | Quarterly | Recorded as completed or not |

The quarterly drill is the one step that cannot be automated away, because it is what catches backing up the wrong thing successfully for six months.

## Runbook — restoring one service

1. Stop the affected stack.
2. Identify the snapshot to restore from.
3. Restore that service's data to a scratch location and inspect it before overwriting anything.
4. For a database, restore the dump into a freshly created database rather than over the live one.
5. Move the restored data into place; start the stack; verify through its published address, not just the container's state.

## Runbook — rolling back a bad upgrade

1. Set the previous tag and digest for that service in the repository.
2. Converge with that service's tag only.
3. Verify the service. Data is untouched throughout — only the image changed.

If the upgrade performed a one-way data migration, roll back the data too, using the runbook above.

## Runbook — rebuilding the node

Assumes the drive has been replaced and both recovery secrets are available.

1. Install Debian, conventionally, with SSH access for the maintainer's key.
2. Create the volume group and run the **storage playbook** with its confirmation variable, producing the declared layout on an empty disk.
3. Clone the repository to the workstation and make the age key available there.
4. Converge fully. Every service starts empty and correctly configured.
5. Restore data from the most recent snapshot — from the peer replica, if one exists; otherwise, from whatever survived, which on a failed single drive may be nothing.
6. Verify each service through its published address, then re-register second factors if identity data could not be restored.

**Realistic expectation:** with the peer replica live, this is a weekend. Without it, a drive failure means the backups died with the source, and only what the repository can rebuild returns. This is the gap that makes enabling the peer the highest-value work after the initial build.

## Runbook — the gate is broken

Every gated service is unreachable at once.

1. Connect over SSH.
2. Inspect the sign-on service's logs and recent configuration changes.
3. If a recent image update is the cause, pin the previous version and converge that service.
4. If its data is corrupted, restore its database from the most recent snapshot.
5. If configuration is at fault, correct it in the repository and converge — never by editing on the host, which would be overwritten anyway.

The proxy fails closed throughout, so nothing is exposed while the gate is down.
