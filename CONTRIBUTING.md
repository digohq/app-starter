# Contributing

Thanks for helping out. This document covers how to get set up, what we expect
in a pull request, and the conventions the codebase follows.

## Getting set up

```bash
git clone <your-fork>
cd app-starter
pnpm bootstrap
pnpm dev
```

`pnpm bootstrap` copies the env files, starts Postgres, Redis, and Mailpit,
applies migrations, and seeds demo data. It is safe to re-run — it never
overwrites an existing env file.

You need Node 22+, pnpm 8+, and Docker (or Podman). You do **not** need any
third-party accounts — Postgres, Redis, and Mailpit all run locally, and every
external integration is optional. See
[`docs/integrations.md`](./docs/integrations.md) if you need one of them.

## Before you open a pull request

```bash
pnpm verify   # type-check, lint, test
pnpm build
```

CI runs all of that plus API end-to-end tests against real Postgres and Redis.
A PR that fails locally will fail there too.

If something breaks along the way,
[`docs/troubleshooting.md`](./docs/troubleshooting.md) covers the common
failures — port conflicts, a stale Prisma client, migration drift — and the
fixes that do not destroy your database.

## What makes a good pull request

- **One change per PR.** A bug fix and a refactor in the same diff are hard to
  review and harder to revert.
- **Tests for behaviour, not coverage.** A test should describe what the code
  guarantees. `updateOrganization throws ForbiddenException when the caller is
not an OWNER` beats `test updateOrganization`.
- **Say what you did not do.** If you left something out or worked around a
  problem, put it in the PR description rather than leaving it to be found.
- **Update docs in the same PR** when you change behaviour someone reads about.

## Conventions

[`AGENTS.md`](./AGENTS.md) has the full set, written so a coding assistant can
pick them up as context, and [`docs/adr/`](./docs/adr/README.md) records why
the architectural decisions were made. If a change works against one of those
records, say so in the PR — reversing a decision is fine, doing it by accident
is not. The short version:

**Backend (`apps/api`)** — one NestJS module per domain. Controllers route,
services hold logic. Every request body is a DTO validated with
`class-validator`. Files are kebab-case, classes PascalCase, booleans start
with a verb (`isLoading`, `canDelete`). Prefer soft deletes.

**Frontend (`apps/web`)** — Tailwind for styling, `cn()` over ternaries in
class strings. Components are `const` arrow functions, handlers prefixed
`handle`. Use the shared components in `components/ui`; don't reinvent them.
Interactive elements need keyboard and ARIA support.

**Shared code** — types and constants used by both apps go in
`packages/shared`, not duplicated.

### Multi-tenancy

Every organization-scoped query **must** filter by `organizationId`. Never rely
on an id being unguessable. `ProjectsService` is the reference implementation:
it loads records by id _and_ organization so a valid id from another tenant
reads as 404 rather than leaking that the record exists.

Role checks live in the service layer, not in a guard, because the organization
id usually arrives as a route parameter that has to be resolved against the
caller first. See [`docs/roles-and-permissions-guide.md`](./docs/roles-and-permissions-guide.md).

## Database changes

Edit `apps/api/prisma/schema.prisma`, then:

```bash
pnpm --filter @app-starter/api exec prisma migrate dev --name describe_your_change
```

Commit the generated migration. Use `TIMESTAMPTZ` for timestamps.

## Commit messages

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
Explain _why_ in the body when the reason is not obvious from the diff.

## AI-assisted contributions

Much of this repository was written with AI assistance. For consistency, AI-assisted pull requests are welcome.

[`docs/first-feature.md`](./docs/first-feature.md) walks through building one
feature end to end that way — how to prompt for a whole vertical slice, what
should come back, and what to check by hand before you trust it.
[`CLAUDE.md`](./CLAUDE.md) and [`AGENTS.md`](./AGENTS.md) are loaded as context
automatically, and `.claude/settings.json` pre-approves the safe commands so
you are not clicking through a permission prompt on every test run.

What we ask is that you have read and understood what you are submitting, and
can answer questions about it in review. Mention the assistance in the PR
description — not as a disclaimer, just so reviewers know where to look
harder. A PR whose author cannot explain their own diff will be closed
regardless of how it was produced.

## Reporting bugs

Open an issue with what you expected, what happened, and the smallest set of
steps that reproduces it. Include versions and the exact error text.

For anything security-related, do **not** open an issue — see
[SECURITY.md](./SECURITY.md).
