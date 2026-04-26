# Desk Picker MVP Runbook

## Setup

```bash
npm install
npm run assets:offices
npm run db:generate
npm run db:migrate
npm run db:seed
```

The MVP uses Prisma 7 with SQLite through `@prisma/adapter-better-sqlite3`. The local database URL is configured in `.env`:

```bash
DATABASE_URL="file:./dev.db"
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The root route redirects to `/dashboard`, and authenticated pages redirect to
`/login` when there is no app session. Local development users are:

```text
dev.user@example.com
dev.admin@example.com
```

Google login routes are present too. If `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are configured, `/login` can start the Google OAuth
flow; otherwise the local dev and admin fallbacks remain available from the
login page.

## Verify

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

## MVP Scope

Implemented:

- Next.js App Router scaffold.
- Prisma/SQLite data model.
- Import of the five complete offices: Milano, Cosenza, Firenze, Roma, Torino.
- Static floor plan assets under `public/offices/`.
- Dev user assigned to Milano.
- Dev admin assigned to Milano.
- Signed session cookie, local dev/admin auth routes, login page, logout, and Google OAuth route scaffolding.
- Browser-session-only app session cookie.
- Hosted-domain validation for Google profiles when `GOOGLE_HOSTED_DOMAIN` is configured.
- Admin role assignment from configured admin email list.
- User office selection and office settings page.
- Dashboard metrics and upcoming reservations.
- Workspace search across offices, seats, reservations, and admin-visible users.
- Future reservation cancellation.
- Booking wizard with single/range dates, floor plan reference, seat table, manual booking, auto-assign, and confirmation.
- Database-level active reservation uniqueness for seat/date and user/date.
- Admin control room with user role/office updates, reservation cancellation, future reservation filters, office closures, resource blocks, and audit log display.
- Unit/integration tests and one Playwright booking flow.

Partially implemented / local-only:

- Google Workspace authentication exists as OAuth/token verification routes, but admin role detection is configured by `AUTH_ADMIN_EMAILS`, not Google Workspace group membership yet.
- Office closures and resource unavailability can be created, but existing impacted reservations are not automatically cancelled or emailed.
- Audit log exists for selected admin actions, but CSV export and broader audit workflows are not complete.

Not implemented yet:

- Runtime office upload/upsert.
- Email and Google Calendar integrations.
- GDPR DSAR/anonymization tools and retention jobs.
- Kubernetes deployment and observability.

## Design

Design exports live in:

```text
docs/design/exports/
```

`tokens.md` is the current frontend token baseline. Stitch is configured in `.mcp.json`, but the Stitch MCP tools were not exposed in this Codex runtime. When Stitch is available, regenerate dashboard and booking wizard screens and update the exports before deeper visual polish.

## Data Notes

Bologna is not seeded because source JSON and floor plan assets are missing.

Tests may create scoped database rows with prefixes such as `task5-test` and `task6-test`. They do not delete physical files.

The Vitest feature suite uses the shared local SQLite database and therefore
runs test files serially (`fileParallelism: false`) to avoid cleanup races
between independent feature tests.
