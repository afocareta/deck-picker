import { Building2, Check, MapPinned } from "lucide-react";

import { changeOfficeAction } from "@/app/settings/office/actions";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/features/auth/current-user";
import { getSelectableOffices } from "@/features/onboarding/office-selection-service";

export const dynamic = "force-dynamic";

type OfficeSettingsPageProps = {
  searchParams: Promise<{ error?: string; officeId?: string }>;
};

function toShellRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "admin" : "user";
}

export default async function OfficeSettingsPage({ searchParams }: OfficeSettingsPageProps) {
  const [user, offices, params] = await Promise.all([
    getCurrentUser(),
    getSelectableOffices(),
    searchParams,
  ]);

  return (
    <AppShell
      officeName={user.assignedOffice.name}
      role={toShellRole(user.role)}
      userEmail={user.email}
    >
      <section className="space-y-5">
        <div>
          <p className="text-[15px] font-medium text-[var(--color-text-muted)]">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 text-[var(--color-text)]">
            Office
          </h1>
        </div>

        {params.error ? (
          <div className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
            {params.error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offices.map((office) => {
            const isCurrent = office.id === user.assignedOffice.id;
            const isHighlighted = office.id === params.officeId;

            return (
              <form
                id={`office-${office.id}`}
                key={office.id}
                action={changeOfficeAction}
                className={`rounded-lg border bg-white p-5 shadow-[var(--shadow-panel)] ${
                  isCurrent
                    ? "border-[var(--color-primary)]"
                    : isHighlighted
                      ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20"
                    : "border-[var(--color-border)]"
                }`}
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
                {isHighlighted && !isCurrent ? (
                  <p className="mt-4 rounded-md bg-[var(--color-accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)]">
                    Search result
                  </p>
                ) : null}
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <Building2 className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  {office.seatCount} seats
                </p>
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-black uppercase tracking-wide ${
                    isCurrent
                      ? "cursor-default bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Current Office
                    </>
                  ) : (
                    "Select Office"
                  )}
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
