# ADR 005 — Database-driven, project-scoped RBAC

## Status

Accepted

## Context

The registry is multi-tenant: users act inside **projects**, and a user's rights in one project say nothing about their rights in another. Authorization therefore has two planes — **global** (what a user may do platform-wide) and **project-scoped** (what a user may do *within a given project*).

Authentication is already delegated to an external provider ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)); that provider proves identity but does not model this application's project-scoped roles. We also wanted roles and their permissions to be **editable as data**, so that adjusting who-can-do-what does not require a code change and redeploy, and we wanted per-request checks to be **cheap**.

## Decision

Implement RBAC as **data in the database, enforced by Spring method security with a custom `PermissionEvaluator`**.

- **Roles and their permissions are rows in the database**, seeded by Flyway migrations, and loaded into an **in-memory map at startup**.
- A user's granted authorities are **plain strings**:
  - global permission names (e.g. `SOME_GLOBAL_PERMISSION`);
  - per-project authorities namespaced as **`{projectId}_{PERMISSION}`**;
  - per-project option authorities **`{projectId}_REGISTRY_PROJECT_OPTION_{X}`**.
- Enforcement uses `@PreAuthorize`:
  - `hasAuthority('X')` checks a **global** permission;
  - `hasPermission(#projectId, 'X')` routes to the custom `PermissionEvaluator`, which simply checks whether the user holds the string **`{projectId}_X`**.

  Project-scoped authorization is therefore a **namespaced-string membership test**.
- **Visibility gating:** for a disabled (invisible) project, non-admins receive **no authorities** at all; even admins keep only project **read/update/delete**.

Authorities are computed at **token-conversion time** — the same custom converter that maps the OIDC token to the local user ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)) builds this authority set.

## Consequences

### Positive

- **Roles and permissions are editable as data.** Changing what a role grants is a database change (a migration), not a code change — no redeploy to adjust the permission model.
- **Multi-tenant isolation comes for free.** Because project authorities are namespaced by `projectId`, a permission in project A (`A_EDIT`) can never satisfy a check in project B (`B_EDIT`). Cross-tenant leakage is structurally impossible in the string form.
- **Checks are simple and fast.** Both planes reduce to an in-memory string-set lookup, so `@PreAuthorize` adds negligible per-request cost.
- **Declarative and co-located.** `@PreAuthorize` sits on the contract interfaces of [ADR 001](/registry/technical/adr/001-hexagonal-architecture), so the required permission for an endpoint is visible right at the API surface.
- **Visibility gating is centralized.** The rule that an invisible project collapses a user's authorities lives in one place (authority computation), not scattered across handlers.

### Negative

- **Authorities are recomputed only at token conversion.** A role or permission change does not take effect for an already-authenticated user until they **re-authenticate** and a fresh authority set is built. There is no live revocation mid-session.
- **String-namespacing is clever but non-obvious.** `{projectId}_{PERMISSION}` as an authority is compact and fast, but a reader must know the convention; a typo or a projectId containing an underscore-like value is a latent correctness risk, and the scheme is not self-documenting.
- **The permission set is loaded at startup.** Because roles/permissions are read into memory once, changing the seed data requires a **restart or an explicit refresh** to take effect — the database being the source of truth does not make it live.
- **Two moving parts to keep aligned.** Seed migrations define the permissions; `@PreAuthorize` strings consume them. A permission renamed in one place but not the other fails silently as a denied check.

### Why not the identity provider's roles/groups

The OIDC provider ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)) can carry roles and groups in the token, which would avoid a local permission model entirely. We rejected leaning on it because the provider does not model this application's **project-scoped** plane — encoding per-project authorities for every project into provider groups does not scale, and it would couple the tenant permission model to IdP administration. Keeping authorization local and data-driven keeps it under application control and editable by a migration.

### Why not a fine-grained ACL / policy engine

A full ACL table or an external policy engine (per-resource grants, attribute-based rules) is more expressive and supports live changes without re-auth. We judged it overkill for the current model: the namespaced-string scheme is dramatically simpler and faster, and the two planes (global + project-scoped) cover the requirements. If authorization ever needs per-record grants or runtime revocation, this is the natural place to revisit — the `PermissionEvaluator` is the single seam where a richer engine would slot in.
