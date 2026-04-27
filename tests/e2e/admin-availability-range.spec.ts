import { execFileSync } from "node:child_process";

import { expect, test } from "playwright/test";

import { getBookableDates } from "../../src/features/booking/date-rules";
import { prisma } from "../../src/lib/prisma";

const TEST_PREFIX = "e2e-availability-range";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function cleanupTestData() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const offices = await prisma.office.findMany({
    where: { code: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });

  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: users.map((user) => user.id) } },
        { targetUserId: { in: users.map((user) => user.id) } },
      ],
    },
  });
  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { userId: { in: users.map((user) => user.id) } },
        { seat: { desk: { floor: { officeId: { in: offices.map((office) => office.id) } } } } },
      ],
    },
  });
  await prisma.resourceBlock.deleteMany({ where: { officeId: { in: offices.map((office) => office.id) } } });
  await prisma.officeClosure.deleteMany({ where: { officeId: { in: offices.map((office) => office.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await prisma.office.deleteMany({ where: { id: { in: offices.map((office) => office.id) } } });
}

async function createOfficeFixture(name: string) {
  const office = await prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `E2E Availability ${name}`,
      location: "E2E test location",
      floors: {
        create: {
          floorNum: 1,
          floorName: "E2E floor",
          floorMap: "/offices/test/e2e.webp",
          desks: {
            create: [
              {
                deskNum: 1,
                deskName: "E2E desk 1",
                seats: { create: { seatNum: 1 } },
              },
              {
                deskNum: 2,
                deskName: "E2E desk 2",
                seats: { create: { seatNum: 1 } },
              },
            ],
          },
        },
      },
    },
  });
  const seats = await prisma.seat.findMany({
    where: { desk: { floor: { officeId: office.id } } },
    include: { desk: true },
    orderBy: [{ desk: { deskNum: "asc" } }, { seatNum: "asc" }],
  });
  const user = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${name}@example.com`,
      name: `E2E Availability ${name}`,
      assignedOfficeId: office.id,
      officeSelectedAt: new Date(),
    },
  });

  return { office, seats, user };
}

test.beforeAll(() => {
  execFileSync("npm", ["run", "db:seed"], { stdio: "inherit" });
});

test.beforeEach(async () => {
  await cleanupTestData();
});

test.afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

test("previews and confirms an office closure range", async ({ page }) => {
  const { office, seats, user } = await createOfficeFixture("closure");
  const [date] = getBookableDates();
  const reservation = await prisma.reservation.create({
    data: { userId: user.id, seatId: seats[0].id, date, status: "ACTIVE" },
  });

  await page.goto("/auth/dev/admin");
  await page.goto("/admin?tab=availability");

  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: "Office Closure" }),
  });
  await form.locator('select[name="officeId"]').selectOption(office.id);
  await form.locator('input[name="startDate"]').fill(toDateKey(date));
  await form.locator('input[name="endDate"]').fill(toDateKey(date));
  await form.locator('input[name="reason"]').fill("E2E closure");
  await form.getByRole("button", { name: "Preview Impact" }).click();

  await expect(page.getByText("1 active reservations affected")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Closure" }).click();
  await expect(page.getByText("Office closure saved. 1 reservations cancelled.")).toBeVisible();

  await expect(prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).resolves.toMatchObject({
    status: "CANCELLED",
  });
});

test("previews and confirms a resource block range", async ({ page }) => {
  const { office, seats, user } = await createOfficeFixture("resource");
  const [date] = getBookableDates();
  const reservation = await prisma.reservation.create({
    data: { userId: user.id, seatId: seats[0].id, date, status: "ACTIVE" },
  });

  await page.goto("/auth/dev/admin");
  await page.goto("/admin?tab=availability");

  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: "Resource Block" }),
  });
  await form.locator('select[name="officeId"]').selectOption(office.id);
  await form.locator('select[name="blockType"]').selectOption("DESK");
  await form.locator('select[name="targetId"]').selectOption(seats[0].deskId);
  await form.locator('input[name="startDate"]').fill(toDateKey(date));
  await form.locator('input[name="endDate"]').fill(toDateKey(date));
  await form.locator('input[name="reason"]').fill("E2E desk block");
  await form.getByRole("button", { name: "Preview Impact" }).click();

  await expect(page.getByText("1 active reservations affected")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Block" }).click();
  await expect(page.getByText("Resource block saved. 1 reservations cancelled.")).toBeVisible();

  await expect(prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).resolves.toMatchObject({
    status: "CANCELLED",
  });
});
