import { prisma } from "../../lib/prisma";
import { normalizeDate } from "./date-rules";

export type SeatAvailabilityStatus = "available" | "reserved" | "blocked";

export type SeatAvailability = {
  seatId: string;
  floorNum: number;
  deskNum: number;
  seatNum: number;
  floorMap: string;
  dates: Record<string, SeatAvailabilityStatus>;
};

export type GetSeatAvailabilityInput = {
  officeId: string;
  dates: Date[];
};

export function toDateKey(date: Date): string {
  return normalizeDate(date).toISOString().slice(0, 10);
}

function overlapsAnyDate(input: { startDate: Date; endDate: Date; dateKeys: Set<string> }) {
  for (
    let current = normalizeDate(input.startDate);
    current <= normalizeDate(input.endDate);
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
  ) {
    if (input.dateKeys.has(toDateKey(current))) {
      return true;
    }
  }

  return false;
}

function includesDate(input: { startDate: Date; endDate: Date; dateKey: string }) {
  const date = new Date(`${input.dateKey}T00:00:00.000Z`);
  return normalizeDate(input.startDate) <= date && date <= normalizeDate(input.endDate);
}

export async function getSeatAvailability({
  officeId,
  dates,
}: GetSeatAvailabilityInput): Promise<SeatAvailability[]> {
  const normalizedDates = dates.map(normalizeDate);
  const dateKeys = normalizedDates.map(toDateKey);
  const dateKeySet = new Set(dateKeys);
  const minDate = normalizedDates.toSorted((left, right) => left.getTime() - right.getTime())[0];
  const maxDate = normalizedDates.toSorted((left, right) => right.getTime() - left.getTime())[0];

  const seats = await prisma.seat.findMany({
    where: { desk: { floor: { officeId } } },
    include: { desk: { include: { floor: true } } },
    orderBy: [
      { desk: { floor: { floorNum: "asc" } } },
      { desk: { deskNum: "asc" } },
      { seatNum: "asc" },
    ],
  });

  const activeReservations = await prisma.reservation.findMany({
    where: {
      status: "ACTIVE",
      date: { in: normalizedDates },
      seat: { desk: { floor: { officeId } } },
    },
    select: { seatId: true, date: true },
  });
  const reservedSeatDates = new Set(
    activeReservations.map((reservation) => `${reservation.seatId}:${toDateKey(reservation.date)}`),
  );
  const closures = await prisma.officeClosure.findMany({
    where: {
      officeId,
      ...(minDate && maxDate ? { startDate: { lte: maxDate }, endDate: { gte: minDate } } : {}),
    },
    select: { startDate: true, endDate: true },
  });
  const overlappingClosures = closures.filter((closure) =>
    overlapsAnyDate({ startDate: closure.startDate, endDate: closure.endDate, dateKeys: dateKeySet }),
  );
  const resourceBlocks = await prisma.resourceBlock.findMany({
    where: {
      officeId,
      ...(minDate && maxDate ? { startDate: { lte: maxDate }, endDate: { gte: minDate } } : {}),
    },
    select: {
      startDate: true,
      endDate: true,
      blockType: true,
      floorId: true,
      deskId: true,
      seatId: true,
    },
  });

  function isBlocked(input: {
    dateKey: string;
    floorId: string;
    deskId: string;
    seatId: string;
  }) {
    if (overlappingClosures.some((closure) => includesDate({ ...closure, dateKey: input.dateKey }))) {
      return true;
    }

    return resourceBlocks.some((block) => {
      if (!includesDate({ startDate: block.startDate, endDate: block.endDate, dateKey: input.dateKey })) {
        return false;
      }

      if (block.blockType === "OFFICE") {
        return true;
      }

      if (block.blockType === "FLOOR") {
        return block.floorId === input.floorId;
      }

      if (block.blockType === "DESK") {
        return block.deskId === input.deskId;
      }

      return block.seatId === input.seatId;
    });
  }

  return seats.map((seat) => ({
    seatId: seat.id,
    floorNum: seat.desk.floor.floorNum,
    deskNum: seat.desk.deskNum,
    seatNum: seat.seatNum,
    floorMap: seat.desk.floor.floorMap,
    dates: Object.fromEntries(
      dateKeys.map((dateKey) => [
        dateKey,
        isBlocked({
          dateKey,
          floorId: seat.desk.floor.id,
          deskId: seat.desk.id,
          seatId: seat.id,
        })
          ? "blocked"
          : reservedSeatDates.has(`${seat.id}:${dateKey}`)
            ? "reserved"
            : "available",
      ]),
    ),
  }));
}
