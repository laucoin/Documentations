# Feature: Data Retention

> Registry holds names, birthdays and the movements of minors. Keeping that forever is not caution, it is a liability.
> So every night, four sweeps ask the same question — *is anything here older than we agreed to keep?* — and remove what
> has aged out.

**Who this is for:** nobody, in the usual sense. This is the only feature whose operator is a scheduled job rather than
a person.

## Who can do what

| Role                                       | May do                                            | Limits                                 |
|--------------------------------------------|---------------------------------------------------|----------------------------------------|
| The **service account** (`REGISTRY_JOB_C`) | Trigger any of the four sweeps                    | The account exists solely for this     |
| `USER_ADMINISTRATOR`                       | The same, by virtue of holding the job permission | Useful for running a dry run on demand |
| Everyone else                              | Nothing                                           | —                                      |

Purging is a global operation. It is the one thing in Registry that reaches across every project at once, which is
exactly why it is behind a permission nobody holds by accident.

## Four sweeps, in a deliberate order

| Sweep                     | Removes                                       | Default schedule | Default threshold |
|---------------------------|-----------------------------------------------|------------------|-------------------|
| **Users**                 | Accounts with no sign-in since the threshold  | 01:00 daily      | 12 months         |
| **Projects**              | Projects untouched since the threshold        | 01:30 daily      | 12 months         |
| **Project content**       | Movements, communications and alerts          | 02:00 daily      | 12 months         |
| **Project configuration** | Vehicles, activities, groups and participants | 02:30 daily      | 12 months         |

The half-hour gaps are not decoration — the order matters:

**Content is purged before configuration**, because participants, vehicles and activities all refuse deletion while a
movement still references them. Remove the movements first and the configuration becomes removable; do it the other way
round and the configuration sweep achieves nothing.

Within the content sweep the same logic applies internally: communications whose movement and alert have both gone are
removed as **orphans**, and alerts that still carry communications are protected until those communications are cleared.

## Dry run first

Every sweep takes a **dry run** flag, and it defaults to **on**. A dry run reports exactly which records would be
removed and touches nothing.

That default is the point: an accidental call does no damage. Deleting requires deliberately asking for it.

Each sweep also accepts an explicit **date threshold**, overriding the configured default — useful for a one-off deeper
clean, or for asking "what would a six-month policy remove?" without committing to one.

```gherkin
Scenario: Previewing what a sweep would remove
  Given I hold the job permission
  When I run the user purge as a dry run
  Then I get the list of accounts that would be removed
  And no account is deleted

Scenario: Running a sweep for real
  When I run the user purge with the dry run flag turned off
  Then the dormant accounts are deleted

Scenario: Overriding the threshold
  When I run the project purge with an explicit date threshold
  Then that date is used instead of the configured default

Scenario: Denying a purge to a user without the job permission
  Given I am a project administrator with no job permission
  When I try to trigger a purge
  Then the request is denied
```

## What "dormant" means

Each sweep has its own definition, and they are not interchangeable:

| Sweep         | Considered dormant when                                                          |
|---------------|----------------------------------------------------------------------------------|
| Users         | The account's **last sign-in** predates the threshold                            |
| Projects      | The project has not been **modified** since the threshold                        |
| Content       | The movement, communication or alert predates the threshold                      |
| Configuration | The element has been **unused** since the threshold — no movement, no membership |

An account that signs in every month is never purged, however old it is. A project touched last week survives regardless
of when it was created. Retention here measures **activity**, not age.

## What survives a purge

Two things deliberately do not disappear:

- **Anonymised accounts** stay as rows. Their identity is already gone; the row keeps the history they authored
  coherent. See [Users](/registry/functional/features/users).
- **Groups that still have members** are not removed by the configuration sweep — only empty and unused ones are, on the
  same principle that a group is never allowed to be empty.

## Related

- [Users](/registry/functional/features/users) — anonymisation, the other half of the data-protection story
- [Projects](/registry/functional/features/projects) — disabling and deleting a project by hand
- [Workflows](/registry/functional/workflows) — where the nightly pass sits in the platform's life
