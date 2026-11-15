---
title: 'Feature: Preferences'
description: 'A user’s personal settings: theme, language and refresh frequency.'
---

# Feature: Preferences

## 1. Overview

- **Goal:** Preferences are the small set of personal settings that shape how Registry looks and behaves for a signed-in user: the **theme**, the interface **language**, and the **refresh mode** — how often the displayed data reloads on its own. Since preferences are stored server-side, they follow the user on any device: sign in elsewhere and the same theme, language and refresh mode are already applied.
- **Who uses it:** Every signed-in user, on **their own** preferences only. There is no cross-user administration here.
- **Option required:** None. It is a **global**, per-user feature, governed by global roles rather than by project options.

## 2. Roles and permissions

This is a **global**, per-user feature: it uses the `USER_ADMINISTRATOR` and `USER` platform roles. Both have **identical** rights here — each acting only on their own preferences. See [Roles and permissions](/registry/functional/roles-and-permissions) for the full model, and [Domain model → User](/registry/functional/domain-model#user) for where preferences live.

| Role                          | Permitted actions   | Conditions / scope                                                                                                                          |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `USER` (global, default)      | **R U** (their own) | Can read and change **their own** theme, language and refresh mode. No special permission needed — being authenticated is enough.           |
| `USER_ADMINISTRATOR` (global) | **R U** (their own) | Identical rights, and only on their **own** preferences. Being a platform administrator grants **no** access to another user's preferences. |

## 3. Business rules

- **Per user and server-side.** Preferences belong to a user and are stored on the server, so they **follow the user on any device** rather than living in a single browser.
- **Copy in the browser.** The theme and the language are also kept in two browser cookies, `registry-theme` and `locale` (valid for one year, readable by the application, `SameSite=Lax`, `Secure` over HTTPS). They are used as long as the server preferences are not known — before sign-in and while the application loads — to show the sign-in page in the right language and avoid a visible theme switch at startup. Without a cookie, the language is the browser's if it is supported, otherwise the default language. As soon as the user is loaded, their preferences saved on the server win and the cookies are updated. The refresh mode has no cookie, and the cookies are not cleared on sign-out.
- **Theme.** One of `SYSTEM`, `LIGHT` or `DARK` (see [Domain model → Theme](/registry/functional/domain-model#status-vocabulary)). `SYSTEM` follows the device's light/dark setting.
- **Language.** French (`fr`) or English (`en`) — only a supported language code is accepted. Changing the language immediately **re-localizes** the interface labels and the backend's error messages.
- **Refresh mode.** One of `OFF`, `ECO`, `NORMAL` (default) or `FAST`. It sets how often the "live" parts of the interface (movements, alerts, statuses, counters) reload in the background while they are on screen: never, about every 3 minutes, every minute, or every 30 seconds. Data that only applies to the current day reloads when the day changes.
- **No remembered active event.** The event a user is in is simply the project they are viewing; nothing about it is saved in the preferences.
- **Personal scope only.** Each operation acts on the caller's preferences; there is no endpoint to read or change someone else's.
