# 0001 — Separate the frontend and backend into two apps

- **Status**: Accepted
- **Date**: 2025-12-17

## Context

A full-stack framework can serve both the UI and the API from one deployable.
That is fewer moving parts, and for a small application it is usually the right
call.

The counter-pressure is that the two halves have different runtime profiles.
The API does the database work, the queue processing, and the webhook handling.
The web app renders pages. Under load they need different amounts of capacity,
and it is normally the API that needs it first.

Collapsing them means every extra API instance also carries a renderer it does
not need, and a slow API route can consume the same process that serves pages.

## Decision

Keep the frontend and the backend as two applications in one monorepo:
`apps/web` and `apps/api`. They share types through `packages/shared` and talk
over HTTP.

Deploy them separately, and scale them independently.

## Consequences

The API can be scaled, restarted, and rate-limited on its own, without touching
the frontend. Its background workers are not competing with page rendering.

Contract changes between the two are explicit. A field added to an API response
does not appear in the frontend until someone wires it through, which is more
friction than a shared function call but makes the boundary visible.

CORS, cookie domains, and auth token handling all become real configuration
rather than non-issues. `apps/api/src/main.ts` carries that setup, and the
cookie and CORS settings need attention before any deployment.

Local development runs two processes. `pnpm dev` starts both.

The shared package is the pressure valve. When something is duplicated across
the boundary, it belongs in `packages/shared` rather than in both apps.
