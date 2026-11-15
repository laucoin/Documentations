---
title: 'ADR 005 — Database-driven per-project RBAC'
description: 'Why roles and permissions are data in the database, enforced per project.'
---

# ADR 005 — Database-driven per-project RBAC

## Status

<Badge type="tip" text="Accepted" />

## Context

The registry is multi-tenant: users act inside **projects**, and a user's rights in one project say nothing about their rights in another. Authorization has two planes — **global** (platform-wide) and **per project** (inside a project).

Authentication is delegated ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)); the provider proves identity but does not model this application's project roles.

## Decision

Model roles and permissions as **database data** — real linked rows — and enforce them with Spring method security and a custom `PermissionEvaluator`.

### The data model is the heart of it

Each of the two planes is three tables (permission name catalog, roles with a numeric `level`, role → permission mapping). Roles are **first-class entities that other rows attach to**:

- a **user** references a global **role**;
- a **project profile** references a project **role**, and belongs to both a **user** and a **project**.

Making the role an entity rather than a string on the user (or a token claim) means that membership, level ordering and the safeguards built on them (the last-permanent-administrator rule, role-ceiling checks) are plain foreign-key relationships. It also makes **data migration simple**: renaming a role, adding a permission or changing what a role grants is a Flyway migration against these tables — existing profiles keep pointing to the same role rows, and no code changes.

### Enforcement

- The rows are injected by Flyway migrations and loaded into an **in-memory map at startup**.
- The granted authorities are plain strings, computed at **token conversion** (the same converter as [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)):
  - global permission names (for example `REGISTRY_USER_R`);
  - per-project authorities namespaced **`{projectId}_{PERMISSION}`**;
  - per-project option authorities `{projectId}_REGISTRY_PROJECT_OPTION_{X}`.
- `@PreAuthorize` on the controllers' contract interfaces:
  - `hasAuthority('X')` — a global check;
  - `hasPermission(#projectId, 'X')` — routes to the custom `PermissionEvaluator`, which checks whether the user holds the `{projectId}_X` string.
- **Visibility filtering:** for a disabled (invisible) project, non-administrators receive no project authority; administrators keep only read/update/delete of the project.
- **Hidden items:** inside a visible project, listing and restoring deleted items requires a dedicated restore permission; other callers are narrowed to visible items only. See [ADR 017](/registry/technical/adr/017-soft-delete-and-restore-permissions).

## Consequences

### Positive

- **Roles/permissions are linkable data.** Membership and level-based safeguards are foreign keys, not string parsing or token claims.
- **Cheap data migrations.** Changing the permission model is a migration on a handful of tables; existing profiles are not touched.
- **Multi-tenant isolation follows from the namespace.** `A_EDIT` can never satisfy a check for `B_EDIT`.
- **Checks are fast** — a lookup in an in-memory string set — and **declarative**, set on the API contract.

### Negative

- **Authorities are only recomputed at token conversion.** A role change only takes effect for an already authenticated user after they re-authenticate; there is no live revocation mid-session.
- **Seed data and `@PreAuthorize` strings must stay aligned.** A permission renamed in one place but not the other fails silently as a denied check.
- **`{projectId}_{PERMISSION}` is compact but not obvious.** The reader has to know the convention.

### Why not the identity provider's roles/groups

The provider does not model the per-project plane; encoding per-project authorities for every project in provider groups does not scale and couples the tenant model to IdP administration.

### Why not a full ACL / policy engine

More expressive and allowing live changes, but disproportionate for a two-plane model. The `PermissionEvaluator` is the single seam where a richer engine would plug in if per-record rights or runtime revocation were ever needed.

## Retrospective

- Visibility of deleted items first relied on the permanent-deletion permission. That shortcut made it impossible to grant restore without destruction; it was replaced by dedicated permissions ([ADR 017](/registry/technical/adr/017-soft-delete-and-restore-permissions)).
- The "a role change is only visible after re-authentication" drawback has been lifted: the principal is cached for a short time, and any rights mutation made through the API immediately invalidates the affected entries.
