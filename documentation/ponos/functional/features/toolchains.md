# Feature: Language Toolchains & Fonts

## 1. Overview

- **Goal:** Provide ready-to-use language runtimes, each managed by its own version manager, plus the terminal font the prompt depends on.
- **Target audience:** The Operator (installs them) and the Daily Driver (uses them).

Ponos installs three language toolchains through dedicated version managers so runtimes can be switched per project, and installs a Nerd Font so the Starship prompt's glyphs render correctly.

## 2. Access & Trust Boundary

All runtimes install under `$HOME` (`~/.pyenv`, `~/.nvm`, `~/.sdkman`); no system-wide install and no elevation. The font is a Homebrew cask. See [Actors & Trust Boundary](/ponos/functional/roles-and-permissions).

## 3. What is installed

| Toolchain | Manager | Behaviour |
| --------- | ------- | --------- |
| **Python** | pyenv | Detects the **latest stable** `3.x.y` from `pyenv install --list`, installs it, sets it global, upgrades pip, and installs the `click` and `colorlog` libraries the CLI extensions and hooks depend on. |
| **Node.js** | nvm | Installs the current **LTS** and aliases `default` to `lts/*`. |
| **Java** | SDKMAN | Installs SDKMAN if absent, then installs the **pinned Java LTS** (Temurin) and sets it as default. |
| **Font** | Homebrew cask | Installs the **Hack Nerd Font** (`font-hack-nerd-font`). |

## 4. Business rules

- **Skip when the manager is unavailable.** If pyenv, nvm or SDKMAN is not present after package installation, the corresponding step logs a warning and is skipped — it never aborts the run.
- **Latest-stable Python.** The Python version is resolved dynamically at run time, not pinned, so a re-run can pick up a newer stable release.
- **Pinned Java.** Java is pinned to a specific LTS build for reproducibility.
- **Idempotent.** Already-installed runtimes and the already-installed font are detected and skipped.
- **Dependency libraries.** The Python step installs `click` and `colorlog` because the [CLI extensions](/ponos/functional/features/cli-extensions) and [Git template hooks](/ponos/functional/features/git-governance) import them.

## 5. Behavioural scenarios (BDD)

```gherkin
Scenario: Installing the latest stable Python
  Given pyenv is available
  When the Python setup runs
  Then the latest stable 3.x.y is installed and set as global
  And pip is upgraded and click and colorlog are installed

Scenario: Node LTS via nvm
  Given nvm is available
  When the Node setup runs
  Then the current Node LTS is installed
  And the default alias points at lts/*

Scenario: Java pinned via SDKMAN
  Given SDKMAN is available (or gets installed)
  When the Java setup runs
  Then the pinned Java LTS is installed and set as default

Scenario: A version manager is missing
  Given pyenv is not on the PATH
  When the Python setup runs
  Then a warning is logged and the step is skipped
  And the rest of the run continues

Scenario: Font already installed
  Given the Hack Nerd Font cask is already installed
  When the font setup runs
  Then it is detected and skipped
```
