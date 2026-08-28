# 0003 — NestJS for the API

- **Status**: Accepted
- **Date**: 2025-12-17

## Context

With the API as its own application ([0001](0001-separate-frontend-and-backend.md)),
it needed a framework. The lighter options — Express or Fastify on their own —
leave the structure entirely to the team: no prescribed module boundaries, no
dependency injection, no convention for validation or configuration.

That freedom costs more than it saves once a codebase has more than a handful
of domains. Every project invents its own layout, and the layout drifts.

The priority was maturity: a framework with settled conventions, a large
ecosystem, and documentation that answers questions without archaeology.

## Decision

Use NestJS for the API.

## Consequences

Module boundaries are enforced by the framework rather than by convention. One
module per domain, with explicit imports and exports, so the dependency graph
is something you can read.

Dependency injection makes services testable without a running application.
Most of the unit tests in this repository build a testing module with mocked
providers and never touch a database.

`class-validator` DTOs give every endpoint input validation at the edge, so
handlers can assume their inputs are well-formed.

The cost is ceremony. A new endpoint means a module, a controller, a service,
and DTOs even when the logic is three lines. Decorators and DI also carry a
learning curve for anyone who has only worked in Express.

Circular dependencies between modules are possible and do happen — billing and
organizations reference each other here — and require `forwardRef` on both the
module and the constructor injection. Getting only one of the two produces a
failure at boot rather than at compile time.
