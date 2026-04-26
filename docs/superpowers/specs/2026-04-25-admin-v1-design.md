# Admin v1 Design

Goal: add a protected admin control room for operational booking management.

Scope:
- `/admin` is available only to users with role `ADMIN`.
- Non-admin users are redirected to `/dashboard`.
- Admin navigation appears only for admins.
- `/admin` has three tabs in one page: Overview, Users, Reservations.
- Overview shows total users, offices, future active reservations, and today's active reservations.
- Users lists all users with role and assigned office, and supports role and office updates.
- Reservations lists future active reservations for all users, with an office filter and admin cancel action.
- Admin cancellation can cancel any future active reservation.

Out of scope:
- audit log
- separate admin sub-pages
- destructive user deletion
- office CRUD
- custom auth provider changes

Testing:
- Unit/integration tests cover admin summary, user updates, role guard helpers, and admin cancellation.
- Existing booking flow must keep passing.
