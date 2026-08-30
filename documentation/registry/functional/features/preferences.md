# Feature: Preferences

> Three small settings that follow you between devices — and one of them decides which project the entire application is
> talking about.

**Who this is for:** every authenticated user, on their own account. There is no permission to check: preferences are
yours, and nobody else can read or change them.

## Who can do what

| Role                   | May do                                      | Limits                                                   |
|------------------------|---------------------------------------------|----------------------------------------------------------|
| Any authenticated user | Set theme · set language · select a profile | **Own preferences only** — there is no cross-user access |
| `USER_ADMINISTRATOR`   | The same, on their own account              | The global role grants nothing here                      |

Preferences are created lazily: the first time you touch them, the record appears.

## The selected profile — the important one

You may hold profiles on several projects. The **selected profile** is the one you are currently working through, and it
decides which project every screen operates on. Without one, the movement and configuration screens refuse to open and
tell you to pick a project.

It can be chosen two ways — by naming the profile, or by naming the **project** and letting Registry find your live
profile on it. The second is what the project switcher uses, because users think in projects, not profiles.

Selecting is guarded exactly like access itself: the profile must be yours, visible, `ACCEPTED`, and inside its access
window. You cannot select your way into a project you have not joined, or one whose window has closed.

It can also be **cleared**, which puts you back to having no project context.

```gherkin
Scenario: Switching to another project
  Given I hold an accepted, in-window profile on that project
  When I select it
  Then that project becomes my working context on every device

Scenario: Refusing to select a profile that is not mine
  When I select a profile belonging to another user
  Then the request is rejected

Scenario: Refusing to select an expired profile
  Given my profile's access window has closed
  When I try to select it
  Then the request is rejected

Scenario: Clearing the selection
  When I clear my selected profile
  Then I have no project context and project screens ask me to pick one
```

::: tip It is chosen for you when it would be obvious
Creating a project, or being granted a support profile, sets that
profile as your selection **if you had none** — so you land inside what you just created. An existing selection is never
overridden behind your back.
:::

## Theme

`SYSTEM`, `LIGHT` or `DARK`, stored on the account rather than in the browser so a phone and a laptop agree. `SYSTEM` —
the default — follows the device.

```gherkin
Scenario: Choosing dark mode
  When I set my theme to DARK
  Then the interface switches, and stays dark on my other devices
```

## Language

The interface speaks **English** and **French**. Your choice is stored on the account and matched leniently against the
supported set — asking for `fr-FR` selects French — so a browser's regional locale does not have to be spelled exactly.

An unmatched language leaves the preference empty, and the interface falls back to the configured default rather than
failing.

```gherkin
Scenario: Choosing French
  When I set my language to fr
  Then the interface is in French on every device I sign in from

Scenario: Matching a regional locale
  When I set my language to fr-FR
  Then French is selected
```

## Related

- [Project Profiles](/registry/functional/features/project-profiles) — what a profile is and how it is granted
- [Workflows](/registry/functional/workflows) — where selecting a profile sits in a working session
