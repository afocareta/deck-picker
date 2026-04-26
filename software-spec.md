# Software Requirements Specification — Desk Picker

> Source: docs/requests/desk-picker-req.md
> FRS: docs/specs/analyst-frs.md
> UAT: docs/specs/analyst-UAT.md
> NFR: docs/specs/writer-nfr.md
> Author: Product Owner (AI-assisted)
> Date: 2026-03-10
> Status: Draft — pending stakeholder review
> Version: 1.0

## 1. Executive Summary

This document is the unified Software Requirements Specification for **Desk Picker**, an internal web application enabling ~300 company employees to reserve desks across 6 offices. The application authenticates users via Google Workspace, provides role-based dashboards, a two-step reservation wizard locked to the user's assigned office, admin tools for office configuration and availability management, email notifications, Google Calendar working location integration, a persistent admin audit trail, and GDPR compliance workflows. The system is deployed on on-premises Kubernetes (Minikube for dev, dedicated clusters for test/prod) and integrates with an existing Prometheus/Grafana/Jaeger/ELK observability stack.

The most critical requirements are: (1) no double-bookings via database-level concurrency control, (2) GDPR-compliant handling of employee personal data, (3) resilient integration with Google APIs that never blocks the core booking flow, (4) runtime-configurable offices without redeployment, and (5) full observability integration for operational reliability.

## 2. System Context

### 2.1 Purpose

Desk Picker solves the problem of desk allocation in a multi-office company. Employees need a self-service way to find and reserve available desks in their assigned office, while administrators need to manage office configurations, closures, and seat availability — all without requiring application redeployment.

### 2.2 Scope

**In scope:**
- Google Workspace authentication with domain verification and role detection
- User office assignment (from identity provider or user-selected fallback)
- Role-based dashboards (User and Admin views)
- Desk reservation wizard (date selection, seat selection/auto-assign)
- Reservation management (create, cancel future reservations)
- Office configuration management (add, upsert with migration strategy)
- Office closing days and granular resource availability management
- Email notifications (booking, cancellation, admin-triggered impacts)
- Google Calendar working location integration
- Admin audit trail with UI view and CSV export
- Concurrency control for reservation integrity
- GDPR compliance workflows (DSAR, right to erasure)
- Automated data retention and archival
- CI/CD pipeline with automated testing and deployment

**Out of scope:**
- Mobile native applications — web only
- Internationalization (i18n) — single language
- Recurring/repeating reservation patterns (e.g., "every Monday")
- User profile editing or self-service office reassignment
- Real-time collaborative views (WebSocket live seat maps)
- Reporting/export beyond dashboard widgets (except audit trail CSV and DSAR export)
- Calendar integration beyond Google Calendar working location
- Cross-office booking — users book only in their assigned office
- Weekend reservations — weekday only
- Same-day booking or cancellation — future dates only

### 2.3 Stakeholders & Actors

| Actor | Type | Description |
|-------|------|-------------|
| User (Standard) | Primary | Company employee who reserves desks in their assigned office |
| Admin | Primary | Employee in `DESK-PICKER-ADMIN` group; all user capabilities plus office management, availability control, audit trail, and GDPR workflows |
| Google Workspace | System | Identity provider (OAuth/OIDC), calendar service (working location API), email relay (SMTP/Gmail API) |
| Background Process | System | Handles retry of failed calendar/email operations, automated data retention |

### 2.4 Constraints

| Constraint | Source |
|-----------|--------|
| GDPR applies — Italian offices, employee personal data | Regulatory |
| On-premises Kubernetes (test, prod); Minikube for dev | Infrastructure |
| Google Workspace standard plan — API quota limits apply | Integration |
| Existing infrastructure budget — no new hardware or cloud spend | Budget |
| ~300 users, 6 offices, peak 30 concurrent users | Scale |

### 2.5 Assumptions

| ID | Assumption | Source | Impact if Wrong | Validated? |
|----|-----------|--------|----------------|------------|
| AS-01 | Google Workspace provides group membership data accessible at login time via API (Directory API available; can query `DESK-PICKER-ADMIN` group membership) | FRS | Admin role detection fails; would need alternative role assignment | Yes |
| AS-02 | Identity provider may or may not include office assignment data; system must handle both cases | FRS | Office selection fallback may be unnecessary or always needed | No |
| AS-03 | ~300 total users across 6 offices; no significant growth expected short-term | PO Scoping | Performance and scaling requirements may need revisiting | Yes |
| AS-04 | Floor plan images are static files with no coordinate/hotspot metadata | FRS | Interactive seat selection on images is not feasible | Yes |
| AS-05 | Configured email sender address has proper Google Workspace sending permissions | FRS | Emails may fail or be rejected | No |
| AS-06 | On-premises K8s clusters have sufficient capacity for Desk Picker | NFR | Resource constraints may require optimization or hardware procurement | Unvalidated |
| AS-07 | No existing desk booking system — no data migration needed | NFR | Migration effort would be additional scope | Unvalidated |
| AS-08 | Database will be a relational database on the same K8s infrastructure | NFR | Non-relational DB would change concurrency control and transaction approach | Unvalidated |

## 3. Requirements by Functional Area

