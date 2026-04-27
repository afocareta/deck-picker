# Availability Closures Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement range-based office closures and resource blocks with impact preview, transactional cancellation, audit logging, removal, and booking enforcement.

**Architecture:** Convert closure/block persistence from single-day records to inclusive UTC date ranges. Keep booking availability authoritative in server services, and expose admin operations through explicit preview and confirm server actions. Reuse the existing admin dashboard page and Vitest/Playwright test structure.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, SQLite, Vitest, Playwright, TypeScript.

---

## File Structure

- Modify `prisma/schema.prisma`: add `startDate`/`endDate` fields, replace single-day closure/block indexes, and extend `AuditAction`.
- Modify `prisma/migrations/20260427120000_closure_resource_ranges/migration.sql`: migrate existing `date` values to one-day ranges.
- Modify `src/features/booking/availability.ts`: query closures/blocks by overlap and evaluate block hierarchy per date.
- Modify `src/features/booking/booking-service.ts`: make server-side booking conflict checks range-aware.
- Modify `src/features/admin/admin-service.ts`: add date-range validation, impact preview, confirmation, removal, cancellation, audit logging, and range-shaped dashboard output.
- Modify `src/app/admin/actions.ts`: parse start/end dates, route preview/confirm/remove actions, and revalidate affected pages.
- Modify `src/features/admin/components/admin-control-room.tsx`: replace single-date forms with range forms, office-filtered resource targets, preview tables, confirm buttons, and removal controls.
- Modify `tests/features/booking/booking-service.test.ts`: add range closure and hierarchy coverage.
- Modify `tests/features/admin/admin-service.test.ts`: add range checks, preview, confirmation, removal, and target filtering coverage.
- Modify `tests/features/admin/admin-audit.test.ts`: add audit coverage for closure/block create/remove and forced cancellations.
- Modify `tests/e2e/admin-resource-block.spec.ts`: update resource block flow for preview/confirm range behavior.
- Add `tests/e2e/admin-office-closure.spec.ts`: cover closure preview/confirmation and booking rejection.

## Task 1: Schema And Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/20260427120000_closure_resource_ranges/migration.sql`

- [ ] **Step 1: Write the schema migration expectation**

Run before editing schema to capture current state:

```bash
npm run db:generate
```

Expected: PASS, confirming the current Prisma schema is valid before the range migration.

- [ ] **Step 2: Update Prisma models**

In `prisma/schema.prisma`, update `AuditAction`, `OfficeClosure`, and `ResourceBlock` to:

```prisma
enum AuditAction {
  USER_UPDATED
  RESERVATION_CANCELLED
  OFFICE_CLOSURE_CREATED
  OFFICE_CLOSURE_REMOVED
  RESOURCE_BLOCK_CREATED
  RESOURCE_BLOCK_REMOVED
}

model OfficeClosure {
  id        String   @id @default(cuid())
  officeId  String
  office    Office   @relation(fields: [officeId], references: [id], onDelete: Cascade)
  startDate DateTime
  endDate   DateTime
  reason    String
  createdAt DateTime @default(now())

  @@index([officeId, startDate, endDate])
  @@index([startDate, endDate])
}

model ResourceBlock {
  id        String            @id @default(cuid())
  officeId  String
  office    Office            @relation(fields: [officeId], references: [id], onDelete: Cascade)
  blockType ResourceBlockType
  floorId   String?
  floor     Floor?            @relation(fields: [floorId], references: [id], onDelete: Cascade)
  deskId    String?
  desk      Desk?             @relation(fields: [deskId], references: [id], onDelete: Cascade)
  seatId    String?
  seat      Seat?             @relation(fields: [seatId], references: [id], onDelete: Cascade)
  startDate DateTime
  endDate   DateTime
  reason    String
  createdAt DateTime          @default(now())

  @@index([officeId, startDate, endDate])
  @@index([floorId, startDate, endDate])
  @@index([deskId, startDate, endDate])
  @@index([seatId, startDate, endDate])
}
```

- [ ] **Step 3: Add migration SQL**

Ensure `prisma/migrations/20260427120000_closure_resource_ranges/migration.sql` contains:

