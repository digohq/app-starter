# Your first feature

A walkthrough of building one feature end to end with a coding assistant, using
the code that is already here as the template.

[`AGENTS.md`](../AGENTS.md) tells the assistant what the conventions are. This
document is the other half: how to drive it, and how to tell whether what came
back is right. It assumes you have run `pnpm bootstrap` and can sign in at
http://localhost:3000.

## The one idea

**Ask for the whole vertical slice in one pass.**

A feature in this repository is not a backend task and then a frontend task. It
is one change that crosses five layers:

```
schema.prisma  →  service  →  DTO  →  API client  →  screen
   (database)     (logic)    (contract)  (fetch)      (UI)
```

Ask for all five together and the assistant can read the schema, the service,
the DTO, the client, and the component in a single pass, so the names and
shapes it invents on one side match the other. Ask for the backend today and
the frontend tomorrow and you get two partial views of the same feature — which
is where mismatched field names and endpoint shapes come from.

There is a check that catches the mismatch either way: `pnpm verify`
type-checks both apps at once. If the API returns `dueDate` and the component
reads `due_date`, it fails. Use it as the definition of done.

## Before you start

Get a clean baseline, so that any failure afterwards is yours:

```bash
pnpm verify
```

## Step 1 — Point at the reference implementation

Projects is the example vertical, and it exists to be copied. Every layer of it
is small enough to read in a few minutes:

| Layer      | File                                                        |
| ---------- | ----------------------------------------------------------- |
| Schema     | `apps/api/prisma/schema.prisma` — the `Project` model       |
| Service    | `apps/api/src/projects/projects.service.ts`                 |
| Routes     | `apps/api/src/projects/projects.controller.ts`              |
| Contract   | `apps/api/src/projects/dto/`                                |
| Tests      | `apps/api/src/projects/projects.service.spec.ts`            |
| API client | `apps/web/src/lib/projects-api.ts`                          |
| Form       | `apps/web/src/components/projects/ProjectForm.tsx`          |
| Screens    | `apps/web/src/app/organizations/[organizationId]/projects/` |

Read `projects.service.ts` yourself before you write a prompt. It is about two
hundred lines and it contains every rule that matters in this codebase — tenant
scoping, role checks, and the 404-not-403 convention. You cannot review what an
assistant hands you if you have not read the thing it was copying.

## Step 2 — Write the prompt

We will add a **due date** to projects. Small enough to finish in one sitting,
and it still touches all five layers.

> Add an optional due date to projects, end to end.
>
> Follow the conventions in AGENTS.md and copy the shape of the existing
> Projects code — `apps/api/src/projects/projects.service.ts` is the reference.
>
> - Add a nullable `dueDate` to the `Project` model as `TIMESTAMPTZ`, and
>   create the migration.
> - Accept it in `CreateProjectDto` and `UpdateProjectDto`, validated with
>   `class-validator`, and return it in `ProjectResponseDto`.
> - Add it to `ProjectsApi` and the `Project` type in
>   `apps/web/src/lib/projects-api.ts`.
> - Add a date field to `ProjectForm`, and show the due date on the project
>   detail page. Use the existing `components/ui` primitives.
> - Add a service test covering create and update with and without a due date.
>
> Then run `pnpm verify` and fix anything it reports.

Three things make that prompt work, and they generalise:

1. **It names the reference implementation.** "Follow the existing patterns" is
   too vague to act on; a file path is not.
2. **It lists the layers.** Not the code — the layers. This is the part
   assistants drop, and once one is missing the slice is broken.
3. **It ends with the verification command.** Otherwise you become the test
   runner, one error at a time.

## Step 3 — Check the file list before you read the code

You should get roughly ten files. Skim the list first — it is the fastest
signal you have:

```
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/<timestamp>_add_project_due_date/migration.sql
apps/api/src/projects/dto/create-project.dto.ts
apps/api/src/projects/dto/update-project.dto.ts
apps/api/src/projects/dto/project-response.dto.ts
apps/api/src/projects/projects.service.ts
apps/api/src/projects/projects.service.spec.ts
apps/web/src/lib/projects-api.ts
apps/web/src/components/projects/ProjectForm.tsx
apps/web/src/app/organizations/[organizationId]/projects/[projectId]/page.tsx
```

**No migration file** is the most common miss. The schema change alone works on
your machine — where you may have run `prisma db push` — and then fails for
everyone else and in CI. If it is absent, ask for it.

**Only API files, or only web files**, means you got half a slice. Ask for the
rest now, in the same session, while the context is still loaded.

**A new file where an existing one would do** — a second date-formatting helper,
a hand-rolled input instead of `components/ui` — is worth pushing back on. This
is what assistants do most reliably wrong, because writing new code is easier
for them than finding the existing code.

