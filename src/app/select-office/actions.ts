"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/current-user";
import { selectUserOffice } from "@/features/onboarding/office-selection-service";

export async function selectOfficeAction(formData: FormData) {
  const officeId = formData.get("officeId");

  if (typeof officeId !== "string" || officeId.length === 0) {
    throw new Error("Office is required");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await selectUserOffice({
    userId: user.id,
    officeId,
  });

  redirect("/dashboard");
}
