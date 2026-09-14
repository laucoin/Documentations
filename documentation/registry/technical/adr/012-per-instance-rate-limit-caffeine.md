# ADR 012 — Per-instance authentication rate limiting with Caffeine

## Status

<Badge type="tip" text="Accepted" />

## Context

Two endpoints are reachable before a JWT exists: `/api/v1/authentication/token` and `/token/refresh`. They are the
entire unauthenticated attack surface, so a dedicated `WebFilter` (`AuthenticationRateLimitHandler`) caps requests
per client IP with a sliding window before either is reached.

The window counters (one per `clientIp|path`) lived in a raw `ConcurrentHashMap`, with expiry handled by a
hand-rolled scheme: on roughly 1 in 1000 counter creations, sweep the whole map and drop any counter untouched for
10× the configured window. It worked, but it duplicates bookkeeping a cache library already does — and by the time
this was revisited, Caffeine was already a project dependency for other short-lived, per-key state.

## Decision

Keep rate limiting **in-memory and per-instance** — no shared store. Replace the `ConcurrentHashMap` and its manual
sweep with a Caffeine `Cache<String, SlidingWindowCounter>`, using `expireAfterAccess(windowSeconds × 10)`.

`expireAfterAccess`, not `expireAfterWrite`: a counter still receiving requests must keep its window. `expireAfterWrite`
measures from creation regardless of subsequent traffic, so it would evict — and silently reset — an actively abusive
client's counter as soon as the TTL elapsed, undermining the limit it's supposed to enforce. Only counters that have
gone genuinely idle should be reclaimed, which is exactly what `expireAfterAccess` does. Eviction is now Caffeine's
job; there is no more manual sampling or sweep.

The limit itself stays scoped to a single running instance. If N instances are running, the effective global capacity
becomes `capacity × N`, not `capacity` — this decision does not change that.

## Consequences

### Positive

- Removes the hand-rolled sampling/eviction logic for one already-available library primitive.
- Consistent with how the codebase already caches other short-lived, per-key state — Caffeine is the established
  in-process caching mechanism, not a one-off.
- No new runtime dependency: in-process, nothing to deploy, connect to, or fail over.

### Negative

- **Does not address multi-instance capacity dilution.** Running the backend as N replicas multiplies the effective
  rate limit by N, since each replica enforces its own counters independently.
- No cross-instance visibility into how close any given replica is to its own limit.

### Why not a shared store (Redis)

A shared store — Redis with `INCR`+`EXPIRE`, or a Lua script for atomicity — would make the limit genuinely global
across instances. Deliberately not done: **the backend runs as a single instance today**, so a shared store buys
nothing yet and adds a new external dependency (a service to deploy, connect to, and degrade gracefully without) for
a problem that does not currently exist. Revisit this decision when a second production instance is actually
planned — not before.
