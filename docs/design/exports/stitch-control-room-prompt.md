# Stitch Prompt: Desk Picker Control Room Direction

Create production-grade UI mockups for Desk Picker using the **Control Room** visual direction.

## Product

Desk Picker is an internal desk reservation web app for employees across Italian offices. It is not a marketing site. The first authenticated screen is the working dashboard.

## Chosen Direction

**Control Room**

- Serious operational SaaS.
- Compact, repeatable daily-use interface.
- Left navigation / rail feeling even for MVP.
- Strong dashboard hierarchy.
- Clear tables.
- Calm gray-blue page background.
- Deep blue-charcoal navigation.
- Teal primary action.
- Blue secondary data accents.
- Amber only for warning/history emphasis.
- No decorative gradients, no orbs, no hero page, no oversized cards.

## Screens To Generate

1. User dashboard desktop, 1366px.
2. User dashboard tablet, 768px.
3. Booking wizard step 1 desktop.
4. Booking wizard step 2 desktop.
5. Booking wizard tablet, 768px.
6. Booking confirmation with partial success warning.

## Real Content

Use:

- Product: Desk Picker.
- User: `dev.user@example.com`.
- Assigned office: Ufficio Milano.
- Address: Via Gustavo Fara, 9, 20124 Milano.
- Office has 1 floor, 2 desks, 26 seats.
- Example upcoming reservation:
  - Mon, 27 Apr 2026
  - Ufficio Milano
  - Piano terra
  - MI-DESK-T1
  - Seat 1

## Dashboard Requirements

Dashboard must include:

- App shell.
- Product name.
- Current office.
- Role/user area.
- Book a Spot primary action.
- Metrics:
  - occupancy today;
  - occupancy next bookable day;
  - history counters for 1/3/6 months.
- Upcoming reservations table:
  - date;
  - office;
  - floor;
  - desk;
  - seat;
  - cancel action.
- Empty state variant can be implied but not primary.

## Booking Wizard Requirements

Step 1:

- Assigned office read-only.
- Single date / range segmented control.
- Native-looking date fields.
- Step indicator.
- Next action.

Step 2:

- Floor plan image as visual reference.
- Seat availability table is primary.
- Columns: status, floor, desk, seat, select.
- Auto-assign button.
- Confirm Reservation button.
- No seats state.

Confirmation:

- Office.
- Booked dates.
- Seat detail.
- Skipped dates warning table when partial success occurs.
- Back to dashboard action.

## Component Direction

Use:

- 6px radius controls.
- 8px radius panels.
- Thin borders.
- Dense table rows.
- Clear focus states.
- Status badges with text and color.
- No nested cards.

## Token Direction

Suggested palette:

- Page: `#eef3f5`
- Surface: `#ffffff`
- Surface muted: `#f5f8fa`
- Border: `#cbd7dd`
- Text: `#14252d`
- Muted text: `#55707b`
- Nav: `#18323b`
- Nav muted: `#8fb3bf`
- Primary teal: `#256b5f`
- Primary hover: `#1d574e`
- Data blue: `#4b6d94`
- Warning amber: `#a36a00`
- Danger red: `#b42318`

## Acceptance Criteria

- Looks like a real internal operations tool.
- No generic AI dashboard look.
- Dashboard and booking wizard fit at 1366px.
- Tablet variants fit at 768px without page horizontal scrolling.
- Tables are comfortable for repeated use.
- Floor plan does not dominate seat selection.
- Primary action is obvious, not loud.
