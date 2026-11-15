---
title: 'ADR 019 — Asynchronous audit log of access to personal data'
description: 'Why access to personal data is traced in an asynchronous audit log.'
---

# ADR 019 — Asynchronous audit log of access to personal data

## Status

<Badge type="tip" text="Accepted" />

## Context

Registry holds names, dates of birth and the movements of minors. The GDPR and families' trust
require being able to answer "who viewed or exported this person's data?", including for refused
attempts. Classic audit columns (`created_by`, `last_modified_by`) only trace writes, not reads.

## Decision

Add a dedicated audit table and two entry points:

- a **security filter**, placed after authentication, that recognizes reads of personal data
  (users, participants, movements, including their lists, histories and timelines) and records the outcome once the
  response is known: succeeded or denied (`403`);
- **GDPR exports**, traced explicitly, including when they are refused by rate limiting (`429`).

Each event records the action, the resource's type and identifier, the project, the actor, the outcome, the real IP
address (resolved through trusted proxies) and the browser. Never the content read.

Writing is **asynchronous**: a bounded in-memory queue, emptied by a single consumer started and drained with the
application's lifecycle. List reads by the same actor on the same resource are **deduplicated** over a short
window; record reads are always traced. The audit is purged by a dedicated retention sweep.

## Consequences

- **Advantages:** the response never waits for the audit; traceability also covers refusals; the screens' automatic refresh
  does not flood the table.
- **Accepted drawbacks / trade-offs:** a full queue rejects the event (logged) and an abrupt shutdown loses
  pending events; deduplication is specific to each instance. The audit itself contains personal data
  (IP), hence its limited retention period.
- **Rejected alternatives:** synchronous writing in the transaction (latency added to every read, and an audit
  outage would block the application); application logs alone (unstructured, hard to query, retention
  not under control).
