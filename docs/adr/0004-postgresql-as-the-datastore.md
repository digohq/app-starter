# 0004 — PostgreSQL as the primary datastore

- **Status**: Accepted
- **Date**: 2025-12-17

## Context

The data here is relational and the relationships matter: users belong to
organizations, organizations own records, and almost every query is scoped by
one of those relationships. Referential integrity is doing real work, not
getting in the way.

The choice was between a mature relational database and the alternatives —
document stores, or a managed proprietary service. The deciding factor was
maturity: decades of production use, well-understood operational behaviour, and
availability from every hosting provider without lock-in.

## Decision

Use PostgreSQL as the primary datastore, accessed through Prisma.

## Consequences

Foreign keys and cascading deletes are enforced by the database. Deleting an
organization removes its members, invites, domain mappings, and everything else
scoped to it, without application code walking the graph.

Transactions are available where an operation must be atomic — creating an
organization and its first owner membership, for instance.

`TIMESTAMPTZ` is the convention for every timestamp, so times are unambiguous
across regions.

The JSON column type is available where structured data would otherwise need a
migration per field — notification payloads use it — while everything that
needs constraints stays in real columns.

Schema changes require migrations, which is friction compared to a schemaless
store, but the friction is the feature — the shape of the data is reviewed and
versioned rather than discovered in production.

Prisma sits on top for type-safe queries. That is a real dependency: the
generated client must be regenerated after any schema change, and it is the
main thing that makes a fresh checkout fail if you skip `prisma generate`.
