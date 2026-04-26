import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { toDateKey } from "../../../src/features/booking/availability";
import { getBookableDates } from "../../../src/features/booking/date-rules";
import { getUserDashboard } from "../../../src/features/dashboard/dashboard-service";
import { prisma } from "../../../src/lib/prisma";

const TEST_PREFIX = "task6-test";

type TestSeat = {
  id: string;
  floorName: string;
  floorNum: number;
  deskName: string;
  deskNum: number;
  seatNum: number;
};

const now = new Date("2026-04-24T12:00:00.000Z");
const today = new Date("2026-04-24T00:00:00.000Z");
const nextBookableDate = getBookableDates(now)[0];

function utcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function cleanupTestData() {
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const testOffices = await prisma.office.findMany({
    where: { code: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });

  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { userId: { in: testUsers.map((user) => user.id) } },
        { seat: { desk: { floor: { officeId: { in: testOffices.map((office) => office.id) } } } } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: testUsers.map((user) => user.id) } } });
  await prisma.office.deleteMany({ where: { id: { in: testOffices.map((office) => office.id) } } });
}

async function createDashboardFixture(name: string) {
  const office = await prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `Task 6 ${name}`,
      location: "Dashboard test location",
      floors: {
        create: [
          {
            floorNum: 1,
            floorName: "First floor",
            floorMap: "/offices/test/floor-1.webp",
            desks: {
              create: [
                {
                  deskNum: 1,
                  deskName: "F1-D1",
                  seats: { create: [{ seatNum: 1 }, { seatNum: 2 }] },
                },
              ],
            },
          },
          {
            floorNum: 2,
            floorName: "Second floor",
            floorMap: "/offices/test/floor-2.webp",
            desks: {
              create: [
                {
                  deskNum: 1,
                  deskName: "F2-D1",
                  seats: { create: [{ seatNum: 1 }, { seatNum: 2 }] },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const seats = await prisma.seat.findMany({
    where: { desk: { floor: { officeId: office.id } } },
    include: { desk: { include: { floor: true } } },
    orderBy: [
      { desk: { floor: { floorNum: "asc" } } },
      { desk: { deskNum: "asc" } },
      { seatNum: "asc" },
    ],
  });
  const user = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${name}@example.com`,
      name: `Task 6 ${name}`,
      role: "ADMIN",
      assignedOfficeId: office.id,
    },
  });

  return {
    office,
    user,
    seats: seats.map<TestSeat>((seat) => ({
      id: seat.id,
      floorName: seat.desk.floor.floorName,
      floorNum: seat.desk.floor.floorNum,
      deskName: seat.desk.deskName,
      deskNum: seat.desk.deskNum,
      seatNum: seat.seatNum,
    })),
  };
}

async function createUser(name: string, officeId: string) {
  return prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${name}@example.com`,
      name: `Task 6 ${name}`,
      assignedOfficeId: officeId,
    },
  });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("dashboard service", () => {
  test("returns user dashboard metrics and reservations for the assigned office", async () => {
    const { office, user, seats } = await createDashboardFixture("overview");
    const todayBlockerA = await createUser("overview-today-blocker-a", office.id);
    const todayBlockerB = await createUser("overview-today-blocker-b", office.id);
    const nextBookableBlocker = await createUser("overview-next-blocker", office.id);
    const futureLater = addUtcDays(nextBookableDate, 2);
    const pastInsideOneMonth = utcDate("2026-04-01");
    const pastInsideThreeMonths = utcDate("2026-03-01");
    const pastInsideSixMonths = utcDate("2025-12-24");
    const pastBeforeSixMonths = utcDate("2025-10-23");

    await prisma.reservation.createMany({
      data: [
        { userId: user.id, seatId: seats[2].id, date: futureLater, status: "ACTIVE" },
        { userId: user.id, seatId: seats[0].id, date: nextBookableDate, status: "ACTIVE" },
        { userId: user.id, seatId: seats[1].id, date: pastInsideOneMonth, status: "ACTIVE" },
        { userId: user.id, seatId: seats[1].id, date: pastInsideThreeMonths, status: "ACTIVE" },
        { userId: user.id, seatId: seats[1].id, date: pastInsideSixMonths, status: "ACTIVE" },
        { userId: user.id, seatId: seats[1].id, date: pastBeforeSixMonths, status: "ACTIVE" },
        { userId: user.id, seatId: seats[2].id, date: today, status: "ACTIVE" },
        { userId: user.id, seatId: seats[1].id, date: utcDate("2026-04-05"), status: "CANCELLED" },
        { userId: todayBlockerA.id, seatId: seats[0].id, date: today, status: "ACTIVE" },
        { userId: nextBookableBlocker.id, seatId: seats[1].id, date: nextBookableDate, status: "ACTIVE" },
      ],
    });

    const dashboard = await getUserDashboard(user.id, now);

    expect(dashboard.user).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "ADMIN",
    });
    expect(dashboard.assignedOffice).toEqual({
      id: office.id,
      code: office.code,
      name: office.name,
      location: office.location,
      seatCount: 4,
    });
    expect(dashboard.upcomingReservations).toEqual([
      {
        id: expect.any(String),
        date: toDateKey(nextBookableDate),
        officeName: office.name,
        floorName: seats[0].floorName,
        floorNum: seats[0].floorNum,
        deskName: seats[0].deskName,
        deskNum: seats[0].deskNum,
        seatNum: seats[0].seatNum,
      },
      {
        id: expect.any(String),
        date: toDateKey(futureLater),
        officeName: office.name,
        floorName: seats[2].floorName,
        floorNum: seats[2].floorNum,
        deskName: seats[2].deskName,
        deskNum: seats[2].deskNum,
        seatNum: seats[2].seatNum,
      },
    ]);
    expect(dashboard.occupancyToday).toBe(50);
    expect(dashboard.occupancyNextBookableDay).toBe(50);
    expect(dashboard.nextBookableDate).toBe(toDateKey(nextBookableDate));
    expect(dashboard.historyCounts).toEqual({
      oneMonth: 1,
      threeMonths: 2,
      sixMonths: 3,
    });
  });

  test("history month windows clamp safely at month end", async () => {
    const { user, seats } = await createDashboardFixture("month-end");
    const monthEndNow = new Date("2026-03-31T12:00:00.000Z");
    const insideOneMonth = utcDate("2026-02-28");
    const beforeOneMonth = utcDate("2026-02-27");

    await prisma.reservation.createMany({
      data: [
        { userId: user.id, seatId: seats[0].id, date: insideOneMonth, status: "ACTIVE" },
        { userId: user.id, seatId: seats[1].id, date: beforeOneMonth, status: "ACTIVE" },
      ],
    });

    const dashboard = await getUserDashboard(user.id, monthEndNow);

    expect(dashboard.historyCounts.oneMonth).toBe(1);
  });
});
