# Actors & Trust Boundary

This is the security baseline for Ponos. It is a single-user tool with **no authentication and no multi-user permission model** — there is nothing to log in to. The meaningful security question is therefore not *"who is allowed to do what"* but *"what is this tool allowed to touch on my machine, with what privileges, and where does it reach out to the network"*. Every feature page references this boundary.

## Authentication model

**None.** Ponos is a local command-line tool. Whoever can run `sync_mac.sh` on the machine already has a shell on it; there is no additional authentication boundary the tool could enforce. It runs entirely as the **invoking macOS user account** and inherits exactly that account's privileges — no more.

## Actors

| Actor | Description | How it is recognised |
| ----- | ----------- | -------------------- |
| **Operator** | A human running the script at a terminal, answering prompts. | Standard input is a TTY (`[[ -t 0 ]]`). |
| **Automation** | The same script running unattended (piped stdin, CI, provisioning). | Standard input is **not** a TTY — prompts are skipped and defaults/overrides are used. |
| **Daily Driver** | The interactive shell using the installed aliases and Python CLI helpers after setup. | Runs as the logged-in user in an interactive zsh session. |

All three are the same operating-system user. The Operator/Automation distinction only changes **whether the tool asks questions**, never what it is permitted to do.

## Privilege boundary — what Ponos is allowed to touch

| Domain | What Ponos does | Privilege required |
| ------ | --------------- | ------------------ |
| **Homebrew & packages** | Installs Homebrew if absent; runs `brew bundle` to install formulae and casks. | User-level. Homebrew itself may prompt for `sudo` when a **cask** installs into `/Applications`; that prompt comes from Homebrew, not from Ponos. |
| **Home directory config** | Symlinks dotfiles into `$HOME` and `$HOME/.config`, `$HOME/.ssh`, VS Code's user directory, etc. | User-level, within `$HOME`. |
| **Global Git config** | Rewrites `~/.gitconfig` and sets Git's template/hook directories. | User-level. |
| **Language toolchains** | Installs pyenv/nvm/SDKMAN runtimes under `$HOME` (`~/.pyenv`, `~/.nvm`, `~/.sdkman`). | User-level. |
| **Running applications** | Restarts `Finder`, `Dock`, `SystemUIServer` so changes take effect (`killall`). | User-level, targets the user's own processes. |
| **The machine as a whole** | Guarded to **macOS only** — the script exits immediately on any non-Darwin OS. | — |

Ponos never writes outside the invoking user's account on its own. The only elevation that can occur is a `sudo` prompt raised **by Homebrew** during a cask install.

## Network access

Bootstrapping is not hermetic — it deliberately fetches from the network:

| Reaches out to | Why |
| -------------- | --- |
| `raw.githubusercontent.com/Homebrew/install` | Install Homebrew when it is missing. |
| Homebrew's formulae/casks CDN | Download every package in the Brewfile. |
| `github.com/zsh-users/*`, `github.com/dracula/vim` | Clone shell plugins and the Vim Dracula theme. |
| `get.sdkman.io` | Install SDKMAN. |
| pyenv / nvm / SDKMAN mirrors | Download the requested language runtimes. |

An air-gapped run is not supported. The Automation actor should have network egress to at least these hosts.

## Secret handling

Ponos avoids storing secrets of its own:

- **Git identity** (`GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, and friends) is read from the **environment** (expected in `~/.zshenv`), never committed. If any required variable is missing, the Git step logs an explicit error and is skipped rather than guessing.
- **SSH** is delegated to a **Bitwarden SSH agent** socket (`SSH_AUTH_SOCK` in `.zshrc`); Ponos ships only a non-secret `~/.ssh/config`, no private keys.
- The **persisted interactive choices** file (`~/.config/ponos/install-choices.env`) contains only non-sensitive selections (container runtime, browser).

## Rules that shape behaviour

- **macOS guard.** The script refuses to run on anything but Darwin and exits non-zero.
- **Idempotency.** Every step detects the already-configured state and does nothing when there is nothing to change.
- **Backup before overwrite.** A real (non-symlink) file at a target path is moved to `<path>.backup.<timestamp>` before a symlink replaces it — no destructive overwrite of user data.
- **Fail-soft on packages.** If `brew bundle` fails, the run continues with the rest of the configuration and reports a warning at the end; a single bad package does not abort the machine setup.
- **Non-interactive safety.** When stdin is not a TTY, prompts are skipped and defaults (or `PONOS_*` overrides) are used, so an unattended run never blocks.

## Adding a new actor (reciprocity rule)

Because there is no permission matrix, introducing a genuinely new actor (for example, a locked-down "restricted" mode) would mean revisiting **this boundary** — which domains it may touch, which network hosts it may reach, and how it handles secrets — and stating those limits on every affected [feature page](/ponos/functional/features/bootstrap) before it ships.
