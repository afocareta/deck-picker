# Superpowers Prompt

Create a production-grade UI design for an internal web application named Desk Picker.

Desk Picker lets company employees reserve desks in their assigned Italian office. The product has about 300 users, 6 planned offices, and a strong operational focus. It must feel calm, fast, trustworthy, and useful for daily work. Avoid a marketing landing page. The first authenticated screen should be the actual dashboard.

Use a polished work-focused SaaS style:

- restrained but distinctive color system;
- excellent table and form design;
- compact, scannable dashboards;
- clear primary action for booking a desk;
- mature admin tooling;
- no decorative gradient-orb backgrounds;
- no oversized hero sections;
- no playful consumer-app treatment.

Use these real office examples in the mockups:

- Ufficio Milano, Via Gustavo Fara, 9, 20124 Milano, 26 seats.
- Ufficio Cosenza, Via Pedro Alvares Cabral, 6, 87036 Rende, 12 seats.
- Ufficio Firenze, Viale Belfiore, 10, 50144 Firenze, 4 seats.
- Ufficio Roma, Via del Poggio Laurentino, 9, 00144 Roma, 32 seats.
- Ufficio Torino, Corso Moncalieri, 506/28, 10133 Torino, 8 seats.
- Ufficio Bologna should appear as planned or incomplete only if needed.

Design these screens:

1. Login page with Google Sign-In and domain/auth error state.
2. First-login office selection page with office list.
3. User dashboard:
   - upcoming reservations table;
   - today occupancy percentage for assigned office;
   - next bookable weekday occupancy;
   - reservation history counters for 1, 3, and 6 months;
   - prominent Book a Spot action.
4. Booking wizard step 1:
   - assigned office shown read-only;
   - single date or date range selector;
   - disabled past dates, today, weekends, dates beyond 21 days, and closure days;
   - clear Next button.
5. Booking wizard step 2:
   - floor plan image area as a reference;
   - seat availability table with floor, desk, seat, availability status;
   - selected seat state;
   - Auto-assign button;
   - Confirm Reservation button;
   - no seats available state.
6. Booking confirmation:
   - office, date or dates, floor, desk, seat;
   - warning list for skipped dates when a range has partial availability.
7. Cancel reservation modal with reservation details and confirm/cancel actions.
8. Admin dashboard:
   - user dashboard content;
   - per-office occupancy today and next bookable weekday;
   - closures and limited availability table;
   - weekly reservation totals line chart over 26 weeks;
   - admin operation controls.
9. Admin office upload/upsert:
   - JSON upload;
   - floor plan image upload;
   - validation errors;
   - migration impact preview with migrable/cancellable reservation counts.
10. Admin closing days:
    - office selector;
    - calendar date selection;
    - current closure list.
11. Admin resource availability:
    - hierarchical selector office -> floor -> desk -> seat;
    - date range picker;
    - impact warning for existing reservations.
12. Admin audit trail:
    - filters for date range, admin, operation type, office;
    - table;
    - CSV export.
13. Admin GDPR tools:
    - user search;
    - DSAR export;
    - anonymization confirmation showing affected data.

Interaction and layout requirements:

- Desktop-first, with tablet variant down to 768px for the dashboard and booking wizard.
- Use a persistent app shell after login.
- Admin users may have a left navigation; standard users can have simpler navigation.
- Keep cards compact and avoid card-inside-card layouts.
- Tables must be comfortable for repeated use.
- Use status badges for available, reserved, unavailable, closed, pending, completed, failed.
- Error messages must be human-readable and actionable.
- Designs should support WCAG 2.1 AA contrast.

Return:

- a visual direction summary;
- desktop mockups for each screen;
- tablet variants for dashboard and booking wizard;
- component guidance for buttons, forms, tables, date picker, charts, modals, status badges;
- color and typography tokens suitable for implementation in React/Next.js.
