# Workflows

These are the journeys Ponos exists to support. Each is described from the actor's point of view, with the tooling doing the work behind the scenes.

## W1 — Bootstrap a fresh Mac

1. I clone the Ponos repository and, before the first run, put my Git identity in `~/.zshenv` (`GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_EDITOR`, `GIT_DEFAULT_BRANCH`, `GIT_BRANCH_PREFIX`).
2. I run `./sync_mac.sh`.
3. The script checks it is on macOS, installs Homebrew if it is missing, then asks two questions — **which container runtime** and **which browser** — and remembers my answers.
4. It installs every package in the Brewfile plus my selections, applies dotfiles, sets up Python/Node/Java toolchains, installs the Hack Nerd Font, configures Git, and lays down Vim, VS Code and Opencode configuration.
5. It restarts Finder, Dock and the menu bar so changes take effect, and prints a success line.

**Why this matters**: a brand-new laptop goes from "fresh macOS" to "ready to code" with one command and two answers.

## W2 — Re-sync after changing a package or a dotfile

1. I edit the `Brewfile` (add a tool) or a file under `dotfiles/`.
2. I run `sync_mac` (the alias) again.
3. Ponos detects everything that is already in place — symlinks that already point at the repo are left alone, installed plugins are skipped — and only applies the delta: the new package installs, the changed dotfile is already live because it is symlinked.

**Why this matters**: the repository is the single source of truth; re-running reconciles the machine to it without side effects.

## W3 — Run unattended (automation / CI)

1. I export deterministic choices ahead of time: `PONOS_CONTAINER=colima` and `PONOS_BROWSER=brave-browser`.
2. A provisioning job runs `./sync_mac.sh` with no TTY attached.
3. Ponos sees stdin is not interactive, **skips every prompt**, honours the `PONOS_*` overrides, and persists them to `~/.config/ponos/install-choices.env` for later interactive runs.
4. The run completes without ever blocking on input.

**Why this matters**: the exact same script serves both a human at a keyboard and an unattended pipeline.

## W4 — Keep a repository's branches tidy

1. I have finished several feature branches that are now merged.
2. I run `bclean` inside the repository.
3. Ponos switches to the default branch and deletes every local branch except the protected ones (`develop`, `main`, `master`, plus the default), reporting exactly which branches it removed — or telling me the repo is already clean.

**Why this matters**: merged local branches stop piling up, without me listing them by hand.

## W5 — Rebase my work onto the latest default branch

1. I am on a feature branch and `main` has moved on.
2. I run `rfrom` (optionally `rfrom <target>`).
3. Ponos pulls the default branch, switches back to my branch, and rebases it onto the freshly updated default — with each step logged.

**Why this matters**: staying up to date with the base branch is a single command instead of a four-step dance.

## W6 — Roll updated Git hooks out to every repository

1. I improve the `commit-msg` or `pre-push` hook in the Ponos repo.
2. I run `rhooks` (pointing it at my repositories directory, or relying on `GIT_PATH`).
3. Ponos finds every `.git/hooks` directory under that path and copies the latest hook templates into each one — with `--force` to overwrite hooks that already exist, or skipping them otherwise.

**Why this matters**: the hooks in the repo are the source of truth, and one command propagates them everywhere.

## W7 — Commit and push with guard rails

1. I commit with a loose message like `wip debugging`.
2. The `commit-msg` template hook recognises the work-in-progress prefix and rewrites it to `[skip ci] wip debugging` to save CI time. For an off-convention message, it tries to synthesise a valid Conventional-Commit message from my branch name (e.g. `feat/login` → `feat: …`); if it cannot, it rejects the commit with the list of allowed keywords.
3. Later I run `git push` while on `main`.
4. The `pre-push` template hook detects the protected branch and asks me to confirm before it lets the push through — the same guard fires on a detected force push.

**Why this matters**: commit conventions and dangerous pushes are handled by the machine, consistently, in every repository.

## W8 — Free a busy TCP port

1. A dev server refuses to start because port `4200` is already in use.
2. I run `uport 4200` to see which process is listening, then `kport 4200` to terminate it.
3. Ponos scans the port with `lsof`, reports the offending PID(s), and (for `kport`) sends them a `SIGTERM`.

**Why this matters**: a stuck port is cleared in one command instead of a manual `lsof`/`kill` hunt.
