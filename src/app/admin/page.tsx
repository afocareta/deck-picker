import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAdminDashboard } from "@/features/admin/admin-service";
import { AdminControlRoom } from "@/features/admin/components/admin-control-room";
import { getCurrentUser } from "@/features/auth/current-user";

export const dynamic = "force-dynamic";

function toShellRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "admin" : "user";
}

type AdminPageProps = {
  searchParams: Promise<{
    officeId?: string;
    dateFrom?: string;
    dateTo?: string;
    userQuery?: string;
    tab?: string;
    success?: string;
    error?: string;
  }>;
};

function parseDateParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const officeId = params.officeId && params.officeId !== "all" ? params.officeId : undefined;
  const dashboard = await getAdminDashboard({
    officeId,
    dateFrom: parseDateParam(params.dateFrom),
    dateTo: parseDateParam(params.dateTo),
    userQuery: params.userQuery,
  });

  return (
    <AppShell
      officeName={user.assignedOffice.name}
      role={toShellRole(user.role)}
      userEmail={user.email}
    >
      <AdminControlRoom
        dashboard={dashboard}
        filters={{
          selectedOfficeId: params.officeId ?? "all",
          dateFrom: params.dateFrom ?? "",
          dateTo: params.dateTo ?? "",
          userQuery: params.userQuery ?? "",
          tab:
            params.tab === "users" ||
            params.tab === "reservations" ||
            params.tab === "audit" ||
            params.tab === "availability"
              ? params.tab
              : "overview",
          success: params.success ?? "",
          error: params.error ?? "",
        }}
      />
    </AppShell>
  );
}
