import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { normalizeDate } from "../../../src/features/booking/date-rules";
import {
  cancelReservationAsAdmin,
  confirmOfficeClosure,
  confirmResourceBlock,
  getAdminDashboard,
  previewOfficeClosureImpact,
  previewResourceBlockImpact,
  removeOfficeClosure,
  updateUserAdminFields,
} from "../../../src/features/admin/admin-service";
import { getSeatAvailability, toDateKey } from "../../../src/features/booking/availability";
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
  await prisma.resourceBlock.deleteMany({ where: { officeId: { in: offices.map((office) => office.id) } } });
  await prisma.officeClosure.deleteMany({ where: { officeId: { in: offices.map((office) => office.id) } } });
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

  test("previews and confirms an office closure range by cancelling affected reservations", async () => {
    const { office, seats } = await createOfficeFixture("closure-confirm");
    const actor = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-closure-confirm-admin@example.com`,
        name: "Closure Admin",
        role: "ADMIN",
        assignedOfficeId: office.id,
      },
    });
    const firstUser = await createUser("closure-confirm-first", office.id);
    const secondUser = await createUser("closure-confirm-second", office.id);
    const firstDate = addUtcDays(new Date(), 1);
    const secondDate = addUtcDays(new Date(), 2);
    const outsideDate = addUtcDays(new Date(), 5);
    const firstReservation = await prisma.reservation.create({
      data: { userId: firstUser.id, seatId: seats[0].id, date: firstDate, status: "ACTIVE" },
    });
    const secondReservation = await prisma.reservation.create({
      data: { userId: secondUser.id, seatId: seats[1].id, date: secondDate, status: "ACTIVE" },
    });
    await prisma.reservation.create({
      data: { userId: secondUser.id, seatId: seats[1].id, date: outsideDate, status: "ACTIVE" },
    });

    const preview = await previewOfficeClosureImpact({
      officeId: office.id,
      startDate: firstDate,
      endDate: secondDate,
      reason: "Maintenance",
      now: new Date(),
    });

    expect(preview.affectedReservations.map((reservation) => reservation.id).toSorted()).toEqual(
      [firstReservation.id, secondReservation.id].toSorted(),
    );

    const result = await confirmOfficeClosure({
      actorUserId: actor.id,
      officeId: office.id,
      startDate: firstDate,
      endDate: secondDate,
      reason: "Maintenance",
      now: new Date(),
    });

    expect(result.cancelledReservations).toHaveLength(2);
    await expect(prisma.reservation.findUniqueOrThrow({ where: { id: firstReservation.id } })).resolves.toMatchObject({
      status: "CANCELLED",
    });
    await expect(prisma.reservation.findUniqueOrThrow({ where: { id: secondReservation.id } })).resolves.toMatchObject({
      status: "CANCELLED",
    });
    await expect(prisma.officeClosure.findUniqueOrThrow({ where: { id: result.period.id } })).resolves.toMatchObject({
      startDate: normalizeDate(firstDate),
      endDate: normalizeDate(secondDate),
    });

    const logs = await prisma.auditLog.findMany({ where: { actorUserId: actor.id }, orderBy: { createdAt: "asc" } });
    expect(logs.map((log) => log.action)).toContain("OFFICE_CLOSURE_CREATED");
    expect(logs.filter((log) => log.action === "RESERVATION_CANCELLED")).toHaveLength(2);
  });

  test("previews and confirms a desk resource block range by cancelling only matching reservations", async () => {
    const { office, seats } = await createOfficeFixture("resource-confirm");
    const actor = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-resource-confirm-admin@example.com`,
        name: "Resource Admin",
        role: "ADMIN",
        assignedOfficeId: office.id,
      },
    });
    const blockedUser = await createUser("resource-confirm-blocked", office.id);
    const otherUser = await createUser("resource-confirm-other", office.id);
    const [blockedSeat] = seats;
    const blockedSeatWithDesk = await prisma.seat.findUniqueOrThrow({ where: { id: blockedSeat.id } });
    const blockedDesk = await prisma.desk.findUniqueOrThrow({ where: { id: blockedSeatWithDesk.deskId } });
    const otherDesk = await prisma.desk.create({
      data: {
        floorId: blockedDesk.floorId,
        deskNum: 2,
        deskName: "Other desk",
        seats: { create: { seatNum: 1 } },
      },
      include: { seats: true },
    });
    const otherSeat = otherDesk.seats[0];
    const firstDate = addUtcDays(new Date(), 1);
    const secondDate = addUtcDays(new Date(), 2);
    const blockedReservation = await prisma.reservation.create({
      data: { userId: blockedUser.id, seatId: blockedSeat.id, date: firstDate, status: "ACTIVE" },
    });
    await prisma.reservation.create({
      data: { userId: otherUser.id, seatId: otherSeat.id, date: firstDate, status: "ACTIVE" },
    });

    const preview = await previewResourceBlockImpact({
      officeId: office.id,
      blockType: "DESK",
      deskId: blockedSeatWithDesk.deskId,
      startDate: firstDate,
      endDate: secondDate,
      reason: "Desk repair",
      now: new Date(),
    });

    expect(preview.affectedReservations.map((reservation) => reservation.id)).toEqual([blockedReservation.id]);

    const result = await confirmResourceBlock({
      actorUserId: actor.id,
      officeId: office.id,
      blockType: "DESK",
      deskId: blockedSeatWithDesk.deskId,
      startDate: firstDate,
      endDate: secondDate,
      reason: "Desk repair",
      now: new Date(),
    });

    expect(result.cancelledReservations).toEqual([expect.objectContaining({ id: blockedReservation.id })]);
    await expect(prisma.reservation.findUniqueOrThrow({ where: { id: blockedReservation.id } })).resolves.toMatchObject({
      status: "CANCELLED",
    });

    const logs = await prisma.auditLog.findMany({ where: { actorUserId: actor.id } });
    expect(logs.map((log) => log.action)).toContain("RESOURCE_BLOCK_CREATED");
    expect(logs.filter((log) => log.action === "RESERVATION_CANCELLED")).toHaveLength(1);
  });

  test("removing an office closure re-enables availability without restoring cancelled reservations", async () => {
    const { office, seats } = await createOfficeFixture("closure-remove");
    const actor = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-closure-remove-admin@example.com`,
        name: "Remove Admin",
        role: "ADMIN",
        assignedOfficeId: office.id,
      },
    });
    const user = await createUser("closure-remove-user", office.id);
    const date = addUtcDays(new Date(), 1);
    const reservation = await prisma.reservation.create({
      data: { userId: user.id, seatId: seats[0].id, date, status: "ACTIVE" },
    });
    const result = await confirmOfficeClosure({
      actorUserId: actor.id,
      officeId: office.id,
      startDate: date,
      endDate: date,
      reason: "One-day event",
      now: new Date(),
    });

    await removeOfficeClosure({ actorUserId: actor.id, closureId: result.period.id, now: new Date() });

    const availability = await getSeatAvailability({ officeId: office.id, dates: [date] });
    expect(availability.every((seat) => seat.dates[toDateKey(date)] === "available")).toBe(true);
    await expect(prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).resolves.toMatchObject({
      status: "CANCELLED",
    });

    const removedLog = await prisma.auditLog.findFirst({
      where: { actorUserId: actor.id, action: "OFFICE_CLOSURE_REMOVED" },
    });
    expect(removedLog).not.toBeNull();
  });
});
