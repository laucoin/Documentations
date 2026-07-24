# ADR 003 — Symlinked dotfiles with backup (optional chezmoi)

## Status

Accepted

## Context

Configuration files (zsh, starship, ssh, vim, VS Code, git, opencode) must stay in sync with the repository so the repo is the single source of truth. A copy-based approach drifts: edit the live file and the repo copy is stale, or edit the repo and nothing changes until the next sync. The setup must also never silently destroy a hand-written config that already exists on the machine.

## Decision

Manage dotfiles as **symlinks** from the repository into `$HOME`, created by a single `ensure_symlink` primitive. It detects a correct existing link (no-op), replaces a wrong one, and **backs up any real file** to `<target>.backup.<timestamp>` before linking. A missing source is a logged error, not a crash. **chezmoi** is supported as an optional extra layer (`chezmoi apply`) when present, but is never required.

## Consequences

- **Pros:** Editing the repo copy is instantly live. Re-runs are true no-ops when links are already correct. User data is never destroyed — it is moved aside with a timestamp. The primitive is reused for every managed file, so behaviour is uniform.
- **Cons / trade-offs:** Symlinks can confuse tools that resolve real paths, and a broken repo path breaks every link at once. Backups accumulate over time and are never cleaned up. The optional chezmoi layer adds a second, overlapping mechanism that can be confusing if both manage the same file.
- **Alternatives rejected:** Copying files (drift, no live edits), a bare Git repo checked out over `$HOME` (fragile, easy to clobber untracked files), or making chezmoi mandatory (an extra hard dependency for a job symlinks already do).
