# 0002 — Next.js for the web app

- **Status**: Accepted
- **Date**: 2025-12-17

## Context

The application has pages that need to be found by search engines. Public
profiles, organization pages, and anything served on a customer's own domain
are only useful if they can be indexed and previewed.

A client-rendered single-page app makes that harder than it needs to be. The
markup arrives empty, metadata has to be injected after the fact, and social
previews depend on whatever the crawler is willing to execute.

## Decision

Use Next.js with the App Router for the web app, and server-render the pages
that need to be indexed.

## Consequences

Public pages return real HTML on first response. `generateMetadata` gives each
route its own title and description without client-side work, which is what
makes link previews and indexing behave.

The public routes in this codebase — `/organization/[slug]`,
`/users/[username]` — are server components that fetch directly rather than
going through the browser API client. That split is deliberate: authenticated
app routes are client components using React Query, public ones are not.

The cost is two rendering contexts to keep straight. Something that runs fine
in a client component will fail in a server one, and the boundary is a common
source of confusion. `'use client'` at the top of a file is load-bearing.

Server-side rendering also means the web app makes its own outbound calls to
the API, so the API must be reachable from the web server, not only from the
browser. `NEXT_PUBLIC_API_URL` is used in both places.
