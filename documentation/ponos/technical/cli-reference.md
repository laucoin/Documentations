# CLI Reference

Every command Ponos exposes, its flags, defaults and behaviour. The developer helpers are Python/Click commands surfaced through `.zshrc` aliases; the orchestrator and Git aliases round out the surface.

## The orchestrator

### `sync_mac.sh`

```bash
./sync_mac.sh
```

Runs the full bootstrap sequence (see [Architecture](/ponos/technical/architecture#end-to-end-run-flow)). No positional arguments. Behaviour is tuned by environment variables:

| Variable | Effect |
| -------- | ------ |
| `PONOS_CONTAINER` | `docker-desktop` or `colima` — skips the container prompt. |
| `PONOS_BROWSER` | `google-chrome` or `brave-browser` — skips the browser prompt. |
| `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_EDITOR`, `GIT_DEFAULT_BRANCH`, `GIT_BRANCH_PREFIX` | Required by the Git step; missing any skips it. |
| `CHEZMOI_SOURCE_DIR` | Overrides where `chezmoi apply` reads from. |

Exit codes: `1` on a non-macOS host or a missing Brewfile; otherwise `0` (with a warning line if `brew bundle` failed).

## Git extensions — `git_ext.py`

Aliased in `.zshrc` as `bclean`, `rfrom`, `rhooks`. All accept `--debug` to re-raise the underlying error.

### `bclean`

```bash
bclean [BRANCH] [-b/--branches BRANCH]... [--debug]
```

Delete stale local branches. Switches to the default branch, then deletes every local branch that is not excluded and is not the current branch.

| Argument / option | Default | Meaning |
| ----------------- | ------- | ------- |
| `BRANCH` (positional) | `$GIT_DEFAULT_BRANCH` | The default branch to switch to; also added to the exclusion set. |
| `-b`, `--branches` (repeatable) | `develop`, `main`, `master` | Branches to exclude from deletion. |

Reports the deleted branches, or logs that the repository is already clean.

### `rfrom`

```bash
rfrom [TARGET] [-b/--branch BRANCH] [--debug]
```

Rebase a branch onto the target. Pulls `TARGET`, switches back to the working branch, and runs `git rebase TARGET`. If the working branch equals the target, it only pulls.

| Argument / option | Default | Meaning |
| ----------------- | ------- | ------- |
| `TARGET` (positional) | `$GIT_DEFAULT_BRANCH` | The branch to rebase onto. |
| `-b`, `--branch` | current branch | The branch to rebase (checked out first if given). |

### `rhooks`

```bash
rhooks [-f/--force] [-r/--repository PATH] [-d/--directory PATH] [--debug]
```

Copy the template hooks into every repository under a directory tree. Finds every `.git/hooks` path under `--directory` and copies `git/git-templates/hooks` from `--repository` into each.

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `-f`, `--force` | off | Overwrite existing hook directories (removes and re-copies). Without it, repos whose hooks already exist are skipped. |
| `-r`, `--repository` | `$GIT_PATH_CONFIG` | The Ponos configuration repository (source of the hooks). Must exist. |
| `-d`, `--directory` | `$GIT_PATH` | The directory tree to scan for repositories. Must exist. |

> `--directory` defaults to `$GIT_PATH`, which is **not** set by the tracked `.zshrc`; pass `-d` explicitly or export `GIT_PATH` to point at your repositories root.

## System extensions — `sys_ext.py`

Aliased in `.zshrc` as `uport`, `kport`. Both accept `-d`/`--debug`.

### `uport`

```bash
uport PORT [-d/--debug]
```

Scan a TCP port for listeners with `lsof -i :PORT -sTCP:LISTEN`, print the raw `lsof` output, and report the listening PID(s) — or that the port is free.

### `kport`

```bash
kport PORT [-d/--debug]
```

Resolve the listeners as `uport` does, then send each PID a `SIGTERM` (`kill -15`). Reports when there is no process to kill.

> **Port validation note.** Both commands pass `PORT` through a `check_port` guard whose bounds check (`0 >= port and port <= 65535`) only rejects `0` and negative values; out-of-range high ports are not rejected. `lsof` simply finds nothing for a non-listening port.

## Git aliases

`setup_git` installs these global aliases (`git <alias>`). `${GIT_DEFAULT_BRANCH}` and `${GIT_BRANCH_PREFIX}` are expanded at configuration time.

| Alias | Expands to | Purpose |
| ----- | ---------- | ------- |
| `def` | `c ${GIT_DEFAULT_BRANCH}` | Checkout the default branch. |
| `st` | `status -s` | Short status. |
| `ct` | `commit` | Commit. |
| `br` | `branch` | List/manage branches. |
| `cb` | `checkout -b` | Create and switch to a branch. |
| `c` | `checkout` | Switch branches. |
| `cmb` | `checkout -b ${GIT_BRANCH_PREFIX}/$1` | New prefixed branch (e.g. `git cmb login` → `jdoe/login`). |
| `cm` | `checkout ${GIT_BRANCH_PREFIX}/$1` | Switch to a prefixed branch. |
| `df` | `diff` | Diff. |
| `del` | `branch -D` | Force-delete a branch. |
| `rb` | `reset --hard` | Hard reset. |
| `hist` | `log -p` | History with patches. |
| `tree` | `log --graph --pretty=…` | Decorated commit graph. |

## Shell aliases & shortcuts (`.zshrc`)

| Alias | Command |
| ----- | ------- |
| `sync_mac` | Run the orchestrator. |
| `ll` | `ls -l` |
| `..`, `...` | `cd ..`, `cd ../..` |
| `g`, `k` | `git`, `kubectl` |
| `sshk` | `ssh-add -L` |
| `perso`, `pro`, `asso` | `cd` into the dev directories and `ll`. |
| `uport`, `kport`, `bclean`, `rfrom`, `rhooks` | The Python CLI extensions. |

Word-wise navigation is bound for `Option/Alt + Arrow` (`backward-word` / `forward-word`) across the common terminal escape sequences.
