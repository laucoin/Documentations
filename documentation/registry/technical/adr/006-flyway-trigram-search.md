---
title: 'ADR 006 — PostgreSQL schema via Flyway, fuzzy search via pg_trgm'
description: 'Why the schema is managed by Flyway and fuzzy search is entrusted to pg_trgm.'
---

# ADR 006 — PostgreSQL schema via Flyway, fuzzy search via pg_trgm

## Status

<Badge type="tip" text="Accepted" />

## Context

The registry needs relational storage whose schema evolves safely across many deployments, and a "search participants / vehicles / activities" experience that tolerates typos, partial names and substring matches — the kind of forgiving search users expect from a modern application.

Two problems hide behind that sentence.

The first is **schema ownership**. Runtime data access is reactive R2DBC ([ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)), which deliberately has no schema management story — R2DBC reads and writes rows, it does not create tables. Something else must own the DDL, and it must be reproducible: the same migrations must produce the same schema on a developer's machine, in CI and in production, with no manual "run this SQL by hand" step.

The second is **search**. A registry of participants, their vehicles and activities is exactly the data set you want to search loosely — "find everyone whose name looks like _Dupon_", "the blue Renault", "that kayaking activity". An exact `WHERE name = ?` is useless here; a naive `LIKE '%term%'` is both slow and still character-exact. The heavyweight answer is a dedicated search engine (Elasticsearch / OpenSearch), but that is one more stateful system to operate, back up and keep in sync, for a data set that realistically stays modest.

## Decision

Own the schema with **Flyway migrations**, and provide fuzzy search with PostgreSQL's **`pg_trgm`** extension — without a separate search engine.

**Flyway.** The schema is a set of versioned, forward-only migrations (`V1_0_0`, `V1_1_0`, …), applied at application startup over a plain JDBC connection, before the application serves traffic. Flyway is the single source of truth for the schema; the R2DBC runtime never issues DDL. This keeps the schema versioned, diffable in review and reproducible everywhere from the same ordered set of scripts.

**Trigram search.** The searchable tables — user, participant, vehicle, activity, and since `V1_13_0` also alert and communication — each carry a `STORED GENERATED` `search_text` column that concatenates the fields worth searching (for a participant, first name + last name; for a vehicle, plate + make + model). Each `search_text` column is backed by a **GIN index using `gin_trgm_ops`**, so that PostgreSQL can answer fuzzy and substring queries on a precomputed, indexed blob rather than scanning rows. Search requires a minimum word similarity, and result set sizes are capped by configuration so that an overly broad term cannot return the whole table.

## Consequences

### Positive

- **The schema is versioned and reproducible.** Every structural change is a reviewed migration with a version number; there is no drift between environments and no manual DDL step. Applying at startup means a deployment either has the right schema or fails loudly, never half-migrated by hand.
- **Good-enough fuzzy search without extra infrastructure.** `pg_trgm` provides typo-tolerant, substring and similarity search directly in the database we already operate and back up. No second datastore to operate, no sync pipeline, and no eventual-consistency window between the record and its search index — the generated column is always in step with the row.
- **The cost of search is paid on write, reads stay fast.** Since `search_text` is a stored generated column with a GIN index, reads hit a precomputed index instead of concatenating and scanning on every query.
- **One backup, one restore story.** Search state lives in PostgreSQL; restoring the database therefore restores the search index with it.

### Negative

- **Trigram search is not a search engine.** No relevance tuning, no stemming, no ranking model, no synonyms, no linguistic analysis. It matches character trigrams, and that is its ceiling. For "find the record" it is excellent; for "rank the ten most relevant results" it is not the right tool.
- **Generated columns and GIN indexes add write cost.** Every insert or update recomputes `search_text` and maintains a GIN index, which is costlier to update than a plain B-tree. On a write-heavy table this would matter; on a registry, it is an acceptable tax.
- **Forward-only discipline.** Migrations are append-only. A mistake is fixed by a new migration, never by editing a published one, and this discipline must be understood by everyone who touches the schema.
- **Two access technologies for one database.** Flyway uses JDBC for DDL, the application uses R2DBC for DML. This split is deliberate, but it is one more thing a newcomer has to understand about why there are two database dependencies.

### Why not a dedicated search engine (Elasticsearch / OpenSearch)

A real search engine clearly wins on relevance, ranking and linguistic features, and at large scale it is the right answer. But it is a second stateful system to deploy, secure, back up and keep in sync with the source of truth, and it introduces an indexing delay between writing a record and its discovery. For a data set of this size, `pg_trgm` covers the real need — forgiving search — for a fraction of the operational cost. If the product later needs real relevance ranking or multilingual analysis, that will be a clean future ADR superseding this one.

### Why not manage the schema from the application at runtime

Letting the application create or alter tables on the fly (or relying on an ORM's "auto-DDL") removes the versioning that makes environments reproducible: no ordered history to review, no way of knowing what structure a given deployment actually has, and no safe rollback. Flyway's explicit, ordered, forward-only migrations make the schema an auditable artifact rather than an emergent side effect.