```sql
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_OfficeClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeClosure_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OfficeClosure" ("createdAt", "endDate", "id", "officeId", "reason", "startDate")
SELECT "createdAt", "date", "id", "officeId", "reason", "date" FROM "OfficeClosure";
DROP TABLE "OfficeClosure";
ALTER TABLE "new_OfficeClosure" RENAME TO "OfficeClosure";
CREATE INDEX "OfficeClosure_officeId_startDate_endDate_idx" ON "OfficeClosure"("officeId", "startDate", "endDate");
CREATE INDEX "OfficeClosure_startDate_endDate_idx" ON "OfficeClosure"("startDate", "endDate");

CREATE TABLE "new_ResourceBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "floorId" TEXT,
    "deskId" TEXT,
    "seatId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceBlock_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_deskId_fkey" FOREIGN KEY ("deskId") REFERENCES "Desk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ResourceBlock" ("blockType", "createdAt", "deskId", "endDate", "floorId", "id", "officeId", "reason", "seatId", "startDate")
SELECT "blockType", "createdAt", "deskId", "date", "floorId", "id", "officeId", "reason", "seatId", "date" FROM "ResourceBlock";
DROP TABLE "ResourceBlock";
ALTER TABLE "new_ResourceBlock" RENAME TO "ResourceBlock";
CREATE INDEX "ResourceBlock_officeId_startDate_endDate_idx" ON "ResourceBlock"("officeId", "startDate", "endDate");
CREATE INDEX "ResourceBlock_floorId_startDate_endDate_idx" ON "ResourceBlock"("floorId", "startDate", "endDate");
CREATE INDEX "ResourceBlock_deskId_startDate_endDate_idx" ON "ResourceBlock"("deskId", "startDate", "endDate");
CREATE INDEX "ResourceBlock_seatId_startDate_endDate_idx" ON "ResourceBlock"("seatId", "startDate", "endDate");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
```

- [ ] **Step 4: Verify schema**

Run:

```bash
npm run db:generate
```

Expected: PASS with Prisma client generated for `startDate` and `endDate`.

## Task 2: Booking Range Enforcement

**Files:**
- Modify: `tests/features/booking/booking-service.test.ts`
- Modify: `src/features/booking/availability.ts`
- Modify: `src/features/booking/booking-service.ts`

- [ ] **Step 1: Write failing availability and booking tests**

Update existing closure/block fixture creates to use `startDate` and `endDate`. Add tests:

```ts
test("office closure range blocks availability and booking on every weekday in range", async () => {
  const { office, seats } = await createOfficeFixture("office-closure-range");
  const user = await createUser("office-closure-range-user", office.id);
  const [firstDate, secondDate, thirdDate] = bookableDates(3);

  await prisma.officeClosure.create({
    data: {
      officeId: office.id,
      startDate: firstDate,
      endDate: thirdDate,
      reason: "Company holiday",
    },
  });

  const availability = await getSeatAvailability({ officeId: office.id, dates: [firstDate, secondDate, thirdDate] });
  expect(availability.every((seat) => seat.dates[isoDate(firstDate)] === "blocked")).toBe(true);
  expect(availability.every((seat) => seat.dates[isoDate(secondDate)] === "blocked")).toBe(true);
  expect(availability.every((seat) => seat.dates[isoDate(thirdDate)] === "blocked")).toBe(true);

  const result = await bookSelectedSeat({
    userId: user.id,
    officeId: office.id,
    seatId: seats[0].id,
    dates: [firstDate, secondDate, thirdDate],
  });

  expect(result.booked).toEqual([]);
  expect(result.skipped).toEqual([
    { date: isoDate(firstDate), reason: "Office closed" },
    { date: isoDate(secondDate), reason: "Office closed" },
    { date: isoDate(thirdDate), reason: "Office closed" },
  ]);
});

test("resource block ranges apply to office floor desk and seat hierarchy", async () => {
  const { office, seats } = await createOfficeFixture("hierarchy-range");
  const [date] = bookableDates(1);
  const blockedSeat = await prisma.seat.findUniqueOrThrow({
    where: { id: seats[0].id },
    include: { desk: { include: { floor: true } } },
  });

  await prisma.resourceBlock.create({
    data: {
      officeId: office.id,
      blockType: "DESK",
      deskId: blockedSeat.deskId,
      startDate: date,
      endDate: date,
      reason: "Desk maintenance",
    },
  });

  const availability = await getSeatAvailability({ officeId: office.id, dates: [date] });
  expect(availability.find((seat) => seat.seatId === seats[0].id)?.dates[isoDate(date)]).toBe("blocked");
  expect(availability.find((seat) => seat.seatId === seats[3].id)?.dates[isoDate(date)]).toBe("available");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- tests/features/booking/booking-service.test.ts
```

Expected: FAIL because Prisma no longer accepts `date` or because production queries still reference `date`.

