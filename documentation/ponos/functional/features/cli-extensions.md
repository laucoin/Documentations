# Feature: Developer CLI Extensions

## 1. Overview

- **Goal:** Give the day-to-day workflow a handful of short, memorable commands for common Git and system chores.
- **Target audience:** The Daily Driver.

Ponos ships five shell aliases backed by two Python/Click command groups. They are wired up in `.zshrc` and share a common coloured logger, so their output matches the rest of the tooling.

| Alias | Backed by | Purpose |
| ----- | --------- | ------- |
| `bclean` | `git_ext.py bclean` | Delete stale local branches. |
| `rfrom` | `git_ext.py rfrom` | Rebase the current (or a named) branch onto the default branch. |
| `rhooks` | `git_ext.py rhooks` | Re-deploy Git template hooks across all repositories under a directory. |
| `uport` | `sys_ext.py uport` | Show which process is listening on a TCP port. |
| `kport` | `sys_ext.py kport` | Terminate the process listening on a TCP port. |

The precise flags and defaults are documented in [Technical → CLI Reference](../../technical/cli-reference).

## 2. Access & Trust Boundary

These commands act on the current user's repositories and processes. `kport` sends `SIGTERM` to processes the user owns. See [Actors & Trust Boundary](../roles-and-permissions).

## 3. Behaviour

- **`bclean [branch]`** — switches to the default branch, then deletes every local branch except the protected set (`develop`, `main`, `master`, plus the given/default branch). Reports the deleted branches, or that the repo is already clean.
- **`rfrom [target]`** — pulls `target` (default: `GIT_DEFAULT_BRANCH`), switches back to the working branch, and rebases it onto `target`. If the working branch *is* the target, it just pulls.
- **`rhooks`** — finds every `.git/hooks` directory under the repositories directory and copies the template hooks into each; `--force` overwrites existing hooks, otherwise they are skipped.
- **`uport <port>`** — runs `lsof` for listeners on the port and prints the matching PIDs (or reports the port is free).
- **`kport <port>`** — resolves the listeners as `uport` does, then sends each PID a `SIGTERM`.

## 4. Business rules

- **Repository guard.** The Git commands verify the current directory is a repository before acting.
- **Protected branches.** `bclean` never deletes `develop`, `main`, `master`, the requested branch, or the currently checked-out branch.
- **Graceful degradation.** Each command logs a clear error and stops (or continues, for `rhooks`) on failure; a `--debug` flag re-raises the underlying error for troubleshooting.
- **Non-destructive scanning.** `uport` only reads; only `kport` sends a signal.

## 5. Behavioural scenarios (BDD)

```gherkin
Scenario: Cleaning merged local branches
  Given a repository with several merged feature branches
  When I run bclean
  Then it switches to the default branch
  And deletes every local branch except develop, main, master and the default
  And reports which branches were removed

Scenario: Repository already clean
  Given a repository with only protected branches
  When I run bclean
  Then it reports the repository is already clean and deletes nothing

Scenario: Rebasing onto the default branch
  Given I am on feature/login and main has new commits
  When I run rfrom
  Then main is pulled, my branch is checked out, and it is rebased onto main

Scenario: Inspecting a busy port
  Given a process is listening on port 4200
  When I run uport 4200
  Then the listening PID is printed

Scenario: Freeing a busy port
  Given a process is listening on port 4200
  When I run kport 4200
  Then the process receives a SIGTERM

Scenario: Running a Git command outside a repository
  Given the current directory is not a Git repository
  When I run bclean
  Then it logs that this is not a repository and does not act
```