### 3.1 Authentication & Authorization

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-AU-01 | The system must authenticate users via Google Sign-In (OAuth 2.0 / OpenID Connect) | Must | User clicks "Login with Google", completes Google auth flow, and is redirected back to the app | FRS §5.1 |
| FR-AU-02 | The server must verify the Google ID token signature and claims on every authentication | Must | Invalid or expired tokens rejected with HTTP 401; user sees "Authentication failed" | FRS §5.1 |
| FR-AU-03 | The server must verify the `hd` (hosted domain) claim against a configured environment variable | Must | Non-matching domains denied with "Not authorized — your organization is not permitted" | FRS §5.1 |
| FR-AU-04 | On each login, the server must log the full raw identity payload to server-side logs | Must | Raw JSON at INFO level, including all claims and group memberships | FRS §5.1 |
| FR-AU-05 | The system must check Google Workspace group memberships at login to determine admin status | Must | `DESK-PICKER-ADMIN` group → admin role; otherwise → standard user | FRS §5.1 |
| FR-AU-06 | User role must be stored in the session and enforced on all subsequent requests | Must | Admin-only endpoints return HTTP 403 for standard users; UI hides admin features | FRS §5.1 |
| FR-AU-07 | Session must last for the browser session only (no persistent sessions) | Must | Closing browser requires re-authentication | FRS §5.1 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-SE-01 | All traffic must use TLS 1.2+ | Must | HTTP redirected to HTTPS; TLS < 1.2 rejected | NFR §SE |
| NFR-SE-03 | Google ID tokens verified server-side on every authentication | Must | Signature, expiration, audience, issuer validated | NFR §SE |
| NFR-SE-04 | `hd` claim checked before any authorization | Must | Mismatched/missing `hd` → HTTP 403 | NFR §SE |
| NFR-SE-05 | API endpoints enforce role-based access control | Must | Admin-only → 403 for non-admin; verified by automated tests | NFR §SE |
| NFR-SE-08 | Session data server-side only; cookie is opaque ID with Secure, HttpOnly, SameSite=Strict | Should | No session state in client-accessible cookies | NFR §SE |

#### Business Rules
- Token verification must happen server-side; client-side inspection is insufficient.
- The `hd` claim check must occur before any other authorization logic.
- A user is admin if and only if they belong to the `DESK-PICKER-ADMIN` group (BR-09).

---

### 3.2 User Office Assignment

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-OA-01 | On login, attempt to determine user's office from identity provider data | Must | Office extracted and stored if present in identity payload | FRS §5.2 |
| FR-OA-02 | If identity provider lacks office info, prompt user to select their office on first login | Must | All configured offices listed; selection required before dashboard access | FRS §5.2 |
| FR-OA-03 | Selected/detected office persisted in user profile | Must | No re-prompt on subsequent logins | FRS §5.2 |

#### Business Rules
- Users (including admins) may only book in their assigned office (BR-03).
- Office mapping from identity provider is TBD — system must be adaptable once raw identity logs are inspected.

---

### 3.3 Dashboard — User View

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-DU-01 | Standard users land on the user dashboard after login | Must | Dashboard is default post-login page | FRS §5.3 |
| FR-DU-02 | Display table of user's upcoming reservations (future dates only) | Must | Rows: date, office, floor, desk, seat; sorted by date ascending | FRS §5.3 |
| FR-DU-03 | Each upcoming reservation row includes a "Cancel" button | Must | Visible and enabled for each future reservation | FRS §5.3 |
| FR-DU-04 | Show percentage of reserved seats in user's office for current day | Must | X% = (reserved seats / (total configured seats − unavailable seats)) × 100, rounded | FRS §5.3 + CR-03 |
| FR-DU-05 | Show percentage of reserved seats for next bookable weekday | Must | Same formula; skips weekends and office closing days (BR-14) | FRS §5.3 |
| FR-DU-06 | Show reservation history: completed reservation-days in last 1, 3, and 6 months | Must | Counts exclude cancelled reservations (BR-15) | FRS §5.3 |
| FR-DU-07 | "Book a Spot" button opens the reservation wizard | Must | Prominently visible on dashboard | FRS §5.3 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-PE-01 | Dashboard page load ≤ 2 seconds including all widgets | Must | p95 ≤ 2s at 30 concurrent users | NFR §PE |

---

### 3.4 Dashboard — Admin View

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-DA-01 | Admin dashboard includes all user dashboard content plus admin widgets | Must | Everything from FR-DU-01 through FR-DU-07, plus below | FRS §5.4 |
| FR-DA-02 | Per-office occupancy for current day, for every configured office | Must | "Office Name: X% occupied" for today | FRS §5.4 |
| FR-DA-03 | Per-office occupancy for next bookable weekday, for every office | Must | Skips weekends and closing days (BR-14) | FRS §5.4 |
| FR-DA-04 | Table of office closures and limited-availability periods per office | Must | Office name, date range, type (closure/limited), affected resources | FRS §5.4 |
| FR-DA-05 | Line chart: weekly reservation totals per office over last 6 months | Must | X-axis: weeks (26); Y-axis: totals; one line per office | FRS §5.4 |
| FR-DA-06 | Controls/buttons to access admin operations | Must | Visible only to admin users | FRS §5.4 |

---

