# ADR 005 — Database-driven, project-scoped RBAC

## Status

<Badge type="tip" text="Accepted" />

## Context

The registry is multi-tenant: users act inside **projects**, and a user's rights in one project say nothing about their rights in another. Authorization has two planes — **global** (platform-wide) and **project-scoped** (within one project).

Authentication is delegated ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)); the provider proves identity but does not model this application's project roles.

## Decision

Model roles and permissions as **data in the database** — real, related rows — and enforce them with Spring method security and a custom `PermissionEvaluator`.

### The data model is the point

Both planes are three tables (catalog of permission names, roles with a numeric `level`, role→permission mapping). Roles are **first-class entities that other rows relate to**:

- a **user** references a global **role**;
- a **project profile** references a project **role**, and belongs to both a **user** and a **project**.

Making the role an entity rather than a string on the user (or a claim in the token) means membership, level ordering, and the safeguards built on them (the last-permanent-administrator rule, role-ceiling checks) are ordinary foreign-key relationships. It also makes **data migration straightforward**: renaming a role, adding a permission, or changing what a role grants is a Flyway migration against these tables — the existing profiles keep pointing at the same role rows, and no code changes.

### Enforcement

- Rows are seeded by Flyway migrations and loaded into an **in-memory map at startup**.
- Granted authorities are plain strings, computed at **token-conversion time** (the same converter as [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)):
  - global permission names (e.g. `REGISTRY_USER_R`);
  - per-project authorities namespaced as **`{projectId}_{PERMISSION}`**;
  - per-project option authorities `{projectId}_REGISTRY_PROJECT_OPTION_{X}`.
- `@PreAuthorize` on the controller contract interfaces:
  - `hasAuthority('X')` — a global check;
  - `hasPermission(#projectId, 'X')` — routes to the custom `PermissionEvaluator`, which checks whether the user holds the string `{projectId}_X`.
- **Visibility gating:** for a disabled (invisible) project, non-admins receive no project authorities; admins keep only project read/update/delete.

## Consequences

### Positive

- **Roles/permissions are relatable data.** Membership and the level-based safeguards are foreign keys, not string parsing or token claims.
- **Cheap data migrations.** Changing the permission model is a migration against a handful of tables; existing profiles are untouched.
- **Multi-tenant isolation falls out of the namespacing.** `A_EDIT` can never satisfy a check for `B_EDIT`.
- **Checks are fast** — an in-memory string-set lookup — and **declarative**, sitting on the API contract.

### Negative

- **Authorities are recomputed only at token conversion.** A role change takes effect for an already-authenticated user only after they re-authenticate; there is no live mid-session revocation.
- **The seed data and the `@PreAuthorize` strings must stay aligned.** A permission renamed in one place but not the other fails silently as a denied check.
- **`{projectId}_{PERMISSION}` is compact but non-obvious.** A reader must know the convention.

### Why not the identity provider's roles/groups

The provider does not model the project-scoped plane; encoding per-project authorities for every project into provider groups does not scale and couples the tenant model to IdP administration.

### Why not a full ACL / policy engine

More expressive and supports live changes, but overkill for a two-plane model. The `PermissionEvaluator` is the single seam where a richer engine would slot in if per-record grants or runtime revocation are ever needed.
