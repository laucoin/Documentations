# Feature: Bootstrap Orchestration

## 1. Overview

- **Goal:** Bring a macOS machine to its declared target state with a single, safe-to-repeat command.
- **Target audience:** The Operator (interactive) and the Automation (unattended).
- **Entry point:** `./sync_mac.sh` (aliased to `sync_mac`).

`sync_mac.sh` is the orchestrator. It runs a fixed sequence of steps, each idempotent and each logging what it did in colour. A failure in package installation is tolerated; the rest of the configuration still runs.

## 2. Access & Trust Boundary

Runs entirely as the invoking macOS user. The only privilege escalation that can occur is a `sudo` prompt raised by **Homebrew** when a cask installs into `/Applications`. See [Actors & Trust Boundary](../roles-and-permissions).

## 3. Orchestration sequence

The `main` function runs these steps in order:

| # | Step | What it does |
| - | ---- | ------------ |
| 0 | **macOS guard** | Exit immediately if the OS is not Darwin. |
| 1 | `ensure_homebrew` | Use an existing `brew`, or install Homebrew, then load its shell environment. |
| 2 | `load` / `prompt` / `save` choices | Load persisted choices, ask (or skip) the container-runtime and browser questions, persist the answers. |
| 3 | `build_effective_brewfile` + `brew bundle` | Compose the base Brewfile with the interactive selections and install everything. |
| 4 | `apply_dotfiles_if_available` | Run `chezmoi apply` if chezmoi and a source directory are present. |
| 5 | `setup_shell` | Symlink zsh/starship/ssh config; install `zsh-autosuggestions` and `zsh-syntax-highlighting`. |
| 6 | `setup_python` | Install the latest stable Python via pyenv and set it global. |
| 7 | `setup_node` | Install Node LTS via nvm and set it default. |
| 8 | `setup_java` | Install SDKMAN and the pinned Java LTS. |
| 9 | `setup_fonts` | Install the Hack Nerd Font cask. |
| 10 | `setup_git` | Rewrite the global Git config, aliases, and template directory. |
| 11 | `setup_vim` | Symlink the vimrc and install the Dracula theme. |
| 12 | `setup_vscode` | Symlink settings/keybindings and install the curated extensions. |
| 13 | `setup_opencode` | Symlink the Opencode config and TUI files. |
| 14 | `restart_affected_apps` | `killall` Finder, Dock and SystemUIServer so changes take effect. |

## 4. Business rules

- **Idempotent by construction.** Each step checks the current state and does nothing when there is nothing to change.
- **Fail-soft packages.** If `brew bundle` returns an error, the run records a warning, continues all remaining steps, and reports "synchronized with package install warnings" at the end.
- **macOS only.** Any non-Darwin OS causes an immediate non-zero exit before anything is touched.
- **Missing sources are surfaced.** If a source file for a symlink is absent, the step logs an error and returns rather than creating a broken link.

## 5. Behavioural scenarios (BDD)

```gherkin
Scenario: First run on a fresh Mac
  Given a machine running macOS with no Homebrew installed
  When I run ./sync_mac.sh interactively
  Then Homebrew is installed
  And I am asked for a container runtime and a browser
  And all Brewfile packages plus my selections are installed
  And dotfiles, toolchains, Git and editors are configured
  And Finder, Dock and SystemUIServer are restarted

Scenario: Re-running on an already configured machine
  Given a machine that was previously synchronized
  When I run sync_mac again
  Then already-present symlinks and plugins are detected and skipped
  And only changed or missing items are applied
  And no existing configuration is destroyed

Scenario: A single package fails to install
  Given one cask in the Brewfile cannot be installed
  When brew bundle runs
  Then the failure is logged as a warning
  And the remaining configuration steps still run
  And the final message notes package install warnings

Scenario: Running on a non-macOS system
  Given the script is executed on Linux
  When it starts
  Then it prints an error and exits with a non-zero status
  And nothing on the machine is modified
```
