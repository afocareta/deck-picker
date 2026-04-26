# Screen Map

## Public/Auth

| Screen | Purpose | Primary Action | Key States |
|--------|---------|----------------|------------|
| Login | Authenticate with Google Workspace | Sign in with Google | Domain denied, auth failed |
| Office selection | Capture office when identity provider has no office data | Confirm office | No offices configured |

## Employee

| Screen | Purpose | Primary Action | Key States |
|--------|---------|----------------|------------|
| User dashboard | Show booking status and launch reservation flow | Book a Spot | No upcoming reservations, cancellation success |
| Booking step 1 | Pick date or date range for assigned office | Next | Closed day, weekend, outside booking horizon |
| Booking step 2 | Select or auto-assign a seat | Confirm Reservation | No seats, selected seat, reserved, unavailable |
| Booking confirmation | Confirm saved reservation details | Back to Dashboard | Partial date range success |
| Cancel reservation modal | Confirm future reservation cancellation | Cancel Reservation | Cancellation failed |

## Admin

| Screen | Purpose | Primary Action | Key States |
|--------|---------|----------------|------------|
| Admin dashboard | Monitor all offices and access operations | Manage offices/closures/availability | No closures, high occupancy |
| Office upload/upsert | Add or replace office configuration | Validate / Apply Changes | Invalid JSON, missing image, migration impact |
| Closing days | Manage office closures | Save Closures | Existing reservations affected |
| Resource availability | Block office/floor/desk/seat resources | Save Unavailability | Existing reservations affected |
| Audit trail | Review admin operations | Export CSV | Empty results, filtered results |
| GDPR tools | Export or anonymize user personal data | Export DSAR / Anonymize | User not found, confirmation required |

## Design Priority

1. User dashboard
2. Booking step 1
3. Booking step 2
4. Admin dashboard
5. Office upload/upsert
6. Login and office selection
7. Remaining admin tools
