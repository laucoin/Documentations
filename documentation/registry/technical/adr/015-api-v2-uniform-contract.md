---
title: 'ADR 015 — /api/v2: a uniform list, search, sort and error contract'
description: 'Why /api/v2 enforces a uniform list, search, sort and error contract.'
---

# ADR 015 — `/api/v2`: a uniform list, search, sort and error contract

## Status

<Badge type="tip" text="Accepted" />

## Context

`/api/v1` grew feature by feature and applied its conventions unevenly: `pageNumber`/`pageSize` alongside
ad hoc filter names, no general `sort`, state transitions as `PATCH` with some values carried in the path, `impersonate` as the name of
anonymization, each item embedding its whole project, and inputs without upper bounds. With a single first-party client,
the irregularities had been frozen rather than fixed, but they made the frontend's generic list machinery impossible and left security gaps
(unbounded strings and lists).

## Decision

Ship a breaking **`/api/v2`** and remove `v1` entirely; the frontend migrated at the same time. Since there was only one client, version 2 was the opportunity to revisit names (parameters, verbs, fields) to adopt good practices and gain readability, without having to preserve backward compatibility.

- **Lists** share `page`, `size` (1–200), `q` (≤ 100 characters, with a minimum word similarity for text search), `sort`
  (`-` prefix for descending order, ≤ 32 characters) and `isVisible`; date filters are `from`/`to`/`at`; booleans are named `is…` or
  `has…`. Inverted ranges are refused. Pages carry `hasNext`.
- **Verbs.** State transitions are `POST /{id}/disable|enable|block|unblock`; creations answer `201` with `Location`,
  deletions `204`.
- **Errors** are RFC 9457 problem details with a stable `code`, localized.
- **Concurrency.** Single-resource responses carry an `ETag`, updates honor `If-Match` ([ADR 016](/registry/technical/adr/016-optimistic-concurrency-and-row-locks)).
- **Bounded inputs.** Every string, list and identifier has a maximum; request bodies are capped (`413`); redirect URIs
  are restricted to a configured allowlist.
- **Leaner payloads.** Items no longer embed their project; dedicated reader DTOs replace domain models in responses.
- **Removals.** Anonymization/`impersonate` is replaced by plain deletion plus a data export; the stored active profile and
  the project-wide communication list are gone.
- OpenAPI is served as 3.0.

## Consequences

- **Advantages:** a client can implement list handling only once; fewer ways to misuse an endpoint; smaller, safer payloads;
  consistent error handling.
- **Drawbacks / trade-offs:** a "flag day" migration — any third-party `v1` client breaks (there were none). Two lasting irregularities
  deliberately remain: `accept/{accepted}` and `alerts/{id}/status/{status}` still carry a value in the path.
- **Alternatives considered:** keeping `v1` and adding `v2` in parallel (ruled out: a single client, twice the surface to
  secure and test); fixing the conventions endpoint by endpoint in `v1` (a breaking change either way, without a clean cut).
