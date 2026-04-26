# Desk Picker MVP Design Tokens

Source inputs:

- `docs/design/design-brief.md`
- `docs/design/screen-map.md`
- `docs/design/stitch/handoff.md`
- `docs/design/superpowers/prompt.md`

Updated after Stitch export: `docs/design/exports/desk_picker_operational_system/DESIGN.md`.

## Visual Direction

Desk Picker uses the **Control Room** direction: compact, authoritative, high-density operations UI. The first authenticated view is the dashboard, not a landing page. Floor plan assets are reference images; seat selection remains table-based.

## Color Tokens

```css
:root {
  --color-page: #eef3f5;
  --color-surface: #ffffff;
  --color-surface-muted: #f6f8f9;
  --color-surface-strong: #3d3935;
  --color-border: #d1d9dd;
  --color-border-strong: #aebbc2;
  --color-text: #271814;
  --color-text-muted: #625d59;
  --color-text-subtle: #8b949e;
  --color-primary: #e34b25;
  --color-primary-hover: #c83d1c;
  --color-primary-soft: #ffe9e4;
  --color-accent: #007bb8;
  --color-accent-soft: #e6f3fb;
  --color-danger: #ba1a1a;
  --color-danger-soft: #ffdad6;
  --color-warning: #a36a00;
  --color-warning-soft: #fff0d1;
  --color-success: #087f3f;
  --color-success-soft: #dff5e7;
  --color-focus: #e34b25;
  --shadow-panel: 0 2px 4px rgba(61, 57, 53, 0.05);
}
```

Vermillion is reserved for primary action and active state. Charcoal anchors navigation and table headers. Blue remains a secondary data accent.

## Typography

- Font stack: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- Page title: 24px, 600 weight, 32px line-height.
- Section title: 18px, 600 weight, 28px line-height.
- Table text: 14px, 400-500 weight, 20px line-height.
- Metadata and helper text: 13px, 400 weight, 18px line-height.
- Letter spacing: `0`.

## Spacing And Radius

- Page padding: 24px desktop, 20px tablet.
- App shell max width: 1280px.
- Section gap: 24px.
- Control gap: 12px.
- Table cell padding: 12px horizontal, 10px vertical.
- Border radius: 8px for cards/modals, 6px for buttons/inputs/badges.
- No card-inside-card layouts.

## Shadows And Focus

- Default surfaces rely on borders and a very light ambient shadow.
- Panel shadow: `var(--shadow-panel)`.
- Popovers/modals: `0 16px 40px rgba(61, 57, 53, 0.16)`.
- Focus ring: 2px solid `var(--color-focus)` with 2px offset.

## Components

### App Shell

- Desktop: charcoal left sidebar with product mark, Dashboard, Bookings, and Quick Reserve.
- Tablet/mobile: compact top navigation.
- Top bar keeps assigned office, role badge, and dev account visible.

### Metric Blocks

- Compact bordered surfaces, 8px radius.
- Label, large value, one-line context.
- Use neutral backgrounds; semantic color only for warnings or high occupancy.

### Tables

- Sticky header where table height can scroll.
- Row actions aligned right.
- Empty state is inline inside the table container.
- Do not rely on color alone; status text must be present.

### Buttons

- Primary: filled vermillion.
- Secondary: charcoal fill or white surface with border depending on hierarchy.
- Destructive: red text/border or red fill only in confirmation modals.
- Icon buttons need accessible labels.

### Status Badges

- Available: success soft background, success text.
- Reserved: warning soft background, warning text.
- Unavailable/closed: muted background, muted text.
- Cancelled: muted background, muted text.

### Booking Wizard

- Two visible steps with compact progress.
- Step 1: assigned office read-only, single/range mode, date inputs.
- Step 2: floor plan reference on the left/top and seat table on the right/below depending on width.
- At 768px, stack floor plan above table.
- Confirmation shows booked dates first, skipped dates as warning rows.

## MVP Screen Guidance

### User Dashboard

Layout:

- Header row with title and Book a Spot action.
- Three metric blocks: today occupancy, next bookable occupancy, history.
- Upcoming reservations table below.
- Empty state should still make Book a Spot obvious.

### Booking Wizard

Layout:

- Keep the wizard within one main content column.
- Do not use a decorative hero.
- Seat table columns: status, floor, desk, seat, selected action.
- Floor images should preserve aspect ratio and never crop critical plan details.

## Accessibility

- Target WCAG 2.1 AA contrast.
- All form controls have labels.
- Error messages explain corrective action.
- Button text must fit at 768px without horizontal page scrolling.