## Step 4 — Verify

```bash
pnpm verify
```

| It says                                  | It means                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type error in `apps/web` about `dueDate` | The two halves disagree. This is the check doing its job — fix the mismatch rather than casting it away                                                     |
| `@prisma/client` has no `dueDate`        | The generated client is stale: `pnpm --filter @app-starter/api exec prisma generate`                                                                        |
| Drift detected                           | The schema changed with no migration — see [troubleshooting](./troubleshooting.md)                                                                          |
| A failing service test                   | Read it before you change it. A test that fails because behaviour changed needs updating; a test that fails because the behaviour is wrong is doing its job |

Then look at it in the browser. `pnpm verify` proves the types agree and the
service does what its tests say. It cannot tell you the field is unreachable
because you forgot to render it, or that the date shows in the wrong timezone.
Create a project, set a due date, reload the page.

## The four rules

Everything above is process. These are the rules the code itself enforces, and
the ones to check by hand in anything an assistant writes.

**1. Every organization-scoped query filters by `organizationId`.** Never treat
an id as unguessable. `loadScoped` in `projects.service.ts` is the pattern:

```ts
const project = await this.prisma.project.findFirst({
  where: { id: projectId, organizationId },
});
if (!project) throw new ProjectNotFoundException(projectId);
```

Loading by id and _then_ comparing the organization is the bug this prevents —
it works, and it leaks that the record exists.

**2. A valid id from another tenant reads as 404, not 403.** 403 confirms the
record is real. This is the single most important line to check in generated
code, because it looks correct either way.

**3. Role checks live in the service, not a guard.** The organization id
arrives as a route parameter that has to be resolved against the caller before
a decision is possible. See
[`roles-and-permissions-guide.md`](./roles-and-permissions-guide.md) and
[ADR 0007](./adr/0007-role-checks-in-the-service-layer.md).

**4. Anything crossing the API/web boundary belongs in `packages/shared`.** Put
a shared type there and a rename becomes a compile error in both apps. Duplicate
it and the two copies drift silently — as `ProjectVisibility` currently does,
declared both as a Prisma enum and again by hand in
`apps/web/src/lib/projects-api.ts`. That one is small enough not to hurt. Yours
may not be.

## One size up: a whole new model

The same method scales to a new domain — say comments on a project. The
sequence is identical; there is just more of it:

- A **new Prisma model** carrying `organizationId`, with
  `@@index([organizationId])` and `@db.Timestamptz(6)` timestamps.
- A **new NestJS module** — `comments.module.ts`, controller, service, DTOs —
  registered in `app.module.ts`. One module per domain; controllers route,
  services hold the logic.
- **Routes nested under the organization**, as
  `organizations/:organizationId/projects/:projectId/comments`, so the tenant
  scope is visible in the path and a caller cannot omit it.
- A **new API client** in `apps/web/src/lib/`, following `projects-api.ts`.
- **Screens and components**, built from `components/ui`.

Ask for it as one change, in that order, naming Projects as the reference at
each layer. The prompt is longer; the shape is the same.

If the feature is large enough that you are unsure, ask for a plan first — the
file list and the model changes, no code — read it, correct it, then ask for
the implementation. Correcting a plan costs a minute. Correcting eight hundred
lines of generated code costs an afternoon.

## When it goes wrong

**It edited a committed migration.** Never allowed once the migration has run
anywhere but your machine. Revert it and write a new migration that corrects
the old one.

**It suggested `prisma migrate reset`.** That drops the database. Sometimes it
is genuinely the right call locally — the data here is disposable and
`prisma:seed` rebuilds it — but make that decision yourself rather than
accepting it as a fix. See [troubleshooting](./troubleshooting.md).

**It cast the error away.** `as any`, a non-null `!`, or a widened type to make
`pnpm verify` pass is the check being defeated rather than satisfied. The type
error was telling you the two halves disagree; silencing it ships the
disagreement.

**It rewrote things you did not ask about.** Revert the diff, narrow the
request, and go again. A smaller change you have read beats a larger one you
have not.

**It cannot explain the diff, or you cannot.** That is the point at which to
stop and read the code. `CONTRIBUTING.md` puts it plainly: a pull request whose
author cannot explain their own diff gets closed regardless of how it was
produced. AI assistance is welcome here — unread AI output is not.

## Where to go next

- [`AGENTS.md`](../AGENTS.md) — the conventions, in full
- [`docs/adr/`](./adr/README.md) — why the architecture is what it is
- [`docs/troubleshooting.md`](./troubleshooting.md) — when something breaks
- [`docs/integrations.md`](./integrations.md) — Google sign-in, storage, SMTP,
  custom domains
- [`SECURITY.md`](../SECURITY.md) — the checklist to read before you deploy
