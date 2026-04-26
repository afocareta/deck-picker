-- Replace status-inclusive uniqueness with active-only uniqueness.
-- This preserves cancellation history while still preventing double bookings.
DROP INDEX "Reservation_seatId_date_status_key";
DROP INDEX "Reservation_userId_date_status_key";

CREATE INDEX "Reservation_seatId_date_status_idx" ON "Reservation"("seatId", "date", "status");
CREATE INDEX "Reservation_userId_date_status_idx" ON "Reservation"("userId", "date", "status");

CREATE UNIQUE INDEX "Reservation_active_seat_date_key"
ON "Reservation"("seatId", "date")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "Reservation_active_user_date_key"
ON "Reservation"("userId", "date")
WHERE "status" = 'ACTIVE';
