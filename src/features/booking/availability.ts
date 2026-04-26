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

export async function getSeatAvailability({
  officeId,
  dates,
}: GetSeatAvailabilityInput): Promise<SeatAvailability[]> {
  const normalizedDates = dates.map(normalizeDate);
  const dateKeys = normalizedDates.map(toDateKey);

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
    where: { officeId, date: { in: normalizedDates } },
    select: { date: true },
  });
  const closedDates = new Set(closures.map((closure) => toDateKey(closure.date)));
  const resourceBlocks = await prisma.resourceBlock.findMany({
    where: { officeId, date: { in: normalizedDates } },
    select: {
      date: true,
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
    if (closedDates.has(input.dateKey)) {
      return true;
    }

    return resourceBlocks.some((block) => {
      if (toDateKey(block.date) !== input.dateKey) {
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
