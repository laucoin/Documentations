# Personas

Ponos is a personal tool. There is really one human — me — but I run it in three distinct contexts, and each context needs something different from the tool.

## The Operator (me, setting up a machine)

The person who runs `sync_mac.sh` interactively on a Mac to bring it to its target state — a brand-new laptop, or an existing one after changing the Brewfile or a dotfile.

- **Goals**: get from "fresh macOS" to "ready to code" without a checklist; re-sync at any time without fear of breaking what already works.
- **Pain points**: forgotten manual steps, half-configured machines, dotfiles that drift out of the repo, install steps that fail and leave the machine in an unknown state.
- **What Ponos owes them**: an idempotent run that is safe to repeat, clear coloured logging of what it did, automatic backups before overwriting anything, and graceful continuation when a single package fails.

## The Automation (the same script, run unattended)

The same `sync_mac.sh`, driven without a keyboard — piped input, or a CI/provisioning job — where no one is there to answer prompts.

- **Goals**: run start-to-finish with zero interaction and deterministic choices.
- **Pain points**: a script that blocks on a `read` prompt forever, or picks a random default.
- **What Ponos owes them**: detection of a non-interactive shell (falls back to sensible defaults), and environment-variable overrides (`PONOS_CONTAINER`, `PONOS_BROWSER`) that bypass every prompt while still persisting the choice for next time.

## The Daily Driver (me, using the machine afterwards)

The same person, now working on the configured machine and leaning on the shell environment and CLI helpers Ponos installed.

- **Goals**: keep repositories tidy (`bclean`, `rfrom`), roll out updated Git hooks everywhere (`rhooks`), free a stuck port (`uport`, `kport`), and commit within convention without thinking about it (template hooks).
- **Pain points**: piles of merged local branches, a port held by a zombie process, inconsistent commit messages, hooks that exist in one repo but not another.
- **What Ponos owes them**: short, memorable aliases with consistent coloured output, guard rails on dangerous Git actions (force push, pushing to a protected branch), and a one-command way to keep every repository's hooks in sync with the source of truth.
