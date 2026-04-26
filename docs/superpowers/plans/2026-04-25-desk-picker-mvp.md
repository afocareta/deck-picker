# Desk Picker MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Desk Picker vertical slice: scaffold app, import office assets, reserve desks, show the user dashboard, and complete the booking wizard.

**Architecture:** Use Next.js App Router with TypeScript as a full-stack app. Prisma + SQLite stores imported offices and reservations. Domain logic lives in focused feature modules, while pages and components call server-side actions and query helpers.

**Tech Stack:** Next.js, React, TypeScript, Prisma, SQLite, Tailwind CSS, Vitest, Testing Library, Playwright, AJV.

---

## File Structure

- Create `src/app/layout.tsx`: root app shell and global metadata.
- Create `src/app/page.tsx`: redirect or render the user dashboard as the first MVP screen.
- Create `src/app/dashboard/page.tsx`: user dashboard route.
- Create `src/app/book/page.tsx`: booking wizard route.
- Create `src/app/reservations/actions.ts`: server actions for booking and cancellation.
- Create `src/app/globals.css`: Tailwind base and app tokens after Stitch.
- Create `src/components/app-shell.tsx`: authenticated shell with product name, assigned office, role, and fixed development account label.
- Create `src/features/dev-user/dev-user.ts`: fixed MVP user and assigned office.
- Create `src/features/offices/office-schema.ts`: Zod or TypeScript runtime representation for imported office JSON.
- Create `src/features/offices/import-offices.ts`: office JSON validation, image resolution, and seed data conversion.
- Create `src/features/offices/queries.ts`: office/floor/desk/seat query helpers.
- Create `src/features/booking/date-rules.ts`: booking horizon and weekday rules.
- Create `src/features/booking/availability.ts`: availability lookup and occupancy calculations.
- Create `src/features/booking/booking-service.ts`: manual booking, auto-assign, range partial success, cancellation.
- Create `src/features/dashboard/dashboard-service.ts`: upcoming reservations, occupancy metrics, and history counters.
- Create `src/features/booking/components/booking-wizard.tsx`: two-step wizard composition.
- Create `src/features/booking/components/date-step.tsx`: assigned office and date/range selection.
- Create `src/features/booking/components/seat-step.tsx`: floor plan reference and seat availability table.
- Create `src/features/dashboard/components/user-dashboard.tsx`: dashboard UI.
- Create `prisma/schema.prisma`: SQLite datasource and MVP models.
- Create `prisma/seed.ts`: seed dev user and five complete offices.
- Create `scripts/copy-office-assets.mjs`: copy floor plan assets to `public/offices`.
- Create `tests/features/offices/import-offices.test.ts`: import validation tests.
- Create `tests/features/booking/date-rules.test.ts`: booking date rule tests.
- Create `tests/features/booking/booking-service.test.ts`: reservation behavior tests.
- Create `tests/features/dashboard/dashboard-service.test.ts`: dashboard derivation tests.
- Create `tests/e2e/booking-flow.spec.ts`: browser-level dashboard-to-confirmation flow.
- Modify `package.json`: add app, Prisma, test, lint, seed, and asset-copy scripts.
- Modify `.gitignore`: ignore `.next`, local SQLite DB files, and test reports.

## Task 1: Scaffold Next.js App

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/app-shell.tsx`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install next react react-dom typescript tailwindcss postcss autoprefixer prisma @prisma/client ajv zod vitest @testing-library/react @testing-library/jest-dom jsdom playwright
```

Expected: dependencies install successfully and `package-lock.json` updates.

- [ ] **Step 2: Add scripts**

Update `package.json` scripts to include:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "assets:offices": "node scripts/copy-office-assets.mjs",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

If `tsx` is not present after the first install, also install it:

```bash
npm install -D tsx
```

- [ ] **Step 3: Add app shell files**

Create a minimal App Router shell:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desk Picker",
  description: "Internal desk reservation tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/components/app-shell.tsx
type AppShellProps = {
  officeName: string;
  role: "user" | "admin";
  children: React.ReactNode;
};

