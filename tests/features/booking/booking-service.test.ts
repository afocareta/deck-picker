import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { getBookableDates } from "../../../src/features/booking/date-rules";
import { getSeatAvailability } from "../../../src/features/booking/availability";
import {
  autoAssignAndBook,
  bookSelectedSeat,
  cancelReservation,
} from "../../../src/features/booking/booking-service";
import { prisma } from "../../../src/lib/prisma";

const TEST_PREFIX = "task5-test";

type TestSeat = {
  id: string;
  floorNum: number;
  deskNum: number;
  seatNum: number;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function bookableDates(count: number): Date[] {
  return getBookableDates(new Date()).slice(0, count);
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
  await prisma.resourceBlock.deleteMany({ where: { officeId: { in: testOffices.map((office) => office.id) } } });
  await prisma.officeClosure.deleteMany({ where: { officeId: { in: testOffices.map((office) => office.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: testUsers.map((user) => user.id) } } });
  await prisma.office.deleteMany({ where: { id: { in: testOffices.map((office) => office.id) } } });
}

async function createOfficeFixture(name: string) {
  const office = await prisma.office.create({
    data: {
      code: `${TEST_PREFIX}-${name}`,
      name: `Task 5 ${name}`,
      location: "Test location",
      floors: {
        create: [
          {
            floorNum: 2,
            floorName: "Second floor",
            floorMap: "/offices/test/floor-2.webp",
            desks: {
              create: [
                {
                  deskNum: 1,
                  deskName: "F2-D1",
                  seats: { create: [{ seatNum: 1 }] },
                },
              ],
            },
          },
          {
            floorNum: 1,
            floorName: "First floor",
            floorMap: "/offices/test/floor-1.webp",
            desks: {
              create: [
                {
                  deskNum: 2,
                  deskName: "F1-D2",
                  seats: { create: [{ seatNum: 1 }] },
                },
                {
                  deskNum: 1,
                  deskName: "F1-D1",
                  seats: { create: [{ seatNum: 2 }, { seatNum: 1 }] },
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

  return {
    office,
    seats: seats.map<TestSeat>((seat) => ({
      id: seat.id,
      floorNum: seat.desk.floor.floorNum,
      deskNum: seat.desk.deskNum,
      seatNum: seat.seatNum,
    })),
  };
}

async function createUser(name: string, officeId: string) {
  return prisma.user.create({
    data: {
      email: `${TEST_PREFIX}-${name}@example.com`,
      name: `Task 5 ${name}`,
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

describe("booking service", () => {
  test("manual booking creates active reservations", async () => {
    const { office, seats } = await createOfficeFixture("manual");
    const user = await createUser("manual-user", office.id);
    const [date] = bookableDates(1);

    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });

    expect(result).toEqual({
      booked: [{ date: isoDate(date), reservationId: expect.any(String) }],
      skipped: [],
    });

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result.booked[0].reservationId },
    });
    expect(reservation.status).toBe("ACTIVE");
    expect(reservation.userId).toBe(user.id);
    expect(reservation.seatId).toBe(seats[0].id);
    expect(isoDate(reservation.date)).toBe(isoDate(date));
  });

  test("same user cannot book two seats on the same date", async () => {
    const { office, seats } = await createOfficeFixture("user-conflict");
    const user = await createUser("user-conflict-user", office.id);
    const [date] = bookableDates(1);

    await bookSelectedSeat({ userId: user.id, officeId: office.id, seatId: seats[0].id, dates: [date] });
    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[1].id,
      dates: [date],
    });

    expect(result.booked).toEqual([]);
    expect(result.skipped).toEqual([
      { date: isoDate(date), reason: "You already have a reservation for this date" },
    ]);
  });

  test("same seat cannot be double-booked on the same date", async () => {
    const { office, seats } = await createOfficeFixture("seat-conflict");
    const firstUser = await createUser("seat-conflict-first", office.id);
    const secondUser = await createUser("seat-conflict-second", office.id);
    const [date] = bookableDates(1);

    await bookSelectedSeat({
      userId: firstUser.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });
    const result = await bookSelectedSeat({
      userId: secondUser.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });

    expect(result.booked).toEqual([]);
    expect(result.skipped).toEqual([{ date: isoDate(date), reason: "Seat no longer available" }]);
  });

  test("office closure blocks availability and booking", async () => {
    const { office, seats } = await createOfficeFixture("office-closure");
    const user = await createUser("office-closure-user", office.id);
    const [date] = bookableDates(1);

    await prisma.officeClosure.create({
      data: {
        officeId: office.id,
        startDate: date,
        endDate: date,
        reason: "Company holiday",
      },
    });

    const availability = await getSeatAvailability({ officeId: office.id, dates: [date] });
    expect(availability.every((seat) => seat.dates[isoDate(date)] === "blocked")).toBe(true);

    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });

    expect(result.booked).toEqual([]);
    expect(result.skipped).toEqual([{ date: isoDate(date), reason: "Office closed" }]);
  });

  test("seat resource block blocks only the matching seat", async () => {
    const { office, seats } = await createOfficeFixture("seat-block");
    const user = await createUser("seat-block-user", office.id);
    const [date] = bookableDates(1);

    await prisma.resourceBlock.create({
      data: {
        officeId: office.id,
        blockType: "SEAT",
        seatId: seats[0].id,
        startDate: date,
        endDate: date,
        reason: "Broken monitor",
      },
    });

    const availability = await getSeatAvailability({ officeId: office.id, dates: [date] });
    expect(availability.find((seat) => seat.seatId === seats[0].id)?.dates[isoDate(date)]).toBe("blocked");
    expect(availability.find((seat) => seat.seatId === seats[1].id)?.dates[isoDate(date)]).toBe("available");

    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });

    expect(result.booked).toEqual([]);
    expect(result.skipped).toEqual([{ date: isoDate(date), reason: "Resource unavailable" }]);
  });

  test("office closure range blocks availability and booking for every date in the range", async () => {
    const { office, seats } = await createOfficeFixture("office-closure-range");
    const user = await createUser("office-closure-range-user", office.id);
    const [firstDate, secondDate, thirdDate] = bookableDates(3);

    await prisma.officeClosure.create({
      data: {
        officeId: office.id,
        startDate: firstDate,
        endDate: secondDate,
        reason: "Company event",
      },
    });

    const availability = await getSeatAvailability({ officeId: office.id, dates: [firstDate, secondDate, thirdDate] });
    expect(availability.every((seat) => seat.dates[isoDate(firstDate)] === "blocked")).toBe(true);
    expect(availability.every((seat) => seat.dates[isoDate(secondDate)] === "blocked")).toBe(true);
    expect(availability.every((seat) => seat.dates[isoDate(thirdDate)] === "available")).toBe(true);

    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [firstDate, secondDate, thirdDate],
    });

    expect(result.booked).toEqual([{ date: isoDate(thirdDate), reservationId: expect.any(String) }]);
    expect(result.skipped).toEqual([
      { date: isoDate(firstDate), reason: "Office closed" },
      { date: isoDate(secondDate), reason: "Office closed" },
    ]);
  });

  test("desk resource block range blocks matching seats for every date in the range", async () => {
    const { office, seats } = await createOfficeFixture("desk-block-range");
    const user = await createUser("desk-block-range-user", office.id);
    const [firstDate, secondDate, thirdDate] = bookableDates(3);

    const blockedSeat = await prisma.seat.findUniqueOrThrow({
      where: { id: seats[0].id },
      include: { desk: true },
    });

    await prisma.resourceBlock.create({
      data: {
        officeId: office.id,
        blockType: "DESK",
        deskId: blockedSeat.deskId,
        startDate: firstDate,
        endDate: secondDate,
        reason: "Desk maintenance",
      },
    });

    const availability = await getSeatAvailability({ officeId: office.id, dates: [firstDate, secondDate, thirdDate] });
    expect(availability.find((seat) => seat.seatId === seats[0].id)?.dates[isoDate(firstDate)]).toBe("blocked");
    expect(availability.find((seat) => seat.seatId === seats[1].id)?.dates[isoDate(secondDate)]).toBe("blocked");
    expect(availability.find((seat) => seat.seatId === seats[0].id)?.dates[isoDate(thirdDate)]).toBe("available");
    expect(availability.find((seat) => seat.seatId === seats[3].id)?.dates[isoDate(firstDate)]).toBe("available");

    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [firstDate, secondDate, thirdDate],
    });

    expect(result.booked).toEqual([{ date: isoDate(thirdDate), reservationId: expect.any(String) }]);
    expect(result.skipped).toEqual([
      { date: isoDate(firstDate), reason: "Resource unavailable" },
      { date: isoDate(secondDate), reason: "Resource unavailable" },
    ]);
  });

  test("cancelling a future reservation frees the seat", async () => {
    const { office, seats } = await createOfficeFixture("cancel");
    const firstUser = await createUser("cancel-first", office.id);
    const secondUser = await createUser("cancel-second", office.id);
    const [date] = bookableDates(1);

    const booking = await bookSelectedSeat({
      userId: firstUser.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });

    await cancelReservation({
      userId: firstUser.id,
      reservationId: booking.booked[0].reservationId,
      now: new Date(date.getTime() - 24 * 60 * 60 * 1000),
    });

    const availability = await getSeatAvailability({ officeId: office.id, dates: [date] });
    expect(availability.find((seat) => seat.seatId === seats[0].id)?.dates[isoDate(date)]).toBe(
      "available",
    );

    const secondBooking = await bookSelectedSeat({
      userId: secondUser.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });
    expect(secondBooking.booked).toHaveLength(1);
    expect(secondBooking.skipped).toEqual([]);
  });

  test("same user can cancel, rebook, and cancel the same date again", async () => {
    const { office, seats } = await createOfficeFixture("cancel-rebook");
    const user = await createUser("cancel-rebook-user", office.id);
    const [date] = bookableDates(1);
    const cancellationNow = new Date(date.getTime() - 24 * 60 * 60 * 1000);

    const firstBooking = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });
    await cancelReservation({
      userId: user.id,
      reservationId: firstBooking.booked[0].reservationId,
      now: cancellationNow,
    });

    const secondBooking = await bookSelectedSeat({
      userId: user.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [date],
    });
    expect(secondBooking.skipped).toEqual([]);

    await expect(
      cancelReservation({
        userId: user.id,
        reservationId: secondBooking.booked[0].reservationId,
        now: cancellationNow,
      }),
    ).resolves.toBeUndefined();

    const cancelledReservations = await prisma.reservation.count({
      where: { userId: user.id, date, status: "CANCELLED" },
    });
    expect(cancelledReservations).toBe(2);
  });

  test("auto-assign chooses lowest floor number, then desk number, then seat number", async () => {
    const { office } = await createOfficeFixture("auto-order");
    const user = await createUser("auto-order-user", office.id);
    const [date] = bookableDates(1);

    const result = await autoAssignAndBook({ userId: user.id, officeId: office.id, dates: [date] });

    expect(result.skipped).toEqual([]);
    expect(result.booked).toHaveLength(1);

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result.booked[0].reservationId },
      include: { seat: { include: { desk: { include: { floor: true } } } } },
    });
    expect({
      floorNum: reservation.seat.desk.floor.floorNum,
      deskNum: reservation.seat.desk.deskNum,
      seatNum: reservation.seat.seatNum,
    }).toEqual({ floorNum: 1, deskNum: 1, seatNum: 1 });
  });

  test("auto-assign falls back to the seat with the most available requested dates", async () => {
    const { office, seats } = await createOfficeFixture("auto-partial");
    const user = await createUser("auto-partial-user", office.id);
    const blockerA = await createUser("auto-partial-blocker-a", office.id);
    const blockerB = await createUser("auto-partial-blocker-b", office.id);
    const blockerC = await createUser("auto-partial-blocker-c", office.id);
    const blockerD = await createUser("auto-partial-blocker-d", office.id);
    const [firstDate, secondDate, thirdDate] = bookableDates(3);

    await bookSelectedSeat({
      userId: blockerA.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [thirdDate],
    });
    await bookSelectedSeat({
      userId: blockerB.id,
      officeId: office.id,
      seatId: seats[1].id,
      dates: [firstDate, thirdDate],
    });
    await bookSelectedSeat({
      userId: blockerC.id,
      officeId: office.id,
      seatId: seats[2].id,
      dates: [firstDate, secondDate, thirdDate],
    });
    await bookSelectedSeat({
      userId: blockerD.id,
      officeId: office.id,
      seatId: seats[3].id,
      dates: [firstDate, secondDate, thirdDate],
    });

    const result = await autoAssignAndBook({
      userId: user.id,
      officeId: office.id,
      dates: [firstDate, secondDate, thirdDate],
    });

    expect(result.booked.map((booking) => booking.date)).toEqual([
      isoDate(firstDate),
      isoDate(secondDate),
    ]);
    expect(result.skipped).toEqual([{ date: isoDate(thirdDate), reason: "Seat no longer available" }]);

    const reservations = await prisma.reservation.findMany({
      where: { id: { in: result.booked.map((booking) => booking.reservationId) } },
    });
    expect(reservations.map((reservation) => reservation.seatId)).toEqual([seats[0].id, seats[0].id]);
  });

  test("range booking returns booked and skipped dates", async () => {
    const { office, seats } = await createOfficeFixture("range");
    const firstUser = await createUser("range-first", office.id);
    const secondUser = await createUser("range-second", office.id);
    const [firstDate, secondDate] = bookableDates(2);
    const invalidDate = new Date("2099-01-03T00:00:00.000Z");

    await bookSelectedSeat({
      userId: secondUser.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [secondDate],
    });
    const result = await bookSelectedSeat({
      userId: firstUser.id,
      officeId: office.id,
      seatId: seats[0].id,
      dates: [firstDate, secondDate, invalidDate],
    });

    expect(result.booked).toEqual([{ date: isoDate(firstDate), reservationId: expect.any(String) }]);
    expect(result.skipped).toEqual([
      { date: isoDate(secondDate), reason: "Seat no longer available" },
      { date: isoDate(invalidDate), reason: "Choose a weekday within the next 21 days" },
    ]);
  });
});
