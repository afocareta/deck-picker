# Desk Picker Design Brief

## Product

Desk Picker is an internal workplace tool for reserving desks across company offices in Italy. The UI should feel calm, fast, operational, and trustworthy: closer to a polished scheduling console than to a marketing site.

## Audience

- Employees who need to reserve a desk quickly in their assigned office.
- Admins who manage offices, closures, unavailable resources, audit history, and GDPR workflows.

## Design Direction

- Work-focused SaaS interface with clear information density.
- Use restrained color, strong hierarchy, and highly scannable tables.
- Avoid landing-page composition, oversized decorative sections, ornamental gradients, and purely illustrative art.
- Floor plan assets should be visible and useful, but seat selection remains table-based because floor plans have no coordinate metadata.
- The booking flow should feel short: dashboard to confirmed reservation in four clear actions.

## Visual Tone

- Reliable, modern, slightly warm.
- Italian office context can appear through real office names and addresses, not through decorative travel imagery.
- Primary action should be unmistakable but not loud.
- Admin areas should feel more analytical and compact than the employee flow.

## Layout Principles

- Persistent app shell after login: top bar with product name, current office, role, and account menu.
- Left navigation for admin users; standard users can use a simpler top-level navigation.
- Use compact cards only for individual metrics or repeated items. Do not nest cards.
- Tables are first-class UI: sticky headers where useful, clear empty states, visible row actions.
- Date and seat selection should remain usable at tablet width down to 768px.

## Data To Use In Mockups

Available offices:

- Ufficio Milano, Via Gustavo Fara, 9, 20124 Milano, 1 floor, 2 desks, 26 seats.
- Ufficio Cosenza, Via Pedro Alvares Cabral, 6, 87036 Rende, 1 floor, 1 desk, 12 seats.
- Ufficio Firenze, Viale Belfiore, 10, 50144 Firenze, 1 floor, 1 desk, 4 seats.
- Ufficio Roma, Via del Poggio Laurentino, 9, 00144 Roma, 2 floors, 2 desks, 32 seats.
- Ufficio Torino, Corso Moncalieri, 506/28, 10133 Torino, 1 floor, 3 desks, 8 seats.
- Ufficio Bologna is planned but missing source JSON and floor plan.

Floor plan images live in `docs/requests/samples/uffici/`.

## Core Screens

1. Login
2. First-login office selection
3. User dashboard
4. Booking wizard, step 1: date selection
5. Booking wizard, step 2: floor plan reference and seat table
6. Booking confirmation
7. Cancellation confirmation dialog
8. Admin dashboard
9. Admin office upload/upsert
10. Admin closing days
11. Admin resource availability
12. Admin audit trail
13. Admin GDPR tools

## Required UI Details

- User dashboard: upcoming reservations, today occupancy, next bookable weekday occupancy, history counts for 1/3/6 months, Book a Spot button.
- Admin dashboard: all user dashboard content plus per-office occupancy, closures/limited availability table, 26-week reservation line chart, admin controls.
- Wizard step 1: assigned office read-only, single date or range, disabled past/today/weekends/outside 21 days/office closures.
- Wizard step 2: floor plan image beside seat availability table; select seat, auto-assign, confirm.
- Reservation success: office, dates, floor, desk, seat, plus warning list when some dates were skipped.
- Admin office upsert: JSON upload, image upload, validation errors, migration impact preview.
- Audit trail: date range, admin, operation type, office filters, CSV export.
- GDPR: user search, DSAR export, anonymization confirmation with scope.

## Accessibility And UX Constraints

- WCAG 2.1 AA target.
- Chrome and Edge latest two versions must work; Firefox and Safari should work.
- Responsive down to 768px without horizontal page scrolling.
- Error messages must be actionable and non-technical.
- No internal error details in UI; include correlation ID when appropriate.
- Use icons for common actions, with labels or tooltips where clarity needs it.

## Deliverables Expected From Superpowers/Stitch

- Desktop mockups for all core screens.
- Tablet-width variants for dashboard and booking wizard.
- Component direction for buttons, inputs, date picker, tables, metrics, status badges, modals, and admin filters.
- Color, typography, spacing, and icon guidance.
- Exportable assets or screenshots saved under `docs/design/exports/`.
