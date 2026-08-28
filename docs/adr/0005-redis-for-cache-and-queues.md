# 0005 — Redis for caching and background queues

- **Status**: Accepted
- **Date**: 2025-12-17

## Context

Two needs, both of which are awkward to serve from PostgreSQL.

Short-lived state — refresh token validity, password reset tokens, resolved
domain lookups — wants cheap reads, automatic expiry, and no durability
guarantee. Putting it in the primary database means writing rows that exist
only to be deleted, plus a job to clean them up.

The same store is the obvious home for background work when it arrives —
sending email without blocking a request, or anything else that should retry
rather than fail a request. Redis-backed queues are a solved problem.

As with PostgreSQL, the deciding factor was maturity rather than novelty.

## Decision

Use Redis for caching, rate limiting, and ephemeral keys.

## Consequences

TTLs handle expiry. A refresh token or a cached domain resolution simply stops
existing; nothing has to sweep it up.

Email currently sends inline, which means a slow SMTP server holds the request
open and a failed send is lost. That is acceptable for the volumes a starter
sees and is the first thing to change under real load — a Redis-backed queue
is already available for it.

It is a second stateful service to run and operate. `docker compose` covers
local development, but production means either a managed Redis or one more
thing to look after.

Cache reads must degrade rather than fail. Wrap every Redis read in a
try/catch and fall back to the database — a cache being unavailable should
slow a request, never break it.

Because the cache is a separate system from the source of truth, invalidation
has to be explicit wherever the underlying record changes. A TTL is a backstop
for what gets missed, not the primary mechanism.
