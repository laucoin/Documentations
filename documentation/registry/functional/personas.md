# Personas

Registry has one unusual property for a multi-tenant product: **most of its users wear different hats on different projects.** The same person can be the administrator of the camp they organise, a coordinator on a friend's event, and nothing at all on a third. So these personas describe *postures*, not accounts — the same human moves between them, sometimes within the same afternoon.

## Camille — the Organiser

**Holds:** `PROJECT_ADMINISTRATOR` on the project she created.

Camille runs the summer camp. She created the project two months before it starts, decided which optional capabilities it needs, registered the eighty participants from her spreadsheets, arranged them into teams, and invited her staff. During the camp she barely touches the screen; her work happened before anyone arrived.

**What she needs:** to set the project up once and correctly. Options she cannot easily change later, dates that constrain everything else, and a staff list where nobody has more power than they should.

**What she fears:** discovering on day two that the option she left off is the one she needed, or that a coordinator can delete something irreplaceable.

::: tip Why she is the only one who can delete
Deletion is an administrator act almost everywhere in Registry precisely because Camille is the person who will still be answering questions about this camp in six months.
:::

## Théo — the Coordinator

**Holds:** `PROJECT_COORDINATOR`, granted by Camille for the duration of the camp.

Théo runs the day. He adds the participant who turned up unannounced, fixes the birthday someone mistyped, sets up the afternoon's activities, checks the minibus out and back in, and pulls up a participant's movement history when a parent calls.

**What he needs:** speed and reach. He can create and correct nearly everything, and he can read history — the one privilege that separates him from the people below him on the ladder.

**What he cannot do:** invite anyone, change anyone's access, or delete the project's configuration. He can, however, delete a **movement** — because fixing a check-in typed at 07:00 is operational work, not governance.

## Inès — the Gatekeeper

**Holds:** `PROJECT_PARTICIPANT`.

Inès is on the gate. Six kids are leaving for the supermarket: she records the exit. A supplier's van arrives: she records the entrance and captures the driver's name. That is essentially her whole relationship with the product, repeated forty times a day, often on a phone, often in a hurry.

**What she needs:** the movement screen, and nothing between her and it.

**What she deliberately cannot see:** movement history, the project's vehicles and activities configuration, and the list of who else has access. She is trusted to record what is happening now, not to audit what happened before or to see the project's staffing.

## Marc — the Platform Administrator

**Holds:** `USER_ADMINISTRATOR` globally, and often no project profile at all.

Marc looks after the platform, not the events. He blocks the account of someone who left the organisation, promotes a colleague, and honours an erasure request by anonymising an account.

**The counter-intuitive part:** Marc's global powers stop dead at every project boundary. He cannot read Camille's participants. If he genuinely needs to help, he creates a **support profile** — a real, one-hour, administrator-level profile on that project that is as visible in the profile list as anyone else's.

::: warning Support access is never invisible
Registry has no silent super-user. If Marc looked inside a project, there is a profile saying so.
:::

## The scheduled job

**Holds:** the `REGISTRY_JOB_C` permission through a service account.

Not a person. Every night it asks Registry the same four questions: any accounts dormant too long? any projects? any project content? any leftover configuration? Whatever crosses the retention threshold is deleted. It can be run in **dry-run mode** first, which reports what *would* go without touching anything — which is how anyone sane uses it the first time.

## How the postures compare

| | Camille | Théo | Inès | Marc |
| --- | :---: | :---: | :---: | :---: |
| Set up the project and its options | ✅ | ❌ | ❌ | ❌ |
| Invite people and manage access | ✅ | ❌ | ❌ | ❌ |
| Register participants and groups | ✅ | ✅ | ✅ | ❌ |
| Record movements | ✅ | ✅ | ✅ | ❌ |
| Read movement history | ✅ | ✅ | ❌ | ❌ |
| Configure vehicles and activities | ✅ | ✅ | ❌ | ❌ |
| Delete a movement | ✅ | ✅ | ❌ | ❌ |
| Delete anything else in the project | ✅ | ❌ | ❌ | ❌ |
| Administer accounts platform-wide | ❌ | ❌ | ❌ | ✅ |

Marc's empty column is the point, not an omission. The exact permissions behind each row are in [Roles & Permissions](/registry/functional/roles-and-permissions).
