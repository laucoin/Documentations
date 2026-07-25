# ADR 006 — PostgreSQL schema via Flyway, fuzzy search via pg_trgm

## Status

Accepted

## Context

The registry needs a relational store with a schema that evolves safely across many deployments, and it needs a "search participants / vehicles / activities" experience that tolerates typos, partial names, and substring matches — the kind of forgiving lookup users expect from a modern app.

Two problems sit underneath that sentence.

The first is **schema ownership**. The runtime data access is reactive R2DBC ([ADR 002](/registry/technical/adr/002-reactive-webflux-r2dbc)), which deliberately has no schema-management story — R2DBC reads and writes rows, it does not create tables. Something else has to own the DDL, and it has to be reproducible: the same migrations must produce the same schema on a developer laptop, in CI, and in production, with no manual "run this SQL by hand" steps.

The second is **search**. A registry of participants and their vehicles and activities is exactly the dataset people want to search loosely — "find everyone whose name looks like *Dupon*", "the blue Renault", "that activity about kayaking". Exact-match `WHERE name = ?` is useless for this; naive `LIKE '%term%'` is both slow and still exact about characters. The heavyweight answer is a dedicated search engine (Elasticsearch / OpenSearch), but that is another stateful system to run, back up, and keep in sync for a dataset that is, realistically, modest.

## Decision

Own the schema with **Flyway migrations**, and provide fuzzy search with PostgreSQL's **`pg_trgm`** extension — no separate search engine.

**Flyway.** The schema is a set of versioned, forward-only migrations (`V1_0_0` … `V1_11_0`) applied on application boot over a plain JDBC connection, before the app starts serving traffic. Flyway is the single source of truth for the schema; the R2DBC runtime never issues DDL. This keeps the schema versioned, diffable in review, and reproducible everywhere from the same ordered set of scripts.

**Trigram search.** The searchable tables — user, participant, vehicle, activity — each carry a `STORED GENERATED` `search_text` column that concatenates the fields worth searching (for a participant, first + last + email; for a vehicle, plate + brand + model). Each `search_text` column is backed by a **GIN index using `gin_trgm_ops`**, so PostgreSQL can answer fuzzy and substring queries against a precomputed, indexed blob rather than scanning rows. Result set sizes are capped by configuration so an over-broad term cannot return the whole table.

## Consequences

### Positive

- **The schema is versioned and reproducible.** Every structural change is a reviewed migration with a version number; there is no drift between environments and no manual DDL step. Boot-time application means a deployment either has the right schema or fails loudly, never half-migrated by hand.
- **Good-enough fuzzy search with no extra infrastructure.** `pg_trgm` gives typo-tolerant, substring, and similarity search directly in the database we already run and back up. There is no second datastore to operate, no sync pipeline, and no eventual-consistency window between the record and its search index — the generated column is always in step with the row.
- **Search cost is paid at write time, read stays fast.** Because `search_text` is a stored generated column with a GIN index, reads hit a precomputed index instead of concatenating and scanning on every query.
- **One backup, one recovery story.** Search state lives inside PostgreSQL, so restoring the database restores the search index with it.

### Negative

- **Trigram search is not a search engine.** There is no relevance tuning, no stemming, no ranking model, no synonyms, no language analysis. It matches character trigrams, and that is the whole ceiling. For "find the record" it is excellent; for "rank the ten most relevant results" it is not the right tool.
- **Generated columns and GIN indexes add write cost.** Every insert or update recomputes `search_text` and maintains a GIN index, which is more expensive to update than a plain B-tree. On a write-heavy table this would matter; on a registry it is an acceptable tax.
- **Forward-only discipline.** Migrations are append-only. A mistake is corrected by a new migration, never by editing a released one, and that discipline has to be understood by everyone who touches the schema.
- **Two access technologies against one database.** Flyway uses JDBC for DDL, the app uses R2DBC for DML. That split is deliberate but is one more thing a newcomer has to understand about why there are two database dependencies.

### Why not a dedicated search engine (Elasticsearch / OpenSearch)

A real search engine wins decisively on relevance, ranking, and linguistic features, and at large scale it is the correct answer. But it is a second stateful system to deploy, secure, back up, and keep synchronized with the source of truth, and it introduces an indexing lag between writing a record and finding it. For a dataset of this size, `pg_trgm` covers the actual requirement — forgiving lookup — at a fraction of the operational cost. If the product later needs true relevance ranking or multilingual analysis, that is a clean future ADR that supersedes this one.

### Why not manage the schema from the application at runtime

Letting the app create or alter tables on the fly (or leaning on an ORM's "auto-DDL") removes the versioning that makes environments reproducible: there is no ordered history to review, no way to know which structure a given deployment actually has, and no safe rollback story. Flyway's explicit, ordered, forward-only migrations make the schema an auditable artifact rather than an emergent side effect.
