import { afterAll, beforeEach, describe, expect, test } from "vitest";

import {
  getSelectableOffices,
  selectUserOffice,
} from "../../../src/features/onboarding/office-selection-service";
import { prisma } from "../../../src/lib/prisma";

const TEST_PREFIX = "office-selection-test";

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

async function createOffice(name: string, seatCount: number) {
  return prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `Office ${name}`,
      location: `Location ${name}`,
      floors: {
        create: {
          floorNum: 1,
          floorName: "Main",
          floorMap: "/offices/test/main.webp",
          desks: {
            create: {
              deskNum: 1,
              deskName: "Desk 1",
              seats: {
                create: Array.from({ length: seatCount }, (_, index) => ({
                  seatNum: index + 1,
                })),
              },
            },
          },
        },
      },
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

describe("office selection", () => {
  test("lists real offices with seat counts", async () => {
    const office = await createOffice("list", 3);

    const offices = await getSelectableOffices();

    expect(offices).toContainEqual(
      expect.objectContaining({
        id: office.id,
        name: office.name,
        seatCount: 3,
      }),
    );
  });

  test("marks user office as explicitly selected", async () => {
    const initialOffice = await createOffice("initial", 1);
    const selectedOffice = await createOffice("selected", 2);
    const user = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-user@example.com`,
        name: "Office Selection User",
        assignedOfficeId: initialOffice.id,
      },
    });

    const updated = await selectUserOffice({
      userId: user.id,
      officeId: selectedOffice.id,
    });

    expect(updated.assignedOfficeId).toBe(selectedOffice.id);
    expect(updated.officeSelectedAt).toBeInstanceOf(Date);
  });

  test("allows office default changes even when future reservations exist", async () => {
    const initialOffice = await createOffice("reserved-initial", 1);
    const selectedOffice = await createOffice("reserved-selected", 1);
    const user = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}-reserved-user@example.com`,
        name: "Reserved User",
        assignedOfficeId: initialOffice.id,
      },
    });
    const seat = await prisma.seat.findFirstOrThrow({
      where: { desk: { floor: { officeId: initialOffice.id } } },
    });

    await prisma.reservation.create({
      data: {
        userId: user.id,
        seatId: seat.id,
        date: new Date("2030-01-10T00:00:00.000Z"),
        status: "ACTIVE",
      },
    });

    const updated = await selectUserOffice({
      userId: user.id,
      officeId: selectedOffice.id,
    });

    expect(updated.assignedOfficeId).toBe(selectedOffice.id);
  });
});
