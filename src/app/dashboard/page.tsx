import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/features/auth/current-user";
import { UserDashboard } from "@/features/dashboard/components/user-dashboard";
import { getUserDashboard } from "@/features/dashboard/dashboard-service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function toShellRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "admin" : "user";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.officeSelectedAt) {
    redirect("/select-office");
  }

  const dashboard = await getUserDashboard(user.id);

  return (
    <AppShell
      officeName={user.assignedOffice.name}
      role={toShellRole(user.role)}
      userEmail={user.email}
    >
      <UserDashboard dashboard={dashboard} />
    </AppShell>
  );
}
