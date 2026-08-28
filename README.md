# App Starter

A multi-tenant SaaS starter. NestJS and Next.js in a Turborepo, with the parts
every SaaS needs already wired together: authentication, organizations with
roles and invites, per-tenant custom domains, and a notification engine.

Billing is deliberately not included — payment provider and pricing model vary
too much between products for a starter to choose for you.

It ships with one small example vertical — Projects — so the patterns are
visible end to end without burying them in a domain you have to delete.

```bash
pnpm bootstrap
pnpm dev
```

## What you get

|                    |                                                                                   |
| ------------------ | --------------------------------------------------------------------------------- |
| **Auth**           | Email + password, OTP, Google OAuth, email verification, JWT with refresh cookies |
| **Multi-tenancy**  | Organizations with `OWNER` / `ADMIN` / `MEMBER`, invite links, member management  |
| **Custom domains** | Per-tenant domains with DNS verification and white-label branding                 |
| **Notifications**  | Email and in-app, with per-user channel preferences                               |
| **Admin**          | User search, quarantine, and impersonation — both fully audited                   |
| **Storage**        | Provider interface with local and S3/R2 implementations                           |

## Requirements

- Node 22+ (`.nvmrc` pins it)
- pnpm 8+
- Docker with Compose, or Podman — PostgreSQL and Redis are both required, and
  `docker compose` runs them for you

## Setup

```bash
git clone <this-repo>
cd app-starter
pnpm bootstrap
```

Or skip the local toolchain entirely: `.devcontainer/` is configured, so
**Code → Codespaces → Create codespace** on GitHub — or **Reopen in Container**
in VS Code — gives you Node, pnpm, and Docker already installed and runs
`pnpm bootstrap` for you. Nothing to install but the editor. In a
browser-based Codespace, set `NEXT_PUBLIC_API_URL` to the forwarded URL for
port 3001 and mark that port **Public**; `localhost` works as-is everywhere
else.

`pnpm bootstrap` copies the env files, installs dependencies, starts Postgres,
Redis, and Mailpit, applies migrations, and seeds. It is safe to re-run — it
never overwrites an env file that already exists.

Then:

```bash
pnpm dev
```

|                    |                                |
| ------------------ | ------------------------------ |
| Web                | http://localhost:3000          |
| API                | http://localhost:3001          |
| API docs (Swagger) | http://localhost:3001/api/docs |
| Mailpit            | http://localhost:8025          |

Mailpit is a local inbox that catches every email the app sends — verification
links, password resets, OTP codes, invites — so you can click through those
flows without a mail provider. Nothing leaves your machine.

The seed creates two accounts:

```
owner@example.com  / Password123!   (also a global admin)
member@example.com / Password123!
```