### 3.5 Reservation Wizard

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-RW-01 | Two-step wizard: Step 1 (date selection) → Step 2 (seat selection) | Must | Step indicators; linear progression | FRS §5.5 |
| FR-RW-02 | Step 1 displays user's assigned office as read-only (not selectable) | Must | No dropdown; office shown but not editable | FRS §5.5 |
| FR-RW-03 | Step 1 allows single date or date range selection | Must | Date picker supports both modes | FRS §5.5 |
| FR-RW-04 | Date picker allows only future weekdays within 21-day booking horizon | Must | Past, today, weekends, beyond-horizon dates disabled | FRS §5.5 |
| FR-RW-05 | Date picker disables office closing days | Must | Closing days greyed out | FRS §5.5 |
| FR-RW-06 | Step 2 shows floor plan images alongside seat availability table | Must | Per-floor image + table with floor, desk, seat, availability status | FRS §5.5 |
| FR-RW-07 | Seat availability shown per selected date; unavailable seats marked | Must | Reserved or unavailable seats clearly indicated | FRS §5.5 |
| FR-RW-08 | User can select a specific available seat | Must | Click/select highlights the chosen seat | FRS §5.5 |
| FR-RW-09 | "Auto-assign" selects lowest-numbered available seat (floor→desk→seat) | Must | Deterministic algorithm (BR-10) | FRS §5.5 |
| FR-RW-10 | Date range bookings assign the same seat for all booked days | Must | All per-day reservations reference same seat | FRS §5.5 |
| FR-RW-11 | Partial availability: book available dates, report skipped dates with reason | Must | Success lists booked dates; warning lists skipped dates | FRS §5.5 |
| FR-RW-12 | Auto-assign for date range: find seat available on all dates first, then fall back to most-available seat | Must | Maximizes booking success while preferring consistency | FRS §5.5 |
| FR-RW-13 | Prevent double-booking: no two reservations for same seat on same day | Must | Concurrent attempts → one success, one "Seat no longer available" | FRS §5.5 |
| FR-RW-14 | No seats available → display "No seats available" (no cross-office suggestion) | Must | Clear message; user cannot switch office | FRS §5.5 |
| FR-RW-15 | Successful booking shows graphical confirmation (office, dates, seat) | Must | UI confirmation dialog/message | FRS §5.5 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-PE-02 | Reservation confirmation ≤ 2s (DB write + concurrency check) | Must | p95 ≤ 2s at 30 concurrent bookings | NFR §PE |
| NFR-PE-04 | Seat availability query ≤ 1s | Must | p95 ≤ 1s for full office lookup | NFR §PE |
| NFR-DM-01 | DB-level concurrency control: unique constraint on (seat_id, date) for active reservations | Must | Verified by concurrent booking test | NFR §DM |
| NFR-DM-02 | Reservation writes are ACID-compliant | Must | Reservation + availability update in single transaction | NFR §DM |

#### Business Rules
- One reservation per user per day (BR-01).
- Booking horizon: today + 1 through today + 21 calendar days, weekdays only, excluding closing days (BR-02).
- Weekends are never bookable (BR-08).
- Users may only book/cancel future dates (BR-05).

---

### 3.6 Reservation Cancellation

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-RC-01 | "Cancel" shows confirmation dialog with reservation details | Must | Date, floor, desk, seat; Confirm/Cancel buttons | FRS §5.6 |
| FR-RC-02 | On confirmation: cancel reservation, make seat available again | Must | Status → cancelled; seat bookable for that date | FRS §5.6 |
| FR-RC-03 | Cancellation only for future dates (not today or past) | Must | Button hidden for non-future; API rejects | FRS §5.6 |

---

### 3.7 Office Configuration Management

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-OC-01 | Admin can add new office by uploading JSON + floor plan images | Must | JSON validated against office-schema.json | FRS §5.7 |
| FR-OC-02 | Uploaded JSON validated against schema before acceptance | Must | Invalid JSON rejected with specific errors | FRS §5.7 |
| FR-OC-03 | Admin can replace (upsert) existing office with new JSON + images | Must | Replaces entire office configuration | FRS §5.7 |
| FR-OC-04 | On upsert: migrate reservations by strict floor→desk→seat number matching; cancel & notify unmappable | Must | Matching structure → preserved; no match → cancelled | FRS §5.7 |
| FR-OC-05 | Before upsert confirmation: show count of migrable and cancellable reservations | Must | Admin sees impact and must confirm or abort | FRS §5.7 |
| FR-OC-06 | No rebuild/redeploy required for office changes | Must | Changes take effect immediately | FRS §5.7 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-PE-07 | Upsert migration impact preview must complete within 10 seconds | Should | Reservation scan and impact calculation ≤ 10s | CR-04 (Phase 3 review) |
| NFR-CE-03 | Floor plan images limited to 5MB per file, JPEG/PNG/WebP only | Must | Upload validation rejects oversized/wrong-format files | NFR §CE |

---

### 3.8 Office Closing Days

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-CD-01 | Admin selects dates from calendar UI and marks as closing days per office | Must | Single/multi-date selection; saved as closing days | FRS §5.8 |
| FR-CD-02 | Closing days prevent all reservations for the entire office | Must | Dates disabled in wizard; API rejects bookings | FRS §5.8 |
| FR-CD-03 | Existing reservations on new closing days: cancel and email affected users | Must | All affected reservations cancelled; email with reason | FRS §5.8 |
| FR-CD-04 | Admin can remove previously set closing days | Should | Removing re-enables bookings for that date | FRS §5.8 |

#### Business Rules
- Closing days can only be set for weekdays (DV-07).
- Closing days and resource unavailability are distinct concepts with separate data models (BR-13).

---

### 3.9 Resource Availability Management

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-RA-01 | Admin can mark office/floor/desk/seat unavailable for a date or date range | Must | Hierarchical selector + date range picker | FRS §5.9 |
| FR-RA-02 | Unavailable resources not bookable in wizard | Must | Seats show "Unavailable"; child resources inherit unavailability | FRS §5.9 |
| FR-RA-03 | Existing reservations on newly unavailable resources: cancel and email affected users | Must | Same pattern as FR-CD-03 but scoped to resource level | FRS §5.9 |
| FR-RA-04 | Admin can remove previously set unavailability periods | Should | Re-enables bookings for those resources/dates | FRS §5.9 |

---

### 3.10 Email Notifications

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-NT-01 | Booking confirmation email with reservation details | Must | Office, dates, floor, desk, seat; via Google Workspace | FRS §5.10 |
| FR-NT-02 | User-initiated cancellation email | Must | Details + "Your reservation has been cancelled" | FRS §5.10 |
| FR-NT-03 | Admin-triggered cancellation email with reason | Must | Details + reason (closure, unavailability, layout update) | FRS §5.10 |
| FR-NT-04 | Email HTML body follows app visual style | Should | Consistent colors, fonts, layout | FRS §5.10 |
| FR-NT-05 | Emails via Google Workspace from configured sender address | Must | Sender configurable via environment variable | FRS §5.10 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-PE-03 | Email operations are asynchronous (non-blocking) | Must | Reservation API does not wait for email delivery | NFR §PE |
| NFR-RA-06 | Email unavailability must not prevent reservations | Must | Emails queued; retry with exponential backoff (max 5 attempts / 24h) | NFR §RA |

