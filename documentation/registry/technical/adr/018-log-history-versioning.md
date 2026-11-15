---
title: 'ADR 018 — Versioned history of log-type items'
description: 'Why check-ins/check-outs, alerts and communications keep all their versions.'
---

# ADR 018 — Versioned history of _log_-type items

## Status

<Badge type="tip" text="Accepted" />

## Context

Check-ins/check-outs, alerts and communications are not mere records: they are **traces** of real
events, consulted after the fact when an incident occurs. Correcting them (wrong time, wrong participant, typo) used to overwrite
the original value, so it was no longer possible to know what had been entered at the time.

A first idea — disabling the item and creating a new one on each change — changed the item's
identifier, broke the links (communications attached to a movement, alerts) and cluttered the lists.

## Decision

Keep the item in place and **archive its previous state** in a dedicated history table before each change:
one table per type (movements and their content, alerts, communications), with an increasing version number per item and
the archiving date.

- Archiving happens in the same transaction as the change, under a row lock: no version is lost in case of
  concurrent changes.
- For an alert, only the status change (resolved, canceled) modifies it, and it is archived; its title and timestamp never change after creation.
- A definitive departure and a guest check-out were first **immutable**, because the effective presence dates
  depend on them. Since the history makes any correction traceable, they can now be corrected: a registered participant's definitive
  departure like any movement, a guest check-out on its date only; the effective dates are recomputed and
  a definitive departure can never precede another movement of the same participants.
- An edit cannot change a movement's direction (check-in/check-out) or content type (registered/guests).

## Consequences

- **Advantages:** the identifier and links stay stable; every earlier version is kept; the trace is
  usable in case of dispute.
- **Drawbacks:** histories grow with corrections; they follow the item (cascading deletion) and
  therefore the retention purges. There is no version browsing screen yet.
- **Rejected alternatives:** a JSON history column in each row (hard to query and purge); a
  generic database-level change data capture mechanism (invisible to the application, heavier to operate).
