# Roles and Permissions Guide

How access control works across the stack. Two independent axes: **platform
admin** (a flag on the user) and **organization role** (a row in
`OrganizationMember`).

## Platform admin

`User.isGlobalAdmin` is a boolean on the user record. It is not a role in the
organization sense — it grants access to the admin surfaces at `/admin` and the
`admin/dashboard/*` API routes, independently of any organization membership.

Enforced by `GlobalAdminGuard` (`src/auth/global-admin.guard.ts`), which is
applied alongside `JwtAuthGuard` on the whole `AdminDashboardController`.

Global admins can:

- List and search platform users
- Quarantine and unquarantine users (`User.quarantinedAt`)
- Impersonate a user, which writes an `AdminImpersonationAudit` row

Both quarantine and impersonation are audited. There is no way to perform
either without leaving a record.

## Organization roles

Every membership carries exactly one `OrgRole`. The enum is ordered by
authority, but there is no numeric hierarchy constant — checks are explicit
comparisons against the roles that are allowed.

| Role     | Granted to                      | Can do                                                                                                                          |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `OWNER`  | The creator of the organization | Everything below, plus: delete the organization, transfer ownership, promote another member to `OWNER`                          |
| `ADMIN`  | Promoted by an `OWNER`          | Manage members and their roles, create and cancel invites, edit organization settings and email settings, manage custom domains |
| `MEMBER` | Default for accepted invites    | Read organization data; act within the organization's verticals                                                                 |

Enforcement rules worth knowing:

- **Only an `OWNER` can delete the organization.** Deletion cascades to
  members, invites, domain mappings, and everything org-scoped.
- **Only an `OWNER` can create another `OWNER`,** and an existing `OWNER`'s
  role cannot be changed by anyone else.
- `ADMIN` and `OWNER` both manage invites and settings; everything else is
  `MEMBER`-visible.

The invited role is fixed at send time (`OrganizationInvite.invitedRole`) and
is immutable afterwards — changing someone's role after they accept is a
separate, separately-authorised action.

## Guards

| Guard                  | Location    | Purpose                                                                                                                                    |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `JwtAuthGuard`         | `src/auth/` | Requires a valid access token                                                                                                              |
| `OptionalJwtAuthGuard` | `src/auth/` | Populates `req.user` when a token is present, but allows anonymous requests — used on public routes that render differently when signed in |
| `EmailVerifiedGuard`   | `src/auth/` | Requires `User.emailVerifiedAt`; applied to mutating routes so unverified accounts can read but not write                                  |
| `GlobalAdminGuard`     | `src/auth/` | Requires `User.isGlobalAdmin`                                                                                                              |
| `ThrottlerGuard`       | global      | Rate limiting, registered as an `APP_GUARD`                                                                                                |

Organization role checks are **not** a guard. They happen inside the service
layer, because the organization id usually arrives as a route parameter that
has to be resolved against the caller before a decision can be made. See
`OrganizationsService.getUserRoleInOrganization`.

## Adding a role check to a new vertical

The `Project` model is the worked example. When adding an org-scoped resource:

1. Give it an `organizationId` and index it.
2. Resolve the caller's role with `getUserRoleInOrganization(userId, organizationId)`.
3. Throw `ForbiddenException` when the role is null or not in the allowed set.
4. Scope every query by `organizationId` — never rely on an id being
   unguessable.