---

### 3.11 Google Calendar Integration

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-GC-01 | On booking: set Google Calendar working location to office for each booked day; if the Working Location API returns 403/unsupported (Starter account), fall back to creating an all-day calendar event with office name as title and office location as event location, marked as 'free' (non-blocking) | Must | Standard account: calendar shows working location; Starter account: all-day event created with correct title, location, and free status | FRS §5.11 |
| FR-GC-02 | On cancellation: remove the working location or delete the corresponding all-day calendar event, depending on which was created | Must | Working location removed or event deleted as applicable | FRS §5.11 |
| FR-GC-03 | Calendar API failure handling: (a) Working Location API returns 403/unsupported → immediate fallback to all-day event (not a failure); (b) general API failure (network, 500, quota) → save reservation, warn user, queue retry | Must | Booking always persisted; 403 triggers silent fallback; other failures show warning + queue retry | FRS §5.11 |
| FR-GC-04 | Background retry with exponential backoff | Should | Configurable max attempts; gives up gracefully | FRS §5.11 |
| FR-GC-05 | The all-day calendar event (Starter fallback) must be created with: title = office name, location = office address/location, show-as = free (non-blocking), description = 'Desk reservation via Desk Picker' | Must | Event fields verified in calendar; event does not block user's schedule | FRS §5.11 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-PE-03 | Calendar operations are asynchronous (non-blocking) | Must | Reservation API does not wait for Calendar API | NFR §PE |
| NFR-RA-05 | Calendar unavailability must not prevent reservations | Must | Bookings succeed; calendar ops queued | NFR §RA |
| NFR-DM-07 | Calendar API usage quota-aware and rate-limited | Must | Tracks daily call count; pauses non-critical ops at 80% quota; prioritizes new bookings | NFR §DM |

---

### 3.12 Admin Audit Trail

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-AT-01 | All admin operations logged in persistent audit trail | Must | Every admin action creates an entry | FRS §5.12 |
| FR-AT-02 | Each entry: timestamp, admin identity, operation type, resources, summary | Must | All five fields populated | FRS §5.12 |
| FR-AT-03 | Audited ops: add/upsert office, mark unavailability, manage closing days | Must | All operation types logged | FRS §5.12 |
| FR-AT-04 | Filterable audit trail UI (date range, admin, operation type, office) | Must | All filter combinations work | FRS §5.12 |
| FR-AT-05 | CSV export of filtered audit trail | Must | Download matches current filter | FRS §5.12 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-PE-06 | CSV export ≤ 10s for up to 10,000 entries | Should | No timeout for typical volumes | NFR §PE |
| NFR-CR-05 | Audit trail is tamper-evident: append-only, no update/delete API | Should | DB constraints prevent modification | NFR §CR |
| NFR-DM-04 | Audit data: 3 years active → archive → delete after 5 years total | Must | Automated enforcement | NFR §DM |

---

### 3.13 GDPR Compliance Workflows (NEW — from Phase 3 review)

#### Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria | Source |
|----|-------------|----------|-------------------|--------|
| FR-GD-01 | Admin can export all personal data for a specific user (Data Subject Access Request) | Should | Export includes: user profile, all reservations (active and historical), and audit entries referencing the user; downloadable as a structured file (JSON or CSV) | Phase 3 resolution G-01 / NFR-CR-02 |
| FR-GD-02 | Admin can anonymize a user's personal data (right to erasure) | Should | Confirmation dialog shows scope: user profile fields replaced with anonymous identifiers; reservations anonymized; audit entries referencing the user have personal data replaced with a hash; working location calendar entries removed | Phase 3 resolution G-02 / NFR-CR-03 |
| FR-GD-03 | Anonymization must preserve audit trail integrity | Should | Audit entries remain queryable and countable; only personal identifiers are replaced | Phase 3 resolution C-01 |

#### Area-Specific Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-CR-01 | GDPR compliance for employee personal data processing | Must | Lawful basis documented; privacy notice accessible | NFR §CR |
| NFR-CR-02 | DSAR support within 30 days | Should | Admin can produce export for any user | NFR §CR |
| NFR-CR-03 | Right to erasure via anonymization | Should | Personal data removed; audit preserved | NFR §CR |
| NFR-CR-04 | Personal data not retained beyond stated purpose | Must | Reservations deleted after 2 years; audit archived after 3 years | NFR §CR |

---

### 3.14 Automated Data Retention

This area is operational rather than user-facing. Requirements are drawn from NFRs and confirmed during Phase 3 review.

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-DM-03 | Reservation data deleted after 2 years from reservation date | Must | Monthly automated job; verified by retention report | NFR §DM |
| NFR-DM-04 | Audit data: 3 years active → archived → deleted after 5 years total | Must | Automated enforcement; alert on job failure | NFR §DM |
| NFR-DM-05 | Daily database backups with 7-day retention | Must | Automated; restore tested quarterly | NFR §DM |

---

## 4. Cross-Cutting Non-Functional Requirements

