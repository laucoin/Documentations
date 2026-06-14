# Technical Documentation

This section covers the engineering design of Project B: architectural decisions, system diagrams, and operational runbooks.

## Structure

| Folder / File | Purpose |
|---------------|---------|
| `adr/` | Architecture Decision Records |
| `diagrams/` | System architecture, data flow, deployment topology |
| `runbooks/` | Operational procedures and incident playbooks |

## ADR format

Each ADR lives in `adr/[NNN]-[short-title].md` and follows this structure:

```markdown
# ADR NNN — Title

## Status
Accepted | Superseded by ADR NNN | Deprecated

## Context
What problem or constraint triggered this decision?

## Decision
What was decided?

## Consequences
What are the trade-offs, risks, and follow-up actions?
```
