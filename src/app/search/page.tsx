import Link from "next/link";
import { Armchair, Building2, CalendarCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { changeOfficeAction } from "@/app/settings/office/actions";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/features/auth/current-user";
import { searchWorkspace } from "@/features/search/search-service";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function toShellRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "admin" : "user";
}

function ResultSection({
  title,
  icon,
  children,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <span className="text-[var(--color-primary)]">{icon}</span>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      </div>
      {empty ? (
        <div className="px-5 py-8 text-sm font-semibold text-[var(--color-text-muted)]">No matches</div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">{children}</div>
      )}
    </section>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user) {
    redirect("/login");
  }

  const query = params.q ?? "";
  const results = await searchWorkspace({
    query,
    currentUserId: user.id,
    currentUserRole: user.role,
  });
  const hasQuery = results.query.length >= 2;

  return (
    <AppShell
      officeName={user.assignedOffice.name}
      role={toShellRole(user.role)}
      userEmail={user.email}
    >
      <div className="space-y-5">
        <div>
          <p className="text-[15px] font-medium text-[var(--color-text-muted)]">Search</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 text-[var(--color-text)]">
            {hasQuery ? `Results for "${results.query}"` : "Search workspace"}
          </h1>
        </div>

        <form action="/search" className="flex max-w-2xl gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search offices, desks, reservations..."
            className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
          >
            Search
          </button>
        </form>

        {!hasQuery ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-white px-5 py-8 text-sm font-semibold text-[var(--color-text-muted)] shadow-[var(--shadow-panel)]">
            Type at least two characters.
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            <ResultSection
              title="Offices"
              icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
              empty={results.offices.length === 0}
            >
              {results.offices.map((office) => (
                <form key={office.id} action={changeOfficeAction} className="px-5 py-4 hover:bg-[var(--color-surface-muted)]">
                  <input type="hidden" name="officeId" value={office.id} />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-[var(--color-text)]">{office.name}</div>
                      <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {office.code} / {office.location}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex min-h-9 items-center justify-center rounded-md bg-[var(--color-primary)] px-3 text-xs font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
                    >
                      Select Office
                    </button>
                  </div>
                </form>
              ))}
            </ResultSection>

            <ResultSection
              title="Seats"
              icon={<Armchair className="h-5 w-5" aria-hidden="true" />}
              empty={results.seats.length === 0}
            >
              {results.seats.map((seat) => (
                <Link key={seat.id} href="/book" className="block px-5 py-4 hover:bg-[var(--color-surface-muted)]">
                  <div className="font-semibold text-[var(--color-text)]">
                    {seat.deskName} / Seat {seat.seatNum}
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {seat.officeName} / {seat.floorName}
                  </div>
                </Link>
              ))}
            </ResultSection>

            <ResultSection
              title="My Reservations"
              icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
              empty={results.reservations.length === 0}
            >
              {results.reservations.map((reservation) => (
                <Link key={reservation.id} href="/dashboard" className="block px-5 py-4 hover:bg-[var(--color-surface-muted)]">
                  <div className="font-semibold text-[var(--color-text)]">
                    {reservation.date} / {reservation.deskName} / Seat {reservation.seatNum}
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {reservation.officeName} / {reservation.floorName}
                  </div>
                </Link>
              ))}
            </ResultSection>

            {user.role === "ADMIN" ? (
              <ResultSection
                title="Users"
                icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
                empty={results.users.length === 0}
              >
                {results.users.map((resultUser) => (
                  <Link key={resultUser.id} href="/admin?tab=users" className="block px-5 py-4 hover:bg-[var(--color-surface-muted)]">
                    <div className="font-semibold text-[var(--color-text)]">{resultUser.name}</div>
                    <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {resultUser.email} / {resultUser.role} / {resultUser.officeName}
                    </div>
                  </Link>
                ))}
              </ResultSection>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
