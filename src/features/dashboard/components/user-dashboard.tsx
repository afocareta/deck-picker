import Link from "next/link";
import {
  CalendarDays,
  MapPinned,
  Monitor,
  Radio,
  Trash2,
  Users,
} from "lucide-react";

import { cancelReservationAction } from "@/app/reservations/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { UserDashboard as UserDashboardData } from "@/features/dashboard/dashboard-service";

type UserDashboardProps = {
  dashboard: UserDashboardData;
};

type MetricBlockProps = {
  label: string;
  value: string;
  context: string;
  icon: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
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

function MetricBlock({ label, value, context, icon, footer, className = "" }: MetricBlockProps) {
  return (
    <article className={`flex min-h-[176px] flex-col justify-between rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-panel)] ${className}`}>
      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium uppercase text-[var(--color-text-muted)]">
            {label}
          </h2>
          <span className="text-[var(--color-primary)]">{icon}</span>
        </div>
        <p className="mt-4 text-2xl font-medium leading-none text-[var(--color-primary)]">
          {value}
        </p>
        <p className="mt-3 text-base leading-6 text-[var(--color-text-muted)]">{context}</p>
      </div>
      {footer ? <div className="mt-6 border-t border-[var(--color-border)] pt-4">{footer}</div> : null}
    </article>
  );
}

export function UserDashboard({ dashboard }: UserDashboardProps) {
  const hasReservations = dashboard.upcomingReservations.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[15px] font-medium text-[var(--color-text-muted)]">
            {dashboard.assignedOffice.name} - operational overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 text-[var(--color-text)]">
            Workspace Dashboard
          </h1>
        </div>
        <Link
          href="/book"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-5 text-base font-semibold text-white shadow-[var(--shadow-panel)] hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Book a Spot
        </Link>
      </div>

      <section
        aria-label="Dashboard metrics"
        className="grid grid-cols-12 gap-4"
      >
        <MetricBlock
          label="Today's Occupancy"
          value={`${dashboard.occupancyToday}%`}
          context={`${dashboard.assignedOffice.seatCount} seats in office`}
          icon={<Radio className="h-5 w-5" aria-hidden="true" />}
          className="col-span-12 md:col-span-3"
          footer={
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[var(--color-success-soft)] px-3 py-1 text-sm font-medium text-[var(--color-success)]">
                Healthy
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">Within peak capacity</span>
            </div>
          }
        />
        <div className="col-span-12 md:col-span-3">
          <MetricBlock
            label="Upcoming"
            value={dashboard.upcomingReservations.length.toString()}
            context="future reservations"
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
            footer={
              <p className="text-sm text-[var(--color-text-muted)]">
                {dashboard.historyCounts.oneMonth} active reservations in the previous 30 days
              </p>
            }
          />
        </div>
        <article className="col-span-12 grid min-h-[176px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)] md:col-span-6 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-sm font-medium uppercase text-[var(--color-text-muted)]">
                Map Pulse
              </h2>
            </div>
            <p className="mt-3 text-xl font-medium text-[var(--color-text)]">
              {dashboard.assignedOffice.name}
            </p>
            <p className="mt-2 max-w-md text-base leading-7 text-[var(--color-text-muted)]">
              Next bookable day is {formatDate(dashboard.nextBookableDate)} with {dashboard.occupancyNextBookableDay}% occupancy.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/book" className="inline-flex min-h-10 items-center justify-center rounded bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]">
                View Availability
              </Link>
            </div>
          </div>
          <div className="relative hidden bg-[var(--color-accent-soft)] md:block">
            <div className="absolute inset-5 rounded-full border border-[var(--color-accent)]/25" />
            <div className="absolute left-10 top-10 h-16 w-28 rounded-[50%] bg-[var(--color-accent)]/20" />
            <div className="absolute right-8 top-16 h-20 w-24 rounded-[45%] bg-[var(--color-success-soft)]" />
            <div className="absolute bottom-8 left-16 h-14 w-32 rounded-[50%] bg-[var(--color-primary-soft)]" />
            <div className="absolute bottom-16 right-12 h-3 w-3 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_8px_rgba(227,75,37,0.16)]" />
          </div>
        </article>
      </section>

      <section
        aria-labelledby="upcoming-reservations-title"
        className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <h2
            id="upcoming-reservations-title"
            className="text-lg font-semibold leading-7 tracking-[-0.01em] text-[var(--color-text)]"
          >
            Upcoming Reservations
          </h2>
          <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">
            {dashboard.upcomingReservations.length}
          </span>
        </div>

        {hasReservations ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--color-surface-strong)] text-white">
                <tr>
                  <th scope="col" className="px-4 py-3 text-sm font-black uppercase">
                    Resource
                  </th>
                  <th scope="col" className="px-4 py-3 text-sm font-black uppercase">
                    Date & Time
                  </th>
                  <th scope="col" className="px-4 py-3 text-sm font-black uppercase">
                    Location / Zone
                  </th>
                  <th scope="col" className="px-4 py-3 text-sm font-black uppercase">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-black uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                {dashboard.upcomingReservations.map((reservation) => (
                  <tr key={reservation.id} className="odd:bg-white even:bg-[var(--color-surface-muted)]">
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
                        <div>
                          <div className="font-medium">{reservation.deskName}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">Seat {reservation.seatNum}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="font-medium">{formatDate(reservation.date)}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">09:00 AM - 06:00 PM</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                      {reservation.floorName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded-full bg-[#dbeafe] px-3 py-1 text-sm font-medium text-[#1d4ed8]">
                        Confirmed
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <form action={cancelReservationAction}>
                        <input
                          type="hidden"
                          name="reservationId"
                          value={reservation.id}
                        />
                        <ConfirmSubmitButton
                          message="Cancel this reservation?"
                          aria-label={`Cancel reservation for ${formatDate(reservation.date)}, ${reservation.deskName}, seat ${reservation.seatNum}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10">
            <div className="max-w-xl">
              <p className="text-base font-semibold text-[var(--color-text)]">
                No upcoming reservations
              </p>
              <Link
                href="/book"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Book a Spot
              </Link>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
