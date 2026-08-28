# Conventions

Context for AI agents and coding assistants working in this repository. These
are the conventions the existing code follows — match them so a diff looks like
the file it lands in.

## Stack

- **Frontend** — React, Next.js (App Router), TypeScript, Tailwind, shadcn/Radix
- **Backend** — NestJS, TypeScript, Prisma, PostgreSQL, Redis
- **Tooling** — Turborepo, pnpm workspaces, Jest

## Monorepo

Two apps, one repository: `apps/api` (NestJS) owns the database and business
logic, `apps/web` (Next.js) owns the UI, `packages/shared` holds what both
import.

**Implement across the stack in one pass.** A feature that needs an endpoint
and a screen should be written as one change — migration, service, DTO, API
client, component — not as a backend task followed later by a frontend task.
Everything needed to keep the two halves consistent is readable in this one
checkout, and `pnpm type-check` verifies both at once. Splitting the work
across sessions is what produces mismatched field names and endpoint shapes
that drifted.

- Types and constants used by both apps belong in `packages/shared`, not
  duplicated in each. Anything crossing the API/web boundary goes there, so a
  mismatch is a compile error rather than a runtime surprise.
- UI comes from `apps/web/src/components/ui` (shadcn-based). Don't reinvent a
  component that already exists there. Design tokens live in
  `apps/web/src/styles/tokens.css`.

## Multi-tenancy

`Organization` is the tenant. This is the constraint most worth getting right:

- Every organization-scoped query filters by `organizationId`. Never treat an
  id as unguessable.
- Load records by id **and** organization, so a valid id from another tenant
  reads as 404 rather than confirming the record exists.
- Role checks live in the service layer, not in a guard — the organization id
  usually arrives as a route parameter that has to be resolved against the
  caller first.

`apps/api/src/projects/projects.service.ts` is the reference implementation.

## Backend (`apps/api`)

- One NestJS module per domain. Controllers route; services hold business logic
  and persistence.
- Every request input is a DTO validated with `class-validator`.
- PascalCase classes, camelCase members, kebab-case files and directories,
  UPPERCASE env vars. Booleans start with a verb: `isLoading`, `hasError`,
  `canDelete`.
- Short single-purpose functions. Prefer immutability (`readonly`, `as const`).
- Prisma for persistence. `TIMESTAMPTZ` for timestamps. Prefer soft deletes.

## Frontend (`apps/web`)

- Tailwind for styling; `cn()` rather than ternaries inside class strings.
- Components and local functions as `const` arrow functions. Event handlers
  prefixed `handle`.
- Early returns over nesting. Readability over micro-optimization unless
  there's a measured problem.
- Interactive elements need keyboard navigation and ARIA.

## Verifying

`pnpm verify` runs type-check, lint, and tests across both apps. Run it before
reporting a task done — it is what catches an API and a web client that have
drifted apart.

`docs/troubleshooting.md` has the common failures and their fixes. Note in
particular that `prisma migrate reset` drops the database: do not reach for it
to resolve a migration problem without asking first.

## Testing

- Jest, arranged as Arrange-Act-Assert.
- Test names read as behaviour: `updateOrganization throws ForbiddenException
when the caller is not an OWNER` rather than `test updateOrganization`.
- Name variables for their role: `inputX`, `mockX`, `actualX`, `expectedX`.

## Documentation

- English throughout.
- Comment the _why_ — the reasoning a reader cannot recover from the code.
  Skip comments that restate what the line already says.
- JSDoc on public classes and methods where the signature isn't self-evident.
