"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/current-user";
import { selectUserOffice } from "@/features/onboarding/office-selection-service";

export async function changeOfficeAction(formData: FormData) {
  const officeId = formData.get("officeId");

  if (typeof officeId !== "string" || officeId.length === 0) {
    redirect("/settings/office?error=Office is required");
  }

  try {
    const user = await getCurrentUser();

    await selectUserOffice({
      userId: user.id,
      officeId,
    });

    revalidatePath("/settings/office");
    revalidatePath("/dashboard");
    revalidatePath("/book");
  } catch (error) {
    redirect(`/settings/office?error=${encodeURIComponent(error instanceof Error ? error.message : "Office change failed")}`);
  }

  redirect("/dashboard");
}
