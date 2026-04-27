"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResourceBlockType } from "@prisma/client";

import {
  cancelReservationAsAdmin,
  confirmOfficeClosure,
  confirmResourceBlock,
  previewOfficeClosureImpact,
  previewResourceBlockImpact,
  removeOfficeClosure,
  removeResourceBlock,
  updateUserAdminFields,
} from "@/features/admin/admin-service";
import { getCurrentUser } from "@/features/auth/current-user";

export type AvailabilityActionState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null;

export type AvailabilityPreviewState =
  | Awaited<ReturnType<typeof previewOfficeClosureImpact>>
  | Awaited<ReturnType<typeof previewResourceBlockImpact>>
  | { ok: false; error: string }
  | null;

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

function parseTextField(formData: FormData, name: string, label: string) {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }

  return value.trim();
}

function parseRange(formData: FormData) {
  return {
    startDate: parseDateField(formData.get("startDate")),
    endDate: parseDateField(formData.get("endDate")),
  };
}

function parseBlockInput(formData: FormData) {
  const officeId = parseTextField(formData, "officeId", "Office");
  const blockType = formData.get("blockType");
  const targetId = formData.get("targetId");
  const reason = parseTextField(formData, "reason", "Reason");

  if (blockType !== "OFFICE" && blockType !== "FLOOR" && blockType !== "DESK" && blockType !== "SEAT") {
    throw new Error("Block type is required");
  }

  if (blockType !== "OFFICE" && (typeof targetId !== "string" || targetId.length === 0)) {
    throw new Error("Target is required");
  }

  const typedBlockType: ResourceBlockType = blockType;

  return {
    officeId,
    blockType: typedBlockType,
    reason,
    ...parseRange(formData),
    floorId: typedBlockType === "FLOOR" ? String(targetId) : undefined,
    deskId: typedBlockType === "DESK" ? String(targetId) : undefined,
    seatId: typedBlockType === "SEAT" ? String(targetId) : undefined,
  };
}

function parseClosureInput(formData: FormData) {
  return {
    officeId: parseTextField(formData, "officeId", "Office"),
    reason: parseTextField(formData, "reason", "Reason"),
    ...parseRange(formData),
  };
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

export async function previewOfficeClosureAction(
  _previousState: AvailabilityPreviewState,
  formData: FormData,
): Promise<AvailabilityPreviewState> {
  try {
    await assertCurrentAdmin();
    return previewOfficeClosureImpact(parseClosureInput(formData));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Closure preview failed" };
  }
}

export async function confirmOfficeClosureAction(
  _previousState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  try {
    const admin = await assertCurrentAdmin();
    const result = await confirmOfficeClosure({ actorUserId: admin.id, ...parseClosureInput(formData) });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/book");
    revalidatePath("/search");
    return { ok: true, message: `Office closure saved. ${result.cancelledReservations.length} reservations cancelled.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Closure failed" };
  }
}

export async function previewResourceBlockAction(
  _previousState: AvailabilityPreviewState,
  formData: FormData,
): Promise<AvailabilityPreviewState> {
  try {
    await assertCurrentAdmin();
    return previewResourceBlockImpact(parseBlockInput(formData));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Resource block preview failed" };
  }
}

export async function confirmResourceBlockAction(
  _previousState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  try {
    const admin = await assertCurrentAdmin();
    const result = await confirmResourceBlock({ actorUserId: admin.id, ...parseBlockInput(formData) });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/book");
    revalidatePath("/search");
    return { ok: true, message: `Resource block saved. ${result.cancelledReservations.length} reservations cancelled.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Resource block failed" };
  }
}

export async function removeOfficeClosureAction(formData: FormData) {
  try {
    const admin = await assertCurrentAdmin();
    const closureId = parseTextField(formData, "closureId", "Closure");

    await removeOfficeClosure({ actorUserId: admin.id, closureId });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/book");
  } catch (error) {
    redirect(`/admin?tab=availability&error=${encodeURIComponent(error instanceof Error ? error.message : "Remove closure failed")}`);
  }

  redirect("/admin?tab=availability&success=Office closure removed");
}

export async function removeResourceBlockAction(formData: FormData) {
  try {
    const admin = await assertCurrentAdmin();
    const blockId = parseTextField(formData, "blockId", "Resource block");

    await removeResourceBlock({ actorUserId: admin.id, blockId });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/book");
  } catch (error) {
    redirect(`/admin?tab=availability&error=${encodeURIComponent(error instanceof Error ? error.message : "Remove resource block failed")}`);
  }

  redirect("/admin?tab=availability&success=Resource block removed");
}
