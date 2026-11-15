---
title: 'Feature: Data retention'
description: 'The five nightly purges that delete data beyond its retention period.'
---

# Feature: Data retention

> Registry holds names, dates of birth and the movements of minors. Keeping that indefinitely is not
> caution, it is a risk. So every night, five sweeps ask the same question — _is there anything here
> older than what we agreed to keep?_ — and delete what is stale.

**Who it is for:** no one, in the usual sense. It is the only feature whose operator is a scheduled job
rather than a person. The nightly runs are triggered by a scheduler inside the application;
the same sweeps can also be run by hand.

## Who can do what

| Role                         | Can do                                      | Limits                            |
| ---------------------------- | ------------------------------------------- | --------------------------------- |
| The **scheduler** (internal) | Runs the five sweeps every night            | Real purges, configured threshold |
| The **service account**      | Triggers any of the five sweeps on demand   | The account exists only for this  |
| `USER_ADMINISTRATOR`         | The same, since it holds the job permission | Useful to run a dry run on demand |
| Everyone else                | Nothing                                     | —                                 |

Purging is a global operation. It is the only thing in Registry that crosses all projects at once, and that is
precisely why it sits behind a permission no one holds by accident.

## Five sweeps, in a deliberate order

| Sweep                     | Deletes                                                           | Default schedule | Default threshold |
| ------------------------- | ----------------------------------------------------------------- | ---------------- | ----------------- |
| **Users**                 | Accounts with no sign-in since the threshold                      | 01:00 every day  | 12 months         |
| **Projects**              | Projects not modified since the threshold                         | 01:30 every day  | 12 months         |
| **Project content**       | Movements, communications and alerts                              | 02:00 every day  | 12 months         |
| **Project configuration** | Vehicles, activities, participants, then groups that became empty | 02:30 every day  | 12 months         |
| **Audit**                 | Events of the [audit log](/registry/functional/features/audit)    | 03:00 every day  | 12 months         |

The half-hour gaps are not decorative — the order matters:

**The audit is purged last**, because it itself contains personal data (IP addresses) and must cover the night's purges.

**Content is purged before configuration**, because participants, vehicles and activities all refuse to be
deleted while a movement references them. Delete the movements first and the configuration becomes deletable;
do the reverse and the configuration sweep achieves nothing.

Within the content sweep, the same logic applies: communications whose movement and alert are both
gone are deleted as **orphans**, and alerts that still carry communications are
protected until those communications are erased.

## Dry run first

Each sweep takes a **dry run** flag, enabled **by default**. A dry run reports
exactly which records would be deleted and touches nothing.

That default is the key point: an accidental call does no damage. Deleting requires asking for it deliberately.

Each sweep also accepts an explicit **date threshold**, which overrides the configured default — useful for a
one-off deeper cleanup, or to ask "what would a six-month policy delete?" without committing to it.

## What "dormant" means

Each sweep has its own definition, and they are not interchangeable:

| Sweep         | Considered dormant when                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| Users         | The account's **last sign-in** is older than the threshold                    |
| Projects      | The project has not been **modified** since the threshold                     |
| Content       | The movement, communication or alert is older than the threshold              |
| Configuration | The item has been **unused** since the threshold — no movement, no membership |
| Audit         | The event is older than the threshold                                         |

An account that signs in every month is never purged, however old it is. A project touched last week
survives whatever its creation date. Retention here measures **activity**, not age.

## What survives a purge

- **The last administrator** of the platform or of a project is never deleted by the users sweep.
- **Groups that still have members** are not deleted by the configuration sweep: only empty groups **not modified since the retention threshold** are. A group created empty, or emptied recently, is therefore kept.
- **The _log_ history** follows its item: it disappears with the purged movement, alert or communication.

::: warning First purge on an existing database
The content and configuration sweeps each run in one go: the first run can delete a large backlog. Measure it first with a dry run, then run it by hand outside usage hours.
:::

## See also

- [Users](/registry/functional/features/users) — deletion and export, the other half of data protection
- [Audit and traceability](/registry/functional/features/audit) — the trace of access to personal data
- [Projects](/registry/functional/features/projects) — disabling and deleting a project by hand
