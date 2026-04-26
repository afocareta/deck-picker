import { Building2, MapPinned } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { selectOfficeAction } from "@/app/select-office/actions";
import { getCurrentUser } from "@/features/auth/current-user";
import { getSelectableOffices } from "@/features/onboarding/office-selection-service";

export const dynamic = "force-dynamic";

export default async function SelectOfficePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.officeSelectedAt) {
    redirect("/dashboard");
  }

  const offices = await getSelectableOffices();

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-5 py-8 text-[var(--color-text)]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--color-primary)] text-lg font-black text-white">
              DP
            </div>
            <p className="mt-6 text-sm font-black uppercase tracking-wide text-[var(--color-primary)]">
              First access
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
              Choose your office
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
              Hi {user.name}. Pick the office you normally work from. Bookings will use this office by default.
            </p>
          </div>
          <div className="flex min-w-0 items-center rounded-md border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
            <div className="min-w-0 px-3 py-2">
              <p className="max-w-[240px] truncate text-sm font-semibold text-[var(--color-text)]" title={user.email}>
                {user.email}
              </p>
              <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                {user.role}
              </p>
            </div>
            <Link
              href="/logout"
              className="flex min-h-11 items-center border-l border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
            >
              Logout
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offices.map((office) => (
            <form
              key={office.id}
              action={selectOfficeAction}
              className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-panel)]"
            >
              <input type="hidden" name="officeId" value={office.id} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">{office.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <MapPinned className="h-4 w-4" aria-hidden="true" />
                    {office.location}
                  </p>
                </div>
                <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-black uppercase text-[var(--color-primary)]">
                  {office.code}
                </span>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <Building2 className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                {office.seatCount} seats
              </p>
              <button
                type="submit"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Select Office
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
