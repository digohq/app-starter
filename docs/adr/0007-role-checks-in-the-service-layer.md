# 0007 — Enforce organization roles in services, not guards

- **Status**: Accepted
- **Date**: 2026-08-26

## Context

NestJS guards are the idiomatic place for authorization. A `@Roles('ADMIN')`
decorator with a matching guard is a familiar pattern and keeps controllers
clean.

It works when the role is a property of the user. It fits badly when the role
is a property of the _relationship_ between the user and a resource. Here, a
user is an `OWNER` of one organization and a `MEMBER` of another, so "is this
caller an admin" has no answer without knowing which organization is being
acted on.

That id usually arrives as a route parameter, which means a guard would have to
read `request.params`, query the membership table, and attach the result — at
which point it is doing service work in a guard, and the service still cannot
assume it ran.

## Decision

Guards handle authentication and platform-level authorization only:
`JwtAuthGuard`, `EmailVerifiedGuard`, and `GlobalAdminGuard`.

Organization role checks live in the service layer, resolved explicitly through
`OrganizationsService.getUserRoleInOrganization(userId, organizationId)`.

## Consequences

A service method is safe to call from anywhere — another service, a queue
worker, a script — because it does not depend on a guard having run first.

The check is visible at the point of use. Reading a service method tells you
what it requires, without cross-referencing a decorator against a guard
registration.

The cost is repetition: every method that needs a role check performs one, and
forgetting is possible. The mitigation is that the checks are short, named
consistently (`requireRole`, `requireCreatorOrManager`), and easy to test —
"stops a MEMBER editing another member's project" is a direct test of the
service, with no HTTP layer involved.

A guard remains the right tool for anything that is a property of the caller or
of the organization alone, rather than of the relationship between them — see
[0008](0008-no-billing-in-the-starter.md) for where a plan-gating guard would
sit if billing is added.
