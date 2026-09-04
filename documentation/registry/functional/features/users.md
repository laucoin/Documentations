# Feature: Users

## 1. Overview

- **Goal:** Users are the platform-wide directory of people who can sign in — the only entity that does not live inside a project. This feature is how platform staff administer that directory: browse accounts, adjust a user's **global role**, **block** an account from signing in, and, when data-protection requires it, **anonymize** (permanently scrub) a user. It also gives every user a single self-service right: the ability to anonymize **their own** account.
- **Who uses it:** A global `USER_ADMINISTRATOR` administers all accounts. An ordinary `USER` has **no access to the directory**, but may anonymize their own account.
- **Option required:** None. This is a **global** feature, governed by global roles rather than project options.

## 2. Roles & Permissions

This is a **global** feature: it uses the platform-wide roles `USER_ADMINISTRATOR` and `USER`, not project roles. Actions use CRUD shorthand — **C**reate, **R**ead, **U**pdate, **D**elete. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → User](/registry/functional/domain-model#user) for the entity.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `USER_ADMINISTRATOR` (global) | **R U D** | View the directory and user metadata/roles (`REGISTRY_USER_R`, `REGISTRY_USER_METADATA_R`); change a user's global role (`REGISTRY_USER_U`); block/unblock an account (`REGISTRY_USER_U`); anonymize or delete another user (`REGISTRY_USER_D`). Subject to the role-level and last-administrator safeguards below. |
| `USER` (global, default) | **self-service only** | No access to the directory. May, however, anonymize **their own** account (authenticated; no special permission). |

> Accounts are not created through this feature: they are **auto-provisioned on first OIDC sign-in** with the default `USER` role. See [Roles & Permissions → Authentication model](/registry/functional/roles-and-permissions#authentication-model).

## 3. Business rules

- **"Impersonate" means GDPR anonymization, not logging in as someone else.** In this system, anonymizing a user **scrambles their personal data** (name, email), **clears the birthday**, and **marks the account purged**. It is a soft-delete for data-protection purposes; the scrambled identity can **never sign in again**. It does **not** let anyone act as another user or borrow their session.
- **Blocking toggles sign-in.** A blocked account is **refused at sign-in**; unblocking restores access. Blocking is reversible; anonymization is not.
- **Role-level safety.** A user may only assign roles **at or below their own level**. The system **refuses to remove or demote the last platform administrator** (the last level-0 global role), so the platform can never be left with no administrator.
- **Auto-provisioning.** On first sign-in through the OIDC provider, an account is created automatically and linked to the provider identity with the default `USER` role.
- **Self-anonymization.** Any signed-in user may anonymize their own account without administrator involvement; the effect is identical to an administrator anonymizing them.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: An administrator browses the user directory
  Given I am a global USER_ADMINISTRATOR
  When I list the platform's users
  Then I see each account with its name, email and global role
```

```gherkin
Scenario: An ordinary user cannot access the directory
  Given I am a global USER with the default role
  When I attempt to list the platform's users
  Then the request is refused for lack of permission
```

```gherkin
Scenario: Anonymizing a user scrubs their identity permanently
  Given I am a global USER_ADMINISTRATOR
  And a user account exists
  When I anonymize that user
  Then their name and email are scrambled
  And their birthday is cleared
  And the account is marked purged and can never sign in again
```

```gherkin
Scenario: Anonymize is not "sign in as" — it does not grant a session
  Given I am a global USER_ADMINISTRATOR
  When I anonymize another user
  Then I do not gain a session or act on their behalf
  And their personal data is scrubbed instead
```

```gherkin
Scenario: A blocked user is refused at sign-in
  Given a user has been blocked by an administrator
  When that user attempts to sign in through the identity provider
  Then sign-in is refused
  And unblocking the account restores their ability to sign in
```

```gherkin
Scenario: The last platform administrator cannot be demoted
  Given only one user holds the level-0 global administrator role
  When an administrator attempts to remove or demote that user's role
  Then the request is refused to avoid leaving the platform without an administrator
```

```gherkin
Scenario: A user may only assign roles at or below their own level
  Given I am a global USER_ADMINISTRATOR at level 0
  When I assign a role above my own level to another user
  Then the request is refused by the role-level safeguard
```

```gherkin
Scenario: Any user may anonymize their own account
  Given I am a signed-in USER with the default role
  When I anonymize my own account
  Then my personal data is scrambled and the account is marked purged
  And I can no longer sign in
```

```gherkin
Scenario: Accounts are auto-provisioned on first sign-in
  Given I have never signed in before
  When I sign in through the OIDC identity provider for the first time
  Then an account is created and linked to my provider identity
  And it is granted the default USER role
```

## 5. API surface

The endpoints backing this feature — their paths, methods and the permission each one requires — are specified in [Technical → API Reference](/registry/technical/api-reference), and kept there only so the transport contract never drifts from this spec. The authority for each action is in §2; the rules it must satisfy are in §3.
