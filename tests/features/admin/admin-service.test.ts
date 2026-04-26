import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { normalizeDate } from "../../../src/features/booking/date-rules";
import {
  cancelReservationAsAdmin,
  getAdminDashboard,
  updateUserAdminFields,
} from "../../../src/features/admin/admin-service";
import { prisma } from "../../../src/lib/prisma";

const TEST_PREFIX = "admin-v1-test";

function addUtcDays(date: Date, days: number) {
  return new Date(normalizeDate(date).getTime() + days * 24 * 60 * 60 * 1000);
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

  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { userId: { in: users.map((user) => user.id) } },
        { seat: { desk: { floor: { officeId: { in: offices.map((office) => office.id) } } } } },
      ],
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: users.map((user) => user.id) } },
        { targetUserId: { in: users.map((user) => user.id) } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await prisma.office.deleteMany({ where: { id: { in: offices.map((office) => office.id) } } });
}

async function createOfficeFixture(name: string) {
  const office = await prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `Admin ${name}`,
      location: "Test location",
      floors: {
        create: {
          floorNum: 1,
          floorName: "Ops floor",
          floorMap: "/offices/test/floor.webp",
          desks: {
            create: {
              deskNum: 1,
              deskName: "Ops desk",
              seats: { create: [{ seatNum: 1 }, { seatNum: 2 }] },
            },
          },
        },
      },
    },
  });
  const seats = await prisma.seat.findMany({
    where: { desk: { floor: { officeId: office.id } } },
    orderBy: { seatNum: "asc" },
  });

  return { office, seats };
}

async function createUser(name: string, officeId: string) {
  return prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${name}@example.com`,
      name: `Admin ${name}`,
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

describe("admin service", () => {
  test("returns admin overview, users, offices, and future reservations", async () => {
    const { office, seats } = await createOfficeFixture("overview");
    const user = await createUser("overview-user", office.id);
    const tomorrow = addUtcDays(new Date(), 1);

    await prisma.reservation.create({
      data: {
        userId: user.id,
        seatId: seats[0].id,
        date: tomorrow,
        status: "ACTIVE",
      },
    });

    const dashboard = await getAdminDashboard({ officeId: office.id, now: new Date() });

    expect(dashboard.summary.futureReservations).toBeGreaterThanOrEqual(1);
    expect(dashboard.offices).toContainEqual(expect.objectContaining({ id: office.id, code: office.code }));
    expect(dashboard.users).toContainEqual(
      expect.objectContaining({ id: user.id, email: user.email, assignedOfficeCode: office.code }),
    );
    expect(dashboard.reservations).toContainEqual(
      expect.objectContaining({
        userEmail: user.email,
        officeName: office.name,
        seatNum: 1,
      }),
    );
  });

  test("updates user role and assigned office", async () => {
    const first = await createOfficeFixture("first");
    const second = await createOfficeFixture("second");
    const user = await createUser("update-user", first.office.id);

    const updated = await updateUserAdminFields({
      userId: user.id,
      role: "ADMIN",
      assignedOfficeId: second.office.id,
    });

    expect(updated.role).toBe("ADMIN");
    expect(updated.assignedOfficeId).toBe(second.office.id);
  });

  test("prevents an admin from removing their own admin role", async () => {
    const { office } = await createOfficeFixture("self-demotion");
    const admin = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-self-admin@example.com`,
        name: "Self Admin",
        role: "ADMIN",
        assignedOfficeId: office.id,
      },
    });

    await expect(
      updateUserAdminFields({
        actorUserId: admin.id,
        userId: admin.id,
        role: "USER",
        assignedOfficeId: office.id,
      }),
    ).rejects.toThrow("Admins cannot remove their own admin role");
  });

  test("blocks office changes while user has future reservations in another office", async () => {
    const first = await createOfficeFixture("office-policy-first");
    const second = await createOfficeFixture("office-policy-second");
    const user = await createUser("office-policy-user", first.office.id);

    await prisma.reservation.create({
      data: {
        userId: user.id,
        seatId: first.seats[0].id,
        date: addUtcDays(new Date(), 1),
        status: "ACTIVE",
      },
    });

    await expect(
      updateUserAdminFields({
        userId: user.id,
        role: "USER",
        assignedOfficeId: second.office.id,
      }),
    ).rejects.toThrow("Cancel future reservations before changing office");
  });

  test("admin can cancel another user's future reservation", async () => {
    const { office, seats } = await createOfficeFixture("cancel");
    const user = await createUser("cancel-user", office.id);
    const tomorrow = addUtcDays(new Date(), 1);
    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        seatId: seats[0].id,
        date: tomorrow,
        status: "ACTIVE",
      },
    });

    await cancelReservationAsAdmin({ reservationId: reservation.id, now: new Date() });

    await expect(
      prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } }),
    ).resolves.toMatchObject({ status: "CANCELLED", cancelledAt: expect.any(Date) });
  });

  test("filters future reservations by office, date range, and user query", async () => {
    const first = await createOfficeFixture("filter-first");
    const second = await createOfficeFixture("filter-second");
    const firstUser = await createUser("filter-alpha", first.office.id);
    const otherFirstUser = await createUser("filter-gamma", first.office.id);
    const secondUser = await createUser("filter-beta", second.office.id);
    const tomorrow = addUtcDays(new Date(), 1);
    const nextWeek = addUtcDays(new Date(), 7);

    await prisma.reservation.create({
      data: {
        userId: firstUser.id,
        seatId: first.seats[0].id,
        date: tomorrow,
        status: "ACTIVE",
      },
    });
    await prisma.reservation.create({
      data: {
        userId: secondUser.id,
        seatId: second.seats[0].id,
        date: nextWeek,
        status: "ACTIVE",
      },
    });
    await prisma.reservation.create({
      data: {
        userId: otherFirstUser.id,
        seatId: first.seats[1].id,
        date: tomorrow,
        status: "ACTIVE",
      },
    });

    const dashboard = await getAdminDashboard({
      officeId: first.office.id,
      dateFrom: tomorrow,
      dateTo: tomorrow,
      userQuery: "alpha",
      now: new Date(),
    });

    expect(dashboard.reservations).toHaveLength(1);
    expect(dashboard.reservations[0]).toMatchObject({
      userEmail: firstUser.email,
      officeId: first.office.id,
    });
  });
});
