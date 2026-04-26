import { ReservationStatus, type UserRole } from "@prisma/client";

import { toDateKey } from "@/features/booking/availability";
import { normalizeDate } from "@/features/booking/date-rules";
import { prisma } from "@/lib/prisma";

export type WorkspaceSearchResults = {
  query: string;
  offices: Array<{
    id: string;
    code: string;
    name: string;
    location: string;
  }>;
  seats: Array<{
    id: string;
    officeName: string;
    floorName: string;
    deskName: string;
    seatNum: number;
  }>;
  reservations: Array<{
    id: string;
    date: string;
    officeName: string;
    floorName: string;
    deskName: string;
    seatNum: number;
  }>;
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    officeName: string;
  }>;
};

export async function searchWorkspace(input: {
  query: string;
  currentUserId: string;
  currentUserRole: UserRole;
  now?: Date;
}): Promise<WorkspaceSearchResults> {
  const query = input.query.trim();

  if (query.length < 2) {
    return {
      query,
      offices: [],
      seats: [],
      reservations: [],
      users: [],
    };
  }

  const today = normalizeDate(input.now ?? new Date());
  const [offices, seats, reservations, users] = await Promise.all([
    prisma.office.findMany({
      where: {
        OR: [
          { code: { contains: query } },
          { name: { contains: query } },
          { location: { contains: query } },
        ],
      },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.seat.findMany({
      where: {
        OR: [
          { desk: { deskName: { contains: query } } },
          { desk: { floor: { floorName: { contains: query } } } },
          { desk: { floor: { office: { name: { contains: query } } } } },
        ],
      },
      include: {
        desk: {
          include: {
            floor: {
              include: { office: true },
            },
          },
        },
      },
      orderBy: [
        { desk: { floor: { office: { name: "asc" } } } },
        { desk: { floor: { floorNum: "asc" } } },
        { desk: { deskNum: "asc" } },
        { seatNum: "asc" },
      ],
      take: 12,
    }),
    prisma.reservation.findMany({
      where: {
        userId: input.currentUserId,
        status: ReservationStatus.ACTIVE,
        date: { gte: today },
        OR: [
          { seat: { desk: { deskName: { contains: query } } } },
          { seat: { desk: { floor: { floorName: { contains: query } } } } },
          { seat: { desk: { floor: { office: { name: { contains: query } } } } } },
        ],
      },
      include: {
        seat: {
          include: {
            desk: {
              include: {
                floor: {
                  include: { office: true },
                },
              },
            },
          },
        },
      },
      orderBy: { date: "asc" },
      take: 8,
    }),
    input.currentUserRole === "ADMIN"
      ? prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: query } },
              { name: { contains: query } },
              { assignedOffice: { name: { contains: query } } },
            ],
          },
          include: { assignedOffice: true },
          orderBy: { email: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return {
    query,
    offices: offices.map((office) => ({
      id: office.id,
      code: office.code,
      name: office.name,
      location: office.location,
    })),
    seats: seats.map((seat) => ({
      id: seat.id,
      officeName: seat.desk.floor.office.name,
      floorName: seat.desk.floor.floorName,
      deskName: seat.desk.deskName,
      seatNum: seat.seatNum,
    })),
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      date: toDateKey(reservation.date),
      officeName: reservation.seat.desk.floor.office.name,
      floorName: reservation.seat.desk.floor.floorName,
      deskName: reservation.seat.desk.deskName,
      seatNum: reservation.seat.seatNum,
    })),
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      officeName: user.assignedOffice.name,
    })),
  };
}
