# ADR 005 — Database-driven, project-scoped permissions

## Status

Accepted

## Context

Registry is multi-tenant and the isolation guarantee is absolute: a user's rights on one project must grant nothing on any other. Roles are also two-dimensional — a global plane governing accounts and project creation, and a per-project plane governing everything inside a project — and a global role must not leak into a project.

The usual approach is a `WHERE project_id = ?` clause on every query. That works right up to the first time someone forgets it, and the failure is silent cross-tenant data exposure.

The permission set also grows with every feature. Encoding it in enums or annotations makes each new capability a code change and a deployment.

## Decision

Store roles and permissions **in the database** — six tables: global permissions, global roles, project permissions, project roles and the two mapping tables — and turn a project role into **authority strings prefixed with the project's identifier**.

At sign-in conversion, `RoleService` maps each of the user's profiles to its permissions and emits `<projectId>_<PERMISSION>`:

```
9f3c1a2e-…-b7d4_REGISTRY_PROJECT_MOVEMENT_R
```

`PermissionService`, a Spring `PermissionEvaluator`, answers `hasPermission(#projectId, 'X')` by testing whether `"${projectId}_X"` is in the authority set. Enabled project options are emitted the same way, so an option gate is itself an authority check.

Only profiles that are **`ACCEPTED` and inside their access window** contribute. Roles carry a `level`, with a partial unique index guaranteeing one level-0 role per plane, and a role may only ever assign itself or a weaker role.

## Rationale & best practices

- **Security:** isolation becomes a property of the credential rather than of a query. An authority for project A cannot satisfy a check for project B — the prefixes differ. A forgotten tenant filter is still a bug, but it is not exploitable into cross-tenant access without a matching authority.
- **Least privilege:** permissions are fine-grained per feature and operation, including separate `_HISTORY_R` and `_METADATA_R` reads, so roles are composed rather than approximated.
- **Evolvability:** granting a role a new permission is a Flyway migration, not a release.

## Consequences

- **Pros:** tenant isolation is structural. Permissions are data, auditable with a query. The two planes stay genuinely independent. Option gating reuses the same mechanism at no extra cost.
- **Cons / trade-offs:** the authority set grows with the number of projects a user holds — a user on fifty projects carries a large principal, rebuilt on every request. Role maps are cached at application start, so a permission change is not picked up until restart. Authority strings are stringly-typed, mitigated only by the convention that they come from constants. Debugging an authorisation failure means inspecting a set of prefixed strings.
- **Alternatives rejected:** query-level tenant filtering alone (one omission is a silent breach); PostgreSQL row-level security (strong, but invisible from the application and awkward with a pooled reactive driver); permissions as code enums (no migration needed to grant, but every grant becomes a deployment).