| ID | Requirement | Categories | Priority | Acceptance Criterion | Source |
|----|-------------|-----------|----------|---------------------|--------|
| NFR-CC-01 | All API responses include correlation ID tracing through logs, metrics, and distributed traces | OO, SE, MA | Must | `X-Correlation-ID` header in every response; same ID in logs, Jaeger, Prometheus | NFR §CC |
| NFR-CC-02 | User-facing error responses omit internal details | SE, UX | Must | No stack traces, SQL errors, internal IPs; only error code + message + correlation ID | NFR §CC |
| NFR-CC-03 | Async operations traceable from originating action | OO, DM | Must | Retry queue entries include correlation ID; visible in Jaeger | NFR §CC |
| NFR-CC-04 | Environment parity: same Docker image across dev/test/prod | PC, MA, OO | Must | No env-specific build steps; config via env vars/ConfigMaps | NFR §CC |
| NFR-SE-06 | Rate limiting: 60 req/min per authenticated user | SE | Must | Exceeded → HTTP 429 | NFR §SE |
| NFR-SE-07 | OWASP Top 10 security review before production | SE | Must | No high/critical findings | NFR §SE |
| NFR-SE-09 | Input validation on all user-supplied data | SE | Must | JSON validated; dates validated server-side; no injection vectors | NFR §SE |
| NFR-SE-02 | Database encrypted at rest (AES-256 or equivalent) | SE | Must | Verified in deployment checklist | NFR §SE |
| NFR-UX-06 | Error messages user-friendly with actionable guidance | UX | Must | No technical jargon; errors suggest next steps | NFR §UX |
| NFR-MA-01 | Automated test coverage ≥ 80% for business logic | MA | Must | Coverage report for core modules | NFR §MA |
| NFR-MA-02 | Integration tests for all Google API interactions | MA | Must | Mock/stub APIs; success + failure paths | NFR §MA |
| NFR-MA-04 | Database schema changes via versioned migrations | MA | Should | Rollback for last 3 migrations | NFR §MA |
| NFR-MA-06 | CI/CD runs tests + security scans on every MR | MA | Must | Blocks merge on failure | NFR §MA |
| NFR-MA-07 | CI/CD supports automated deployment to test + prod | MA | Must | Manual approval gate for prod | NFR §MA |
| NFR-SC-03 | Deployable as multiple K8s replicas (1–3) | SC | Should | No session affinity required | NFR §SC |
| NFR-SC-04 | Background job processor scales independently of web tier | SC | Should | Queue processing continues during web pod restarts | NFR §SC |
| NFR-RA-01 | 99.5% availability during business hours (Mon–Fri 07:00–20:00 CET) | RA | Must | ≤ 1.7h downtime/month | NFR §RA |
| NFR-RA-04 | RTO ≤ 4 hours after full system failure | RA | Must | Documented recovery runbook | NFR §RA |
| NFR-RA-07 | Daily backups, 7-day retention, quarterly restore test | RA | Must | Automated and verified | NFR §RA |
| NFR-DM-06 | Retry queue persists across pod restarts | DM | Must | DB-backed; not in-memory | NFR §DM |
| NFR-OO-01 | Structured JSON logs to stdout/stderr | OO | Must | Fields: timestamp, level, message, correlation_id, user_id | NFR §OO |
| NFR-OO-02 | `/health` endpoint for K8s probes | OO | Must | Liveness + readiness | NFR §OO |
| NFR-OO-03 | Prometheus metrics at `/metrics` | OO | Must | Request count, latency histogram, error rate, queue depth | NFR §OO |
| NFR-OO-04 | Distributed tracing (OpenTelemetry/Jaeger) | OO | Must | Trace spans for all HTTP requests; visible in Jaeger | NFR §OO |
| NFR-OO-05 | Alerts: error rate > 5%/5min, p95 > 5s, health failure | OO | Must | Prometheus rules; email alerts | NFR §OO |
| NFR-OO-06 | Grafana dashboard template | OO | Should | Covers key operational metrics | NFR §OO |
| NFR-OO-07 | Zero-downtime rolling updates | OO | Should | K8s rolling strategy + readiness probes | NFR §OO |
| NFR-PC-01 | Containerized as Docker on K8s | PC | Must | Runs on Minikube, test, prod | NFR §PC |
| NFR-PC-02 | Config externalized via env vars / ConfigMaps / Secrets | PC | Must | No hardcoded env-specific values | NFR §PC |
| NFR-UX-01 | Chrome + Edge (latest 2 versions) | UX | Must | No functional issues | NFR §UX |
| NFR-UX-02 | Firefox + Safari (latest 2 versions) | UX | Should | Minor visual differences acceptable | NFR §UX |
| NFR-UX-03 | WCAG 2.1 Level AA | UX | Should | No Level A violations; minimal AA violations | NFR §UX |
| NFR-UX-04 | Responsive down to 768px (tablet) | UX | Should | No horizontal scrolling | NFR §UX |
| NFR-UX-07 | Wizard: ≤ 4 clicks dashboard to confirmation | UX | Should | Book → date → Next → seat → Confirm | NFR §UX |

## 5. Data Requirements

### 5.1 Data Entities

| Entity | Key Attributes | Constraints | Lifecycle |
|--------|---------------|-------------|-----------|
| User | user_id, email, name, office_id, role, google_sub | email unique; role from group membership at login | Created on first login → updated on subsequent logins → **anonymized on erasure request** |
| Office | office_id, name, location, json_config, status | name unique | Created by admin → updated by upsert → soft-deleted if removed |
| Floor | floor_id, office_id, floor_num, floor_name, floor_map_image | floor_num unique within office | Created with office → replaced on upsert |
| Desk | desk_id, floor_id, desk_num, available_seats_count | desk_num unique within floor | Created with office → replaced on upsert |
| Seat | seat_id, desk_id, seat_num | seat_num unique within desk | Created with office → replaced on upsert |
| Reservation | reservation_id, user_id, seat_id, date, status (active/cancelled), cancellation_reason | Unique: (seat_id, date) where active; Unique: (user_id, date) where active | Created → cancelled by user/admin → **deleted after 2 years** |
| ClosingDay | closing_day_id, office_id, date | Unique: (office_id, date) | Created by admin → removable by admin |
| Unavailability | unavailability_id, resource_type, resource_id, start_date, end_date | Valid weekday dates | Created by admin → removable by admin |
| AuditEntry | audit_id, timestamp, admin_user_id, operation_type, resource_type, resource_id, summary | Immutable (append-only) | Created on admin action → **3yr active → archived → deleted after 5yr total** |
| NotificationRetry | retry_id, user_id, date, type (calendar_set/calendar_remove/email), calendar_strategy (working_location/event), payload, attempts, status, correlation_id | calendar_strategy records which API path was used (Working Location or all-day event) so retries call the correct API | Created on API failure → completed or abandoned after max retries |

