# ADR 002 — Homebrew Bundle for declarative packages

## Status

Accepted

## Context

The workstation needs a sizeable, evolving set of CLI tools, casks and fonts. Installing them with a hand-maintained list of `brew install` commands is verbose, non-declarative, and awkward to diff. Two packages (the container runtime and the browser) are machine-specific choices that should not be hard-coded into the shared list.

## Decision

Declare the base package set in a **`Brewfile`** and install it with **`brew bundle`**. At run time, `build_effective_brewfile` copies the tracked Brewfile to a temp file and **appends the interactive selections** (container runtime, browser), so the base file stays generic while per-machine choices are layered on and then discarded. `brew bundle` failures are tolerated (see [ADR 001](/ponos/technical/adr/001-idempotent-bash-orchestrator)).

## Consequences

- **Pros:** The package set is a single declarative file, trivially diffable and reviewable. `brew bundle` is idempotent — already-installed packages are skipped. The effective-Brewfile pattern keeps machine-specific choices out of version control.
- **Cons / trade-offs:** Homebrew is the single point of dependency for the whole toolset; a Homebrew outage or a renamed cask breaks a run (mitigated by fail-soft). Casks that install into `/Applications` can raise a `sudo` prompt outside Ponos's control. The base Brewfile already pins `docker-desktop`, so the container *choice* mainly adds `docker-compose`/`colima` rather than gating Docker itself.
- **Alternatives rejected:** A shell loop over `brew install` (imperative, no idempotency guarantees) and MacPorts / manual `.dmg` installs (less declarative, no bundle concept).
