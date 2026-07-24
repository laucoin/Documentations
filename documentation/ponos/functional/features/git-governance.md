# Feature: Git Configuration & Template Hooks

## 1. Overview

- **Goal:** Configure Git globally in an opinionated, reproducible way, and enforce commit conventions and safe pushes in **every** repository through Git's template directory.
- **Target audience:** The Operator (configures) and the Daily Driver (commits and pushes).

Ponos owns the global Git configuration and installs two template hooks — `commit-msg` and `pre-push` — that Git copies into each new repository automatically.

## 2. Access & Trust Boundary

Configures the user's global Git (`~/.gitconfig`) and points Git at the repository's template hooks. Git identity is read from the environment, never stored in the repo. See [Actors & Trust Boundary](../roles-and-permissions).

## 3. What is configured

**Global config** — identity (`user.name`, `user.email`) from environment variables, `core.editor`, a global `core.excludesFile` pointing at `dotfiles/git/ignore`, `push.default = current`, `init.defaultBranch`, and `init.templateDir` pointing at the repository's `git-templates`. A set of aliases (`st`, `cb`, `cm`, `cmb`, `tree`, …) is also installed; see [Technical → CLI Reference](../../technical/cli-reference#git-aliases).

**Template hooks** — because `init.templateDir` is set, every `git init` / `git clone` gets these hooks:

| Hook | What it enforces |
| ---- | ---------------- |
| **`commit-msg`** | Validates the message against Conventional-Commit keywords (`build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `BREAKING_CHANGE`). A `wip …` message is prefixed with `[skip ci]`. An off-convention message triggers an attempt to synthesise a valid one from the branch name; if that fails, the commit is rejected with guidance. |
| **`pre-push`** | Requires interactive confirmation when pushing to a protected branch (`master`, `main`, `develop`) or when a **force push** is detected. |

## 4. Business rules

- **Required environment variables.** `setup_git` needs `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_EDITOR`, `GIT_DEFAULT_BRANCH` and `GIT_BRANCH_PREFIX`. If any is missing, the step logs each missing variable and is skipped — it never writes a partial config.
- **Branch-derived commits.** For a branch like `feat/login`, an off-convention message can be rewritten to a conforming `feat: …` message; the optional scope is taken from the trailing path segment.
- **CI-saving WIP.** Messages starting with `wip` are prefixed with `[skip ci]` to avoid burning CI minutes on work-in-progress commits.
- **Protected-branch and force-push guards.** `pre-push` blocks until the user confirms `y`/`yes` for a protected branch or a force push.
- **Template propagation.** New repositories receive the hooks automatically; existing repositories are updated on demand with [`rhooks`](./cli-extensions).

## 5. Behavioural scenarios (BDD)

```gherkin
Scenario: Configuring Git with all variables present
  Given GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, GIT_EDITOR, GIT_DEFAULT_BRANCH and GIT_BRANCH_PREFIX are set
  When setup_git runs
  Then the global user, editor, excludes file, default branch, template dir and aliases are configured

Scenario: Missing a required Git variable
  Given GIT_AUTHOR_EMAIL is not set
  When setup_git runs
  Then it logs the missing variable and skips Git configuration

Scenario: Rewriting an off-convention commit from the branch name
  Given I am on branch feat/login
  When I commit with the message "add form"
  Then the commit-msg hook rewrites it to "feat(login): add form"

Scenario: Skipping CI for a work-in-progress commit
  Given I commit with the message "wip refactor"
  When the commit-msg hook runs
  Then the message becomes "[skip ci] wip refactor"

Scenario: Rejecting an unconvertible commit message
  Given I am on a branch whose name carries no valid keyword
  And I commit with an off-convention message
  When the commit-msg hook runs
  Then the commit is rejected with the list of allowed keywords

Scenario: Confirming a push to a protected branch
  Given I am on the main branch
  When I run git push
  Then the pre-push hook asks me to confirm before the push proceeds

Scenario: Confirming a force push
  Given my last command was a force push
  When the pre-push hook runs
  Then it asks me to confirm before the push proceeds
```
