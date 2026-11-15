---
title: 'ADR 010 — Retention purges: internal scheduler plus permission-protected endpoints'
description: 'Why retention purges run internally, behind a dedicated permission.'
---

# ADR 010 — Retention purges: internal scheduler plus permission-protected endpoints

## Status

<Badge type="tip" text="Accepted" />

## Context

Registry holds names, dates of birth and the movement history of minors, indefinitely by default. That is a
data protection risk and, for the volume the platform actually needs, it is pointless — a camp
that ended two years ago has no operational value.

The deletion order is not arbitrary. Participants, vehicles and activities refuse to be deleted while a movement
still references them, and alerts refuse to be deleted while they carry communications. Any purge must therefore
run in dependency order, otherwise it achieves nothing.

There is also a real risk of getting it wrong. A retention job is a program whose whole purpose is to delete
production data.

## Decision

Implement retention as **four cron-scheduled sweeps** triggered by a `PurgeScheduler` inside the application, and expose the same
sweeps as authenticated HTTP endpoints under `/api/v2/purge` for manual and dry-run use. The endpoints require the
`REGISTRY_JOB_C` permission, held by a dedicated `SERVICE_ACCOUNT` user and by user administrators.

| Sweep | Deletes | Default schedule |
| --- | --- | --- |
| Users | Accounts with no sign-in since the threshold | 01:00 |
| Projects | Projects not modified since the threshold | 01:30 |
| Content | Movements, communications, alerts | 02:00 |
| Configuration | Vehicles, activities, participants, then groups that became empty | 02:30 |

The users sweep skips accounts whose deletion would violate the last-administrator safeguards (platform or project); it processes users one by one because those checks depend on previous deletions. The content and configuration sweeps each run in a transaction.

The staggering encodes the dependency order: **content before configuration**, so that the movements blocking a
participant's deletion are gone before the configuration sweep runs.

Each endpoint accepts an optional `dateThreshold` that overrides the configured default, and a `dryRun` flag that
**defaults to `true`** — it reports what would be deleted and deletes nothing. The scheduler calls the same services
with `dryRun=false` and the configured threshold. Thresholds default to 12 months and belong to
configuration, not code.

## Rationale and good practices

- **Security:** deletion sits behind a permission no ordinary role holds, on an account that exists only for this. It is
  the only Registry operation that spans all projects, which is precisely why it is protected this way rather than
  run as an unauthenticated internal job.
- **Safe by default:** an accidental call is a dry run. Destruction requires asking for it explicitly.
- **Observability:** each sweep logs every identifier it deletes or would delete, so a run is auditable after the fact.

## Consequences

- **Advantages:** data minimization is automatic and continuous. Thresholds are tunable per environment without a release. The dry
  run makes the policy inspectable before it applies. Reusing HTTP means the same authorization, logging and
  error handling as everything else.
- **Drawbacks / trade-offs:** **purging is irreversible and there is no export before deletion** — data that ages out is
  lost, and a misconfigured threshold destroys live data. The four sweeps are scheduled independently, without orchestration,
  so a slow content sweep may still be running when the configuration one starts, leaving records that refuse to be deleted
  until the next night. Nothing warns a project's owner before their project is purged. In a multi-replica deployment,
  each replica runs its own scheduler, so sweeps run once per replica (they are idempotent, but redundant).
- **Rejected alternatives:** database-level scheduled jobs (no application-level dependency ordering and invisible to the
  audit log); a separate batch application (cleaner isolation, but one more artifact to build, deploy and secure);
  soft delete only (fully reversible, but it does not discharge the data protection obligation, which is what the
  feature exists for).

## Retrospective

- A **fifth sweep** purges the [audit log](/registry/technical/adr/019-personal-data-access-audit) (03:00 by default, 12 months), after the others: the audit itself contains personal data (IP addresses).
- The content and configuration sweeps each run in a single transaction: the first run on an old database can delete a large backlog and hold locks for a long time. The recommended procedure is to measure it first with a dry run, then trigger it by hand outside usage hours.