If you would rather set up by hand, see [Manual setup](#manual-setup). If
something breaks, [`docs/troubleshooting.md`](docs/troubleshooting.md) has the
failures you are most likely to hit and what actually fixes them.

### Then build something

[**`docs/first-feature.md`**](docs/first-feature.md) walks through adding one
feature end to end with a coding assistant — the prompt to write, the ten files
that should come back, and how to tell whether what you got is right. Start
there if this is your first time in a codebase this size.

Google sign-in, S3/R2 storage, a real SMTP provider, and custom domains are
all optional and off by default.
[`docs/integrations.md`](docs/integrations.md) covers what each one needs, how
to get credentials, and what breaks without it.
[`docs/providers.md`](docs/providers.md) recommends who to host them with.

## Architecture

```
app-starter/
├── apps/
│   ├── api/                  NestJS + Prisma
│   │   ├── prisma/           schema, migrations, seed
│   │   └── src/
│   │       ├── auth/         JWT, OAuth, OTP, guards
│   │       ├── organizations/  tenants, members, invites, domains
│   │       ├── projects/     the example vertical
│   │       ├── notifications/  engine, templates, channels
│   │       ├── users/        profiles
│   │       ├── admin-*/      platform admin and impersonation
│   │       └── common/       storage, guards, filters, utils
│   └── web/                  Next.js App Router
│       └── src/
│           ├── app/          routes
│           ├── components/   ui/ is the shared component set
│           ├── hooks/
│           └── lib/          API clients
├── packages/shared/          types and constants used by both apps
└── docker/postgres/
```

### Why one repository

Two deployable apps, one repository. `apps/api` owns the database and business
logic, `apps/web` owns the UI, and `packages/shared` holds the types and
constants both import — as a workspace dependency, so a change to it is visible
to both apps in the same commit with nothing to publish.

The point is that a feature is **one change**. The migration, the endpoint, the
DTO, the API client, and the screen land in a single commit: reviewable as a
unit, revertible as a unit, and verified together by one `pnpm type-check`.
Rename a shared field and both sides fail to compile immediately, rather than
drifting apart until something breaks in an environment.

**This matters most when you are building with a coding agent.** In one
repository the agent can read the schema, the service, the DTO, the client, and
the component in a single pass, so asking for a whole vertical slice — "add
project archiving", schema through UI — produces a coherent change. Split
across repositories, the same work becomes two conversations against two
partial views, and the seam between them is where the mismatches land. Ask for
the full slice, put anything crossing the boundary in `packages/shared`, and
let the type checker confirm the two halves agree.

[ADR 0009](docs/adr/0009-monorepo-over-separate-repositories.md) has the
reasoning and the costs.

Why the other pieces are what they are is recorded in
[`docs/adr/`](docs/adr/README.md) — the framework choices, the
frontend/backend split, the multi-tenancy model below, and why billing is
left out.

### How multi-tenancy works

`Organization` is the tenant. Everything scoped to one carries an
`organizationId`, and every query filters on it — a valid id from another
tenant reads as 404 rather than revealing that the record exists.
`ProjectsService` is the reference implementation; copy its shape.

Role checks live in the service layer rather than a guard, because the
organization id usually arrives as a route parameter that has to be resolved
against the caller before a decision can be made. See
[`docs/roles-and-permissions-guide.md`](docs/roles-and-permissions-guide.md).

## Making it yours

1. **Rename.** Replace `app-starter` in `package.json` files, `docker-compose.yml`,
   and the `@app-starter/*` import scope. Update `apps/api/src/config/branding.ts`.
2. **Replace Projects.** Delete `apps/api/src/projects` and
   `apps/web/src/app/organizations/[organizationId]/projects`, then build your
   own vertical on the same shape.
3. **Add billing if you need it.** `Organization` is where it attaches — it
   already has the identity and the membership list a seat count would use.
   [ADR 0008](docs/adr/0008-no-billing-in-the-starter.md) explains why it is
   left out and suggests a shape for entitlements.
4. **Wire up the integrations you need** — Google sign-in, object storage,
   SMTP, custom domains. See [`docs/integrations.md`](docs/integrations.md).
5. **Before deploying,** read the checklist at the end of
   [SECURITY.md](SECURITY.md).

## Commands

Run from the repository root:

|                   |                                                     |
| ----------------- | --------------------------------------------------- |
| `pnpm dev`        | Start the API and web app                           |
| `pnpm build`      | Build everything                                    |
| `pnpm test`       | Run all tests                                       |
| `pnpm verify`     | Type-check, lint, and test — the definition of done |
| `pnpm lint`       | Lint everything                                     |
| `pnpm type-check` | Type-check everything                               |
| `pnpm clean`      | Remove build artifacts                              |
| `pnpm format`     | Format with Prettier                                |

Target one package with `--filter`:

```bash
pnpm --filter @app-starter/api dev
pnpm --filter @app-starter/web test
```

### Database

```bash
cd apps/api
pnpm exec prisma migrate dev --name describe_your_change   # create a migration
pnpm exec prisma studio                                     # browse the data
pnpm run prisma:seed                                        # re-seed
```

## Manual setup

If you prefer not to use `pnpm bootstrap`:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
cp apps/web/.env.example apps/web/.env.local

pnpm install
docker compose up -d

pnpm --filter @app-starter/api exec prisma migrate deploy
pnpm --filter @app-starter/api run prisma:seed
```

The root `.env` only sets the ports the containers publish; application
configuration lives in the per-app files.

Database defaults: `localhost:5432`, database / user / password all
`app_starter`. See [`docker/postgres/README.md`](docker/postgres/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The conventions the codebase follows
are in [AGENTS.md](AGENTS.md), which doubles as context for coding assistants.

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## Provenance

This started as Digo, an event-management platform we built for the tech
community to share their events. The event domain was removed and what
remained — authentication, organizations, notifications, custom domains,
storage, and the admin surfaces — was generalised into a starter. The Projects
example was written from scratch.

The parts carried over have production mileage behind them. The parts that are
new do not, though they are covered by tests.

Much of the extraction was done with heavy AI assistance (Claude). The full
suite passes — API unit and end-to-end, web, lint, type-check, build — and the
result has been reviewed, but read what you are adopting before you build on
it, as you would with any starter.

## License

[MIT](LICENSE)
