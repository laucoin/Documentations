---
title: 'ADR 012 — Per-instance authentication rate limiting with Caffeine'
description: 'Why rate limiting stays in memory per instance, with Caffeine.'
---

# ADR 012 — Per-instance authentication rate limiting with Caffeine

## Status

<Badge type="tip" text="Accepted" />

## Context

Two endpoints are reachable before a JWT exists: `/api/v2/authentication/token` and `/token/refresh`. They are the whole
unauthenticated attack surface, so a dedicated `WebFilter` (`AuthenticationRateLimitHandler`) caps requests
per client IP with a sliding window before either one is reached.

The window counters (one per `clientIp|path`) lived in a raw `ConcurrentHashMap`, with expiry handled by a
home-grown scheme: on roughly 1 in 1000 counter creations, walk the whole map and remove any counter untouched for
10× the configured window. It worked, but duplicated bookkeeping a caching library already does — and when
the topic was revisited, Caffeine was already a project dependency for other ephemeral per-key state.

## Decision

Keep rate limiting **in memory and per instance** — no shared store. Replace the `ConcurrentHashMap` and its manual
sweep with a Caffeine `Cache<String, SlidingWindowCounter>`, with `expireAfterAccess(windowSeconds × 10)`. The cache is also **bounded** (`registry.security.rate-limit.auth.max-tracked-clients`, 10,000 by default), so that a flood of distinct client addresses cannot make it grow without limit.

`expireAfterAccess`, not `expireAfterWrite`: a counter that still receives requests must keep its window. `expireAfterWrite`
measures from creation regardless of later traffic, so it would evict — and silently reset — the counter of an
actively abusive client as soon as the TTL elapsed, undermining the limit it is supposed to enforce. Only truly
idle counters should be reclaimed, which is exactly what `expireAfterAccess` does. Eviction is now Caffeine's job;
no more sampling or manual sweep.

The limit itself is still enforced by a single running instance. If N instances run, the effective global capacity
becomes `capacity × N`, not `capacity` — this decision does not change that.

## Consequences

### Positive

- Removes the home-grown sampling/eviction logic in favor of a library primitive already available.
- Consistent with how the codebase already caches other ephemeral per-key state — Caffeine is the
  established in-process caching mechanism, not a one-off.
- No new runtime dependency: in-process, nothing to deploy, connect or fail over.

### Negative

- **Does not address multi-instance capacity dilution.** Running the backend as N replicas multiplies the effective rate limit
  by N, since each replica enforces its own counters independently.
- No cross-instance visibility into how close a given replica is to its own limit.

### Why not a shared store (Redis)

A shared store — Redis with `INCR`+`EXPIRE`, or a Lua script for atomicity — would make the limit truly global
across instances. Deliberately not done: **the backend runs as a single instance today**, so a shared store brings
nothing for now and adds a new external dependency (a service to deploy, connect, and degrade gracefully) for
a problem that does not currently exist. Revisit this decision when a second production instance is actually
planned — not before.

## Retrospective

- The same mechanism (in-memory sliding window, bounded Caffeine cache) was extended to three **per authenticated user** limits: personal data exports (5 per hour), search for a user to invite (30 per minute) and project creation (10 per hour).
- The per-IP limit first counted the connection address, that is the reverse proxy's in production, which made it global. The real address is now resolved through a list of **trusted proxies**: `X-Forwarded-For` is only read if the connection comes from one of them. See [Security → Rate limiting](/registry/technical/security#rate-limiting).
