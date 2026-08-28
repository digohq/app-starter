# 0006 — Single-database multi-tenancy scoped by `organizationId`

- **Status**: Accepted
- **Date**: 2026-08-26

## Context

Multi-tenant applications isolate tenants in one of three common ways: a
database per tenant, a schema per tenant, or a shared schema with a tenant
column on every scoped table.

Database- and schema-per-tenant give strong isolation and simple compliance
stories, at the cost of running migrations across N databases, connection
pooling that scales with tenant count, and cross-tenant queries becoming a
project. Those costs are worth paying at a certain size and for certain
regulatory positions. Most products never reach either.

A shared schema keeps operations simple and makes admin and analytics queries
ordinary, but moves isolation into application code — where a single forgotten
`where` clause is a data leak.

## Decision

Use a shared schema. Every tenant-scoped table carries an `organizationId`, and
every query filters on it.

Load records by id **and** organization, so a valid id belonging to another
tenant returns 404 rather than confirming the record exists.

## Consequences

One database, one migration run, one connection pool. Admin surfaces query
across tenants without federation.

Isolation is now a discipline rather than a guarantee, and that discipline has
to hold in every new query. This is the single most dangerous property of the
codebase to get wrong.

`ProjectsService` exists partly to make the pattern concrete. Its
`loadScoped()` helper is the shape to copy:

```ts
const project = await this.prisma.project.findFirst({
  where: { id: projectId, organizationId },
});
```

Not `findUnique({ where: { id } })` followed by a check — the filter belongs in
the query.

Tests should cover the negative case. "reads a project from another
organization as not found" is a more valuable test than most happy paths.

If a deployment later needs hard isolation, this is reversible but not cheaply:
the `organizationId` columns become the partition key, and the work is in the
migration and the connection routing rather than in the query code.
