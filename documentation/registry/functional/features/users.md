# Feature: Users

> This is the **global plane** — accounts, not projects. Everything here is about who may sign in and what they may do platform-wide, and none of it grants a single right inside anybody's project.

**Who this is for:** platform administrators. Plus two operations that every user can perform on themselves.

## Who can do what

| Role | May do | Limits |
| ---- | ------ | ------ |
| `USER_ADMINISTRATOR` | Read the directory · list assignable roles · change a role · Block · Unblock · **Anonymise** · **Delete** | Platform-wide; grants nothing inside projects |
| `USER` | Nothing on other accounts | — |
| Any authenticated user | **Anonymise their own account** | Acting on themselves only |

::: info Accounts are not created here
There is no "create user" operation. Accounts appear when someone signs in for the first time — see [Roles & Permissions](/registry/functional/roles-and-permissions#account-provisioning).
:::

## Roles on the global plane

Two roles: `USER_ADMINISTRATOR` (level 0) and `USER` (level 9000, the default given to every new account). The same ladder rule as everywhere else applies — **you may assign your own role or a weaker one, never a stronger one** — and an administrator can only act on accounts whose role is one they could assign.

```gherkin
Scenario: Promoting a colleague
  Given I am a USER_ADMINISTRATOR
  When I set another user's role to USER_ADMINISTRATOR
  Then the change is saved

Scenario: Listing the roles I may assign
  When I ask for the assignable roles
  Then I get my own role and every weaker one
```

## The last administrator is protected

A platform without an administrator cannot be recovered, so Registry refuses every path that would produce one. The **last global administrator** cannot be demoted, blocked, anonymised or deleted.

The same protection extends sideways into projects: a user who is the **last administrator of any project** cannot be blocked, anonymised or deleted either — the error names the project so you know where to hand the role over first.

```gherkin
Scenario: Refusing to demote the last administrator
  Given I am the only USER_ADMINISTRATOR on the platform
  When I try to change my own role
  Then the request is rejected

Scenario: Refusing to delete the last administrator of a project
  Given a user is the sole administrator of a project
  When I try to delete their account
  Then the request is rejected and the project is named
```

## Blocking

Blocking makes an account invisible and **refuses its sign-in outright** — the token is valid, the account exists, and Registry says no. It is the reversible way to suspend someone who has left, without touching the history their account is attached to.

You cannot block yourself.

```gherkin
Scenario: Blocking an account
  Given a user who has left the organisation
  When I block their account
  Then their next sign-in is refused

Scenario: Unblocking an account
  Given a blocked account
  When I unblock it
  Then the user can sign in again

Scenario: Refusing to block myself
  When I try to block my own account
  Then the request is rejected
```

## Anonymising

Anonymisation is Registry's answer to an erasure request. It **severs the identity while keeping the account row**:

- first name, last name and email are replaced with random values;
- the birthday is cleared;
- the account is flagged as anonymised, and any future sign-in is refused.

Keeping the row is the point: everything the account created — projects, participants, movements — keeps a coherent author, with nobody's name on it. A hard delete would leave the history dangling.

Two people can trigger it: a platform administrator on someone else's account, or **any user on their own**. Self-service erasure needs no permission at all, only that you are not the last administrator somewhere.

```gherkin
Scenario: Erasing my own account
  Given I am signed in and I am not the last administrator anywhere
  When I anonymise my own account
  Then my personal data is replaced and my next sign-in is refused

Scenario: Refusing to anonymise myself as an administrator acting on others
  When a USER_ADMINISTRATOR targets their own account through the administration screen
  Then the request is rejected, because self-erasure has its own route

Scenario: Refusing to anonymise the last administrator of a project
  Given I am the sole administrator of a project
  When I anonymise my account
  Then the request is rejected and the project is named
```

## Deleting

Deletion removes the account entirely, cascading its profiles and preferences. Anything it authored keeps its record but loses the link back. It is administrator-only, and guarded by the same protections as anonymisation, plus one more: **you cannot delete yourself** through the administration screen.

Anonymisation is almost always the better instrument — it honours erasure without breaking authorship.

## Reading the directory

The directory lists every account with its role and its status, searched by fuzzy text across first name, last name and email, and filtered by visibility so that blocked accounts can be found deliberately. It requires an explicit read permission that only administrators hold — ordinary users cannot enumerate each other.

The **service account** used by the scheduled retention jobs also lives here. It is a distinct account type, it carries no email, and it exists solely to hold the job permission.

## Related

- [Roles & Permissions](/registry/functional/roles-and-permissions) — the global permission catalogue and provisioning rules
- [Project Profiles](/registry/functional/features/project-profiles) — the other plane, and support profiles
- [Data Retention](/registry/functional/features/data-retention) — automatic removal of dormant accounts
