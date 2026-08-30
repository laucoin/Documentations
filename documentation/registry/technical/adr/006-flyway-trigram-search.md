# ADR 006 — Flyway migrations and trigram search in PostgreSQL

## Status

Accepted

## Context

Two questions with one answer.

**Schema evolution.** Registry's schema grew feature by feature — groups, then vehicles, then activities, then communications, then alerts — each bringing tables *and* the permission rows the feature needs. Both parts must arrive together in every environment, or the feature ships without the rights to use it.

**Search.** Almost every list is searched by name, over data typed by hand at a gate, on a phone, in a hurry. Exact matching is useless against "Sofie" for "Sophie". A dedicated search server would be a second stateful service to run, back up and keep in sync for what is fundamentally a name-matching problem over a few thousand rows.

## Decision

Use **Flyway**, forward-only, running at boot over JDBC, with the convention that a feature ships as a pair: `V<x>_<y>_0` for the structure and `V<x>_<y>_1` for its permission seed.

Use PostgreSQL's **`pg_trgm`** extension for search. Each searchable table carries a `search_text` column declared `GENERATED ALWAYS … STORED`, concatenating the fields that should match, with a **GIN trigram index** over it. Queries filter on `similarity(search_text, :textSearched) > 0` and order by that score.

| Table | `search_text` concatenates |
| ----- | -------------------------- |
| `tb_user` | first name · last name · email |
| `tb_participant` | first name · last name |
| `tb_vehicle` | licence plate · brand · model |
| `tb_activity` | name · description |

## Rationale & best practices

- **Operability:** no second datastore. Search is backed up, restored and migrated with the database, and is transactionally consistent with it by construction.
- **Correctness:** a generated column can never drift from its source fields — there is no synchronisation code to forget.
- **Auditability:** forward-only migrations mean every environment shares one history. `V1_12_0` is the pattern: `V1_3_0` created the activity indexes on the wrong table, and the fix is a *new* migration that drops and recreates them, with a comment saying why, rather than an edit that would desynchronise environments that already ran it.

## Consequences

- **Pros:** one datastore to operate. Typo-tolerant search at low cost. Schema and its permission seed always arrive together. Migration history is a readable record of how the domain grew.
- **Cons / trade-offs:** trigram similarity does not scale to very large corpora and has no stemming, ranking or multilingual analysis — it is name matching, not full-text search. Stored generated columns add write cost and storage. Flyway has no reactive driver, so the boot-time migration is the one place the application uses JDBC. Forward-only means mistakes are corrected by adding migrations, which lengthens the history.
- **Alternatives rejected:** Elasticsearch or OpenSearch (far better search, at the cost of a second stateful service and a sync problem); PostgreSQL full-text search (`tsvector` — better for prose, worse for the fuzzy short-name matching that actually matters here); Liquibase (comparable, but Flyway's plain-SQL migrations are more legible for a SQL-heavy schema).
