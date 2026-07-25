# Feature: Preferences

## 1. Overview

- **Goal:** Preferences are the small set of personal settings that shape how Registry looks and behaves for one signed-in user: the **theme**, the interface **language**, and the **active project profile** — the event the user is currently "inside". Because preferences are stored server-side, they follow the user to any device: sign in elsewhere and the same theme, language and active event are already applied.
- **Who uses it:** Every signed-in user, over **their own** preferences only. There is no cross-user administration here.
- **Option required:** None. This is a **global**, per-user feature, governed by global roles rather than project options.

## 2. Roles & Permissions

This is a **global**, per-user feature: it uses the platform-wide roles `USER_ADMINISTRATOR` and `USER`. Both have **identical** rights here — each acting only on their own preferences. See [Roles & Permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain Model → User](/registry/functional/domain-model#user) for where preferences live.

| Role | Permitted actions | Conditions / Scope |
| ---- | ----------------- | ------------------ |
| `USER` (global, default) | **R U** (own) | May read and update **their own** theme, language and active profile. No special permission needed — authenticated is enough. |
| `USER_ADMINISTRATOR` (global) | **R U** (own) | Identical rights, and only over their **own** preferences. Being a platform administrator grants **no** access to another user's preferences. |

## 3. Business rules

- **Per-user and server-side.** Preferences belong to one user and are stored on the server, so they **follow the user to any device** rather than living in a single browser.
- **Theme.** One of `SYSTEM`, `LIGHT` or `DARK` (see [Domain Model → Theme](/registry/functional/domain-model#status-vocabulary)). `SYSTEM` follows the device's own light/dark setting.
- **Language.** English (`en`) or French (`fr`). Switching language **re-localizes** the interface labels immediately.
- **Active project profile.** Selecting an active profile switches **which event the user is "inside"** and **resets the in-app project context** to that event. The profile can be chosen directly by its id, or by naming a project (the user's profile on that project is selected).
- **Own scope only.** Every operation acts on the caller's own preferences; there is no endpoint to read or change someone else's.

## 4. Behavioral scenarios (BDD)

```gherkin
Scenario: A user switches to dark theme
  Given I am a signed-in user
  When I set my theme to DARK
  Then my preference is saved server-side
  And the interface renders in dark mode on every device I sign in from
```

```gherkin
Scenario: The system theme follows the device
  Given I am a signed-in user
  When I set my theme to SYSTEM
  Then the interface follows my device's own light/dark setting
```

```gherkin
Scenario: A user switches the interface language
  Given I am a signed-in user with the interface in English
  When I set my language to fr
  Then the interface labels are re-localized to French
  And the preference is saved server-side
```

```gherkin
Scenario: Selecting an active profile switches the current event
  Given I am a signed-in user with accepted profiles on project A and project B
  And project A is my active profile
  When I select my profile on project B as active
  Then project B becomes the event I am "inside"
  And the in-app project context is reset to project B
```

```gherkin
Scenario: Selecting an active profile by project
  Given I am a signed-in user with an accepted profile on project B
  When I select the active profile by naming project B
  Then my profile on project B becomes active
```

```gherkin
Scenario: Preferences follow the user to another device
  Given I set my theme to DARK and my language to fr on one device
  When I sign in from a different device
  Then the interface is already in dark mode and French
```

```gherkin
Scenario: An administrator cannot change another user's preferences
  Given I am a global USER_ADMINISTRATOR
  When I attempt to change another user's theme
  Then there is no such capability — preferences act only on the caller's own account
```

## 5. API surface

REST endpoints backing this feature, under `/api/v2/users/preferences`. Every call is **authenticated** and acts on the **caller's own** preferences; there are no permissions beyond being signed in. See [Technical → API Reference](/registry/technical/api-reference).

| Method | Path | Purpose | Permission |
| ------ | ---- | ------- | ---------- |
| `POST` | `/users/preferences/theme` | Set the theme (`SYSTEM` / `LIGHT` / `DARK`) | Authenticated (self) |
| `POST` | `/users/preferences/language` | Set the interface language (`en` / `fr`) | Authenticated (self) |
| `POST` | `/users/preferences/select-profile` | Select the active profile (body: profileId or projectId) | Authenticated (self) |
