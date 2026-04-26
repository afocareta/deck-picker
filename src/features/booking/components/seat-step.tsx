"use client";

import Image from "next/image";

import type { SeatAvailability } from "@/features/booking/availability";

type SeatStatus = "available" | "partial" | "reserved";

type SeatStepProps = {
  officeName: string;
  dateKeys: string[];
  seats: SeatAvailability[];
  floorMaps: Array<{ floorNum: number; floorMap: string }>;
  selectedSeatId?: string;
  pendingAction?: "manual" | "auto";
  error?: string;
  onSelectSeat: (seatId: string) => void;
  onBack: () => void;
  onAutoAssign: () => void;
  onConfirm: () => void;
};

function seatStatus(seat: SeatAvailability, dateKeys: string[]): SeatStatus {
  const availableCount = dateKeys.filter((dateKey) => seat.dates[dateKey] === "available").length;

  if (availableCount === dateKeys.length) {
    return "available";
  }

  return availableCount > 0 ? "partial" : "reserved";
}

function statusLabel(status: SeatStatus) {
  if (status === "available") {
    return "Available";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Reserved";
}

function statusClassName(status: SeatStatus) {
  if (status === "available") {
    return "bg-[var(--color-success-soft)] text-[var(--color-success)]";
  }

  if (status === "partial") {
    return "bg-[var(--color-warning-soft)] text-[var(--color-warning)]";
  }

  return "bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
}

export function SeatStep({
  officeName,
  dateKeys,
  seats,
  floorMaps,
  selectedSeatId,
  pendingAction,
  error,
  onSelectSeat,
  onBack,
  onAutoAssign,
  onConfirm,
}: SeatStepProps) {
  const hasSeats = seats.length > 0;
  const selectedSeat = seats.find((seat) => seat.seatId === selectedSeatId);
  const canConfirm = selectedSeat ? seatStatus(selectedSeat, dateKeys) !== "reserved" : false;

  return (
    <section aria-labelledby="seat-step-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {officeName} · {dateKeys.length} {dateKeys.length === 1 ? "date" : "dates"}
          </p>
          <h2 id="seat-step-title" className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            Select Workspace
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onAutoAssign}
            disabled={pendingAction !== undefined || !hasSeats}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-surface-strong)] px-4 text-sm font-bold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-border-strong)]"
          >
            {pendingAction === "auto" ? "Assigning" : "Auto-assign"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pendingAction !== undefined || !canConfirm}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-5 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-border-strong)]"
          >
            {pendingAction === "manual" ? "Booking" : "Confirm Reservation"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,520px)_minmax(0,1fr)]">
        <aside
          aria-label="Floor plans"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]"
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-[var(--color-text-muted)]">
              Floor Visualizer
            </h3>
          </div>
          <div className="grid gap-3 p-3">
            {floorMaps.map((floorMap) => (
              <figure key={`${floorMap.floorNum}-${floorMap.floorMap}`} className="space-y-2">
                <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <Image
                    src={floorMap.floorMap}
                    alt={`${officeName} floor ${floorMap.floorNum} plan`}
                    width={760}
                    height={520}
                    className="h-auto w-full object-contain"
                    priority={floorMaps.length === 1}
                  />
                </div>
                <figcaption className="px-1 text-sm font-medium text-[var(--color-text-muted)]">
                  Floor {floorMap.floorNum}
                </figcaption>
              </figure>
            ))}
          </div>
        </aside>

        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Availability</h3>
            {selectedSeat ? (
              <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-sm font-semibold text-[var(--color-primary)]">
                Floor {selectedSeat.floorNum} · Desk {selectedSeat.deskNum} · Seat{" "}
                {selectedSeat.seatNum}
              </span>
            ) : null}
          </div>

          {hasSeats ? (
            <div className="overflow-x-auto">
              <table className="min-w-[680px] border-collapse text-left text-sm">
                <thead className="bg-[var(--color-surface-strong)] text-white">
                  <tr>
                    <th scope="col" className="w-12 px-4 py-3 text-xs font-black uppercase tracking-wide">
                      Pick
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wide">
                      Floor
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wide">
                      Desk
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wide">
                      Seat
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                  {seats.map((seat) => {
                    const status = seatStatus(seat, dateKeys);
                    const isReserved = status === "reserved";
                    const isSelected = selectedSeatId === seat.seatId;

                    return (
                      <tr
                        key={seat.seatId}
                        className={
                          isSelected
                            ? "bg-[var(--color-primary-soft)]"
                            : "odd:bg-white even:bg-[var(--color-surface-muted)]"
                        }
                      >
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name="seat"
                            checked={isSelected}
                            disabled={isReserved}
                            onChange={() => onSelectSeat(seat.seatId)}
                            aria-label={`Floor ${seat.floorNum}, desk ${seat.deskNum}, seat ${seat.seatNum}`}
                            className="h-4 w-4 accent-[var(--color-primary)] disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          Floor {seat.floorNum}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">Desk {seat.deskNum}</td>
                        <td className="whitespace-nowrap px-4 py-3">Seat {seat.seatNum}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClassName(
                              status,
                            )}`}
                          >
                            {statusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-10">
              <p className="text-base font-semibold text-[var(--color-text)]">No seats</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                No seats are configured for this office.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
