import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { searchWorkspace } from "../../../src/features/search/search-service";
import { prisma } from "../../../src/lib/prisma";

const TEST_PREFIX = "search-test";

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
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await prisma.office.deleteMany({ where: { id: { in: offices.map((office) => office.id) } } });
}

async function createOfficeFixture(name: string) {
  const office = await prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `Search ${name}`,
      location: `Location ${name}`,
      floors: {
        create: {
          floorNum: 1,
          floorName: "North Floor",
          floorMap: "/offices/test/search.webp",
          desks: {
            create: {
              deskNum: 7,
              deskName: "Focus Desk",
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
      name: `Search ${name}`,
      role,
      assignedOfficeId: officeId,
      officeSelectedAt: new Date(),
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

describe("workspace search", () => {
  test("finds offices, seats, and current user reservations", async () => {
    const { office, seat } = await createOfficeFixture("rome");
    const user = await createUser("person", office.id);

    await prisma.reservation.create({
      data: {
        userId: user.id,
        seatId: seat.id,
        date: new Date("2030-04-10T00:00:00.000Z"),
        status: "ACTIVE",
      },
    });

    const results = await searchWorkspace({
      query: "Focus",
      currentUserId: user.id,
      currentUserRole: "USER",
      now: new Date("2029-01-01T00:00:00.000Z"),
    });

    expect(results.seats).toContainEqual(expect.objectContaining({ deskName: "Focus Desk" }));
    expect(results.reservations).toContainEqual(expect.objectContaining({ deskName: "Focus Desk" }));
    expect(results.users).toEqual([]);
  });

  test("returns admin user matches only for admins", async () => {
    const { office } = await createOfficeFixture("admin");
    const admin = await createUser("admin", office.id, "ADMIN");
    await createUser("target", office.id);

    const adminResults = await searchWorkspace({
      query: "target",
      currentUserId: admin.id,
      currentUserRole: "ADMIN",
    });
    const userResults = await searchWorkspace({
      query: "target",
      currentUserId: admin.id,
      currentUserRole: "USER",
    });

    expect(adminResults.users).toContainEqual(expect.objectContaining({ email: `${TEST_PREFIX}-target@example.com` }));
    expect(userResults.users).toEqual([]);
  });
});
