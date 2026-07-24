# ADR 004 — Per-language version managers

## Status

Accepted

## Context

Development spans Python, Node.js and Java, and different projects need different runtime versions. A single system-wide install per language forces one global version and makes upgrades disruptive. The setup should install a sensible current version now while leaving room to switch versions per project later.

## Decision

Install each language through its **own version manager**, under `$HOME`:

- **Python → pyenv**, resolving and installing the **latest stable** `3.x.y` and setting it global, plus the `click`/`colorlog` libraries the CLIs need.
- **Node.js → nvm**, installing the current **LTS** and defaulting to `lts/*`.
- **Java → SDKMAN**, installing a **pinned** Temurin LTS and setting it default.

Each step degrades gracefully: if the manager is absent, it logs a warning and is skipped.

## Consequences

- **Pros:** Per-project version switching is available out of the box. Everything installs under the user's home, needing no elevation. Fail-soft keeps a missing manager from aborting the run.
- **Cons / trade-offs:** Three different managers mean three ecosystems, three init snippets in `.zshrc`, and slower shell startup. Python is intentionally *not* pinned (latest-stable), so two machines set up months apart may get different Python versions — deliberate for freshness, at the cost of strict reproducibility. SDKMAN's init script is incompatible with `set -eu`, requiring a local `set +eu` guard.
- **Alternatives rejected:** System/Homebrew installs of each runtime (one global version, awkward switching) and a single polyglot manager like `asdf`/`mise` (fewer moving parts, but a departure from the per-language managers already in muscle memory).
