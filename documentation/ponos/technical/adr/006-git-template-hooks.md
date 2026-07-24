# ADR 006 — Git template-directory hooks

## Status

Accepted

## Context

Commit-message conventions and guard rails on risky pushes are only useful if they apply in **every** repository, automatically, without remembering to copy hooks around. Hooks live inside each repo's `.git/hooks`, which is not version-controlled, so there needs to be a mechanism to seed new repos and refresh existing ones.

## Decision

Ship the hooks in the Ponos repo under `dotfiles/git/git-templates/hooks/` and point Git's **`init.templateDir`** at that directory in the global config. Git then copies the hooks into **every new `git init`/`git clone`**. Two hooks are provided:

- **`commit-msg`** — enforces Conventional-Commit keywords, prefixes `wip` messages with `[skip ci]`, and can synthesise a valid message from the branch name.
- **`pre-push`** — prompts for confirmation on a protected branch (`main`/`master`/`develop`) or a detected force push, reading `~/.zsh_history` to spot the force flag.

For repos that already existed before the template was set, [`rhooks`](../cli-reference#rhooks) copies the latest hooks into every `.git/hooks` under a directory tree on demand.

## Consequences

- **Pros:** New repositories are governed automatically with zero per-repo setup. The hooks are versioned in one place and propagated (`rhooks`) to existing repos. Commit hygiene and push safety are enforced by the machine, consistently.
- **Cons / trade-offs:** `init.templateDir` only affects *new* repos, so existing ones need the manual `rhooks` step. `pre-push` inferring the force flag from `~/.zsh_history` is fragile — it assumes zsh and that the last history line is the push command. The hooks are Python, so they depend on Python + `colorlog` being present. `rhooks`'s `copytree` fails on an existing hooks directory unless `--force` is given.
- **Alternatives rejected:** A managed framework like `pre-commit` (extra dependency and per-repo config file) and documenting a manual copy step (relies on discipline, drifts immediately).
