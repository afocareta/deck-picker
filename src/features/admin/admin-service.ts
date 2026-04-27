import { AuditAction, ReservationStatus, type ResourceBlockType, type UserRole } from "@prisma/client";

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
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  resourceBlocks: Array<{
    id: string;
    officeName: string;
    blockType: string;
    targetName: string;
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  resourceTargets: Array<{
    id: string;
    officeId: string;
    type: "FLOOR" | "DESK" | "SEAT";
    label: string;
  }>;
};

export type AffectedReservation = {
  id: string;
  date: string;
  userId: string;
  userEmail: string;
  userName: string;
  officeName: string;
  floorName: string;
  deskName: string;
  seatNum: number;
};

type DateRangeInput = {
  startDate: Date;
  endDate: Date;
  now?: Date;
};

type ResourceBlockInput = DateRangeInput & {
  officeId: string;
  reason: string;
  blockType: ResourceBlockType;
  floorId?: string;
  deskId?: string;
  seatId?: string;
};

type OfficeClosureInput = DateRangeInput & {
  officeId: string;
  reason: string;
};

function addUtcDays(date: Date, days: number) {
  return new Date(normalizeDate(date).getTime() + days * 24 * 60 * 60 * 1000);
}

function assertWeekdayRange(input: DateRangeInput) {
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  const today = normalizeDate(input.now ?? new Date());

  if (startDate > endDate) {
    throw new Error("Invalid date range");
  }

  if (startDate <= today) {
    throw new Error("Invalid date range");
  }

  for (let date = startDate; date <= endDate; date = addUtcDays(date, 1)) {
    const day = date.getUTCDay();

    if (day === 0 || day === 6) {
      throw new Error("Closing days can only be set for weekdays");
    }
  }

  return { startDate, endDate };
}

function normalizeAffectedReservation(
  reservation: {
    id: string;
    date: Date;
    userId: string;
    user: { email: string; name: string };
    seat: {
      seatNum: number;
      desk: {
        deskName: string;
        floor: {
          floorName: string;
          office: { name: string };
        };
      };
    };
  },
): AffectedReservation {
  return {
    id: reservation.id,
    date: toDateKey(reservation.date),
    userId: reservation.userId,
    userEmail: reservation.user.email,
    userName: reservation.user.name,
    officeName: reservation.seat.desk.floor.office.name,
    floorName: reservation.seat.desk.floor.floorName,
    deskName: reservation.seat.desk.deskName,
    seatNum: reservation.seat.seatNum,
  };
}

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
      where: { endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      take: 50,
    }),
    prisma.resourceBlock.findMany({
      include: {
        office: true,
        floor: true,
        desk: true,
        seat: { include: { desk: true } },
      },
      where: { endDate: { gte: today } },
      orderBy: { startDate: "asc" },
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
      startDate: toDateKey(closure.startDate),
      endDate: toDateKey(closure.endDate),
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
      startDate: toDateKey(block.startDate),
      endDate: toDateKey(block.endDate),
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

async function affectedReservationsForOfficeClosure(input: OfficeClosureInput): Promise<AffectedReservation[]> {
  const { startDate, endDate } = assertWeekdayRange(input);
  const reservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.ACTIVE,
      date: { gte: startDate, lte: endDate },
      seat: { desk: { floor: { officeId: input.officeId } } },
    },
    include: {
      user: true,
      seat: { include: { desk: { include: { floor: { include: { office: true } } } } } },
    },
    orderBy: [{ date: "asc" }, { user: { email: "asc" } }],
  });

  return reservations.map(normalizeAffectedReservation);
}

async function assertResourceTarget(input: ResourceBlockInput) {
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
}

function resourceReservationWhere(input: ResourceBlockInput) {
  return {
    status: ReservationStatus.ACTIVE,
    seat: { desk: { floor: { officeId: input.officeId } } },
    OR:
      input.blockType === "OFFICE"
        ? undefined
        : input.blockType === "FLOOR"
          ? [{ seat: { desk: { floorId: input.floorId } } }]
          : input.blockType === "DESK"
            ? [{ seat: { deskId: input.deskId } }]
            : [{ seatId: input.seatId }],
  };
}

async function affectedReservationsForResourceBlock(input: ResourceBlockInput): Promise<AffectedReservation[]> {
  const { startDate, endDate } = assertWeekdayRange(input);
  await assertResourceTarget(input);
  const reservations = await prisma.reservation.findMany({
    where: {
      ...resourceReservationWhere(input),
      date: { gte: startDate, lte: endDate },
    },
    include: {
      user: true,
      seat: { include: { desk: { include: { floor: { include: { office: true } } } } } },
    },
    orderBy: [{ date: "asc" }, { user: { email: "asc" } }],
  });

  return reservations.map(normalizeAffectedReservation);
}

export async function previewOfficeClosureImpact(input: OfficeClosureInput) {
  const { startDate, endDate } = assertWeekdayRange(input);

  return {
    type: "OFFICE_CLOSURE" as const,
    officeId: input.officeId,
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    reason: input.reason,
    affectedReservations: await affectedReservationsForOfficeClosure(input),
  };
}

export async function previewResourceBlockImpact(input: ResourceBlockInput) {
  const { startDate, endDate } = assertWeekdayRange(input);

  return {
    type: "RESOURCE_BLOCK" as const,
    officeId: input.officeId,
    blockType: input.blockType,
    targetId: input.blockType === "FLOOR" ? input.floorId : input.blockType === "DESK" ? input.deskId : input.blockType === "SEAT" ? input.seatId : "",
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    reason: input.reason,
    affectedReservations: await affectedReservationsForResourceBlock(input),
  };
}