export function AppShell({ officeName, role, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="font-semibold">Desk Picker</div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{officeName}</span>
            <span className="rounded border border-slate-300 px-2 py-1 uppercase">{role}</span>
            <span>dev.user@example.com</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Verify scaffold**

Run:

```bash
npm run build
```

Expected: Next.js build completes or fails only on missing pages that the next task creates.

## Task 2: Add Prisma Data Model

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write schema**

Use this MVP schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

enum ReservationStatus {
  ACTIVE
  CANCELLED
}

model User {
  id               String        @id @default(cuid())
  email            String        @unique
  name             String
  role             UserRole      @default(USER)
  assignedOfficeId String
  assignedOffice   Office        @relation(fields: [assignedOfficeId], references: [id])
  reservations     Reservation[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

model Office {
  id        String  @id @default(cuid())
  code      String  @unique
  name      String
  location  String
  floors    Floor[]
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Floor {
  id        String @id @default(cuid())
  officeId  String
  office    Office @relation(fields: [officeId], references: [id], onDelete: Cascade)
  floorNum  Int
  floorName String
  floorMap  String
  desks     Desk[]

  @@unique([officeId, floorNum])
}

model Desk {
  id       String @id @default(cuid())
  floorId  String
  floor    Floor  @relation(fields: [floorId], references: [id], onDelete: Cascade)
  deskNum  Int
  deskName String
  seats    Seat[]

  @@unique([floorId, deskNum])
}

model Seat {
  id           String        @id @default(cuid())
  deskId       String
  desk         Desk          @relation(fields: [deskId], references: [id], onDelete: Cascade)
  seatNum      Int
  reservations Reservation[]

  @@unique([deskId, seatNum])
}

model Reservation {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  seatId      String
  seat        Seat              @relation(fields: [seatId], references: [id])
  date        DateTime
  status      ReservationStatus @default(ACTIVE)
  cancelledAt DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([seatId, date, status])
  @@unique([userId, date, status])
  @@index([date, status])
}
```

- [ ] **Step 2: Add Prisma client helper**

```ts
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Add local database env**

Create `.env`:

```bash
DATABASE_URL="file:./dev.db"
```

Add to `.gitignore`:

```gitignore
.next
prisma/*.db
prisma/*.db-journal
test-results
playwright-report
```

- [ ] **Step 4: Verify migration**

Run:

```bash
npm run db:generate
npm run db:migrate -- --name init
```

Expected: Prisma client generates and SQLite migration succeeds.

## Task 3: Import Office Assets

**Files:**
- Create: `src/features/offices/office-schema.ts`
- Create: `src/features/offices/import-offices.ts`
- Create: `scripts/copy-office-assets.mjs`
- Create: `prisma/seed.ts`
- Create: `tests/features/offices/import-offices.test.ts`

- [ ] **Step 1: Write import test**

```ts
// tests/features/offices/import-offices.test.ts
import { describe, expect, it } from "vitest";
import { loadOfficeSources } from "../../../src/features/offices/import-offices";

describe("loadOfficeSources", () => {
  it("loads the five complete offices and excludes Bologna", async () => {
    const offices = await loadOfficeSources();
    expect(offices.map((office) => office.code).sort()).toEqual(["cs", "fi", "mi", "rm", "to"]);
    expect(offices.reduce((sum, office) => sum + office.seatCount, 0)).toBe(82);
  });
});
```

- [ ] **Step 2: Implement office source loader**

```ts
// src/features/offices/import-offices.ts
import Ajv from "ajv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import schema from "../../../docs/requests/schemas/office-schema.json";

export type OfficeSource = {
  code: string;
  name: string;
  location: string;
  sourceDir: string;
  seatCount: number;
  floors: Array<{
    floor_num: number;
    floor_name: string;
    floor_map: string;
    desks: Array<{
      desk_num: number;
      desk_name: string;
      seats: Array<{ seat_num: number }>;
    }>;
  }>;
};

const OFFICE_FILES = [
  ["mi", "docs/requests/samples/uffici/mi/ufficio-milano.json"],
  ["cs", "docs/requests/samples/uffici/cs/ufficio-cs.json"],
  ["fi", "docs/requests/samples/uffici/fi/ufficio-fi.json"],
  ["rm", "docs/requests/samples/uffici/rm/ufficio-roma.json"],
  ["to", "docs/requests/samples/uffici/to/ufficio-to.json"],
] as const;

export async function loadOfficeSources(): Promise<OfficeSource[]> {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  const offices = await Promise.all(
    OFFICE_FILES.map(async ([code, filePath]) => {
      const absolutePath = path.join(process.cwd(), filePath);
      const parsed = JSON.parse(await readFile(absolutePath, "utf8"));

      if (!validate(parsed)) {
        throw new Error(`Invalid office JSON for ${code}: ${ajv.errorsText(validate.errors)}`);
      }

      const seatCount = parsed.floors.reduce(
        (floorSum: number, floor: OfficeSource["floors"][number]) =>
          floorSum + floor.desks.reduce((deskSum, desk) => deskSum + desk.seats.length, 0),
        0,
      );

      return {
        code,
        ...parsed,
        sourceDir: path.dirname(absolutePath),
        seatCount,
      };
    }),
  );

  return offices;
}
```

- [ ] **Step 3: Seed offices and dev user**

Implement `prisma/seed.ts` to upsert offices, floors, desks, seats, and `dev.user@example.com` assigned to Milano. Run:

```bash
npm run assets:offices
npm run db:seed
```

Expected: database contains 5 offices and 82 seats.

## Task 4: Booking Domain Rules

**Files:**
- Create: `src/features/booking/date-rules.ts`
- Create: `tests/features/booking/date-rules.test.ts`

- [ ] **Step 1: Write tests**

Cover tomorrow, today rejection, weekend rejection, and 21-day horizon:

```ts
import { describe, expect, it } from "vitest";
import { getBookableDates, isBookableDate } from "../../../src/features/booking/date-rules";

const base = new Date("2026-04-24T12:00:00.000Z");

describe("date rules", () => {
  it("rejects today and accepts the next weekday", () => {
    expect(isBookableDate(new Date("2026-04-24T00:00:00.000Z"), base)).toBe(false);
    expect(isBookableDate(new Date("2026-04-27T00:00:00.000Z"), base)).toBe(true);
  });

  it("rejects weekends", () => {
    expect(isBookableDate(new Date("2026-04-25T00:00:00.000Z"), base)).toBe(false);
  });

  it("rejects dates beyond 21 calendar days", () => {
    expect(isBookableDate(new Date("2026-05-16T00:00:00.000Z"), base)).toBe(false);
  });

  it("returns only weekdays in the booking horizon", () => {
    expect(getBookableDates(base)).toHaveLength(15);
  });
});
```

- [ ] **Step 2: Implement date rules**

Create pure functions that normalize dates to UTC midnight, compare against `baseDate`, exclude Saturdays/Sundays, and enforce `baseDate + 1` through `baseDate + 21`.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- tests/features/booking/date-rules.test.ts
```

Expected: all date rule tests pass.

## Task 5: Availability And Booking Service

**Files:**
- Create: `src/features/booking/availability.ts`
- Create: `src/features/booking/booking-service.ts`
- Create: `tests/features/booking/booking-service.test.ts`

- [ ] **Step 1: Write booking tests**

Add tests for:

- manual booking creates active reservations;
- same user cannot book two seats on the same date;
- same seat cannot be double-booked on the same date;
- cancelling a future reservation frees the seat;
- auto-assign chooses lowest floor, desk, then seat;
- range booking returns booked and skipped dates.

- [ ] **Step 2: Implement availability query**

`getSeatAvailability({ officeId, dates })` should return each seat with floor, desk, seat number, floor map, and per-date status.

- [ ] **Step 3: Implement booking service**

Expose:

```ts
type BookingResult = {
  booked: Array<{ date: string; reservationId: string }>;
  skipped: Array<{ date: string; reason: string }>;
};

export async function bookSelectedSeat(input: {
  userId: string;
  officeId: string;
  seatId: string;
  dates: Date[];
}): Promise<BookingResult>;

export async function autoAssignAndBook(input: {
  userId: string;
  officeId: string;
  dates: Date[];
}): Promise<BookingResult>;

export async function cancelReservation(input: {
  userId: string;
  reservationId: string;
  now?: Date;
}): Promise<void>;
```

Catch Prisma unique constraint failures and convert them to skipped dates with `"Seat no longer available"` or `"You already have a reservation for this date"`.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- tests/features/booking/booking-service.test.ts
```

Expected: all booking behavior tests pass.

## Task 6: Dashboard Service

**Files:**
- Create: `src/features/dashboard/dashboard-service.ts`
- Create: `tests/features/dashboard/dashboard-service.test.ts`

- [ ] **Step 1: Write dashboard tests**

Verify upcoming reservations sorted ascending, today occupancy percentage, next bookable weekday occupancy, and history counts for 1, 3, and 6 months excluding cancelled reservations.

- [ ] **Step 2: Implement dashboard aggregation**

Expose:

```ts
export async function getUserDashboard(userId: string, now = new Date()) {
  return {
    user: {},
    assignedOffice: {},
    upcomingReservations: [],
    occupancyToday: 0,
    occupancyNextBookableDay: 0,
    historyCounts: { oneMonth: 0, threeMonths: 0, sixMonths: 0 },
  };
}
```

Use concrete typed objects in implementation rather than empty example objects.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- tests/features/dashboard/dashboard-service.test.ts
```

Expected: all dashboard service tests pass.

## Task 7: Stitch Design Pass

**Files:**
- Read: `docs/design/design-brief.md`
- Read: `docs/design/superpowers/prompt.md`
- Read: `docs/design/stitch/handoff.md`
- Create: `docs/design/exports/`

- [ ] **Step 1: Run Stitch before final UI**

Use Stitch with the existing brief and assets to produce implementation-friendly dashboard and wizard direction. Save outputs under:

```text
docs/design/exports/
```

- [ ] **Step 2: Extract tokens**

Capture colors, typography, spacing, radius, focus rings, badges, table states, and modal guidance in:

```text
docs/design/exports/tokens.md
```

- [ ] **Step 3: Apply tokens**

Update Tailwind and CSS variables after the export exists. Keep the MVP UI functional if Stitch is temporarily unavailable, but do not call the frontend final until the Stitch pass is applied.

## Task 8: User Dashboard UI

**Files:**
- Create: `src/features/dashboard/components/user-dashboard.tsx`
- Create: `src/app/dashboard/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/reservations/actions.ts`

- [ ] **Step 1: Build server page**

`src/app/dashboard/page.tsx` loads the dev user dashboard and renders `AppShell`.

- [ ] **Step 2: Build dashboard component**

Render:

- Book a Spot action linking to `/book`;
- upcoming reservations table;
- cancel action for future reservations;
- occupancy today;
- next bookable weekday occupancy;
- 1/3/6 month history counters;
- useful empty state when no upcoming reservations exist.

- [ ] **Step 3: Verify page**

Run:

```bash
npm run build
```

Expected: dashboard builds without TypeScript errors.

## Task 9: Booking Wizard UI

**Files:**
- Create: `src/features/booking/components/booking-wizard.tsx`
- Create: `src/features/booking/components/date-step.tsx`
- Create: `src/features/booking/components/seat-step.tsx`
- Create: `src/app/book/page.tsx`
- Modify: `src/app/reservations/actions.ts`

- [ ] **Step 1: Build date step**

Show assigned office read-only, mode toggle for single date/range, date inputs constrained by domain validation, and a Next action.

- [ ] **Step 2: Build seat step**

Show floor plan image reference, seat availability table, selected seat state, Auto-assign action, Confirm Reservation action, and no-seats state.

- [ ] **Step 3: Build confirmation state**

After booking, show office, dates, floor, desk, seat, booked dates, and skipped dates with reasons.

- [ ] **Step 4: Verify page**

Run:

```bash
npm run build
```

Expected: booking wizard builds without TypeScript errors.

## Task 10: End-To-End Booking Flow

**Files:**
- Create: `tests/e2e/booking-flow.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Write E2E test**

Test dashboard to booking confirmation:

- open `/dashboard`;
- click Book a Spot;
- choose the next bookable date;
- select the first available seat or auto-assign;
- confirm reservation;
- return to dashboard;
- assert upcoming reservation appears.

- [ ] **Step 2: Run E2E**

Run:

```bash
npm run test:e2e
```

Expected: booking flow passes in Chromium.

## Task 11: Final Verification

**Files:**
- All MVP files

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run assets:offices
npm run db:generate
npm run db:migrate -- --name verify
npm run db:seed
npm test
npm run build
npm run test:e2e
```

Expected: assets copied, database seeded, unit tests pass, production build passes, and E2E booking flow passes.

- [ ] **Step 2: Document MVP runbook**

Create `docs/mvp-runbook.md` with:

- setup commands;
- seed commands;
- how to run the app;
- known MVP exclusions;
- how Stitch exports map to frontend tokens.

## Plan Self Review

- The plan covers scaffold, import offices, booking, dashboard, wizard, Stitch gate, and verification.
- The plan intentionally excludes final-product enterprise features and places them in the roadmap spec.
- File paths are concrete and aligned with a Next.js App Router project.
- Tests are assigned before implementation tasks for core domain logic.
- No active office depends on missing Bologna source data.
- The Prisma uniqueness model may need refinement during implementation because SQLite cannot express partial unique indexes directly through Prisma; the MVP compensates by using `status` in the unique constraints and server-side cancellation semantics.
