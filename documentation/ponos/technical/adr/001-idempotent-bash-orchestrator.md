# ADR 001 — A single idempotent Bash orchestrator

## Status

Accepted

## Context

Setting up a Mac involves a dozen loosely related chores: install a package manager, install packages, link config files, install language runtimes, configure Git, restart affected apps. This has to be **repeatable** — run on a fresh laptop, and re-run later after the repo changes — without leaving the machine half-configured or clobbering hand-made edits. The tool has to run on a pristine macOS with nothing but the system shell and (after a prompt) the Command Line Tools.

## Decision

Implement the whole flow as **one Bash script** (`sync_mac.sh`) run under `set -euo pipefail`, structured as small single-purpose functions orchestrated by `main`. Every step is written to be **idempotent** (check-then-act), the script **guards on macOS** at the top, and it **fails soft** on package installation so one bad package cannot abort the machine setup. A shared `log LEVEL` function gives consistent coloured output.

## Consequences

- **Pros:** Zero runtime dependencies beyond the system shell — it works on a brand-new Mac before anything else is installed. Re-runnable by design. Easy to read top-to-bottom and to extend with another `setup_*` function.
- **Cons / trade-offs:** Bash is error-prone for anything complex; `set -e` interacts subtly with some steps (e.g. the `rm ~/.gitconfig` edge case, and SDKMAN's init needing `set +eu`). There is no automated test suite, so correctness rests on careful idempotency and manual runs.
- **Alternatives rejected:** A full configuration-management tool (Ansible — which is itself *installed* by the Brewfile, not used to bootstrap) or a Makefile were heavier than a single personal machine warrants and would still need bootstrapping. Ansible remains available for larger, multi-host work (see the homelab project) but is overkill for one laptop's initial setup.
