# 0008 — Leave billing to the adopter

- **Status**: Accepted
- **Date**: 2026-08-26

## Context

Most SaaS starters ship a billing implementation, usually Stripe
subscriptions with seat counting and plan entitlements.

Doing that here would make the starter opinionated about the thing that varies
most between products. Payment provider, pricing model, seat versus usage
versus flat rate, trials, tax handling, regional requirements — none of these
are decisions a starter can make for a product it knows nothing about.

Worse, a billing implementation is not neutral scaffolding. It reaches into the
data model, the invite flow, and the authorization path. Removing an
implementation you disagree with is more work than adding the one you want, and
every adopter who does not use Stripe pays that cost before writing any code.

## Decision

Ship no billing, no payments, and no plan entitlements.

The starter's scope is multi-tenancy: organizations, roles, invites, custom
domains, notifications, and the surrounding infrastructure. Monetisation is
left entirely to whoever adopts it.

## Consequences

There is no `Plan`, `Subscription`, or `BillingEvent` model, no payment
provider dependency, and no entitlement layer. Nothing to rip out.

`Organization` is the natural place to attach billing when it is added. It
already has the identity, the membership list that a seat count would use, and
the id every scoped query filters on.

If plan-gated features are wanted later, one shape that works well is a JSON
`features` column on the plan, holding boolean flags and numeric limits, read
through a cached service and invalidated by the provider's webhook. That keeps
pricing changes out of migrations. It is a suggested starting point, not
something the codebase implements.

Authorization is now purely role-based ([0007](0007-role-checks-in-the-service-layer.md)).
An adopter adding billing will want a second, orthogonal axis — role answers
_may this person act_, entitlement answers _has this organization paid for it_ —
and both need to pass.
