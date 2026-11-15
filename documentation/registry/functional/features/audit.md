---
title: 'Feature: Audit and traceability'
description: 'The trace of access to personal data, log versioning and usage limits.'
---

# Feature: Audit and traceability

> Registry holds names, dates of birth and the movements of minors. It must be able to say, after the fact,
> **who viewed or exported that data, and when** — including when access was denied.

**Who it is for:** no one day to day. The audit runs in the background, without a screen; it serves to answer a request from a data subject, a compliance check or an incident analysis.

## What is traced

- **Every access to personal data**: viewing the records and lists of users, participants (including birthdays, histories and presence timelines) and check-ins/check-outs.
- **Every GDPR export** of a user or a participant.
- **Refusals**: an access denied for lack of rights, and an export refused because the rate limit was reached.

Each trace records the action (read or export), the resource, the project, the user who made the request, the outcome (succeeded, denied, rate-limited), the IP address and the browser, and the date. **The viewed content is never copied** into the audit: only the fact that it was viewed.

To avoid flooding the audit with the screens' automatic refresh, repeated views of the same **list** by the same user are traced only once per minute. Viewing an individual **record** is always traced.

## What is versioned

Independently of the audit, _log_-type items — **check-ins/check-outs, alerts, communications** — keep all their versions: before each change (or an alert's status change), the previous state is archived. Correcting an entry never makes what had been recorded disappear.

## Usage limits

| Action                                       | Default limit              |
| -------------------------------------------- | -------------------------- |
| GDPR exports (user or participant, combined) | 5 per hour and per user    |
| Searching for a user to invite               | 30 per minute and per user |
| Project creation                             | 10 per hour and per user   |

Beyond that, the request is refused with a message suggesting to try again later; for an export, the refusal is itself traced.

## Retention period

The audit itself contains personal data (IP addresses). It is therefore purged every night beyond 12 months by default (see [Data retention](/registry/functional/features/data-retention)).
