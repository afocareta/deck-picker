"use client";

import { ArrowRight, CalendarDays, Check, SlidersHorizontal } from "lucide-react";

type DateMode = "single" | "range";

type DateStepProps = {
  office: {
    name: string;
    location: string;
  };
  mode: DateMode;
  startDate: string;
  endDate: string;
  minDate: string;
  maxDate: string;
  selectedDateCount: number;
  dateError?: string;
  onModeChange: (mode: DateMode) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onNext: () => void;
};

export function DateStep({
  office,
  mode,
  startDate,
  endDate,
  minDate,
  maxDate,
  selectedDateCount,
  dateError,
  onModeChange,
  onStartDateChange,
  onEndDateChange,
  onNext,
}: DateStepProps) {
  const canContinue = selectedDateCount > 0 && !dateError;

  return (
    <section
      aria-labelledby="date-step-title"
      className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]"
    >
      <div className="min-h-[520px] rounded-lg border border-[var(--color-outline-variant,#e3beb6)] bg-white p-6 shadow-[var(--shadow-panel)]">
        <h2 id="date-step-title" className="text-xl font-medium text-[var(--color-text)]">
          Book your assigned office
        </h2>

        <div className="mt-8">
          <p className="text-base font-medium text-[var(--color-text)]">Office</p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4 rounded-md border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
                {office.name.slice(8, 10).toUpperCase() || "HQ"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium text-[var(--color-text)]">{office.name}</p>
                <p className="mt-1 text-base text-[var(--color-text-muted)]">{office.location}</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <Check className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg border border-[var(--color-outline-variant,#e3beb6)] bg-white p-6 shadow-[var(--shadow-panel)]">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="text-xl font-medium text-[var(--color-text)]">Select Date</h3>
          </div>

          <fieldset>
            <legend className="sr-only">Mode</legend>
            <div className="grid min-h-11 grid-cols-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
              <button
                type="button"
                onClick={() => onModeChange("single")}
                className={`rounded px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
                  mode === "single"
                    ? "bg-[var(--color-surface-strong)] text-white shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                Single date
              </button>
              <button
                type="button"
                onClick={() => onModeChange("range")}
                className={`rounded px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
                  mode === "range"
                    ? "bg-[var(--color-surface-strong)] text-white shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                Range
              </button>
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              {mode === "single" ? "Date" : "Start date"}
            </span>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="mt-2 min-h-14 w-full rounded-md border border-[var(--color-outline-variant,#e3beb6)] bg-white px-4 text-base font-medium text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            />
          </label>

          {mode === "range" ? (
            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                End date
              </span>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                className="mt-2 min-h-14 w-full rounded-md border border-[var(--color-outline-variant,#e3beb6)] bg-white px-4 text-base font-medium text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              />
            </label>
          ) : null}
          </div>

          <div className="mt-5 rounded-md border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Availability for selected dates
            </p>
            <p className="mt-2 text-base text-[var(--color-text)]">
              <span className="font-medium text-[var(--color-primary)]">{selectedDateCount}</span>{" "}
              {selectedDateCount === 1 ? "date" : "dates"} selected
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-outline-variant,#e3beb6)] bg-white p-6 shadow-[var(--shadow-panel)]">
          <div className="mb-5 flex items-center gap-3">
            <SlidersHorizontal className="h-6 w-6 text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="text-xl font-medium text-[var(--color-text)]">Requirements</h3>
          </div>
          <div className="space-y-5">
            {["External Monitor", "Standing Desk", "Quiet Zone"].map((item, index) => (
              <label key={item} className="flex items-start gap-4">
                <input
                  type="checkbox"
                  defaultChecked={index === 2}
                  className="mt-1 h-5 w-5 rounded border-[var(--color-outline-variant,#e3beb6)] accent-[var(--color-primary)]"
                />
                <span>
                  <span className="block text-base font-medium text-[var(--color-text)]">{item}</span>
                  <span className="block text-sm text-[var(--color-text-muted)]">
                    {index === 0 ? "Dual 27 inch screens" : index === 1 ? "Electric height adjustment" : "Minimal distractions area"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {dateError ? (
          <p className="text-sm font-medium text-[var(--color-danger)] md:col-span-2 lg:col-span-1">
            {dateError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-lg bg-[var(--color-primary)] px-5 text-lg font-semibold text-white shadow-[var(--shadow-panel)] hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-border-strong)]"
        >
          Continue to Desk Selection
          <ArrowRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
