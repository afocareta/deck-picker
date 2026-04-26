# Desk Picker MVP Design

## Context

Desk Picker is planned as a full internal desk reservation product for Italian offices. The complete product includes Google Workspace authentication, role-based admin tooling, office configuration management, closures, granular resource unavailability, email and Google Calendar integrations, audit trail, GDPR workflows, Kubernetes deployment, and observability.

The first implementation increment should be a vertical MVP that proves the core product loop: an employee can see their assigned office, inspect availability, reserve a desk, and view/cancel upcoming bookings. This keeps the product moving toward the final system without forcing all enterprise integrations into the first build.

## Product Roadmap

### Phase 1: MVP Vertical Slice

Build a working Next.js application with imported office assets, persistent local data, user dashboard, booking wizard, and reservation cancellation. Use a development user instead of real Google authentication. Exclude Bologna until source JSON and floor plan assets exist.

### Phase 2: Product Hardening

Add real Google Workspace authentication, hosted-domain validation, role detection, session handling, authorization boundaries, stricter error handling, and broader automated tests. Keep the booking flow non-blocked by external integrations.

### Phase 3: Admin Operations

Add admin dashboard, office upload/upsert, migration preview, closing days, resource availability, impact handling for affected reservations, and admin-only navigation.

### Phase 4: Enterprise Integrations

Add email notifications, Google Calendar working-location updates, audit trail, CSV export, GDPR DSAR export, anonymization, retention, and background retry jobs.

### Phase 5: Deployment And Observability

Add Docker, Kubernetes manifests, environment-specific configuration, CI/CD, health checks, structured logs, metrics, tracing, and dashboards for the existing observability stack.

## MVP Scope

### In Scope

- Next.js App Router scaffold with TypeScript.
- Application shell after a mock login/dev user.
- Import of the five complete office configurations from `docs/requests/samples/uffici/`.
- Floor plan images served from the app as static assets.
- SQLite-backed persistence through Prisma.
- User dashboard with upcoming reservations, occupancy metrics, and history counters.
- Two-step booking wizard:
  - assigned office shown read-only;
  - single date or date range within today + 1 through today + 21 calendar days;
  - weekdays only;
  - floor plan reference images;
  - seat availability table;
  - manual seat selection;
  - deterministic auto-assign;
  - partial success for ranges.
- Reservation creation with database-level uniqueness for seat/date and user/date.
- Reservation cancellation for future bookings.
- Stitch design pass before final frontend component styling.
- Automated unit and integration coverage for import, availability, booking rules, and dashboard derivations.

### Out Of Scope For MVP

- Real Google Workspace authentication.
- Admin dashboard and admin operations.
- Runtime office upload/upsert.
- Office closing days and resource unavailability.
- Email and Google Calendar integrations.
- Audit trail, GDPR workflows, data retention.
- Kubernetes deployment and production observability.
- Mobile-native app.
- Cross-office booking.
- Same-day, weekend, recurring, or past-date booking.

## Architecture

Use Next.js with the App Router as a full-stack web application. Server-side code owns Prisma access, booking validation, office import, and dashboard aggregation. Client components own interaction-heavy UI such as the date/range picker and seat selection table.

The MVP should keep domain logic in focused modules under `src/features`, rather than embedding booking rules directly inside pages. This will make later Google auth, admin workflows, and API hardening easier to add without replacing the core booking model.

## Data Model

The MVP uses Prisma with SQLite in development.

- `User`: development user profile with assigned office and role.
- `Office`: imported office name and location.
- `Floor`: imported floor number, name, and floor map asset path.
- `Desk`: imported desk number and name.
- `Seat`: imported seat number and relationships.
- `Reservation`: user, office, seat, date, status, timestamps.

`Reservation` must enforce:

- one active reservation per seat per date;
- one active reservation per user per date.

Cancelled reservations remain in the table for history, but do not count as active bookings or availability blockers.

## Office Import

The import reads all complete office JSON files from:

- `docs/requests/samples/uffici/mi/ufficio-milano.json`
- `docs/requests/samples/uffici/cs/ufficio-cs.json`
- `docs/requests/samples/uffici/fi/ufficio-fi.json`
- `docs/requests/samples/uffici/rm/ufficio-roma.json`
- `docs/requests/samples/uffici/to/ufficio-to.json`

Each JSON must be validated against `docs/requests/schemas/office-schema.json`. Referenced floor plan images are copied or made available under `public/offices/<office-code>/`. Bologna is represented only in documentation as missing source data, not seeded as an active office.

## Booking Rules

- Users can book only in their assigned office.
- Bookable dates are tomorrow through 21 calendar days from today.
- Weekends are not bookable.
- Same-day, past, and out-of-horizon dates are rejected in UI and server code.
- A date range creates one reservation per bookable date.
- Manual seat selection attempts to book the same selected seat for each requested date.
- Auto-assign first tries the lowest ordered seat available for every requested date.
- If no seat is available for every requested date, auto-assign picks the seat with the highest number of available requested dates, breaking ties by floor number, desk number, then seat number.
- Partial success is allowed for ranges: available dates are booked and skipped dates are returned with a reason.
- Concurrent attempts cannot create duplicate active seat/date reservations.

## User Experience

The MVP uses a persistent app shell with product name, assigned office, role indicator, and a non-functional account label for the fixed development user. The dashboard is the first authenticated screen.

The dashboard shows upcoming reservations, today occupancy, next bookable weekday occupancy, history counters for 1/3/6 months, and a clear Book a Spot action. The wizard should be completable from dashboard to confirmation in four obvious actions.

Seat selection remains table-based because floor plan assets have no coordinate metadata. Floor images are shown as reference material next to the table.

## Stitch Gate

Before final frontend styling, run Stitch with the existing inputs:

- `docs/design/design-brief.md`
- `docs/design/superpowers/prompt.md`
- `docs/design/stitch/handoff.md`
- office assets under `docs/requests/samples/uffici/`

Stitch output should be saved under `docs/design/exports/` and should include dashboard, booking wizard, component tokens, table states, modal states, and tablet variants. Implementation should then map those tokens and layouts into the Next.js components.

## Testing Strategy

Automated tests should cover:

- office JSON validation and import counts;
- floor map asset path resolution;
- bookable date calculations;
- seat availability derivation;
- manual and auto-assigned booking;
- date range partial success;
- duplicate user/date and seat/date prevention;
- dashboard metrics and reservation history;
- cancellation of future reservations.

The MVP is complete when a developer can run the app locally, seed offices, book and cancel desks, see dashboard metrics update, and verify the core tests pass.

## Self Review

- No incomplete requirements remain in this design.
- MVP scope is intentionally narrower than the final product roadmap.
- Bologna is explicitly excluded from active import because source data is missing.
- Stitch is a required visual pass before final component styling, not a replacement for the implementation plan.
- The core no-double-booking requirement is represented in both server rules and database constraints.
