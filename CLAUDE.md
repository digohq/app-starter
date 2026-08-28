# CLAUDE.md

The conventions for this repository live in [AGENTS.md](./AGENTS.md). Read that
file first — it is the single source of truth, and this file exists only so
that assistants looking for `CLAUDE.md` by name find their way there.

@AGENTS.md

## Working here

- **Build the whole vertical slice in one pass.** Migration, service, DTO, API
  client, and screen belong in one change. `pnpm verify` checks both halves at
  once. See [docs/first-feature.md](./docs/first-feature.md) for the worked
  walkthrough.
- **Verify with `pnpm verify`** (type-check, lint, tests) before reporting a
  task done.
- **Never weaken tenant scoping.** Every organization-scoped query filters by
  `organizationId`. `apps/api/src/projects/projects.service.ts` is the
  reference implementation.
- **Do not run `prisma migrate reset`** to resolve a migration problem without
  asking first — it drops the database. See
  [docs/troubleshooting.md](./docs/troubleshooting.md) for the safe paths.
