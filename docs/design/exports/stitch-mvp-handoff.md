# Stitch MVP Handoff

## Runtime Status

Stitch is configured in `.mcp.json`, but this Codex runtime did not expose callable Stitch MCP tools. No generated Stitch screenshots were produced in this pass.

## Required Stitch Pass When Available

Generate or refine these screens before final visual polish:

1. User dashboard at 1366px desktop.
2. User dashboard at 768px tablet.
3. Booking wizard step 1 at 1366px desktop.
4. Booking wizard step 2 at 1366px desktop.
5. Booking wizard tablet layout at 768px.
6. Booking confirmation with partial success warning.

## Prompt Inputs

Use:

- `docs/design/superpowers/prompt.md`
- `docs/design/design-brief.md`
- `docs/design/stitch/handoff.md`
- `docs/design/exports/tokens.md`
- floor plan assets under `docs/requests/samples/uffici/`

## Implementation Acceptance

The frontend can proceed with `tokens.md` as a conservative MVP visual baseline. Replace screenshots and token values later if Stitch produces a stronger direction, but preserve these product rules:

- Dashboard first, no landing page.
- Operational SaaS feel.
- Table-based seat selection.
- Floor plans as visual reference.
- Four obvious actions from dashboard to confirmed reservation.
