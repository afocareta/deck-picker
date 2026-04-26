import { ReservationStatus, UserRole } from "@prisma/client";

import { toDateKey } from "../booking/availability";
import { getBookableDates, normalizeDate } from "../booking/date-rules";
import { prisma } from "../../lib/prisma";

export type UserDashboard = {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  assignedOffice: {
    id: string;
    code: string;
    name: string;
    location: string;
    seatCount: number;
  };
  upcomingReservations: Array<{
    id: string;
    date: string;
    officeName: string;
    floorName: string;
    floorNum: number;
    deskName: string;
    deskNum: number;
    seatNum: number;
  }>;
  occupancyToday: number;
  occupancyNextBookableDay: number;
  nextBookableDate: string;
  historyCounts: {
    oneMonth: number;
    threeMonths: number;
    sixMonths: number;
  };
};

function subtractUtcMonths(date: Date, months: number): Date {
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() - months;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function occupancyForDate(officeId: string, date: Date, seatCount: number): Promise<number> {
  if (seatCount === 0) {
    return 0;
  }

  const activeReservations = await prisma.reservation.count({
    where: {
      status: ReservationStatus.ACTIVE,
      date,
      seat: { desk: { floor: { officeId } } },
    },
  });

  return Math.round((activeReservations / seatCount) * 100);
}

async function historyCount(userId: string, startDate: Date, endDate: Date): Promise<number> {
  return prisma.reservation.count({
    where: {
      userId,
      status: ReservationStatus.ACTIVE,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
}

export async function getUserDashboard(userId: string, now = new Date()): Promise<UserDashboard> {
  const today = normalizeDate(now);
  const [nextBookableDate] = getBookableDates(now);

  if (!nextBookableDate) {
    throw new Error("No bookable dates available");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { assignedOffice: true },
  });
  const seatCount = await prisma.seat.count({
    where: { desk: { floor: { officeId: user.assignedOfficeId } } },
  });
  const upcomingReservations = await prisma.reservation.findMany({
    where: {
      userId,
      status: ReservationStatus.ACTIVE,
      date: { gt: today },
    },
    include: {
      seat: {
        include: {
          desk: {
            include: {
              floor: {
                include: {
                  office: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });
  const [
    occupancyToday,
    occupancyNextBookableDay,
    oneMonth,
    threeMonths,
    sixMonths,
  ] = await Promise.all([
    occupancyForDate(user.assignedOfficeId, today, seatCount),
    occupancyForDate(user.assignedOfficeId, nextBookableDate, seatCount),
    historyCount(userId, subtractUtcMonths(today, 1), addUtcDays(today, -1)),
    historyCount(userId, subtractUtcMonths(today, 3), addUtcDays(today, -1)),
    historyCount(userId, subtractUtcMonths(today, 6), addUtcDays(today, -1)),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    assignedOffice: {
      id: user.assignedOffice.id,
      code: user.assignedOffice.code,
      name: user.assignedOffice.name,
      location: user.assignedOffice.location,
      seatCount,
    },
    upcomingReservations: upcomingReservations.map((reservation) => ({
      id: reservation.id,
      date: toDateKey(reservation.date),
      officeName: reservation.seat.desk.floor.office.name,
      floorName: reservation.seat.desk.floor.floorName,
      floorNum: reservation.seat.desk.floor.floorNum,
      deskName: reservation.seat.desk.deskName,
      deskNum: reservation.seat.desk.deskNum,
      seatNum: reservation.seat.seatNum,
    })),
    occupancyToday,
    occupancyNextBookableDay,
    nextBookableDate: toDateKey(nextBookableDate),
    historyCounts: {
      oneMonth,
      threeMonths,
      sixMonths,
    },
  };
}