- [ ] **Step 3: Implement range overlap in availability**

In `src/features/booking/availability.ts`, replace closure/block queries with:

```ts
const rangeWhere = {
  startDate: { lte: normalizedDates.at(-1) },
  endDate: { gte: normalizedDates[0] },
};

const closures = await prisma.officeClosure.findMany({
  where: { officeId, ...rangeWhere },
  select: { startDate: true, endDate: true },
});

function rangeContainsDate(startDate: Date, endDate: Date, dateKey: string) {
  const date = normalizeDate(new Date(`${dateKey}T00:00:00.000Z`));
  return normalizeDate(startDate) <= date && normalizeDate(endDate) >= date;
}
```

Use `rangeContainsDate` instead of matching `block.date`.

- [ ] **Step 4: Implement range conflict checks in booking service**

In `findConflict`, replace exact `date` filters with:

```ts
const rangeDateFilter = {
  startDate: { lte: date },
  endDate: { gte: date },
};
```

Apply it to both `officeClosure.findFirst` and `resourceBlock.findFirst`.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- tests/features/booking/booking-service.test.ts
```

Expected: PASS.

## Task 3: Admin Service Preview Confirm Remove

**Files:**
- Modify: `tests/features/admin/admin-service.test.ts`
- Modify: `tests/features/admin/admin-audit.test.ts`
- Modify: `src/features/admin/admin-service.ts`

- [ ] **Step 1: Write failing service tests**

Add tests for invalid range, weekend range, preview, confirmation, audit logs, and removal. The desired API:

```ts
const preview = await previewOfficeClosureImpact({
  officeId: office.id,
  startDate: tomorrow,
  endDate: nextWeekday,
  reason: "Maintenance",
  now: new Date(),
});

await confirmOfficeClosure({
  actorUserId: actor.id,
  officeId: office.id,
  startDate: tomorrow,
  endDate: nextWeekday,
  reason: "Maintenance",
  now: new Date(),
});

await removeOfficeClosure({
  actorUserId: actor.id,
  closureId,
  now: new Date(),
});
```

Expected assertions:

```ts
expect(preview.affectedReservations).toContainEqual(expect.objectContaining({
  userEmail: user.email,
  date: isoDate(tomorrow),
  officeName: office.name,
}));
expect(await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).toMatchObject({
  status: "CANCELLED",
  cancelledAt: expect.any(Date),
});
await expect(removeOfficeClosure({ actorUserId: actor.id, closureId, now: new Date() })).resolves.toBeUndefined();
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- tests/features/admin/admin-service.test.ts tests/features/admin/admin-audit.test.ts
```

Expected: FAIL with missing exported functions and old `date` field references.

- [ ] **Step 3: Add validation helpers**

In `admin-service.ts`, add:

```ts
function validateFutureWeekdayRange(input: { startDate: Date; endDate: Date; now?: Date }) {
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  const today = normalizeDate(input.now ?? new Date());

  if (startDate > endDate || startDate <= today) {
    throw new Error("Invalid date range");
  }

  for (let cursor = startDate; cursor <= endDate; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const day = cursor.getUTCDay();
    if (day === 0 || day === 6) {
      throw new Error("Closing days can only be set for weekdays");
    }
  }

  return { startDate, endDate };
}
```

- [ ] **Step 4: Add shared impact query**

Add a helper that finds active future reservations inside the date range and selected office/resource hierarchy. It should return reservation id, user id/name/email, date key, office/floor/desk/seat labels, and seat ids.

- [ ] **Step 5: Implement preview and confirm functions**

Export:

```ts
previewOfficeClosureImpact(input)
previewResourceBlockImpact(input)
confirmOfficeClosure(input)
confirmResourceBlock(input)
removeOfficeClosure(input)
removeResourceBlock(input)
```

Confirmation must run in `prisma.$transaction`, create the period, cancel affected active reservations with `cancelledAt`, and create audit logs for period creation plus each forced reservation cancellation.

- [ ] **Step 6: Update dashboard range output**

Change `AdminDashboard["closures"]` and `["resourceBlocks"]` from `date` to `startDate`/`endDate`. Query future periods with `endDate: { gt: today }`, and sort by `startDate`.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
npm test -- tests/features/admin/admin-service.test.ts tests/features/admin/admin-audit.test.ts
```

Expected: PASS.

## Task 4: Server Actions And Admin UI

**Files:**
- Modify: `src/app/admin/actions.ts`
- Modify: `src/features/admin/components/admin-control-room.tsx`

