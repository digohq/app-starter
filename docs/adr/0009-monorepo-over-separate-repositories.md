# 0009 — One repository for both apps

- **Status**: Accepted
- **Date**: 2026-08-26

## Context

[0001](0001-separate-frontend-and-backend.md) made the frontend and backend two
separately deployable applications. That decision says nothing about where the
code lives, and the usual next step is to split them into two repositories —
one per team, one per deploy target.

Two repositories make each one smaller and let the two sides version
independently. The cost lands on anything that spans both, which for a product
of this shape is most feature work: an endpoint, its DTO, the client that calls
it, and the screen that renders it are one change wearing four hats.

Split across repositories, that change becomes two pull requests with an
ordering constraint, a shared types package that has to be published and
consumed before either side compiles, and a window where `main` in one repo
does not work against `main` in the other.

## Decision

One repository, pnpm workspaces, Turborepo for task orchestration.

```
apps/api        NestJS  — HTTP API, database, business logic
apps/web        Next.js — UI, server-rendered public pages
packages/shared types and constants both apps import
```

`packages/shared` is a workspace dependency, not a published package. A change
to it is visible to both apps in the same commit, with no version bump and no
publish step.

## Consequences

**A feature is one commit.** The migration, the service, the DTO, the API
client, and the page land together — reviewable as a unit, revertible as a
unit, and bisectable. There is no state where the backend has shipped and the
frontend has not.

**Contract changes fail loudly and immediately.** Rename a field in
`packages/shared` and `pnpm type-check` fails on both sides in the same run,
before anything is committed. Across repositories the same mistake surfaces at
runtime, in an environment, after a deploy.

**One command verifies everything.** `pnpm type-check`, `pnpm lint`,
`pnpm test`, and `pnpm build` cover both apps. Turborepo caches per-task, so
touching only the web app does not rebuild the API — the whole-repo check stays
fast enough to run on every change rather than only in CI.

### Why this matters for coding agents

This is the decision that most affects working with an AI assistant, and it is
worth being explicit about.

An agent works from what it can see. In one repository it can read the Prisma
schema, the service, the DTO, the API client, and the component in a single
pass — so when you ask for a feature, it writes the migration and the endpoint
and the screen as one coherent change, and the types tie them together.

Split across repositories, the same request becomes two conversations against
two partial views. The agent implements a backend against an imagined
frontend, then a frontend against a half-remembered backend. The seam between
them is exactly where the mistakes land: a field named one thing on one side
and another on the other, a nullable the client does not handle, an endpoint
shape that drifted between the two sessions.

The practical guidance follows from that:

- **Ask for the whole slice.** "Add project archiving" — schema through UI —
  produces better results than "add an archive endpoint" now and "add an
  archive button" later.
- **Let the type checker close the loop.** Put anything crossing the boundary
  in `packages/shared` so a mismatch is a compile error rather than a bug
  someone finds in staging.
- **Keep `pnpm type-check` in the loop.** It is the fastest signal that a
  full-stack change is internally consistent, and it covers both apps at once.

### The costs

**More context to hold.** The repository is larger than either half, for
people and for agents. The structure above is the mitigation: three
directories with obvious names.

**Coupling is easier.** Nothing physically stops the web app from reaching
into API internals. The boundary is a convention — apps talk over HTTP, share
only through `packages/shared` — and it needs enforcing in review.

**Everything is versioned together.** Independent release cadences are
possible but not free. If the two apps need genuinely separate lifecycles,
this decision is the one to revisit.
