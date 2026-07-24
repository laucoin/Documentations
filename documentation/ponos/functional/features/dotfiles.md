# Feature: Dotfiles & Shell Environment

## 1. Overview

- **Goal:** Keep the machine's configuration files in sync with the repository, so the repo is the single source of truth for how the shell, editors and tools behave.
- **Target audience:** The Operator (applies them) and the Daily Driver (lives in them).

Ponos manages dotfiles by **symlinking** tracked files from the repository into their expected locations in `$HOME`. Because they are symlinks, editing the repo copy takes effect immediately, and re-running the setup is a no-op when the link is already correct.

## 2. Access & Trust Boundary

All symlinks are created within the user's `$HOME` and its config subdirectories. No elevation is required. See [Actors & Trust Boundary](../roles-and-permissions).

## 3. What is managed

| Area | Source → Target |
| ---- | --------------- |
| **Zsh** | `dotfiles/zsh/.zshrc` → `~/.zshrc` |
| **Starship prompt** | `dotfiles/starship/config.toml` → `~/.config/starship.toml` |
| **SSH** | `dotfiles/ssh/config` → `~/.ssh/config` |
| **Vim** | `dotfiles/vim/vimrc` → `~/.vim/vimrc` (+ Dracula theme, see [Toolchains](./toolchains)) |
| **VS Code** | `settings.json`, `keybindings.json` → the VS Code user directory |
| **Opencode** | `config.json` → `~/.config/opencode/opencode.json`; `tui.json` → `~/.config/opencode/tui.json` |
| **Git ignore** | `dotfiles/git/ignore` referenced as the global excludes file (see [Git Governance](./git-governance)) |

The shell setup also installs two zsh plugins — **zsh-autosuggestions** and **zsh-syntax-highlighting** — by cloning them into `~/.zsh/` when absent.

### Optional: chezmoi

If [chezmoi](https://www.chezmoi.io/) is installed and a source directory is available, `sync_mac.sh` runs `chezmoi apply` as an additional dotfiles layer. When chezmoi or its source is missing, the step is skipped with a log line — it is never required.

## 4. Business rules

- **Symlink over copy.** Managed files are symlinks, so repo edits are live and re-runs are idempotent.
- **Backup before overwrite.** If a **real file** already exists at a target path, it is moved to `<target>.backup.<timestamp>` before the symlink is created. Existing symlinks that already point at the repo are left untouched; symlinks pointing elsewhere are replaced.
- **Missing source is an error, not a crash.** If the source file does not exist, the individual link is skipped with an error and the run continues.
- **Plugins installed once.** zsh plugins and themes are cloned only when their directory is absent.

## 5. Behavioural scenarios (BDD)

```gherkin
Scenario: First-time dotfile linking
  Given ~/.zshrc does not exist
  When the shell setup runs
  Then ~/.zshrc is symlinked to the repository's dotfiles/zsh/.zshrc

Scenario: Backing up an existing real file
  Given a hand-written ~/.zshrc already exists as a regular file
  When the shell setup runs
  Then it is moved to ~/.zshrc.backup.<timestamp>
  And a symlink to the repository copy takes its place

Scenario: Re-running with the correct symlink already in place
  Given ~/.zshrc already points at the repository copy
  When the shell setup runs again
  Then it is detected as already configured and left unchanged

Scenario: Missing source file
  Given the SSH config source is missing from the repository
  When the shell setup runs
  Then an error is logged for that item
  And the remaining dotfiles are still linked

Scenario: chezmoi not installed
  Given chezmoi is not on the PATH
  When the dotfiles step runs
  Then it is skipped with a debug log
  And the symlink-based dotfiles are still applied
```
