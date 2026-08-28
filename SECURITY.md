# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through
[GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository — the **Security** tab, then **Report a vulnerability**.

Include what you can:

- What the issue is and roughly how severe you think it is
- Steps to reproduce, or a proof of concept
- Affected versions or commit
- Any mitigation you have already found

You should get an acknowledgement within a few days. We will let you know
whether the report is accepted, and tell you when a fix ships. If you would
like credit in the advisory, say so and how you want to be named.

## Scope

This is a starter template. Most deployments will have modified it, so the
security of your own deployment is yours to own. Reports are most useful when
they concern code in this repository rather than a misconfiguration of a fork.

Particularly worth reporting:

- **Tenant isolation failures** — any path where one organization can read or
  modify another's data
- **Authentication or session bypass** — token handling, refresh flow, cookies,
  impersonation
- **Privilege escalation** — a `MEMBER` performing `OWNER` or `ADMIN` actions,
  or a non-admin reaching `/admin`

Out of scope: vulnerabilities in dependencies with no exploitable path through
this code (report those upstream), findings that require an already-compromised
host or database, missing hardening headers with no demonstrated impact, and
anything relying on the example credentials in `prisma/seed.ts` — those are
documented demo accounts, not secrets.

## Before deploying

The defaults here are tuned for local development, not production. At minimum:

- Set a real `JWT_SECRET` — `openssl rand -base64 48`. With
  `NODE_ENV=production` the API refuses to start on the placeholder or on
  anything under 32 characters, so this one fails loudly rather than silently.
- Leave `COOKIE_DOMAIN` unset unless the API and web app are on different
  subdomains of one registrable domain, in which case set it to the shared
  parent (`.example.com`). A value that does not match the serving host is
  dropped by the browser and reads as a broken login.
- Never commit an `.env` file. `.env.example` files carry placeholders only.
  The root `.dockerignore` also keeps them out of built images — both
  Dockerfiles build from the repository root, so that file is the one Docker
  reads.
- Don't run the seed outside development. It creates a global admin with a
  password published in this repository; `prisma/seed.ts` refuses to run under
  `NODE_ENV=production` unless you set `SEED_ALLOW_PRODUCTION=true`.
- Serve over HTTPS; the app sets `secure` cookies when `NODE_ENV=production`.
