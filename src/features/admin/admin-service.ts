import { AuditAction, ReservationStatus, type UserRole } from "@prisma/client";

import { toDateKey } from "@/features/booking/availability";
import { normalizeDate } from "@/features/booking/date-rules";
import { prisma } from "@/lib/prisma";

export type AdminDashboard = {
  summary: {
    totalUsers: number;
    totalOffices: number;
    todayReservations: number;
    futureReservations: number;
  };
  offices: Array<{
    id: string;
    code: string;
    name: string;
    location: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    assignedOfficeId: string;
    assignedOfficeCode: string;
    assignedOfficeName: string;
  }>;
  reservations: Array<{
    id: string;
    date: string;
    userEmail: string;
    userName: string;
    officeId: string;
    officeName: string;
    floorName: string;
    deskName: string;
    seatNum: number;
  }>;
  auditLogs: Array<{
    id: string;
    action: AuditAction;
    actorEmail: string;
    actorName: string;
    targetUserEmail?: string;
    reservationId?: string;
    details: string;
    createdAt: string;
  }>;
  closures: Array<{
    id: string;
    officeName: string;
    date: string;
    reason: string;
  }>;
  resourceBlocks: Array<{
    id: string;
    officeName: string;
    blockType: string;
    targetName: string;
    date: string;
    reason: string;
  }>;
  resourceTargets: Array<{
    id: string;
    officeId: string;
    type: "FLOOR" | "DESK" | "SEAT";
    label: string;
  }>;
};

export async function getAdminDashboard(input: {
  officeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  userQuery?: string;
  now?: Date;
} = {}): Promise<AdminDashboard> {
  const today = normalizeDate(input.now ?? new Date());
  const dateFrom = input.dateFrom ? normalizeDate(input.dateFrom) : undefined;
  const dateTo = input.dateTo ? normalizeDate(input.dateTo) : undefined;
  const userQuery = input.userQuery?.trim();
  const reservationWhere = {
    status: ReservationStatus.ACTIVE,
    ...(input.officeId ? { seat: { desk: { floor: { officeId: input.officeId } } } } : {}),
  };
  const filteredReservationWhere = {
    ...reservationWhere,
    date: {
      gt: today,
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    },
    ...(userQuery
      ? {
          user: {
            OR: [
              { email: { contains: userQuery } },
              { name: { contains: userQuery } },
            ],
          },
        }
      : {}),
  };

  const [
    totalUsers,
    totalOffices,
    todayReservations,
    futureReservations,
    offices,
    users,
    reservations,
    auditLogs,
    closures,
    resourceBlocks,
    floors,
    desks,
    seats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.office.count(),
    prisma.reservation.count({ where: { ...reservationWhere, date: today } }),
    prisma.reservation.count({ where: filteredReservationWhere }),
    prisma.office.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      include: { assignedOffice: true },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    prisma.reservation.findMany({
      where: filteredReservationWhere,
      include: {
        user: true,
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
      orderBy: [{ date: "asc" }, { user: { email: "asc" } }],
    }),
    prisma.auditLog.findMany({
      include: {
        actorUser: true,
        targetUser: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.officeClosure.findMany({
      include: { office: true },
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      take: 50,
    }),
    prisma.resourceBlock.findMany({
      include: {
        office: true,
        floor: true,
        desk: true,
        seat: { include: { desk: true } },
      },
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      take: 50,
    }),
    prisma.floor.findMany({
      include: { office: true },
      orderBy: [{ office: { name: "asc" } }, { floorNum: "asc" }],
    }),
    prisma.desk.findMany({
      include: { floor: { include: { office: true } } },
      orderBy: [{ floor: { office: { name: "asc" } } }, { floor: { floorNum: "asc" } }, { deskNum: "asc" }],
    }),
    prisma.seat.findMany({
      include: { desk: { include: { floor: { include: { office: true } } } } },
      orderBy: [
        { desk: { floor: { office: { name: "asc" } } } },
        { desk: { floor: { floorNum: "asc" } } },
        { desk: { deskNum: "asc" } },
        { seatNum: "asc" },
      ],
    }),
  ]);

  return {
    summary: {
      totalUsers,
      totalOffices,
      todayReservations,
      futureReservations,
    },
    offices: offices.map((office) => ({
      id: office.id,
      code: office.code,
      name: office.name,
      location: office.location,
    })),
    users: users.flatMap((user) => {
      if (!user.assignedOffice) {
        return [];
      }

      return [{
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assignedOfficeId: user.assignedOfficeId,
        assignedOfficeCode: user.assignedOffice.code,
        assignedOfficeName: user.assignedOffice.name,
      }];
    }),
    reservations: reservations.flatMap((reservation) => {
      const seat = reservation.seat;
      const desk = seat?.desk;
      const floor = desk?.floor;
      const office = floor?.office;

      if (!seat || !desk || !floor || !office) {
        return [];
      }

      return [{
        id: reservation.id,
        date: toDateKey(reservation.date),
        userEmail: reservation.user.email,
        userName: reservation.user.name,
        officeId: office.id,
        officeName: office.name,
        floorName: floor.floorName,
        deskName: desk.deskName,
        seatNum: seat.seatNum,
      }];
    }),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorEmail: log.actorUser.email,
      actorName: log.actorUser.name,
      targetUserEmail: log.targetUser?.email,
      reservationId: log.reservationId ?? undefined,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    })),
    closures: closures.map((closure) => ({
      id: closure.id,
      officeName: closure.office.name,
      date: toDateKey(closure.date),
      reason: closure.reason,
    })),
    resourceBlocks: resourceBlocks.map((block) => ({
      id: block.id,
      officeName: block.office.name,
      blockType: block.blockType,
      targetName:
        block.blockType === "OFFICE"
          ? block.office.name
          : block.blockType === "FLOOR"
            ? (block.floor?.floorName ?? "Unknown floor")
            : block.blockType === "DESK"
              ? (block.desk?.deskName ?? "Unknown desk")
              : block.seat
                ? `${block.seat.desk.deskName} / Seat ${block.seat.seatNum}`
                : "Unknown seat",
      date: toDateKey(block.date),
      reason: block.reason,
    })),
    resourceTargets: [
      ...floors.flatMap((floor) => {
        if (!floor.office) {
          return [];
        }

        return [{
          id: floor.id,
          officeId: floor.officeId,
          type: "FLOOR" as const,
          label: `${floor.office.name} / ${floor.floorName || `Floor ${floor.floorNum}`}`,
        }];
      }),
      ...desks.flatMap((desk) => {
        if (!desk.floor?.office) {
          return [];
        }

        return [{
          id: desk.id,
          officeId: desk.floor.officeId,
          type: "DESK" as const,
          label: `${desk.floor.office.name} / ${desk.floor.floorName || `Floor ${desk.floor.floorNum}`} / ${desk.deskName}`,
        }];
      }),
      ...seats.flatMap((seat) => {
        if (!seat.desk?.floor?.office) {
          return [];
        }

        return [{
          id: seat.id,
          officeId: seat.desk.floor.officeId,
          type: "SEAT" as const,
          label: `${seat.desk.floor.office.name} / ${seat.desk.deskName} / Seat ${seat.seatNum}`,
        }];
      }),
    ],
  };
}

