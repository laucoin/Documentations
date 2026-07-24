# Functional Documentation

Ponos is the tooling that sets up and maintains a macOS development machine. Everything here is described from the point of view of the person who uses it — what it does to a Mac, who runs it, and the rules that govern each behaviour. The engineering behind it lives in the [Technical Documentation](../technical/).

## What Ponos is, in one paragraph

Ponos turns a fresh (or drifted) Mac into a fully configured developer workstation by running **one idempotent script**, `sync_mac.sh`. It installs a curated list of applications and command-line tools through Homebrew, asks a couple of setup questions (which container runtime, which browser) and remembers the answers, symlinks a set of tracked **dotfiles** into place with automatic backups, installs per-language toolchains (Python via pyenv, Node via nvm, Java via SDKMAN), configures Git globally — including a shared ignore file and a template hooks directory — and lays down editor configuration for Vim, VS Code and Opencode. Beyond the one-time setup, Ponos also ships a small set of **developer CLI helpers** (shell aliases backed by Python/Click scripts) that the same person uses every day: cleaning stale branches, rebasing onto the default branch, re-deploying Git hooks across repositories, and freeing busy TCP ports. The whole thing is **safe to re-run**: existing configuration is detected, only what changed is touched, and real files are backed up before they are replaced.

> The name comes from **Ponos**, the Greek personification of hard labour and toil — the drudgery of machine setup, done once and for all by a script.

## Core concepts

| Concept | What it means to the user |
| ------- | ------------------------- |
| **Bootstrap** | A single run of `sync_mac.sh` that brings the machine to its declared target state. Idempotent — re-running it only applies what is missing or changed. |
| **Brewfile** | The declarative list of Homebrew formulae and casks that make up the base toolset. |
| **Interactive choice** | A setup question (container runtime, browser) whose answer is persisted so future runs don't ask again. |
| **Dotfile** | A tracked configuration file (zsh, starship, ssh, vim, VS Code, git…) symlinked from the repository into your home directory. |
| **Toolchain** | A per-language runtime installed through its own version manager: pyenv, nvm, SDKMAN. |
| **CLI extension** | A shell alias (`bclean`, `rfrom`, `rhooks`, `uport`, `kport`) backed by a Python/Click script, used in daily development. |
| **Template hook** | A Git hook (`commit-msg`, `pre-push`) installed into every repository via Git's template directory to enforce commit conventions and guard risky pushes. |

## Scope and non-goals

| In scope | Out of scope |
| -------- | ------------ |
| A single, personal macOS workstation | Fleet / MDM management of many machines |
| Idempotent, re-runnable setup driven by one script | A one-shot installer that must run on a pristine machine only |
| Declarative package install via Homebrew Bundle | A hand-written list of `brew install` commands |
| Personal dotfiles symlinked with backup | A cloud settings-sync service |
| Per-language version managers (pyenv, nvm, SDKMAN) | Global system-wide runtime installs |
| Opinionated Git governance and conventional-commit hooks | A team-wide CI policy engine |
| Small, focused developer CLI helpers | A general-purpose task runner or build system |
| macOS only (guarded at startup) | Linux or Windows support |

## Documentation map

| Page | Purpose |
| ---- | ------- |
| [Personas](./personas) | Who runs Ponos and what each context needs from it |
| [Actors & Trust Boundary](./roles-and-permissions) | The security baseline: who runs it, what it is allowed to touch, privilege escalation, secrets and network access |
| [Workflows](./workflows) | End-to-end journeys, from bootstrapping a fresh Mac to daily branch and port hygiene |
| [Features](./features/bootstrap) | One page per capability, each with its behaviour rules and BDD scenarios |
