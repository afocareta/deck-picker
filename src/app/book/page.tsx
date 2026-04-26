import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/features/auth/current-user";
import { getSeatAvailability, toDateKey } from "@/features/booking/availability";
import { BookingWizard } from "@/features/booking/components/booking-wizard";
import { getBookableDates } from "@/features/booking/date-rules";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function toShellRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "admin" : "user";
}

export default async function BookPage() {
  const user = await getCurrentUser();

  if (!user.officeSelectedAt) {
    redirect("/select-office");
  }

  const bookableDates = getBookableDates();
  const [availability, floorMaps] = await Promise.all([
    getSeatAvailability({
      officeId: user.assignedOffice.id,
      dates: bookableDates,
    }),
    prisma.floor.findMany({
      where: { officeId: user.assignedOffice.id },
      select: { floorNum: true, floorMap: true },
      orderBy: { floorNum: "asc" },
    }),
  ]);

  return (
    <AppShell
      officeName={user.assignedOffice.name}
      role={toShellRole(user.role)}
      userEmail={user.email}
    >
      <BookingWizard
        office={user.assignedOffice}
        bookableDateKeys={bookableDates.map(toDateKey)}
        initialAvailability={availability}
        floorMaps={floorMaps}
      />
    </AppShell>
  );
}