export async function createOfficeClosure(input: {
  officeId: string;
  date: Date;
  reason: string;
}) {
  return prisma.officeClosure.upsert({
    where: {
      officeId_date: {
        officeId: input.officeId,
        date: normalizeDate(input.date),
      },
    },
    update: { reason: input.reason },
    create: {
      officeId: input.officeId,
      date: normalizeDate(input.date),
      reason: input.reason,
    },
  });
}

export async function createResourceBlock(input: {
  officeId: string;
  date: Date;
  reason: string;
  blockType: "OFFICE" | "FLOOR" | "DESK" | "SEAT";
  floorId?: string;
  deskId?: string;
  seatId?: string;
}) {
  if (input.blockType === "FLOOR") {
    const floor = input.floorId
      ? await prisma.floor.findFirst({ where: { id: input.floorId, officeId: input.officeId }, select: { id: true } })
      : null;

    if (!floor) {
      throw new Error("Floor does not belong to selected office");
    }
  }

  if (input.blockType === "DESK") {
    const desk = input.deskId
      ? await prisma.desk.findFirst({
          where: { id: input.deskId, floor: { officeId: input.officeId } },
          select: { id: true },
        })
      : null;

    if (!desk) {
      throw new Error("Desk does not belong to selected office");
    }
  }

  if (input.blockType === "SEAT") {
    const seat = input.seatId
      ? await prisma.seat.findFirst({
          where: { id: input.seatId, desk: { floor: { officeId: input.officeId } } },
          select: { id: true },
        })
      : null;

    if (!seat) {
      throw new Error("Seat does not belong to selected office");
    }
  }

  return prisma.resourceBlock.create({
    data: {
      officeId: input.officeId,
      blockType: input.blockType,
      floorId: input.floorId,
      deskId: input.deskId,
      seatId: input.seatId,
      date: normalizeDate(input.date),
      reason: input.reason,
    },
  });
}

export async function updateUserAdminFields(input: {
  actorUserId?: string;
  userId: string;
  role: UserRole;
  assignedOfficeId: string;
}) {
  const previousUser = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { role: true, assignedOfficeId: true },
  });

  if (input.actorUserId === input.userId && previousUser.role === "ADMIN" && input.role !== "ADMIN") {
    throw new Error("Admins cannot remove their own admin role");
  }

  if (previousUser.assignedOfficeId !== input.assignedOfficeId) {
    const futureReservation = await prisma.reservation.findFirst({
      where: {
        userId: input.userId,
        status: ReservationStatus.ACTIVE,
        date: { gt: normalizeDate(new Date()) },
      },
      select: { id: true },
    });

    if (futureReservation) {
      throw new Error("Cancel future reservations before changing office");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: input.userId },
    data: {
      role: input.role,
      assignedOfficeId: input.assignedOfficeId,
    },
  });

  if (input.actorUserId) {
    await prisma.auditLog.create({
      data: {
        action: AuditAction.USER_UPDATED,
        actorUserId: input.actorUserId,
        targetUserId: input.userId,
        details: JSON.stringify({
          role: { from: previousUser.role, to: input.role },
          assignedOfficeId: {
            from: previousUser.assignedOfficeId,
            to: input.assignedOfficeId,
          },
        }),
      },
    });
  }

  return updatedUser;
}

export async function cancelReservationAsAdmin(input: {
  actorUserId?: string;
  reservationId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: input.reservationId,
      status: ReservationStatus.ACTIVE,
    },
  });

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  if (normalizeDate(reservation.date) <= normalizeDate(now)) {
    throw new Error("Only future reservations can be cancelled");
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: ReservationStatus.CANCELLED,
      cancelledAt: now,
    },
  });

  if (input.actorUserId) {
    await prisma.auditLog.create({
      data: {
        action: AuditAction.RESERVATION_CANCELLED,
        actorUserId: input.actorUserId,
        targetUserId: reservation.userId,
        reservationId: reservation.id,
        details: JSON.stringify({
          date: toDateKey(reservation.date),
          seatId: reservation.seatId,
        }),
      },
    });
  }

  return updatedReservation;
}