### 5.2 Data Validation Rules

| ID | Field/Entity | Rule | Error Handling |
|----|-------------|------|----------------|
| DV-01 | Reservation.date | Future weekday within 21 calendar days | "Selected date is outside the booking window" |
| DV-02 | Reservation.date | Not an office closing day | "The office is closed on this date" |
| DV-03 | Reservation.seat_id + date | Seat not already actively reserved | "This seat is already reserved for the selected date" |
| DV-04 | Reservation.user_id + date | User has no active reservation on that date | "You already have a reservation for this date" |
| DV-05 | Reservation.seat_id | Seat not within an unavailable resource | "This seat is currently unavailable" |
| DV-06 | Office JSON upload | Must validate against office-schema.json | Specific validation errors shown to admin |
| DV-07 | ClosingDay.date | Must be a weekday | "Closing days can only be set for weekdays" |
| DV-08 | Unavailability dates | start_date ≤ end_date; both weekdays | "Invalid date range" |
| DV-09 | Floor plan image | ≤ 5MB; JPEG, PNG, or WebP | "File too large or unsupported format" |

### 5.3 Data Management NFRs

| ID | Requirement | Priority | Acceptance Criterion | Source |
|----|-------------|----------|---------------------|--------|
| NFR-DM-01 | DB-level concurrency control (unique constraint) | Must | Verified by concurrent booking test | NFR §DM |
| NFR-DM-02 | ACID-compliant reservation writes | Must | Single transaction; rollback on partial failure | NFR §DM |
| NFR-DM-03 | Reservation data deleted after 2 years | Must | Monthly automated job | NFR §DM |
| NFR-DM-04 | Audit data: 3yr active → archive → delete after 5yr | Must | Automated enforcement | NFR §DM |
| NFR-DM-05 | Daily backups, 7-day retention | Must | Quarterly restore test | NFR §DM |
| NFR-DM-06 | Retry queue persists across pod restarts | Must | DB-backed | NFR §DM |
| NFR-DM-07 | Calendar API quota-aware rate limiting | Must | Pause at 80% daily quota; prioritize bookings | NFR §DM |

## 6. Interface Requirements

### 6.1 User Interfaces

- **Login page** — Google Sign-In button; error messaging for domain/auth failures
- **Office selection page** — shown once if identity provider lacks office data; list of all offices
- **User dashboard** — upcoming reservations table, today's occupancy, next-day occupancy, reservation history, "Book a Spot" button
- **Admin dashboard** — user dashboard + per-office occupancy (today/next day), closures table, weekly trend chart, admin operation controls
- **Reservation wizard Step 1** — read-only office, date picker (single/range), "Next" button
- **Reservation wizard Step 2** — floor plan images (reference), seat table, manual selection, "Auto-assign", "Confirm Reservation"
- **Cancellation dialog** — reservation details, Confirm/Cancel buttons
- **Admin: Add/Upsert office** — JSON upload, image upload, validation feedback, migration impact preview
- **Admin: Manage closing days** — office selector, calendar UI
- **Admin: Manage availability** — hierarchical selector (office→floor→desk→seat), date range picker
- **Admin: Audit trail** — filterable table, CSV export button
- **Admin: GDPR tools** — user search, DSAR export, anonymization with confirmation

### 6.2 System Interfaces

| Integration | Protocol | Data | Direction |
|------------|----------|------|-----------|
| Google Sign-In | OAuth 2.0 / OIDC | ID token, user profile, group memberships | Inbound |
| Google Calendar API | REST (HTTPS) | Working location set/remove per date | Outbound |
| Google Workspace SMTP / Gmail API | SMTP / REST | Transactional emails | Outbound |

### 6.3 Reporting Requirements

| ID | Report | Trigger | Content | Audience |
|----|--------|---------|---------|----------|
| RP-01 | Audit trail CSV | On-demand (admin) | Filtered audit entries | Admins |
| RP-02 | DSAR export | On-demand (admin) | All personal data for a specific user | Admins / Data Subject |

## 7. Conflict Resolutions

| ID | Conflict | FR Reference | NFR Reference | Resolution | Rationale |
|----|----------|-------------|---------------|------------|-----------|
| CR-01 | User lifecycle: FRS says "never deleted" vs. NFR requires right to erasure | FRS §6.1 User entity | NFR-CR-03 | User data is **anonymized** on erasure request (personal data replaced with hash); user record preserved in anonymized form | Satisfies GDPR right to erasure while maintaining referential integrity |
| CR-02 | Audit lifecycle: FRS says "persisted permanently" vs. NFR says 3yr + archive | FRS §6.1 AuditEntry | NFR-DM-04 | Audit entries retained **3 years active**, then **archived for 2 additional years**, then **deleted** (5yr total) | Aligns with data minimization principle and confirmed retention policy |
| CR-03 | Occupancy denominator: FRS used "total available seats" without clarifying unavailability | FR-DU-04, FR-DA-02 | — | Occupancy = reserved seats / (**total configured seats minus currently unavailable seats**) × 100 | Gives accurate occupancy picture; counting unavailable seats in denominator would deflate the percentage |
| CR-04 | No performance target for upsert migration | FR-OC-04, FR-OC-05 | — | Added **NFR-PE-07**: migration impact preview must complete within 10 seconds | Prevents admin UI from hanging during large migration scans |
| CR-05 | CalendarRetry entity too narrow (calendar only) | FRS §6.1 CalendarRetry | NFR-RA-06, NFR-DM-06 | Entity renamed to **NotificationRetry** covering both calendar and email retry operations | Single retry mechanism for all async notification operations |

