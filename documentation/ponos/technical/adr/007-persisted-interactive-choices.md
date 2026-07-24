# ADR 007 — Persisted interactive choices with env-var override

## Status

Accepted

## Context

Two setup decisions are genuinely per-machine — the container runtime and the browser — so they can't be hard-coded in the shared Brewfile. But the tool must serve two audiences: a human at a keyboard who should be asked once, and an unattended pipeline that must never block on a prompt. Re-asking the same questions on every run is friction; blocking forever on a `read` in CI is a failure.

## Decision

Resolve each choice through a **three-tier precedence** and **persist the result**:

1. If a `PONOS_CONTAINER` / `PONOS_BROWSER` environment variable is set, use it (no prompt).
2. Else, if stdin is **not a TTY**, use the default (or previously persisted value) — never block.
3. Else prompt interactively, defaulting to the persisted/previous answer.

The resolved values are written to `~/.config/ponos/install-choices.env` and reloaded at the start of the next run, so an interactive user is effectively asked only once.

## Consequences

- **Pros:** One script serves both interactive and unattended use. Humans answer once; automation is deterministic via env vars; CI never hangs. Persistence is a plain sourced env file — trivial to inspect, edit or delete.
- **Cons / trade-offs:** Three input sources for one value add cognitive overhead when reasoning about "why did it pick that". Persisted answers can go stale (delete the file to reset). The persisted file is world-readable config in `~/.config`; acceptable only because the values are non-sensitive.
- **Alternatives rejected:** Always prompting (breaks automation, annoys on re-run), a committed config file (leaks per-machine choices into the shared repo), and flags-only with no persistence (every run must re-specify the choices).
