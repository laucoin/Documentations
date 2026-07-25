# Configuration

Everything that parameterises a Ponos run: the environment variables it reads, the choices it persists, the packages it declares, and the paths it manages.

## Environment variables

### Required for Git configuration

Read by `setup_git`; expected in `~/.zshenv` so they reach the script's non-interactive shell. Missing any one skips the Git step (each missing variable is logged).

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `GIT_AUTHOR_NAME` | Name used in commits (`user.name`). | `John Doe` |
| `GIT_AUTHOR_EMAIL` | Email used in commits (`user.email`). | `john@example.com` |
| `GIT_EDITOR` | Editor Git launches (`core.editor`). | `vim` |
| `GIT_DEFAULT_BRANCH` | Default branch (`init.defaultBranch`); also the default target for `bclean`/`rfrom`. | `main` |
| `GIT_BRANCH_PREFIX` | Prefix used by the `cmb`/`cm` aliases. | `jdoe` |

### Optional run-time overrides

| Variable | Used by | Effect |
| -------- | ------- | ------ |
| `PONOS_CONTAINER` | `sync_mac.sh` | `docker-desktop` or `colima`; skips the container prompt. |
| `PONOS_BROWSER` | `sync_mac.sh` | `google-chrome` or `brave-browser`; skips the browser prompt. |
| `CHEZMOI_SOURCE_DIR` | `sync_mac.sh` | Overrides the chezmoi source directory. |

### Read by the CLI extensions

Set in `.zshrc` (except `GIT_PATH`, see the note in [CLI Reference → rhooks](/ponos/technical/cli-reference#rhooks)).

| Variable | Default value in `.zshrc` | Used by |
| -------- | ------------------------- | ------- |
| `GIT_PATH_CONFIG` | `$DEV_PERSO_PATH/Ponos` | `rhooks` (source of hook templates). |
| `GIT_PATH` | *(unset)* | `rhooks` (directory to scan for repositories). |
| `GIT_DEFAULT_BRANCH` | from `~/.zshenv` | `bclean`, `rfrom`. |
| `DEV_PATH`, `DEV_PERSO_PATH`, `DEV_PRO_PATH`, `DEV_ASSO_PATH` | under `~/Documents/Development` | the `perso`/`pro`/`asso` aliases. |
| `SSH_AUTH_SOCK` | `~/.bitwarden-ssh-agent.sock` | SSH auth via the Bitwarden agent. |

## Persisted choices

`~/.config/ponos/install-choices.env` — written by `save_install_choices`, sourced by `load_install_choices` on the next run:

```sh
CONTAINER_CHOICE="docker-desktop"
BROWSER_CHOICE="google-chrome"
```

Contains only non-sensitive selections. Delete it to be asked again from scratch.

## Brewfile

The base package set (authoritative list lives in the repository's `Brewfile`):

| Group | Packages |
| ----- | -------- |
| **Core tools** | `git`, `zsh`, `starship`, `chezmoi`, `ansible` |
| **Language managers** | `pyenv`, `nvm` |
| **Editors / IDE / AI** | `vim`, `visual-studio-code`, `jetbrains-toolbox`, `claude-code`, `opencode-desktop`, `redis-insight` |
| **Infra / DevOps** | `talosctl` (siderolabs tap), `opentofu`, `kubectl`, `helm`, `velero`, `docker-desktop` |
| **Apps** | `iterm2`, `insomnia`, `firefox`, `obsidian`, `rectangle`, `alt-tab` |
| **Communication** | `whatsapp`, `discord` |
| **Other** | `bitwarden`, `spotify`, `steam` |

At run time `sync_mac.sh` appends the interactive selections (see [Packages & Interactive Choices](/ponos/functional/features/package-management#what-is-installed)) to a temporary effective Brewfile; the tracked file is never modified.

## Managed paths

| Path | Managed by | Contents |
| ---- | ---------- | -------- |
| `~/.zshrc` | symlink | Shell init, env vars, aliases, keybindings. |
| `~/.config/starship.toml` | symlink | Starship prompt (Dracula palette). |
| `~/.ssh/config` | symlink | SSH host definitions (keys via Bitwarden agent). |
| `~/.vim/vimrc` | symlink | Vim configuration. |
| `~/.vim/pack/themes/opt/dracula` | git clone | Vim Dracula theme. |
| `~/Library/Application Support/Code/User/{settings,keybindings}.json` | symlink | VS Code config. |
| `~/.config/opencode/{opencode,tui}.json` | symlink | Opencode config. |
| `~/.gitconfig` | rewritten | Global Git config, aliases, template dir. |
| `~/.config/git/hooks` | `mkdir` | Hooks directory created by `setup_git`. |
| `~/.zsh/zsh-autosuggestions`, `~/.zsh/zsh-syntax-highlighting` | git clone | Zsh plugins. |
| `~/.pyenv`, `~/.nvm`, `~/.sdkman` | version managers | Language runtimes. |
| `~/.config/ponos/install-choices.env` | written | Persisted interactive choices. |

> **`~/.gitconfig` note.** `setup_git` runs `rm ~/.gitconfig` (without `-f`) before rewriting it. On a machine with **no** existing global config this `rm` fails, and because the script runs under `set -e` the failure aborts the whole run at that point. Ensure a `~/.gitconfig` exists (even an empty `touch ~/.gitconfig`) before the first run.
