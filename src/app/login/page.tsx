import Link from "next/link";

const errorCopy: Record<string, string> = {
  google_not_configured: "Google login is not configured locally. Dev fallback remains active.",
  invalid_google_state: "The Google login attempt expired. Try again.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error
    ? (errorCopy[params.error] ?? params.error)
    : undefined;

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-5 py-8 text-[var(--color-text)]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--color-primary)] text-lg font-black text-white">
            DP
          </div>
          <p className="mt-8 text-sm font-black uppercase tracking-wide text-[var(--color-primary)]">
            Desk Picker
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-5xl">
            Workspace access for the control room.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-text-muted)]">
            Sign in with the company Google account, or keep using the local dev fallback while auth env vars are not configured.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-panel)]">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Login</h2>
          {error ? (
            <p className="mt-3 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3">
            <a
              href="/auth/google/start"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Continue with Google
            </a>
            <Link
              href="/auth/dev"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Use local dev fallback
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
