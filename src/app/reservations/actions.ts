"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  autoAssignAndBook,
  bookSelectedSeat,
  cancelReservation,
  type BookingResult,
} from "@/features/booking/booking-service";
import { getCurrentUser } from "@/features/auth/current-user";
import { prisma } from "@/lib/prisma";

export type BookingSeatDetails = {
  seatId: string;
  floorNum: number;
  floorName: string;
  deskNum: number;
  deskName: string;
  seatNum: number;
};

export type BookingActionResult = BookingResult & {
  seat?: BookingSeatDetails;
};

export type BookingActionState =
  | { ok: true; result: BookingActionResult }
  | { ok: false; error: string };

type BookingActionInput = {
  officeId: string;
  dateKeys: string[];
};

type SelectedSeatBookingActionInput = BookingActionInput & {
  seatId: string;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateKeys(dateKeys: string[]): Date[] {
  return [...new Set(dateKeys)].map((dateKey) => {
    if (!DATE_KEY_PATTERN.test(dateKey)) {
      throw new Error("Invalid date");
    }

    const date = new Date(`${dateKey}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return date;
  });
}

async function assertCurrentUserOffice(officeId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.assignedOffice.id !== officeId) {
    throw new Error("Office is not assigned to this user");
  }

  return user;
}

function toSeatDetails(
  seat: {
    id: string;
    seatNum: number;
    desk: {
      deskNum: number;
      deskName: string;
      floor: {
        floorNum: number;
        floorName: string;
      };
    };
  },
): BookingSeatDetails {
  return {
    seatId: seat.id,
    floorNum: seat.desk.floor.floorNum,
    floorName: seat.desk.floor.floorName,
    deskNum: seat.desk.deskNum,
    deskName: seat.desk.deskName,
    seatNum: seat.seatNum,
  };
}

async function getSeatDetailsForSeat(seatId: string, officeId: string): Promise<BookingSeatDetails | undefined> {
  const seat = await prisma.seat.findFirst({
    where: { id: seatId, desk: { floor: { officeId } } },
    include: { desk: { include: { floor: true } } },
  });

  return seat ? toSeatDetails(seat) : undefined;
}

async function getSeatDetailsForBooking(result: BookingResult): Promise<BookingSeatDetails | undefined> {
  const firstBooking = result.booked[0];

  if (!firstBooking) {
    return undefined;
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: firstBooking.reservationId },
    include: { seat: { include: { desk: { include: { floor: true } } } } },
  });

  return reservation ? toSeatDetails(reservation.seat) : undefined;
}

export async function cancelReservationAction(formData: FormData) {
  const reservationId = formData.get("reservationId");

  if (typeof reservationId !== "string" || reservationId.length === 0) {
    throw new Error("Reservation id is required");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await cancelReservation({
    userId: user.id,
    reservationId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/book");
}

export async function bookSelectedSeatAction(
  input: SelectedSeatBookingActionInput,
): Promise<BookingActionState> {
  try {
    if (input.seatId.length === 0 || input.dateKeys.length === 0) {
      return { ok: false, error: "Choose a seat and date" };
    }

    const user = await assertCurrentUserOffice(input.officeId);
    const result = await bookSelectedSeat({
      userId: user.id,
      officeId: input.officeId,
      seatId: input.seatId,
      dates: parseDateKeys(input.dateKeys),
    });
    const seat =
      (await getSeatDetailsForBooking(result)) ??
      (await getSeatDetailsForSeat(input.seatId, input.officeId));

    revalidatePath("/dashboard");
    revalidatePath("/book");

    return { ok: true, result: { ...result, seat } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reservation failed",
    };
  }
}

export async function autoAssignBookingAction(
  input: BookingActionInput,
): Promise<BookingActionState> {
  try {
    if (input.dateKeys.length === 0) {
      return { ok: false, error: "Choose a date" };
    }

    const user = await assertCurrentUserOffice(input.officeId);
    const result = await autoAssignAndBook({
      userId: user.id,
      officeId: input.officeId,
      dates: parseDateKeys(input.dateKeys),
    });
    const seat = await getSeatDetailsForBooking(result);

    revalidatePath("/dashboard");
    revalidatePath("/book");

    return { ok: true, result: { ...result, seat } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reservation failed",
    };
  }
}
