# Stitch Handoff Notes

Use Stitch after the first Superpowers direction is selected. The goal is to refine the generated direction into implementable layouts and components.

## Inputs

- `docs/design/design-brief.md`
- `docs/design/superpowers/prompt.md`
- Superpowers exports saved under `docs/design/exports/`
- Office assets under `docs/requests/samples/uffici/`
- Office schema under `docs/requests/schemas/office-schema.json`

## Stitch Tasks

1. Normalize the app shell:
   - authenticated top bar;
   - role indicator;
   - assigned office display;
   - admin navigation state.

2. Refine core components:
   - primary, secondary, destructive, and icon buttons;
   - text input, select, file upload, search, date picker, date range picker;
   - compact metric blocks;
   - reservation table;
   - seat availability table;
   - status badges;
   - modal dialogs;
   - chart container for weekly totals.

3. Refine layout states:
   - loading;
   - empty;
   - validation error;
   - partial success;
   - no seats available;
   - unauthorised domain/login failure;
   - admin action impact preview.

4. Produce implementation-friendly tokens:
   - colors;
   - typography;
   - spacing scale;
   - border radius;
   - shadows;
   - focus rings;
   - status colors.

## Acceptance Criteria

- The first authenticated screen is useful without explanation text.
- Dashboard widgets fit at 1366px desktop and 768px tablet widths.
- Booking wizard can be completed in four obvious actions from dashboard.
- Seat selection remains table-based, with floor plan images used as visual reference.
- Admin screens are dense enough for repeated operational use.
- Tables and buttons do not rely on color alone to communicate state.
- All destructive actions use confirmation modals.
- Output is ready to translate into React components without redesigning from scratch.

## Export Location

Save final design exports, screenshots, and tokens under:

`docs/design/exports/`
