"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  autoAssignBookingAction,
  bookSelectedSeatAction,
  type BookingActionResult,
} from "@/app/reservations/actions";
import type { SeatAvailability } from "@/features/booking/availability";

import { DateStep } from "./date-step";
import { SeatStep } from "./seat-step";

type DateMode = "single" | "range";
type WizardStep = "date" | "seat" | "confirmation";
type PendingAction = "manual" | "auto";

type OfficeSummary = {
  id: string;
  code: string;
  name: string;
  location: string;
};

type BookingWizardProps = {
  office: OfficeSummary;
  bookableDateKeys: string[];
  initialAvailability: SeatAvailability[];
  floorMaps: Array<{ floorNum: number; floorMap: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(dateKey: string) {
  return dateFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
}

function selectedDatesForMode(input: {
  mode: DateMode;
  startDate: string;
  endDate: string;
  bookableDateKeys: string[];
}) {
  const { mode, startDate, endDate, bookableDateKeys } = input;

  if (mode === "single") {
    return bookableDateKeys.includes(startDate) ? [startDate] : [];
  }

  const startIndex = bookableDateKeys.indexOf(startDate);
  const endIndex = bookableDateKeys.indexOf(endDate);

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return [];
  }

  return bookableDateKeys.slice(startIndex, endIndex + 1);
}

function dateError(input: {
  mode: DateMode;
  startDate: string;
  endDate: string;
  selectedDateKeys: string[];
  bookableDateKeys: string[];
}) {
  const { mode, startDate, endDate, selectedDateKeys, bookableDateKeys } = input;

  if (!startDate || (mode === "range" && !endDate)) {
    return "Choose a date";
  }

  if (!bookableDateKeys.includes(startDate)) {
    return "Choose a weekday within the next 21 days";
  }

  if (mode === "range" && !bookableDateKeys.includes(endDate)) {
    return "Choose a weekday within the next 21 days";
  }

  if (mode === "range" && startDate > endDate) {
    return "End date must be after start date";
  }

  if (selectedDateKeys.length === 0) {
    return "No bookable dates";
  }

  return undefined;
}

function Confirmation({
  office,
  result,
  onNewReservation,
}: {
  office: OfficeSummary;
  result: BookingActionResult;
  onNewReservation: () => void;
}) {
  return (
    <section
      aria-labelledby="confirmation-title"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]"
    >
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          {office.name} · {office.location}
        </p>
        <h2 id="confirmation-title" className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Confirmation
        </h2>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Booked dates
            </h3>
            {result.booked.length > 0 ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {result.booked.map((booking) => (
                  <li
                    key={booking.reservationId}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm font-medium text-[var(--color-text)]"
                  >
                    {formatDate(booking.date)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">None</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Skipped dates
            </h3>
            {result.skipped.length > 0 ? (
              <div className="mt-2 overflow-x-auto rounded-md border border-[var(--color-border)]">
                <table className="min-w-[520px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--color-surface-strong)] text-white">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-xs font-black uppercase tracking-wide">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-2 text-xs font-black uppercase tracking-wide">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                    {result.skipped.map((skipped) => (
                      <tr key={`${skipped.date}-${skipped.reason}`}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">
                          {formatDate(skipped.date)}
                        </td>
                        <td className="px-3 py-2">{skipped.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">None</p>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Seat
          </h3>
          {result.seat ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-text-muted)]">Floor</dt>
                <dd className="font-semibold text-[var(--color-text)]">
                  {result.seat.floorName || `Floor ${result.seat.floorNum}`}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Desk</dt>
                <dd className="font-semibold text-[var(--color-text)]">
                  {result.seat.deskName || `Desk ${result.seat.deskNum}`}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Seat</dt>
                <dd className="font-semibold text-[var(--color-text)]">Seat {result.seat.seatNum}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">None</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onNewReservation}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              New Reservation
            </button>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Dashboard
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function BookingWizard({
  office,
  bookableDateKeys,
  initialAvailability,
  floorMaps,
}: BookingWizardProps) {
  const [step, setStep] = useState<WizardStep>("date");
  const [mode, setMode] = useState<DateMode>("single");
  const [startDate, setStartDate] = useState(bookableDateKeys[0] ?? "");
  const [endDate, setEndDate] = useState(bookableDateKeys[0] ?? "");
  const [selectedSeatId, setSelectedSeatId] = useState<string>();
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [actionError, setActionError] = useState<string>();
  const [confirmation, setConfirmation] = useState<BookingActionResult>();
  const [availability, setAvailability] = useState(initialAvailability);

  const selectedDateKeys = useMemo(
    () => selectedDatesForMode({ mode, startDate, endDate, bookableDateKeys }),
    [bookableDateKeys, endDate, mode, startDate],
  );
  const currentDateError = dateError({
    mode,
    startDate,
    endDate,
    selectedDateKeys,
    bookableDateKeys,
  });
  const minDate = bookableDateKeys[0] ?? "";
  const maxDate = bookableDateKeys.at(-1) ?? "";

  function handleModeChange(nextMode: DateMode) {
    setMode(nextMode);
    setActionError(undefined);

    if (nextMode === "single") {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(date: string) {
    setStartDate(date);
    setSelectedSeatId(undefined);
    setActionError(undefined);

    if (mode === "single") {
      setEndDate(date);
    }
  }

  function handleEndDateChange(date: string) {
    setEndDate(date);
    setSelectedSeatId(undefined);
    setActionError(undefined);
  }

  async function handleAutoAssign() {
    setPendingAction("auto");
    setActionError(undefined);

    const response = await autoAssignBookingAction({
      officeId: office.id,
      dateKeys: selectedDateKeys,
    });

    setPendingAction(undefined);

    if (!response.ok) {
      setActionError(response.error);
      return;
    }

    markBookedDates(response.result);
    setConfirmation(response.result);
    setStep("confirmation");
  }

  async function handleConfirm() {
    if (!selectedSeatId) {
      setActionError("Choose a seat");
      return;
    }

    setPendingAction("manual");
    setActionError(undefined);

    const response = await bookSelectedSeatAction({
      officeId: office.id,
      seatId: selectedSeatId,
      dateKeys: selectedDateKeys,
    });

    setPendingAction(undefined);

    if (!response.ok) {
      setActionError(response.error);
      return;
    }

    markBookedDates(response.result);
    setConfirmation(response.result);
    setStep("confirmation");
  }

  function markBookedDates(result: BookingActionResult) {
    if (!result.seat || result.booked.length === 0) {
      return;
    }

    const bookedSeatId = result.seat.seatId;
    const bookedDateKeys = new Set(result.booked.map((booking) => booking.date));

    setAvailability((currentAvailability) =>
      currentAvailability.map((seat) => {
        if (seat.seatId !== bookedSeatId) {
          return seat;
        }

        return {
          ...seat,
          dates: {
            ...seat.dates,
            ...Object.fromEntries(
              [...bookedDateKeys].map((dateKey) => [dateKey, "reserved" as const]),
            ),
          },
        };
      }),
    );
  }

  function handleNewReservation() {
    setSelectedSeatId(undefined);
    setActionError(undefined);
    setConfirmation(undefined);
    setStep("date");
  }

  const steps: Array<{ id: WizardStep; label: string; number: string }> = [
    { id: "date", label: "Office & Date", number: "1" },
    { id: "seat", label: "Desk Selection", number: "2" },
    { id: "confirmation", label: "Confirmation", number: "3" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {office.name} · {office.location}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-[-0.02em] text-[var(--color-text)]">
            Book a Spot
          </h1>
        </div>
      </div>

      <ol className="grid grid-cols-3 items-start gap-4">
        {steps.map((wizardStep, index) => {
          const isActive = step === wizardStep.id;
          const activeIndex = steps.findIndex((candidate) => candidate.id === step);
          const isComplete = index < activeIndex;

          return (
            <li key={wizardStep.id} className="relative flex flex-col items-center text-center">
              {index > 0 ? (
                <span className="absolute right-1/2 top-7 h-px w-full bg-[var(--color-outline-variant,#e3beb6)]" aria-hidden="true" />
              ) : null}
              <span
                className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 text-lg font-semibold ${
                  isActive || isComplete
                    ? "border-white bg-[var(--color-primary)] text-white shadow-[0_0_0_1px_var(--color-outline-variant,#e3beb6)]"
                    : "border-white bg-[var(--color-secondary-container,#e9e1db)] text-[var(--color-text-muted)] shadow-[0_0_0_1px_var(--color-outline-variant,#e3beb6)]"
                }`}
              >
                {wizardStep.number}
              </span>
              <span
                className={`mt-3 text-base font-medium ${
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {wizardStep.label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === "date" ? (
        <DateStep
          office={office}
          mode={mode}
          startDate={startDate}
          endDate={endDate}
          minDate={minDate}
          maxDate={maxDate}
          selectedDateCount={selectedDateKeys.length}
          dateError={currentDateError}
          onModeChange={handleModeChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onNext={() => {
            if (!currentDateError) {
              setStep("seat");
            }
          }}
        />
      ) : null}

      {step === "seat" ? (
        <SeatStep
          officeName={office.name}
          dateKeys={selectedDateKeys}
          seats={availability}
          floorMaps={floorMaps}
          selectedSeatId={selectedSeatId}
          pendingAction={pendingAction}
          error={actionError}
          onSelectSeat={(seatId) => {
            setSelectedSeatId(seatId);
            setActionError(undefined);
          }}
          onBack={() => {
            setActionError(undefined);
            setStep("date");
          }}
          onAutoAssign={handleAutoAssign}
          onConfirm={handleConfirm}
        />
      ) : null}

      {step === "confirmation" && confirmation ? (
        <Confirmation office={office} result={confirmation} onNewReservation={handleNewReservation} />
      ) : null}
    </div>
  );
}
