# Feature: Packages & Interactive Choices

## 1. Overview

- **Goal:** Install a curated, declarative set of applications and command-line tools, plus two user-selected packages, through Homebrew.
- **Target audience:** The Operator and the Automation.

The base toolset is declared in the repository's `Brewfile`. Two selections — the **container runtime** and the **browser** — are made interactively and appended to an effective Brewfile at run time, so the same base file serves everyone while the machine-specific choices stay out of it.

## 2. Access & Trust Boundary

Package installation runs as the user; casks that install into `/Applications` may trigger a Homebrew `sudo` prompt. See [Actors & Trust Boundary](../roles-and-permissions).

## 3. What is installed

The base `Brewfile` covers core tools (`git`, `zsh`, `starship`, `chezmoi`, `ansible`), language version managers (`pyenv`, `nvm`), editors and IDE tooling, infrastructure CLIs (`talosctl`, `opentofu`, `kubectl`, `helm`, `velero`), and a set of desktop applications. The exact, authoritative list lives in the `Brewfile` itself; the [Technical → Configuration](../../technical/configuration#brewfile) page enumerates it.

On top of the base file, `sync_mac.sh` appends the interactive selections into a temporary **effective Brewfile**:

| Selection | Options | Appended packages |
| --------- | ------- | ----------------- |
| **Container runtime** | `docker-desktop` (default) / `colima` | `docker-desktop` + `docker-compose`, **or** `colima` + `docker` + `docker-compose` |
| **Browser** | `google-chrome` (default) / `brave-browser` | the selected browser cask |

## 4. Business rules

- **Persistence.** Choices are saved to `~/.config/ponos/install-choices.env` and reloaded on the next run, so the questions are asked only once.
- **Environment override.** `PONOS_CONTAINER` and `PONOS_BROWSER`, when set, bypass the corresponding prompt entirely and are still persisted.
- **Non-interactive fallback.** When stdin is not a TTY, both prompts are skipped and the defaults (or persisted values / overrides) are used.
- **Invalid answer → default.** An unrecognised interactive answer logs a warning and falls back to the default.
- **Fail-soft install.** A `brew bundle` failure is a warning, not a stop (see [Bootstrap](./bootstrap)).
- **Ephemeral effective Brewfile.** The composed file is written to a temp path and deleted after the run; the tracked `Brewfile` is never modified.

## 5. Behavioural scenarios (BDD)

```gherkin
Scenario: First-time interactive selection
  Given no persisted choices exist
  When I run the script and choose "Colima" and "Brave"
  Then colima, docker and docker-compose are installed
  And brave-browser is installed
  And my choices are written to ~/.config/ponos/install-choices.env

Scenario: Choices remembered on the next run
  Given ~/.config/ponos/install-choices.env already records my selections
  When I run the script again interactively
  Then I am still shown the prompts with my previous answers as defaults
  And pressing Enter keeps them

Scenario: Overriding with environment variables
  Given I export PONOS_CONTAINER=colima and PONOS_BROWSER=brave-browser
  When I run the script
  Then no container or browser prompt is shown
  And those values are used and persisted

Scenario: Unattended run with no TTY
  Given the script runs from a pipeline with no interactive input
  When it reaches the choice step
  Then no prompt blocks execution
  And the default (or persisted / overridden) selections are used

Scenario: Invalid interactive answer
  Given I am asked for a container runtime
  When I type an unrecognised value
  Then a warning is logged
  And the default (docker-desktop) is used
```
