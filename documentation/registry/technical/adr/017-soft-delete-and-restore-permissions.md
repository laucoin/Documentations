---
title: 'ADR 017 — Dedicated permissions for soft delete and restore'
description: 'Why soft delete and restore have their own permissions.'
---

# ADR 017 — Dedicated permissions for soft delete and restore

## Status

<Badge type="tip" text="Accepted" />

## Context

Until now, each resource had only four permissions (create, read, update, delete). Soft delete was
tied to "update", and restore — as well as the right to **see** deleted items — to "delete"
([ADR 005](/registry/technical/adr/005-db-driven-project-rbac)). This shortcut caused two problems:

- to let the coordinator restore an item, they also had to be given **permanent** deletion;
- to prevent a participant from deleting, update had to be taken away from them.

Yet the functional reference distinguishes three actions with different audiences: delete (everyone), restore and see
deleted items (administrator and coordinator), permanently delete (administrator only).

## Decision

Add, for each resource and for users, two explicit permissions: `…_SOFT_DELETE` (hide, block) and
`…_RESTORE` (show again, unblock). The `…_D` permission now only means permanent deletion.

- The hide/block endpoints require `…_SOFT_DELETE`; the show/unblock ones require `…_RESTORE`.
- `…_RESTORE` is also the **visibility key**: only its holders can list or read deleted items; for
  everyone else, the visibility filter is forced to "visible".
- The project and profiles remain reserved for the administrator; vehicles and activities do not concern the participant, who
  has no access to them.

## Consequences

- **Advantages:** the technical matrix mirrors the functional matrix exactly; each action can be granted without
  bringing the others along; the coordinator restores without being able to destroy.
- **Drawbacks:** two more permissions per resource to keep aligned between the injected data, the constants
  and the access rules (automated tests check this alignment).
- **Rejected alternative:** a minimum role level per action ("restore if level ≤ 10") — shorter, but it
  reintroduces hard-coded logic where the model is data-driven.