**Impact on requirements:**
- CR-01: FRS User entity lifecycle updated from "never deleted" to "anonymized on erasure request." New FRs added: FR-GD-01, FR-GD-02, FR-GD-03.
- CR-02: FRS AuditEntry lifecycle updated from "persisted permanently" to "3yr active → archived → deleted after 5yr."
- CR-03: FR-DU-04 and FR-DA-02/03 acceptance criteria updated to use corrected denominator formula.
- CR-04: New NFR-PE-07 added for upsert migration performance.
- CR-05: FRS CalendarRetry entity renamed to NotificationRetry with expanded scope.

## 8. Risk Register

| ID | Risk | Source | Likelihood | Impact | Mitigation | Owner |
|----|------|--------|-----------|--------|------------|-------|
| RK-01 | Google Calendar API quota exhaustion on standard plan (peak: 30 users × 5 days = 150 calls) | NFR | Medium | Medium | Queue-based processing with quota tracking (NFR-DM-07); prioritize bookings over retries | Dev Team |
| RK-02 | Double-booking race condition | FRS + NFR | Low | High | DB unique constraint + ACID transactions (NFR-DM-01, NFR-DM-02); load test | Dev Team |
| RK-03 | GDPR non-compliance post-launch | NFR | Medium | High | Document lawful basis; implement DSAR + erasure (FR-GD-01, FR-GD-02); legal review | PO + Legal |
| RK-04 | On-premises infrastructure failure beyond RTO | NFR | Low | High | Daily backups + offsite copy; recovery runbook; quarterly restore test | Ops Team |
| RK-05 | Google API breaking changes or deprecation | NFR | Low | Medium | Abstraction layer; monitor deprecation announcements; integration tests | Dev Team |
| RK-06 | Data retention automation failure → GDPR violation | NFR | Low | Medium | Monitoring + alerting on job failure; quarterly audit | Dev Team + DPO |
| RK-07 | Identity provider office data never available → permanent fallback | FRS | Medium | Low | FR-OA-02 handles this; worst case is all users self-select office | PO |
| RK-08 | Office upsert migration cancels many reservations unexpectedly | FRS | Low | Medium | FR-OC-05 impact preview; admin must confirm; email notifications | Admin users |

## 9. Open Questions

| ID | Question | Source | Impacts | Owner | Due Date |
|----|----------|--------|---------|-------|----------|
| OQ-01 | Exact structure of Google Workspace identity data for office assignment | FRS | FR-OA-01 — may eliminate fallback | PO | Before prod |
| OQ-02 | Configured sender email address for notifications | FRS | FR-NT-05 | PO | Before deployment |
| OQ-03 | ~~Google Workspace API scopes needed for group membership query~~ | FRS | FR-AU-05 | PO / IT Admin | **Resolved** — Google Directory API is available; app can query `DESK-PICKER-ADMIN` group membership at login |
| OQ-04 | Retry limits and backoff parameters for failed async operations | FRS | FR-GC-04, NFR-RA-05/06 | Dev Team | Design phase |
| OQ-05 | Should the system support removing an office entirely (not just upserting)? | FRS | Office management | PO | Design phase |
| OQ-06 | Database engine choice (PostgreSQL, MySQL, etc.) | NFR | NFR-SE-02, NFR-DM-05 | Dev Team | Design phase |
| OQ-07 | ~~GDPR lawful basis — legitimate interest or consent?~~ | NFR | NFR-CR-01 | PO + Legal | **Resolved** — Lawful basis is **legitimate interest** (employer operational need for desk allocation) |
| OQ-08 | Available K8s cluster capacity for Desk Picker | NFR | NFR-CE-01 | Ops Team | Before deployment |
| OQ-09 | Google Workspace standard plan daily API quota numbers | NFR | NFR-DM-07 | Dev Team | Design phase |
| OQ-10 | Audit trail archive storage location (same DB, cold storage, external) | NFR | NFR-DM-04 | Dev Team + Ops | Design phase |
| OQ-11 | SSL/TLS certificate management — existing cert-manager on K8s? | NFR | NFR-SE-01 | Ops Team | Before deployment |
| OQ-12 | Bologna office JSON configuration and floor plan image are missing from the provided office asset archive | Office samples | Office seed data; office selection list; booking availability for Bologna | PO | Before implementation seed/import |

## 10. Traceability Matrix

| Business Need | Functional Req | Non-Functional Req | UAT Test Case | Conflict Resolution |
|--------------|---------------|-------------------|---------------|-------------------|
| BN-01: Authenticate via Google | FR-AU-01–07 | NFR-SE-01, SE-03, SE-04, SE-05, SE-08 | UAT-AU-01–06 | — |
| BN-02: Assign users to offices | FR-OA-01–03 | — | UAT-OA-01–02 | — |
| BN-03: User dashboard | FR-DU-01–07 | NFR-PE-01 | UAT-DU-01–05 | CR-03 (occupancy formula) |
| BN-04: Admin dashboard | FR-DA-01–06 | NFR-PE-01, PE-05 | UAT-DA-01–05 | CR-03 |
| BN-05: Book a desk | FR-RW-01–15 | NFR-PE-02, PE-04, DM-01, DM-02 | UAT-RW-01–10 | — |
| BN-06: Cancel reservation | FR-RC-01–03 | — | UAT-RC-01–03 | — |
| BN-07: Manage offices | FR-OC-01–06 | NFR-PE-07, CE-03, MA-03 | UAT-OC-01–05 | CR-04 (perf target), CR-05 (retry entity) |
| BN-08: Manage closing days | FR-CD-01–04 | — | UAT-CD-01–04 | — |
| BN-09: Manage availability | FR-RA-01–04 | — | UAT-RA-01–04 | — |
| BN-10: Email notifications | FR-NT-01–05 | NFR-PE-03, RA-06 | UAT-NT-01–04 | CR-05 (retry entity) |
| BN-11: Calendar integration | FR-GC-01–05 | NFR-PE-03, RA-05, DM-07 | UAT-GC-01–08 | CR-05 |
| BN-12: Audit trail | FR-AT-01–05 | NFR-PE-06, CR-05, DM-04 | UAT-AT-01–04 | CR-02 (lifecycle) |
| BN-13: GDPR compliance | FR-GD-01–03 | NFR-CR-01–04 | (new UAT cases needed) | CR-01 (user lifecycle) |
| BN-14: Data retention | — | NFR-DM-03, DM-04, DM-05 | (operational verification) | CR-02 |
| BN-15: Observability | — | NFR-OO-01–07, CC-01, CC-03 | (operational verification) | — |
| BN-16: CI/CD | — | NFR-MA-06, MA-07 | (pipeline verification) | — |
| BN-17: Security hardening | — | NFR-SE-02, SE-06, SE-07, SE-09, SE-10 | (security review) | — |

