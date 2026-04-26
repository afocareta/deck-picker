import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  CircleHelp,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Map,
  MapPinned,
  PlusCircle,
  Search,
  Settings,
  Shield,
  Users,
} from "lucide-react";

type AppShellProps = {
  officeName: string;
  role: "user" | "admin";
  userEmail?: string;
  children: React.ReactNode;
};

export function AppShell({
  officeName,
  role,
  userEmail = "dev.user@example.com",
  children,
}: AppShellProps) {
  const accountInitial = userEmail.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)] lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen bg-[var(--color-surface-strong)] text-white lg:flex lg:flex-col">
        <div className="p-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-primary)] text-lg font-black">
              DP
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Desk Picker</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Internal Ops
              </p>
            </div>
          </div>
          <nav aria-label="Primary navigation" className="space-y-1">
            <Link
              href="/dashboard"
              className="flex min-h-12 items-center gap-3 border-l-4 border-[var(--color-primary)] bg-white/8 px-4 text-sm font-semibold text-white"
            >
              <Map className="h-5 w-5" aria-hidden="true" />
              Map
            </Link>
            <Link
              href="/book"
              className="flex min-h-12 items-center gap-3 border-l-4 border-transparent px-4 text-sm font-semibold text-white/58 hover:bg-white/8 hover:text-white"
            >
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              Bookings
            </Link>
            <Link
              href="/settings/office"
              className="flex min-h-12 items-center gap-3 border-l-4 border-transparent px-4 text-sm font-semibold text-white/58 hover:bg-white/8 hover:text-white"
            >
              <MapPinned className="h-5 w-5" aria-hidden="true" />
              Office
            </Link>
            <div className="flex min-h-12 items-center gap-3 border-l-4 border-transparent px-4 text-sm font-semibold text-white/45">
              <Users className="h-5 w-5" aria-hidden="true" />
              People
            </div>
            <div className="flex min-h-12 items-center gap-3 border-l-4 border-transparent px-4 text-sm font-semibold text-white/45">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              Analytics
            </div>
            {role === "admin" ? (
              <Link
                href="/admin"
                className="flex min-h-12 items-center gap-3 border-l-4 border-transparent px-4 text-sm font-semibold text-white/58 hover:bg-white/8 hover:text-white"
              >
                <Shield className="h-5 w-5" aria-hidden="true" />
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="mt-auto p-6">
          <Link
            href="/book"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Quick Reserve
          </Link>
          <div className="mt-8 border-t border-white/12 pt-5">
            <div className="flex items-center gap-3 text-sm font-medium text-white/58">
              <LifeBuoy className="h-5 w-5" aria-hidden="true" />
              Support
            </div>
            <div className="mt-5 text-xs font-medium text-white/45">{officeName}</div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
          <div className="flex min-h-14 flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:hidden">
              <div className="lg:hidden">
                <p className="text-base font-black uppercase tracking-wide text-[var(--color-text)]">
                  Desk Picker
                </p>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">{officeName}</p>
              </div>
              <nav aria-label="Primary navigation" className="flex items-center gap-1 lg:hidden">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Dashboard
              </Link>
              <Link
                href="/book"
                className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Book
              </Link>
              <Link
                href="/settings/office"
                className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Office
              </Link>
              <Link
                href="/search"
                className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Search
              </Link>
              {role === "admin" ? (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
            <form action="/search" className="hidden min-w-[280px] max-w-md flex-1 items-center lg:flex">
              <label className="relative w-full">
                <span className="sr-only">Search workspace</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-subtle)]" />
                <input
                  name="q"
                  placeholder="Search offices, desks, reservations..."
                  className="min-h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] pl-10 pr-12 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                </button>
              </label>
            </form>
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <div className="hidden items-center gap-1 lg:flex">
                <button className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Help">
                  <CircleHelp className="h-5 w-5" />
                </button>
                <Link href="/settings/office" className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
              <span className="h-6 w-px bg-[var(--color-border)]" aria-hidden="true" />
              <Link
                href="/settings/office"
                className="hidden items-center gap-2 rounded-md px-2 py-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] md:flex"
              >
                <span>{officeName}</span>
                <span className="text-xs font-black uppercase tracking-wide text-[var(--color-primary)]">
                  Change
                </span>
              </Link>
              <div className="flex min-w-0 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <div className="flex min-w-0 items-center gap-2 px-2.5 py-1.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-xs font-black text-white">
                    {accountInitial}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block max-w-[220px] truncate font-semibold text-[var(--color-text)]"
                      title={userEmail}
                    >
                      {userEmail}
                    </span>
                    <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                      {role}
                    </span>
                  </span>
                </div>
                <Link
                  href="/logout"
                  className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-[1280px] px-5 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
