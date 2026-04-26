"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelReservationAsAdmin,
  createOfficeClosure,
  createResourceBlock,
  updateUserAdminFields,
} from "@/features/admin/admin-service";
import { getCurrentUser } from "@/features/auth/current-user";

async function assertCurrentAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return user;
}

function parseDateField(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Valid date is required");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Valid date is required");
  }

  return date;
}

export async function updateUserAdminAction(formData: FormData) {
  try {
    const admin = await assertCurrentAdmin();

    const userId = formData.get("userId");
    const role = formData.get("role");
    const assignedOfficeId = formData.get("assignedOfficeId");

    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("User id is required");
    }

    if (role !== "USER" && role !== "ADMIN") {
      throw new Error("Invalid role");
    }

    if (typeof assignedOfficeId !== "string" || assignedOfficeId.length === 0) {
      throw new Error("Office is required");
    }

    await updateUserAdminFields({ actorUserId: admin.id, userId, role, assignedOfficeId });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(`/admin?tab=users&error=${encodeURIComponent(error instanceof Error ? error.message : "Update failed")}`);
  }

  redirect("/admin?tab=users&success=User updated");
}

export async function cancelReservationAdminAction(formData: FormData) {
  try {
    const admin = await assertCurrentAdmin();

    const reservationId = formData.get("reservationId");

    if (typeof reservationId !== "string" || reservationId.length === 0) {
      throw new Error("Reservation id is required");
    }

    await cancelReservationAsAdmin({ actorUserId: admin.id, reservationId });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/book");
  } catch (error) {
    redirect(`/admin?tab=reservations&error=${encodeURIComponent(error instanceof Error ? error.message : "Cancel failed")}`);
  }

  redirect("/admin?tab=reservations&success=Reservation cancelled");
}

export async function createOfficeClosureAction(formData: FormData) {
  try {
    await assertCurrentAdmin();

    const officeId = formData.get("officeId");
    const reason = formData.get("reason");

    if (typeof officeId !== "string" || officeId.length === 0) {
      throw new Error("Office is required");
    }

    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error("Reason is required");
    }

    await createOfficeClosure({
      officeId,
      date: parseDateField(formData.get("date")),
      reason: reason.trim(),
    });

    revalidatePath("/admin");
  } catch (error) {
    redirect(`/admin?tab=availability&error=${encodeURIComponent(error instanceof Error ? error.message : "Closure failed")}`);
  }

  redirect("/admin?tab=availability&success=Office closure saved");
}

export async function createResourceBlockAction(formData: FormData) {
  try {
    await assertCurrentAdmin();

    const officeId = formData.get("officeId");
    const blockType = formData.get("blockType");
    const targetId = formData.get("targetId");
    const reason = formData.get("reason");

    if (typeof officeId !== "string" || officeId.length === 0) {
      throw new Error("Office is required");
    }

    if (blockType !== "OFFICE" && blockType !== "FLOOR" && blockType !== "DESK" && blockType !== "SEAT") {
      throw new Error("Block type is required");
    }

    if (blockType !== "OFFICE" && (typeof targetId !== "string" || targetId.length === 0)) {
      throw new Error("Target is required");
    }

    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error("Reason is required");
    }

    await createResourceBlock({
      officeId,
      blockType,
      date: parseDateField(formData.get("date")),
      reason: reason.trim(),
      floorId: blockType === "FLOOR" ? String(targetId) : undefined,
      deskId: blockType === "DESK" ? String(targetId) : undefined,
      seatId: blockType === "SEAT" ? String(targetId) : undefined,
    });

    revalidatePath("/admin");
  } catch (error) {
    redirect(`/admin?tab=availability&error=${encodeURIComponent(error instanceof Error ? error.message : "Resource block failed")}`);
  }

  redirect("/admin?tab=availability&success=Resource block saved");
}
