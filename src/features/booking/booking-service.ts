import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { getSeatAvailability, SeatAvailability, toDateKey } from "./availability";
import { isBookableDate, normalizeDate } from "./date-rules";

export type BookingResult = {
  booked: Array<{ date: string; reservationId: string }>;
  skipped: Array<{ date: string; reason: string }>;
};

const INVALID_DATE_REASON = "Choose a weekday within the next 21 days";
const SEAT_CONFLICT_REASON = "Seat no longer available";
const USER_CONFLICT_REASON = "You already have a reservation for this date";
const OFFICE_CLOSED_REASON = "Office closed";
const RESOURCE_BLOCKED_REASON = "Resource unavailable";

type ValidDate = {
  date: Date;
  dateKey: string;
  order: number;
};

type InternalSkippedDate = BookingResult["skipped"][number] & {
  order: number;
};

function toBookingResult(booked: BookingResult["booked"], skipped: InternalSkippedDate[]): BookingResult {
  return {
    booked,
    skipped: skipped
      .toSorted((left, right) => left.order - right.order)
      .map(({ date, reason }) => ({ date, reason })),
  };
}

function partitionDates(dates: Date[]): { validDates: ValidDate[]; skipped: InternalSkippedDate[] } {
  const validDates: ValidDate[] = [];
  const skipped: InternalSkippedDate[] = [];

  for (const [order, inputDate] of dates.entries()) {
    const date = normalizeDate(inputDate);
    const dateKey = toDateKey(date);

    if (!isBookableDate(date)) {
      skipped.push({ date: dateKey, reason: INVALID_DATE_REASON, order });
      continue;
    }

    validDates.push({ date, dateKey, order });
  }

  return { validDates, skipped };
}

async function assertSeatBelongsToOffice(seatId: string, officeId: string): Promise<void> {
  const seat = await prisma.seat.findFirst({
    where: { id: seatId, desk: { floor: { officeId } } },
    select: { id: true },
  });

  if (!seat) {
    throw new Error("Seat does not belong to requested office");
  }
}

async function findConflict(
  userId: string,
  seatId: string,
  date: Date,
): Promise<string | undefined> {
  const seat = await prisma.seat.findUnique({
    where: { id: seatId },
    include: { desk: { include: { floor: true } } },
  });

  if (!seat) {
    return SEAT_CONFLICT_REASON;
  }

  const officeClosure = await prisma.officeClosure.findFirst({
    where: {
      officeId: seat.desk.floor.officeId,
      date,
    },
    select: { id: true },
  });

  if (officeClosure) {
    return OFFICE_CLOSED_REASON;
  }

  const resourceBlock = await prisma.resourceBlock.findFirst({
    where: {
      officeId: seat.desk.floor.officeId,
      date,
      OR: [
        { blockType: "OFFICE" },
        { blockType: "FLOOR", floorId: seat.desk.floor.id },
        { blockType: "DESK", deskId: seat.desk.id },
        { blockType: "SEAT", seatId },
      ],
    },
    select: { id: true },
  });

  if (resourceBlock) {
    return RESOURCE_BLOCKED_REASON;
  }

  const userReservation = await prisma.reservation.findFirst({
    where: { userId, date, status: "ACTIVE" },
    select: { id: true },
  });

  if (userReservation) {
    return USER_CONFLICT_REASON;
  }

  const seatReservation = await prisma.reservation.findFirst({
    where: { seatId, date, status: "ACTIVE" },
    select: { id: true },
  });

  if (seatReservation) {
    return SEAT_CONFLICT_REASON;
  }

  return undefined;
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function uniqueConstraintReason(error: Prisma.PrismaClientKnownRequestError): string {
  const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";

  if (target.includes("userId")) {
    return USER_CONFLICT_REASON;
  }

  return SEAT_CONFLICT_REASON;
}

async function bookDatesForSeat(input: {
  userId: string;
  seatId: string;
  validDates: ValidDate[];
  skipped: InternalSkippedDate[];
}): Promise<BookingResult> {
  const booked: BookingResult["booked"] = [];
  const skipped = [...input.skipped];

  for (const { date, dateKey, order } of input.validDates) {
    const conflictReason = await findConflict(input.userId, input.seatId, date);

    if (conflictReason) {
      skipped.push({ date: dateKey, reason: conflictReason, order });
      continue;
    }

    try {
      const reservation = await prisma.reservation.create({
        data: {
          userId: input.userId,
          seatId: input.seatId,
          date,
          status: "ACTIVE",
        },
      });
      booked.push({ date: dateKey, reservationId: reservation.id });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      skipped.push({
        date: dateKey,
        reason: (await findConflict(input.userId, input.seatId, date)) ?? uniqueConstraintReason(error),
        order,
      });
    }
  }

  return toBookingResult(booked, skipped);
}

export async function bookSelectedSeat(input: {
  userId: string;
  officeId: string;
  seatId: string;
  dates: Date[];
}): Promise<BookingResult> {
  await assertSeatBelongsToOffice(input.seatId, input.officeId);
  const { validDates, skipped } = partitionDates(input.dates);

  return bookDatesForSeat({
    userId: input.userId,
    seatId: input.seatId,
    validDates,
    skipped,
  });
}

function availableDateCount(seat: SeatAvailability, validDates: ValidDate[]): number {
  return validDates.filter(({ dateKey }) => seat.dates[dateKey] === "available").length;
}

function compareSeats(left: SeatAvailability, right: SeatAvailability): number {
  return (
    left.floorNum - right.floorNum ||
    left.deskNum - right.deskNum ||
    left.seatNum - right.seatNum
  );
}

function chooseSeat(seats: SeatAvailability[], validDates: ValidDate[]): SeatAvailability | undefined {
  const seatsAvailableForEveryDate = seats.filter((seat) =>
    validDates.every(({ dateKey }) => seat.dates[dateKey] === "available"),
  );

  if (seatsAvailableForEveryDate.length > 0) {
    return seatsAvailableForEveryDate.toSorted(compareSeats)[0];
  }

  return seats
    .filter((seat) => availableDateCount(seat, validDates) > 0)
    .toSorted((left, right) => {
      const availabilityDifference = availableDateCount(right, validDates) - availableDateCount(left, validDates);

      return availabilityDifference || compareSeats(left, right);
    })[0];
}

export async function autoAssignAndBook(input: {
  userId: string;
  officeId: string;
  dates: Date[];
}): Promise<BookingResult> {
  const { validDates, skipped } = partitionDates(input.dates);

  if (validDates.length === 0) {
    return { booked: [], skipped };
  }

  const availability = await getSeatAvailability({
    officeId: input.officeId,
    dates: validDates.map(({ date }) => date),
  });
  const selectedSeat = chooseSeat(availability, validDates);

  if (!selectedSeat) {
    return toBookingResult(
      [],
      [
        ...skipped,
        ...validDates.map(({ dateKey, order }) => ({
          date: dateKey,
          reason: SEAT_CONFLICT_REASON,
          order,
        })),
      ],
    );
  }

  return bookDatesForSeat({
    userId: input.userId,
    seatId: selectedSeat.seatId,
    validDates,
    skipped,
  });
}

export async function cancelReservation(input: {
  userId: string;
  reservationId: string;
  now?: Date;
}): Promise<void> {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: input.reservationId,
      userId: input.userId,
      status: "ACTIVE",
    },
  });

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  if (normalizeDate(reservation.date) <= normalizeDate(input.now ?? new Date())) {
    throw new Error("Only future reservations can be cancelled");
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "CANCELLED",
      cancelledAt: input.now ?? new Date(),
    },
  });
}
