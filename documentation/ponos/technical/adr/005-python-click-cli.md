# ADR 005 — Python + Click for the CLI extensions

## Status

Accepted

## Context

A handful of daily chores — pruning branches, rebasing onto the default branch, redeploying hooks, freeing ports — deserve first-class commands with proper argument parsing, defaults, help text and consistent output. Writing these as raw shell functions makes option handling and error reporting tedious and inconsistent.

## Decision

Implement the helpers as **Python 3 scripts using [Click](https://click.palletsprojects.com/)**, grouped into two command groups — `git_ext` (`bclean`, `rfrom`, `rhooks`) and `sys_ext` (`uport`, `kport`) — and surface them as `.zshrc` aliases. Commands read defaults from environment variables (`GIT_DEFAULT_BRANCH`, `GIT_PATH_CONFIG`, `GIT_PATH`), shell out to `git`/`lsof`/`kill` via `subprocess`, log through a shared **`colorlog`** logger, and expose a `--debug` flag that re-raises the underlying error.

## Consequences

- **Pros:** Free `--help`, argument validation, defaults and subcommands from Click. Output colour matches the bash orchestrator's palette, so the whole toolkit feels uniform. Environment-driven defaults make the commands behave like native Git subcommands.
- **Cons / trade-offs:** Adds a Python + `click` + `colorlog` runtime dependency to what is otherwise a shell tool (installed by the pyenv step, creating a soft ordering dependency). Shelling out to `git`/`lsof` parses text output, which is brittle across versions. Some validation is imperfect (e.g. the `check_port` bounds check) and there is no test coverage.
- **Alternatives rejected:** Pure shell functions/aliases (poor option parsing and error handling) and Git's own alias mechanism (fine for one-liners like `st`/`tree`, but not for multi-step logic with prompts and branch inspection).
