---
title: 'ADR 016 — Optimistic concurrency with ETag/If-Match, backed by row locks'
description: 'Why concurrent edits are protected by ETag/If-Match and row locks.'
---

# ADR 016 — Optimistic concurrency with `ETag`/`If-Match`, backed by row locks

## Status

<Badge type="tip" text="Accepted" />

## Context

Several people edit the same event at the same time: coordinators correct movements while administrators change groups.
Two failure modes appeared: a late save that silently overwrites an earlier one, and invariants checked then applied
in two steps ("not the last administrator", "not the last group member", a participant's effective dates) that
two concurrent requests could both get past.

## Decision

- **Detect stale writes.** Single-resource reads, updates and transitions return an `ETag` derived from the resource's
  `lastEdition` instant. An update that sends `If-Match` is only applied if the tag still matches; otherwise the response is
  `412 RESOURCE_MODIFIED_SINCE_READ`. Omitting the header (or sending `*`) skips the check, so simple clients keep working.
  The frontend sends it from the item being edited.
- **Make the check safe.** `ConcurrencyService` locks the resource's row _before_ comparing, so that the comparison and the
  update cannot interleave.
- **Protect invariants.** The rows an invariant depends on — level-0 project profiles, users, groups, and the
  participants whose effective dates are recomputed by a movement — are locked in the same transaction before the check.
- **Bound the wait.** The R2DBC connection sets `lock_timeout` (`registry.datasource.lock-timeout-ms`, 5 s by default); a lock conflict answers
  `409 CONCURRENT_UPDATE_CONFLICT` instead of hanging.

## Consequences

- **Advantages:** no more silently lost updates; the last-administrator and last-member rules hold under concurrency; failures are explicit
  and translatable.
- **Drawbacks / trade-offs:** `If-Match` is optional, so a client that omits it still overwrites. Row locks serialize writers on
  hot rows, and the timeout turns contention into `409`s that clients must handle. The `ETag`'s granularity is the millisecond of
  `lastEdition`.
- **Alternatives considered:** a numeric version column (more robust, but a schema change on every table and a new field in
  every payload); pessimistic edit locks held by the user (poorly suited to a stateless API and abandoned sessions); relying on
  transactions alone (does not detect an overwrite between two separate requests).

::: info Update
A group can now be empty: the "last group member" rule mentioned above has been removed. Groups stay
locked while their members are changed, so that two concurrent additions or removals do not overwrite each other. The
last-administrator rule and the participant effective-date rules are unchanged.
:::
