# ADR 011 — Retention purges as scheduled, permission-gated endpoints

## Status

Accepted

## Context

Registry holds names, birthdays and the movement history of minors, indefinitely by default. That is a data-protection
liability and, for the volume the platform actually needs, unnecessary — a camp that ended two years ago has no
operational value.

The deletion order is not arbitrary. Participants, vehicles and activities refuse deletion while a movement still
references them, and alerts refuse deletion while they carry communications. Any purge must therefore run in dependency
order or achieve nothing.

There is also a real risk of getting it wrong. A retention job is a program whose entire purpose is deleting production
data.

## Decision

Implement retention as **four cron-scheduled sweeps invoked through authenticated HTTP endpoints** under
`/api/v1/purge`, each requiring the `REGISTRY_JOB_C` permission, held by a dedicated `SERVICE_ACCOUNT` user.

| Sweep         | Removes                                      | Default schedule |
|---------------|----------------------------------------------|------------------|
| Users         | Accounts with no sign-in since the threshold | 01:00            |
| Projects      | Projects not modified since the threshold    | 01:30            |
| Content       | Movements, communications, alerts            | 02:00            |
| Configuration | Vehicles, activities, groups, participants   | 02:30            |

The staggering encodes the dependency order: **content before configuration**, so the movements blocking a participant's
deletion are gone before the configuration sweep runs.

Every endpoint accepts an optional `dateThreshold` overriding the configured default, and a `dryRun` flag that
**defaults to `true`** — it reports what would be removed and deletes nothing. Thresholds default to 12 months and are
configuration, not code.

`dateThreshold` may only move the window **backwards**. A threshold in the future makes every record older than it,
so a single call would empty the table; it is rejected with `PURGE_DATE_THRESHOLD_IN_FUTURE`. A past threshold more
recent than the configured default stays allowed — purging more aggressively than the retention policy is a
legitimate operational choice, and only the future date is always a mistake.

### Running the scheduler

The in-process scheduler is **opt-in**: `registry.feature.purge.scheduler.enabled` defaults to `false`, and the
sweeps then run only when something calls the endpoints — an external scheduler authenticating as the service
account, for instance. Enabling the flag restores the cron-driven behaviour described above.

When it is enabled, each sweep takes a PostgreSQL advisory lock before doing any work and gives up its turn if
another instance holds it. This closes the multi-replica hazard listed under *Cons* below: without it, every
replica ran its own copy of every sweep, at the same cron minute, deleting the same rows concurrently.

## Rationale & best practices

- **Security:** deletion is behind a permission no ordinary role holds, on an account that exists for nothing else. It
  is the only operation in Registry that crosses every project, which is precisely why it is gated this way rather than
  run as an unauthenticated internal task.
- **Safe by default:** an accidental call is a dry run. Destruction requires explicitly asking for it.
- **Observability:** every sweep logs each identifier it removes or would remove, so a run is auditable after the fact.

## Consequences

- **Pros:** data minimisation is automatic and continuous. Thresholds are tunable per environment without a release. The
  dry run makes the policy inspectable before it is applied. Reusing HTTP means the same authorisation, logging and
  error handling as everything else.
- **Cons / trade-offs:** **the purge is irreversible and there is no export before deletion** — data that ages out is
  gone, and a badly set threshold destroys live data. The four sweeps are independently scheduled with no orchestration,
  so a slow content sweep can still be running when the configuration sweep starts, leaving records that refuse deletion
  until the next night. Nothing warns a project owner before their project is purged.
- **Alternatives rejected:** database-level scheduled jobs (no application-level dependency ordering and invisible to
  the audit log); a separate batch application (cleaner isolation, another artefact to build, deploy and secure);
  soft-delete only (fully reversible, but it does not discharge the data-protection obligation, which is what the
  feature exists for).
