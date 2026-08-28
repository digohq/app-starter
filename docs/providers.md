# Recommended providers

**Last reviewed: 2026-08-26.**

Opinionated defaults for hosting the services this starter needs. None of
these are required — everything here speaks a standard protocol, so swap
freely. They are listed because picking one is otherwise an afternoon of
research.

This page ages faster than anything else in the repository. Pricing, free
tiers, and the relative merits of these companies all move; treat it as a
starting point and check the current terms before committing. If you find
something out of date, a pull request updating it — and the date above — is
welcome.

For what each integration does and which variables it reads, see
[integrations.md](integrations.md).

| Need                     | Recommended                                                                            | Free tier        |
| ------------------------ | -------------------------------------------------------------------------------------- | ---------------- |
| App hosting              | [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io) | Trial or limited |
| PostgreSQL               | [Neon](https://neon.tech) or [Supabase](https://supabase.com)                          | Yes              |
| Redis                    | [Upstash](https://upstash.com)                                                         | Yes              |
| Email                    | [Resend](https://resend.com)                                                           | Yes              |
| Object storage, DNS, CDN | [Cloudflare](https://cloudflare.com)                                                   | Yes              |
| Product analytics        | [PostHog](https://posthog.com)                                                         | Yes              |

---

## Application hosting — Railway, Render, or Fly.io

There are **two deployables** here, and that shapes the choice. The API is a
long-running NestJS process; the web app is Next.js. See
[ADR 0001](adr/0001-separate-frontend-and-backend.md) for why they are
separate.

Both apps have a `Dockerfile`, and the web app is configured for Next.js
`standalone` output, so anything that runs a container will run this.

**Railway** is the shortest path. Point it at the repo, add two services, and
it detects and builds both. It can also run your Postgres and Redis, so a
first deploy needs no other accounts. Pricing is usage-based with a trial
credit rather than a permanent free tier. Its main appeal is that the whole
stack lives in one project with one set of environment variables.

**Render** is the closest equivalent, with a more traditional feel: explicit
service definitions, a `render.yaml` blueprint if you want infrastructure in
the repo, and a free tier for web services that sleeps when idle. Pick it if
you prefer declared configuration over dashboard clicks.

**Fly.io** runs containers close to users and is the strongest of the three if
you care about running in several regions or need persistent volumes. It is
also the most hands-on — `fly.toml` per app, and a mental model closer to
machines than to a PaaS.

### Configuring the two services

Whichever you use, the shape is the same:

- **API** — set `DATABASE_URL`, `JWT_SECRET`, `REDIS_HOST`, `REDIS_PORT`,
  `REDIS_PASSWORD`, `REDIS_TLS`, `FRONTEND_URL`, and the SMTP variables. Run
  `prisma migrate deploy` as a release or pre-deploy step so migrations apply
  before new code serves traffic.
- **Web** — set `NEXT_PUBLIC_API_URL` to the API's public URL. It is
  `NEXT_PUBLIC_`, so it is **baked in at build time**: changing it means
  rebuilding, not restarting.
- **Both** — the build context must be the **monorepo root**, not the app
  directory, because pnpm workspaces need the root lockfile. Set the
  Dockerfile path to `apps/api/Dockerfile` or `apps/web/Dockerfile` and leave
  the root directory empty. The root `.dockerignore` is what applies, since
  Docker only reads the one at the context root; it keeps your local `.env`
  files out of the image, so do not narrow it without checking what you are
  letting back in.

Set `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` once you know the real
hostnames, or authentication will fail across the two origins in a way that
looks like a cookie bug.

Leave `COOKIE_DOMAIN` **unset** unless the two services sit on different
subdomains of one registrable domain — `app.example.com` and
`api.example.com`, say — in which case set it to the shared parent,
`.example.com`. Unset gives you a host-only cookie, which is what a
single-domain deploy wants. A value that does not match the host actually
serving the app is accepted by the API and then silently discarded by the
browser: sign-in returns 200 and nothing is logged in.

### Other options in the same class

**Vercel** is the best host for the Next.js half and a poor fit for the other
half — a long-running NestJS process with WebSocket connections is not what
its functions are for. A common split is Vercel for web and Railway, Render,
or Fly for the API. That works, at the cost of two dashboards.

**DigitalOcean App Platform** and **Koyeb** are comparable to Render, with
smaller ecosystems. **Heroku** still works and is still the most expensive way
to do this. **Kubernetes** is the answer when you have someone whose job it is
to run it, and the wrong answer before then.

## PostgreSQL — Neon or Supabase

Both give you a real Postgres with a connection string, a generous free tier,
and no server to look after.

**Neon** separates storage from compute, so it scales to zero when idle and
gives you database branching — a throwaway copy of production data per pull
request, which pairs well with preview deployments. Pick it if you want the
database to be as disposable as the app.

**Supabase** is Postgres plus a platform: auth, storage, realtime, and an
auto-generated API. This starter already has its own auth and storage, so you
would be using a fraction of it — but if you expect to want realtime
subscriptions or their dashboard for poking at data, it earns its place.

Either way you only need the connection string:

```bash
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
```

**Watch for:** both are serverless and pool connections. Use the **pooled**
connection string for the running app, and the **direct** one for
`prisma migrate`, which needs a session-mode connection. Neon labels these
clearly; on Supabase the pooler is on port 6543 and direct is 5432. Getting
this backwards produces migration errors that do not obviously point at
pooling.

**Scaling to zero has a cost:** the first request after an idle period pays a
cold start. Fine for staging, worth understanding before production.

---

## Redis — Upstash

Redis over HTTP and the standard protocol, priced per request rather than per
hour, which suits an app that uses Redis for tokens and caching rather than as
a primary datastore.

```bash
REDIS_HOST=<your-endpoint>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<your-password>
REDIS_TLS=true
```

**`REDIS_TLS=true` is required** — Upstash terminates TLS and the connection
fails without it. This is the single most common setup mistake.

Redis is **required** by this starter: refresh tokens, OTP codes, and password
reset tokens all live there. See
[integrations.md](integrations.md#redis).

**Alternatives:** your platform's managed Redis add-on (Railway, Render,
Fly.io) is usually simpler if you are already deployed there. Elasticache
makes sense inside AWS and nowhere else.

---

## Email — Resend

Modern API, sane dashboard, and a free tier that covers development and early
production. The starter talks SMTP, which Resend supports, so no code changes
are needed.

You do not need this for local development — Mailpit catches everything, see
[integrations.md](integrations.md#mailpit-local-email).

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=<your API key>
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your App
```

**Verify your domain first.** Resend walks you through the SPF, DKIM, and DMARC
records. Until those resolve, mail either bounces or lands in spam — and this
is a DNS propagation wait, not something you can rush on launch day. Do it
early.

**Alternatives:** Postmark has the best deliverability for transactional mail
and a correspondingly serious approach to what you may send. SES is the
cheapest at volume and the most work to set up. Both speak SMTP, so switching
is an env change.

---

## Object storage, DNS, and CDN — Cloudflare

One account covers three of this starter's needs, which is most of why it is
recommended.

**R2** is S3-compatible object storage with **no egress fees**, which matters
for user-uploaded images served on every page load. The storage provider here
already targets R2; see [integrations.md](integrations.md#object-storage) for
credentials and the public-access setup.

**DNS** is where your own domain lives, and where tenants point their custom
domains. Cloudflare's API is good enough to automate the CNAME and certificate
side of custom-domain onboarding, which the starter deliberately leaves to you
— it handles TXT-record ownership verification and routing only.

**CDN and TLS** come along with it, including certificates for domains you do
not own, which is exactly the hard part of a custom-domain feature.

**Watch for:** Cloudflare proxying (the orange cloud) sits in front of your
origin and will interfere with WebSocket upgrades and long-running requests
unless configured for them. If realtime notifications stop working after you
move DNS, that is the first thing to check.

---

## Product analytics — PostHog

Product analytics, session replay, feature flags, and experiments in one tool,
with a generous free tier and the option to self-host if you would rather own
the data.

**Not included in this starter**, which deliberately does not choose an
analytics vendor for you. What it does ship is cookie consent with an
**analytics** category — it defaults to off and nothing reads it, so it is
ready for whichever provider you pick.

To wire PostHog in, gate initialisation on that consent:

```ts
import { hasAnalyticsConsent } from '@/lib/consent';

if (hasAnalyticsConsent()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    opt_out_capturing_by_default: true,
  });
}
```

`lib/consent/index.ts` dispatches `app-starter:consent-change` when
preferences change, so you can opt in or out without a page reload.

**Watch for:** keys exposed to the browser need the `NEXT_PUBLIC_` prefix,
which bakes them into the bundle at build time. That is normal for a PostHog
project key. Use the EU host (`https://eu.i.posthog.com`) if your users are
there.

---

## A note on lock-in

Everything above is deliberately replaceable. Postgres is Postgres, Redis
speaks the Redis protocol, email is SMTP, and R2 is S3-compatible. Switching
any of them is an environment change rather than a rewrite. Both apps ship a
Dockerfile, so moving between hosts is a build-settings change.

The one place to be careful is **custom domains**. Automating certificate
provisioning for domains you do not own is genuinely platform-specific, and
whatever you build there will be the hardest part to move. Keep it behind a
small interface.