## 11. Decision Log

| ID | Decision | Phase | Alternatives Considered | Rationale |
|----|----------|-------|------------------------|-----------|
| DL-01 | One reservation per user per day | BA | AM/PM splits | Aligns with Calendar working location (one per day); simplest model |
| DL-02 | Users book only in assigned office | PO | Cross-office booking | Offices in different cities; no real use case |
| DL-03 | Per-day reservations for date ranges | BA | Single multi-day record | Enables individual cancellation, simpler calendar/occupancy logic |
| DL-04 | Deterministic auto-assign (lowest number) | BA | Random, preference-based | Testable and predictable |
| DL-05 | Upsert migration with strict number matching | BA | Cancel all, block, name-based | Minimizes disruption; strict matching is simple |
| DL-06 | Separate closing days and unavailability | BA | Unified model | Different semantics: holidays vs. operational |
| DL-07 | Table-based seat selection | BA | Interactive floor plan | JSON schema lacks coordinates; table works with current data |
| DL-08 | Browser-session-only auth | BA | Sliding window, fixed duration | Simplest; daily-use workplace tool |
| DL-09 | Future-only booking/cancellation | BA | Same-day operations | Stable occupancy data; fewer edge cases |
| DL-10 | Audit trail UI + CSV export | BA | UI only, PDF export | CSV covers analytical needs |
| DL-11 | Booking horizon 21 days | PO | 14 days (original) | Extended per user request |
| DL-12 | 99.5% business-hours availability | TW | 99.9% (HA setup), 99% | Balances reliability with on-prem simplicity |
| DL-13 | Async email + calendar with retry | TW | Synchronous, fire-and-forget | Best UX + eventual delivery |
| DL-14 | DB-backed retry queue | TW | RabbitMQ, Redis, in-memory | Avoids extra infrastructure for ~300 users |
| DL-15 | Server-side sessions | TW | JWT (hard to revoke) | Browser-session-only + clean revocation |
| DL-16 | Rate limit 60 req/min/user | TW | None, stricter (20/min) | Generous for humans; catches scripts |
| DL-17 | GDPR erasure via anonymization | Review | Full deletion, retention override | Preserves audit integrity; satisfies GDPR |
| DL-18 | Occupancy excludes unavailable seats | Review | Include unavailable in denominator | Accurate percentage; unavailable seats aren't bookable |
| DL-19 | NotificationRetry (unified retry entity) | Review | Separate CalendarRetry + EmailRetry | Single mechanism; simpler implementation |
| DL-20 | Calendar fallback: Working Location API first, all-day event for Starter accounts | Review | Working Location only (breaks Starter users), all-day event only (loses Working Location benefits for Standard users) | Two-tier approach maximizes compatibility; Working Location is preferred when available; fallback is transparent to users |
| DL-21 | GDPR lawful basis: legitimate interest (employer operational need) | Review | Consent-based (requires opt-in; complicates onboarding) | Desk allocation is an employer operational need; legitimate interest is the appropriate basis per GDPR Article 6(1)(f) |
| DL-22 | UI/visual design will use Superpowers and Stitch as graphic design inputs before implementation | UX | Direct implementation from textual requirements only; generic component-library defaults | Keeps the product visually intentional while allowing the implemented UI to remain consistent with generated/approved design assets |

## 12. Source Document Summary

| Document | Path | Generated By | Key Content |
|----------|------|-------------|-------------|
| Functional Requirements Specification | docs/specs/analyst-frs.md | Business Analyst | 60+ FRs, 15 business rules, 10 data entities, 8 validation rules |
| User Acceptance Test Cases | docs/specs/analyst-UAT.md | Business Analyst | 46 test cases, 3 E2E tests, 100% FR coverage matrix |
| Non-Functional Requirements | docs/specs/writer-nfr.md | Technical Writer | 50+ NFRs across 10 categories, 6 risks, 9 decision log entries |
| Office JSON Schema | docs/requests/schemas/office-schema.json | Generated from provided office samples | Office structure: name, location, floors → desks → seats; image filename format constrained to JPG/PNG/WebP |
| Office JSON Samples and Floor Plans | docs/requests/samples/uffici/ | Provided | Office configurations and floor plan assets for Milano, Cosenza, Firenze, Roma, Torino; Bologna folder present but missing JSON/floor plan |
| Original Office Asset Archive | docs/requests/originals/uffici.zip | Provided | Original zip archive containing office JSON files and floor plan assets |
| UI Mockups | docs/requests/samples/*.png | Provided | User dashboard, admin dashboard, wizard step 1, wizard step 2 |
| UI Design Brief and Screen Map | docs/design/ | Generated from SRS and office samples | Superpowers prompt, Stitch handoff notes, screen map, and visual design brief |
| UI Design Inputs | Superpowers / Stitch exports | To be produced | Visual direction, layouts, components, and graphic assets for the Desk Picker interface |
