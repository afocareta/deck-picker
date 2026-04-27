# Availability And Closures Range Design

Goal: make admin office closures and resource unavailability match the full software spec for date ranges, impact preview, cancellation of affected reservations, audit logging, and removal.

## Scope

- Admins can create office closures for an inclusive date range.
- Admins can create resource unavailability for an inclusive date range.
- Resource unavailability supports office, floor, desk, and seat targets.
- Resource target options are filtered by selected office and selected resource type.
- Admins must preview impact before confirming a closure or resource block.
- Preview shows active future reservations that would be cancelled by the operation.
- Confirmation creates the period, cancels affected active reservations, and writes audit logs.
- Admins can remove future closure/resource block periods.
- Removing a period re-enables availability but does not recreate previously cancelled reservations.
- Booking availability and booking submission both respect closure/block ranges.

Email notifications and Google Calendar updates remain part of the full product spec, but are implemented in a later integration block. This block records enough cancellation reason/detail for those integrations to attach later.

## Data Model

`OfficeClosure` changes from a single `date` to:

- `startDate`
- `endDate`
- `reason`
- `createdAt`

`ResourceBlock` changes from a single `date` to:

- `startDate`
- `endDate`
- `blockType`
- optional `floorId`, `deskId`, `seatId`
- `reason`
- `createdAt`

Existing single-day records migrate to `startDate = date` and `endDate = date`.

Indexes should support range lookup by office/resource and date overlap. Exact uniqueness is not required for this block because overlapping business periods can be valid if they describe different reasons or resource levels. Duplicate detection may be added later as a UX improvement, not as a blocking rule.

## Validation Rules

- `startDate` and `endDate` are required.
- Dates use UTC-normalized day values.
- `startDate <= endDate`.
- The range must be future-only: no past dates and no today.
- Every date in the range must be a weekday.
- Office closure requires an office and reason.
- Resource block requires office, type, reason, and target for floor/desk/seat.
- For floor/desk/seat blocks, the target must belong to the selected office.

User-facing errors should be short and actionable, for example:

- `Invalid date range`
- `Closing days can only be set for weekdays`
- `Target does not belong to selected office`
- `Reason is required`

## Admin Flow

The `Admin > Availability` tab has two managed operations.

Office closure form:

- Office
- Start date
- End date
- Reason
- Preview impact

Resource block form:

- Office
- Resource type: office, floor, desk, seat
- Target, hidden or disabled for office-level blocks
- Start date
- End date
- Reason
- Preview impact

Preview result includes:

- affected reservation count
- user name
- user email
- date
- office
- floor
- desk
- seat
- reason

The admin confirms from the preview state. If there are no affected reservations, confirmation is still explicit and shows `No active reservations affected`.

## Confirmation Behavior

On confirmation, the server performs the operation transactionally:

- Re-validates all input.
- Recomputes affected active future reservations.
- Creates the office closure or resource block.
- Cancels affected reservations with `status = CANCELLED` and `cancelledAt`.
- Writes audit entries for the admin operation and reservation cancellations.
- Revalidates admin, dashboard, booking, and search surfaces.

Affected reservations are active reservations whose date is inside the range and whose seat is inside the affected office/resource hierarchy.

## Removal Behavior

Admins can remove future closure/resource block periods.

Removal rules:

- Only future periods can be removed.
- Removing a period deletes the closure/block record.
- Removing a period does not restore reservations cancelled when the period was created.
- Removal writes an audit entry.
- Availability and booking immediately reflect the removed period.

## Booking And Availability Behavior

Availability queries treat a date as blocked when:

- an office closure overlaps that date for the office; or
- a resource block overlaps that date for the office; and
- the resource block applies to the selected seat through office/floor/desk/seat hierarchy.

Booking submission performs the same range-aware checks server-side before creating reservations. UI availability is advisory; server validation remains authoritative.

The booking wizard should continue to support partial success for date ranges. If a selected range contains blocked dates, available dates can still be booked and blocked dates return a skipped reason.

## Audit

Audit logs should cover:

- office closure created
- office closure removed
- resource block created
- resource block removed
- reservation cancelled by a closure/resource block confirmation

Each audit log should include the actor, operation type, affected period/resource, and a summary. Reservation cancellation logs should keep the cancelled reservation id and target user.

The existing audit model can be extended if necessary, but the implementation should keep append-only behavior.

## Testing

Automated coverage must include:

- closure range blocks availability and booking for every weekday in range
- resource block range blocks office/floor/desk/seat hierarchy correctly
- invalid ranges are rejected
- weekend-containing ranges are rejected
- preview returns the expected affected reservations
- confirmation creates the period and cancels affected reservations
- confirmation writes audit entries
- removal re-enables availability
- target list filters by selected office and selected type
- E2E admin preview and confirmation for closure range
- E2E admin preview and confirmation for resource block range
- E2E booking cannot book blocked dates

## Out Of This Block

The following requirements remain in the full software spec and are intentionally scheduled for later blocks:

- Email notifications for affected users.
- Google Calendar working-location/event updates.
- Retry queue processing for notification/calendar failures.
- Office JSON upload/upsert and migration preview.
- Full audit CSV export.
- GDPR DSAR/anonymization.
- Deployment and observability work.
