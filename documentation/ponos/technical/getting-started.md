# Getting Started

This is the procedure to run Ponos on a macOS machine. It is safe to run on both a fresh laptop and an already-configured one.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **macOS** | The script guards on `uname -s == Darwin` and exits on anything else. |
| **Command Line Tools / `git`** | Needed to clone the repo and for the shell-plugin/theme clones. macOS prompts to install the Command Line Tools on first `git` use if absent. |
| **Network access** | Bootstrapping fetches Homebrew, packages, plugins and language runtimes (see [Actors & Trust Boundary → Network access](/ponos/functional/roles-and-permissions#network-access)). |
| **Git identity in `~/.zshenv`** | Required for the Git configuration step (see below). |

Homebrew itself is **not** a prerequisite — the script installs it if missing.

## 1 — Set your Git identity

`setup_git` reads five variables from the environment. Put them in `~/.zshenv` so they are available to every shell, including the non-interactive one the script uses:

```sh
# ~/.zshenv
export GIT_AUTHOR_NAME="John Doe"
export GIT_AUTHOR_EMAIL="john@example.com"
export GIT_EDITOR="vim"
export GIT_DEFAULT_BRANCH="main"
export GIT_BRANCH_PREFIX="jdoe"
```

If any of these is missing when the script runs, the Git step logs each missing variable and is **skipped** — the rest of the run still completes.

## 2 — (Optional) Pre-select choices for an unattended run

To avoid the interactive prompts entirely — for a scripted or CI run — export the choices before running:

```sh
export PONOS_CONTAINER="docker-desktop"   # or: colima
export PONOS_BROWSER="google-chrome"      # or: brave-browser
```

When set, the matching prompt is skipped and the value is persisted to `~/.config/ponos/install-choices.env`. The script also detects a non-interactive shell (no TTY) and falls back to defaults automatically.

## 3 — Run the orchestrator

```bash
git clone <this-repo> ~/path/to/Ponos
cd ~/path/to/Ponos
./sync_mac.sh
```

Interactively, you will be asked two questions — container runtime and browser — then the run proceeds through package installation, dotfiles, toolchains, Git, editors and an app restart. It is **idempotent**: re-run it any time.

## 4 — Load the new shell

Open a new terminal (or `exec zsh`). The symlinked `~/.zshrc` initialises Homebrew, pyenv, nvm, SDKMAN, Starship and the zsh plugins, and defines the aliases (`sync_mac`, `bclean`, `rfrom`, `rhooks`, `uport`, `kport`, and the navigation/`g`/`k` shortcuts).

## 5 — iTerm2 Option + Arrow word navigation

The `.zshrc` binds the common `Option/Alt + Arrow` escape sequences for word-wise navigation. For iTerm2, set the profile keys to emit them:

1. iTerm2 → **Settings → Profiles → Keys**.
2. Set **Left Option Key** to `Esc+`.
3. Set **Right Option Key** to `Esc+`.
4. Reload the shell (`exec zsh`). `Option + Left/Right` now moves by word.

## 6 — Verify

```bash
brew --version            # Homebrew present
python --version          # pyenv global set
node --version            # nvm LTS
sdk version               # SDKMAN present
git config --global --list | grep alias   # Ponos Git aliases installed
bclean --help             # Click CLI reachable
```

## Re-running & troubleshooting

- **Re-run freely.** Existing symlinks, plugins, runtimes and the font are detected and skipped; only deltas are applied.
- **A package fails.** The run continues and reports "synchronized with package install warnings"; re-run after fixing, or install the failing formula/cask by hand (`brew install …` / `brew install --cask …`).
- **A version manager is missing.** The related toolchain step logs a warning and is skipped — install the manager and re-run.

> **Note on the `sync_mac` alias.** In the tracked `.zshrc` the alias is defined as `"$GIT_PATH_CONFIG/Ponos/sync_mac.sh"`, and `GIT_PATH_CONFIG` already ends in `/Ponos`. If your checkout is not nested as `Ponos/Ponos`, invoke the script by its real path (`./sync_mac.sh`) or adjust the alias/`GIT_PATH_CONFIG` to match your layout.