- [ ] **Step 1: Update server actions**

Replace create-only actions with preview/confirm/remove actions:

```ts
export async function previewOfficeClosureAction(formData: FormData) { ... }
export async function confirmOfficeClosureAction(formData: FormData) { ... }
export async function removeOfficeClosureAction(formData: FormData) { ... }
export async function previewResourceBlockAction(formData: FormData) { ... }
export async function confirmResourceBlockAction(formData: FormData) { ... }
export async function removeResourceBlockAction(formData: FormData) { ... }
```

Each action parses `startDate`, `endDate`, `officeId`, `reason`, and target fields. Preview redirects to `/admin?tab=availability&preview=...` with a compact JSON payload or stores the preview as URL search params if small. Confirm revalidates `/admin`, `/dashboard`, `/book`, and `/search`.

- [ ] **Step 2: Update resource target filtering**

In `AdminControlRoom`, track selected office for the resource block form:

```ts
const [resourceOfficeId, setResourceOfficeId] = useState(dashboard.offices[0]?.id ?? "");
const resourceBlockTargets =
  resourceBlockType === "OFFICE"
    ? []
    : dashboard.resourceTargets.filter((target) => target.type === resourceBlockType && target.officeId === resourceOfficeId);
```

- [ ] **Step 3: Replace date inputs with start/end inputs**

Both forms must submit:

```tsx
<input name="startDate" type="date" required />
<input name="endDate" type="date" required />
```

The primary form button becomes `Preview Impact`. Preview state renders a table of affected reservations plus a confirm button. Empty preview renders `No active reservations affected` and still shows confirm.

- [ ] **Step 4: Add removal controls**

For upcoming closures and resource blocks, show `formatDate(startDate)` and `formatDate(endDate)`. Add a remove form per row with `ConfirmSubmitButton` and the matching remove action.

- [ ] **Step 5: Verify TypeScript and lint**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

## Task 5: E2E Coverage

**Files:**
- Modify: `tests/e2e/admin-resource-block.spec.ts`
- Add: `tests/e2e/admin-office-closure.spec.ts`

- [ ] **Step 1: Update resource block E2E**

Change the existing test to fill start/end dates, click `Preview Impact`, confirm, and assert the resulting range appears in upcoming resource blocks.

- [ ] **Step 2: Add office closure E2E**

Create a test that signs in as admin, opens `/admin?tab=availability`, fills office closure start/end/reason, previews, confirms, then signs in as a normal dev user and verifies a blocked date cannot be booked.

- [ ] **Step 3: Verify E2E**

Run:

```bash
npm run test:e2e -- tests/e2e/admin-resource-block.spec.ts tests/e2e/admin-office-closure.spec.ts
```

Expected: PASS.

## Task 6: Full Verification And Commit

**Files:**
- Verify all modified files

- [ ] **Step 1: Run focused test suite**

Run:

```bash
npm test -- tests/features/booking/booking-service.test.ts tests/features/admin/admin-service.test.ts tests/features/admin/admin-audit.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full project checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git diff --stat
git diff -- prisma/schema.prisma src/features/booking/availability.ts src/features/booking/booking-service.ts src/features/admin/admin-service.ts src/app/admin/actions.ts src/features/admin/components/admin-control-room.tsx
```

Expected: only range availability changes and tests are present.

- [ ] **Step 4: Commit**

Run:

```bash
git add prisma/schema.prisma prisma/migrations/20260427120000_closure_resource_ranges/migration.sql src/features/booking/availability.ts src/features/booking/booking-service.ts src/features/admin/admin-service.ts src/app/admin/actions.ts src/features/admin/components/admin-control-room.tsx tests/features/booking/booking-service.test.ts tests/features/admin/admin-service.test.ts tests/features/admin/admin-audit.test.ts tests/e2e/admin-resource-block.spec.ts tests/e2e/admin-office-closure.spec.ts
git commit -m "Implement availability ranges"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: schema range fields, validation, target ownership, preview, confirmation, cancellation, audit logs, removal, booking availability, booking submission, UI resource filtering, and E2E coverage are all mapped to tasks.
- Scope intentionally excludes email, Google Calendar, retry queues, import preview, CSV audit export, GDPR, deployment, and observability.
- Placeholder scan: no unresolved markers or undefined follow-up placeholders remain.
- Type consistency: service APIs use `startDate`/`endDate`, `confirm*` for transactional writes, `preview*` for read-only impact, and `remove*` for future-period deletion.