export async function confirmOfficeClosure(input: OfficeClosureInput & { actorUserId: string }) {
  const { startDate, endDate } = assertWeekdayRange(input);
  const affectedReservations = await affectedReservationsForOfficeClosure(input);
  const reservationIds = affectedReservations.map((reservation) => reservation.id);
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const period = await tx.officeClosure.create({
      data: {
        officeId: input.officeId,
        startDate,
        endDate,
        reason: input.reason,
      },
    });

    if (reservationIds.length > 0) {
      await tx.reservation.updateMany({
        where: { id: { in: reservationIds }, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: now },
      });
    }

    await tx.auditLog.create({
      data: {
        action: AuditAction.OFFICE_CLOSURE_CREATED,
        actorUserId: input.actorUserId,
        details: JSON.stringify({
          closureId: period.id,
          officeId: input.officeId,
          startDate: toDateKey(startDate),
          endDate: toDateKey(endDate),
          reason: input.reason,
          cancelledReservationCount: reservationIds.length,
        }),
      },
    });

    await Promise.all(
      affectedReservations.map((reservation) =>
        tx.auditLog.create({
          data: {
            action: AuditAction.RESERVATION_CANCELLED,
            actorUserId: input.actorUserId,
            targetUserId: reservation.userId,
            reservationId: reservation.id,
            details: JSON.stringify({
              reason: "Office closure",
              closureId: period.id,
              date: reservation.date,
            }),
          },
        }),
      ),
    );

    return { period, cancelledReservations: affectedReservations };
  });
}

export async function confirmResourceBlock(input: ResourceBlockInput & { actorUserId: string }) {
  const { startDate, endDate } = assertWeekdayRange(input);
  await assertResourceTarget(input);
  const affectedReservations = await affectedReservationsForResourceBlock(input);
  const reservationIds = affectedReservations.map((reservation) => reservation.id);
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const period = await tx.resourceBlock.create({
      data: {
        officeId: input.officeId,
        blockType: input.blockType,
        floorId: input.floorId,
        deskId: input.deskId,
        seatId: input.seatId,
        startDate,
        endDate,
        reason: input.reason,
      },
    });

    if (reservationIds.length > 0) {
      await tx.reservation.updateMany({
        where: { id: { in: reservationIds }, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: now },
      });
    }

    await tx.auditLog.create({
      data: {
        action: AuditAction.RESOURCE_BLOCK_CREATED,
        actorUserId: input.actorUserId,
        details: JSON.stringify({
          blockId: period.id,
          officeId: input.officeId,
          blockType: input.blockType,
          floorId: input.floorId,
          deskId: input.deskId,
          seatId: input.seatId,
          startDate: toDateKey(startDate),
          endDate: toDateKey(endDate),
          reason: input.reason,
          cancelledReservationCount: reservationIds.length,
        }),
      },
    });

    await Promise.all(
      affectedReservations.map((reservation) =>
        tx.auditLog.create({
          data: {
            action: AuditAction.RESERVATION_CANCELLED,
            actorUserId: input.actorUserId,
            targetUserId: reservation.userId,
            reservationId: reservation.id,
            details: JSON.stringify({
              reason: "Resource unavailable",
              blockId: period.id,
              date: reservation.date,
            }),
          },
        }),
      ),
    );

    return { period, cancelledReservations: affectedReservations };
  });
}

export async function removeOfficeClosure(input: { actorUserId: string; closureId: string; now?: Date }) {
  const today = normalizeDate(input.now ?? new Date());
  const closure = await prisma.officeClosure.findUniqueOrThrow({ where: { id: input.closureId } });

  if (closure.endDate <= today) {
    throw new Error("Only future closure periods can be removed");
  }

  await prisma.$transaction([
    prisma.officeClosure.delete({ where: { id: input.closureId } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.OFFICE_CLOSURE_REMOVED,
        actorUserId: input.actorUserId,
        details: JSON.stringify({
          closureId: input.closureId,
          officeId: closure.officeId,
          startDate: toDateKey(closure.startDate),
          endDate: toDateKey(closure.endDate),
          reason: closure.reason,
        }),
      },
    }),
  ]);
}

export async function removeResourceBlock(input: { actorUserId: string; blockId: string; now?: Date }) {
  const today = normalizeDate(input.now ?? new Date());
  const block = await prisma.resourceBlock.findUniqueOrThrow({ where: { id: input.blockId } });

  if (block.endDate <= today) {
    throw new Error("Only future resource block periods can be removed");
  }

  await prisma.$transaction([
    prisma.resourceBlock.delete({ where: { id: input.blockId } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.RESOURCE_BLOCK_REMOVED,
        actorUserId: input.actorUserId,
        details: JSON.stringify({
          blockId: input.blockId,
          officeId: block.officeId,
          blockType: block.blockType,
          floorId: block.floorId,
          deskId: block.deskId,
          seatId: block.seatId,
          startDate: toDateKey(block.startDate),
          endDate: toDateKey(block.endDate),
          reason: block.reason,
        }),
      },
    }),
  ]);
}

export async function createOfficeClosure(input: OfficeClosureInput) {
  const { startDate, endDate } = assertWeekdayRange(input);

  return prisma.officeClosure.create({
    data: { officeId: input.officeId, startDate, endDate, reason: input.reason },
  });
}

export async function createResourceBlock(input: ResourceBlockInput) {
  const { startDate, endDate } = assertWeekdayRange(input);
  await assertResourceTarget(input);

  return prisma.resourceBlock.create({
    data: {
      officeId: input.officeId,
      blockType: input.blockType,
      floorId: input.floorId,
      deskId: input.deskId,
      seatId: input.seatId,
      startDate,
      endDate,
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
