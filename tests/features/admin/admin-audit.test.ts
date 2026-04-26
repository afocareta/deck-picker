import { afterAll, beforeEach, describe, expect, test } from "vitest";

import {
  cancelReservationAsAdmin,
  getAdminDashboard,
  updateUserAdminFields,
} from "../../../src/features/admin/admin-service";
import { normalizeDate } from "../../../src/features/booking/date-rules";
import { prisma } from "../../../src/lib/prisma";

const TEST_PREFIX = "admin-audit-test";

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
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await prisma.office.deleteMany({ where: { id: { in: offices.map((office) => office.id) } } });
}

async function createOfficeFixture(name: string) {
  const office = await prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `Audit ${name}`,
      location: "Test location",
      floors: {
        create: {
          floorNum: 1,
          floorName: "Audit floor",
          floorMap: "/offices/test/audit.webp",
          desks: {
            create: {
              deskNum: 1,
              deskName: "Audit desk",
              seats: { create: [{ seatNum: 1 }] },
            },
          },
        },
      },
    },
  });
  const seat = await prisma.seat.findFirstOrThrow({
    where: { desk: { floor: { officeId: office.id } } },
  });

  return { office, seat };
}

async function createUser(name: string, officeId: string, role: "USER" | "ADMIN" = "USER") {
  return prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${name}@example.com`,
      name: `Audit ${name}`,
      role,
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

describe("admin audit log", () => {
  test("records user admin updates and exposes them in admin dashboard", async () => {
    const first = await createOfficeFixture("first");
    const second = await createOfficeFixture("second");
    const actor = await createUser("actor", first.office.id, "ADMIN");
    const target = await createUser("target", first.office.id);

    await updateUserAdminFields({
      actorUserId: actor.id,
      userId: target.id,
      role: "ADMIN",
      assignedOfficeId: second.office.id,
    });

    const dashboard = await getAdminDashboard();

    expect(dashboard.auditLogs[0]).toMatchObject({
      action: "USER_UPDATED",
      actorEmail: actor.email,
      targetUserEmail: target.email,
      details: expect.stringContaining("role"),
    });
  });

  test("records admin reservation cancellation", async () => {
    const { office, seat } = await createOfficeFixture("cancel");
    const actor = await createUser("cancel-actor", office.id, "ADMIN");
    const target = await createUser("cancel-target", office.id);
    const reservation = await prisma.reservation.create({
      data: {
        userId: target.id,
        seatId: seat.id,
        date: addUtcDays(new Date(), 1),
        status: "ACTIVE",
      },
    });

    await cancelReservationAsAdmin({
      actorUserId: actor.id,
      reservationId: reservation.id,
      now: new Date(),
    });

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { reservationId: reservation.id },
      include: { actorUser: true, targetUser: true },
    });

    expect(log).toMatchObject({
      action: "RESERVATION_CANCELLED",
      actorUserId: actor.id,
      targetUserId: target.id,
    });
  });
});
