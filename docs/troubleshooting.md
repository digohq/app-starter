# Troubleshooting

The failures you are most likely to hit locally, and what actually fixes them.

If you are working with a coding assistant, point it here before you let it
guess. Several of the wrong answers to the problems below — `prisma migrate
reset` in particular — destroy data, and an assistant with no better
information will suggest them.

## Quick triage

Run these three before anything else. Most problems are one of them.

```bash
docker compose ps                                        # are the containers up?
pnpm --filter @app-starter/api exec prisma migrate status # is the schema current?
pnpm verify                                              # do types, lint, tests pass?
```

---

## Setup and startup

### `pnpm bootstrap` fails at "Starting Postgres, Redis, and Mailpit"

Docker is not running. Start Docker Desktop (or `colima start`, or your Podman
machine) and re-run — `pnpm bootstrap` is safe to run again and will not
overwrite env files that already exist.

### `Error: bind: address already in use` on 5432, 6379, 3000, or 3001

Something else already holds the port — usually another project's Postgres, or
a previous `pnpm dev` that did not exit.

Find it:

```bash
lsof -i :5432
```

For **5432 / 6379 / 8025**, you do not have to stop the other process. The
root `.env` exists precisely for this — change the published port and re-create
the containers:

```bash
# .env
POSTGRES_PORT=5433
```

```bash
docker compose up -d
```

Then update `DATABASE_URL` in `apps/api/.env` to match the new port.

For **3000 / 3001**, stop the stale process (`kill <pid>`), or set `PORT` in
`apps/web/.env.local` / `apps/api/.env`. If you move the API port, update
`NEXT_PUBLIC_API_URL` in `apps/web/.env.local` too.

### The app starts but every request fails at sign-in

Redis is not reachable. It is required — refresh tokens, OTP codes, password
reset tokens, and the custom-domain cache all live there — but a wrong
`REDIS_HOST` still lets the API boot, so the first symptom is a failed login
rather than a startup error.

```bash
docker compose ps redis
docker compose exec redis redis-cli ping   # expect: PONG
```

Running the API **inside** Docker means `REDIS_HOST=redis`; running it on your
machine means `REDIS_HOST=localhost`. Same distinction for `SMTP_HOST`
(`mailpit` vs `localhost`).

---

## Database and Prisma

### `@prisma/client did not initialize yet` / a field you just added is missing

The generated client is stale. It is regenerated on `pnpm install` and on
`pnpm build`, but not when you only edit `schema.prisma`:

```bash
pnpm --filter @app-starter/api exec prisma generate
```

Restart the TypeScript server in your editor afterwards — VS Code caches the
old types (Command Palette → **TypeScript: Restart TS Server**).

### `Drift detected: your database schema is not in sync with your migration history`

You changed the schema without creating a migration, or you pulled someone
else's migration.

**If you pulled someone else's migration**, apply it:

```bash
pnpm --filter @app-starter/api exec prisma migrate deploy
```

**If you changed `schema.prisma` yourself**, create the migration:

```bash
pnpm --filter @app-starter/api exec prisma migrate dev --name describe_your_change
```

**Do not reach for `prisma migrate reset`** as a first move. It drops the
database and everything in it. It is the right command only when you are
certain the local data is disposable — and in this project it usually is, since
`pnpm --filter @app-starter/api run prisma:seed` rebuilds the demo data. Just
decide that deliberately rather than because a tool suggested it.

### The migration is already committed and wrong

Do not edit a migration that has been applied anywhere but your own machine.
Write a new one that corrects it. Editing history works locally and then fails
for everyone else.

### The seeded accounts do not work

Re-seed. It upserts, so it is safe to repeat:

```bash
pnpm --filter @app-starter/api run prisma:seed
```

```
owner@example.com  / Password123!   (also a global admin)
member@example.com / Password123!
```

---

## Email

### No verification or reset email arrives

They are not sent anywhere real in development. Mailpit catches all of them at
**http://localhost:8025** — verification links, password resets, OTP codes, and
invites all land there, and nothing leaves your machine.

If the inbox is empty, check `SMTP_HOST` / `SMTP_PORT` in `apps/api/.env`
(`localhost:1025` when the API runs on your machine) and that the container is
up: `docker compose ps mailpit`.

---

## Types, tests, and CI

### `pnpm type-check` fails after a change to `packages/shared`

`packages/shared` is consumed as a built package, so its `dist` has to be
current:

```bash
pnpm --filter @app-starter/shared run build
```

`pnpm verify` and `pnpm build` do this for you via Turborepo's task graph.

### Tests pass locally but fail in CI

The usual causes, in order:

1. **Uncommitted migration.** CI runs `prisma migrate deploy` against an empty
   database. A schema change with no migration file passes locally, where your
   database already has the column, and fails there.
2. **A stale `pnpm-lock.yaml`.** CI installs with `--frozen-lockfile`. If you
   added a dependency, commit the lockfile.
3. **Test order.** CI runs the API suite with `--runInBand` against one shared
   database. A test that depends on data another test created will surface
   there first.

### The API test suite cannot find its database

It reads `apps/api/.env.test`, which `pnpm bootstrap` creates. If it is
missing:

```bash
cp apps/api/.env.test.example apps/api/.env.test
```

---

## Deployment

### Sign-in works locally but not on the deployed app

Nearly always cookies. In production the API sets the cookie `domain` from
`COOKIE_DOMAIN`; if it does not match the host actually serving the app, the
browser accepts the response and silently discards the cookie. The request
succeeds, and nothing is logged in.

If the API and web app share one host, **leave `COOKIE_DOMAIN` unset** — the
cookie is then host-only, which is correct. Set it only when they are on
different subdomains of one registrable domain, to the shared parent with a
leading dot (`.example.com`).

Then check `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` point at the real web
origin. See [`docs/providers.md`](./providers.md).

### The web app calls `localhost:3001` in production

`NEXT_PUBLIC_API_URL` is `NEXT_PUBLIC_`, so it is **baked in at build time**.
Changing it in your host's dashboard and restarting does nothing — you have to
rebuild.

### The Docker build fails on `pnpm install --frozen-lockfile`

The build context must be the **monorepo root**, not `apps/api` or `apps/web`.
pnpm workspaces need the root `pnpm-lock.yaml` and `pnpm-workspace.yaml`. Set
the Dockerfile path to `apps/api/Dockerfile` and leave the root directory
empty.

---

## Starting over

Nothing here is precious. To reset the local environment completely:

```bash
docker compose down -v     # deletes the database and Redis volumes
pnpm bootstrap             # recreates, migrates, and re-seeds
```

If dependencies are the problem:

```bash
pnpm clean
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```
