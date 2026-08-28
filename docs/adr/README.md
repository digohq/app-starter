# Architecture Decision Records

Short notes on decisions that shaped this codebase, and why. They exist so you
can tell a considered choice from an accident, and so you know what you are
breaking if you change one.

Records are immutable once accepted. If a decision is reversed, add a new
record that supersedes the old one rather than editing history.

Format follows [Michael Nygard's](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
lightweight template: context, decision, consequences.

| #                                                   | Decision                                                 | Status   |
| --------------------------------------------------- | -------------------------------------------------------- | -------- |
| [0001](0001-separate-frontend-and-backend.md)       | Separate the frontend and backend into two apps          | Accepted |
| [0002](0002-nextjs-for-the-web-app.md)              | Next.js for the web app                                  | Accepted |
| [0003](0003-nestjs-for-the-api.md)                  | NestJS for the API                                       | Accepted |
| [0004](0004-postgresql-as-the-datastore.md)         | PostgreSQL as the primary datastore                      | Accepted |
| [0005](0005-redis-for-cache-and-queues.md)          | Redis for caching and background queues                  | Accepted |
| [0006](0006-single-database-multi-tenancy.md)       | Single-database multi-tenancy scoped by `organizationId` | Accepted |
| [0007](0007-role-checks-in-the-service-layer.md)    | Enforce organization roles in services, not guards       | Accepted |
| [0008](0008-no-billing-in-the-starter.md)           | Leave billing to the adopter                             | Accepted |
| [0009](0009-monorepo-over-separate-repositories.md) | One repository for both apps                             | Accepted |

Records 0001–0005 date from the original build. 0006–0009 were made when the
codebase was generalised into a starter — see the Provenance section of the
[README](../../README.md).
