# Storage Layout

One 4 TB NVMe drive, divided into logical volumes so that no dataset can starve the host. Isolation here is logical: it contains growth, not drive failure.

## Volumes

Sizes are declared in the repository and are starting points. Growing is safe and online; the volume group deliberately retains a large unallocated reserve so any volume can be extended later.

| Volume | Mount | Size | Holds |
| ------ | ----- | ---- | ----- |
| System | `/` | 20 GB | Debian, packages, the Ansible working copy |
| Logs | `/var/log` | 20 GB | Journal and service logs, rotated — its own volume so a logging burst never eats into `/var` |
| `/var` | `/var` | 15 GB | Everything else conventionally under `/var` (APT cache, mail spool, systemd state) |
| Container runtime | `/var/lib/docker` | 60 GB | Images and layers of running services |
| Application data | `/srv` | 100 GB | Databases, service state, hosted application data — the Linux-conventional location for service data |
| Registry artefacts *(planned, Phase 3)* | `/srv/registry` | ~500 GB | Published image layers; nested under `/srv` but its own volume, since it is the largest and fastest-growing dataset |
| Object storage *(planned, Phase 3)* | `/srv/garage` | ~1 TB | Encrypted backups, application buckets, peer allowance; likewise its own volume nested under `/srv` |
| Swap | — | 4 GB | |
| **Unallocated** | — | **~3.4 TB** | Reserve for growth |

System, `/var` and swap are asserted and grown like every other declared volume, but were not created by Ansible — they already exist from the manual Debian install, at the sizes above. `/srv` replaced an earlier `/var/data` mount that held nothing but `lost+found`; carrying it forward as a plain unmount/remount, not a data migration, since there was nothing to preserve.

The object-storage volume is further divided by quota rather than by volume: roughly 400 GB for Atlas's own backups and application buckets, roughly 600 GB reserved for the peer. Quotas are enforced by the storage service, so neither tenant can consume the other's allowance.

Filesystem is **ext4** everywhere: growable online, well understood, excellent repair tooling, and the Debian default. No disk encryption — on a headless machine it would mean either a passphrase at every boot or a key stored beside the data it protects, and the realistic threat here is remote compromise rather than drive theft.

## Reconciliation rules

These rules are the mechanism behind the promise that a converge never destroys data.

1. **Match by name.** A declared volume is identified by its name. If a volume of that name exists, it is reconciled in place — never recreated.
2. **Create what is missing.** A declared volume with no counterpart is created from free space. Creating something that does not exist cannot destroy anything.
3. **Grow online.** If the declared size exceeds the current size, extend the volume and then the filesystem, without unmounting.
4. **Refuse to shrink.** If the declared size is smaller than the current size, **fail the run with an explicit message**. Shrinking requires an unmount, a check and a filesystem resize, and destroys data if usage exceeds the target. It is almost always a mistyped variable.
5. **Reclaim only the undeclared.** Space held by a volume the repository does not know about may be released to satisfy a declared one. A declared volume is never a candidate.
6. **Assert before acting.** Every run first verifies the expected volume group and the mount table, and stops if the machine is not what the repository believes it to be.
7. **A volume can be carved out of a live one, carefully.** `/var/log` did not always have its own volume — it started as part of `/var`. Splitting it out live, without data loss, follows one sequence: create the new volume and filesystem, `rsync` the current contents across while the source stays in use, briefly stop the log writer for one final delta sync so nothing written during the copy is lost, remount the new volume at the target path, restart the log writer. This is the one place reconciliation touches data that is actively being written, and it is why this step — like every other storage change — lives only in the destructive playbook, run once, watched.

## The destructive playbook

Storage provisioning lives in **its own playbook**, never in the ordinary converge, and cannot be reached by a tag on the main one.

- Running it requires an explicit confirmation variable.
- It is the only place in the repository permitted to remove a volume.
- The everyday playbook only *asserts* that the layout matches, and fails loudly if it does not.

This is what reconciles two things the maintainer asked for that would otherwise conflict: a layout that can be rebuilt to specification, and a converge that can never wipe data.

## Monitoring

Every volume's usage is collected continuously and shown per volume. Crossing eighty-five percent raises an immediate notification naming the volume.

The registry volume is the one most likely to trigger it: image registries grow without bound unless cleaned. Retention keeps the ten most recent tags per package and removes untagged layers weekly, and anything currently deployed is never removed.
