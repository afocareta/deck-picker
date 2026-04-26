"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CalendarX, LockKeyhole, Shield, Users } from "lucide-react";

import {
  cancelReservationAdminAction,
  createOfficeClosureAction,
  createResourceBlockAction,
  updateUserAdminAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { AdminDashboard } from "@/features/admin/admin-service";

type AdminControlRoomProps = {
  dashboard: AdminDashboard;
  filters: {
    selectedOfficeId: string;
    dateFrom: string;
    dateTo: string;
    userQuery: string;
    tab: AdminTab;
    success: string;
    error: string;
  };
};

type AdminTab = "overview" | "users" | "reservations" | "availability" | "audit";
type ResourceBlockType = "OFFICE" | AdminDashboard["resourceTargets"][number]["type"];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(dateKey: string) {
  return dateFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </h2>
        <span className="text-[var(--color-primary)]">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-[var(--color-text)]">{value}</p>
    </article>
  );
}

export function AdminControlRoom({ dashboard, filters }: AdminControlRoomProps) {
  const [tab, setTab] = useState<AdminTab>(filters.tab);
  const [resourceBlockType, setResourceBlockType] = useState<ResourceBlockType>("SEAT");
  const resourceBlockTargets =
    resourceBlockType === "OFFICE"
      ? []
      : dashboard.resourceTargets.filter((target) => target.type === resourceBlockType);

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "reservations", label: "Reservations" },
    { id: "availability", label: "Availability" },
    { id: "audit", label: "Audit" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[15px] font-medium text-[var(--color-text-muted)]">
            Admin control room
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 text-[var(--color-text)]">
            Workspace Operations
          </h1>
        </div>
        <div className="flex rounded-lg border border-[var(--color-border)] bg-white p-1 shadow-[var(--shadow-panel)]">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-10 rounded-md px-4 text-sm font-semibold ${
                tab === item.id
                  ? "bg-[var(--color-surface-strong)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filters.success ? (
        <div className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-success)]">
          {filters.success}
        </div>
      ) : null}

      {filters.error ? (
        <div className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
          {filters.error}
        </div>
      ) : null}

      {tab === "overview" ? (
        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Users"
            value={dashboard.summary.totalUsers.toString()}
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
          />
          <SummaryCard
            label="Offices"
            value={dashboard.summary.totalOffices.toString()}
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          />
          <SummaryCard
            label="Today"
            value={dashboard.summary.todayReservations.toString()}
            icon={<Shield className="h-5 w-5" aria-hidden="true" />}
          />
          <SummaryCard
            label="Future"
            value={dashboard.summary.futureReservations.toString()}
            icon={<CalendarX className="h-5 w-5" aria-hidden="true" />}
          />
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-[var(--color-surface-strong)] text-white">
                <tr>
                  <th className="px-4 py-3 font-black uppercase">User</th>
                  <th className="px-4 py-3 font-black uppercase">Role</th>
                  <th className="px-4 py-3 font-black uppercase">Office</th>
                  <th className="px-4 py-3 text-right font-black uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {dashboard.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--color-text)]">{user.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <form id={`user-${user.id}`} action={updateUserAdminAction} className="contents">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        form={`user-${user.id}`}
                        name="assignedOfficeId"
                        defaultValue={user.assignedOfficeId}
                        className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium"
                      >
                        {dashboard.offices.map((office) => (
                          <option key={office.id} value={office.id}>
                            {office.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        form={`user-${user.id}`}
                        type="submit"
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "reservations" ? (
        <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Future Reservations</h2>
          </div>
          <form method="get" className="grid gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4 md:grid-cols-[1fr_160px_160px_160px_auto]">
            <input type="hidden" name="tab" value="reservations" />
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              User
              <input
                name="userQuery"
                defaultValue={filters.userQuery}
                placeholder="Name or email"
                className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              From
              <input
                name="dateFrom"
                type="date"
                defaultValue={filters.dateFrom}
                className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              To
              <input
                name="dateTo"
                type="date"
                defaultValue={filters.dateTo}
                className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Office
              <select
                name="officeId"
                defaultValue={filters.selectedOfficeId}
                className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
              >
                <option value="all">All</option>
                {dashboard.offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.code}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
              >
                Filter
              </button>
              <Link
                href="/admin?tab=reservations"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Reset
              </Link>
            </div>
          </form>
          <div className="overflow-x-auto">
            {dashboard.reservations.length > 0 ? (
              <table className="min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-[var(--color-surface-strong)] text-white">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase">Date</th>
                    <th className="px-4 py-3 font-black uppercase">User</th>
                    <th className="px-4 py-3 font-black uppercase">Office</th>
                    <th className="px-4 py-3 font-black uppercase">Seat</th>
                    <th className="px-4 py-3 text-right font-black uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {dashboard.reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        {formatDate(reservation.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--color-text)]">{reservation.userName}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{reservation.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">{reservation.officeName}</td>
                      <td className="px-4 py-3">
                        {reservation.floorName} / {reservation.deskName} / Seat {reservation.seatNum}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={cancelReservationAdminAction}>
                          <input type="hidden" name="reservationId" value={reservation.id} />
                        <ConfirmSubmitButton
                          message="Cancel this reservation?"
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white"
                        >
                          Cancel
                        </ConfirmSubmitButton>
                      </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-10">
                <p className="font-semibold text-[var(--color-text)]">No future reservations found</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Adjust filters or reset the reservation view.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Audit Log</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Latest admin role, office, and reservation actions.
            </p>
          </div>
          <div className="overflow-x-auto">
            {dashboard.auditLogs.length > 0 ? (
              <table className="min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-[var(--color-surface-strong)] text-white">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase">Time</th>
                    <th className="px-4 py-3 font-black uppercase">Action</th>
                    <th className="px-4 py-3 font-black uppercase">Actor</th>
                    <th className="px-4 py-3 font-black uppercase">Target</th>
                    <th className="px-4 py-3 font-black uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {dashboard.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        {new Date(log.createdAt).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-black text-[var(--color-primary)]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--color-text)]">{log.actorName}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{log.actorEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        {log.targetUserEmail ?? log.reservationId ?? "-"}
                      </td>
                      <td className="max-w-[360px] truncate px-4 py-3 text-[var(--color-text-muted)]" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-10">
                <p className="font-semibold text-[var(--color-text)]">No admin actions yet</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Changes to users and admin cancellations will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "availability" ? (
        <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            <form
              action={createOfficeClosureAction}
              className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-panel)]"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-[var(--color-danger-soft)] p-2 text-[var(--color-danger)]">
                  <CalendarX className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Office Closure</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Office
                  <select
                    name="officeId"
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  >
                    {dashboard.offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Date
                  <input
                    name="date"
                    type="date"
                    required
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Reason
                  <input
                    name="reason"
                    required
                    placeholder="Holiday, maintenance..."
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Save Closure
                </button>
              </div>
            </form>

            <form
              action={createResourceBlockAction}
              className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-panel)]"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary)]">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Resource Block</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Office
                  <select
                    name="officeId"
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  >
                    {dashboard.offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Type
                  <select
                    name="blockType"
                    value={resourceBlockType}
                    onChange={(event) => setResourceBlockType(event.target.value as ResourceBlockType)}
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  >
                    <option value="OFFICE">OFFICE</option>
                    <option value="FLOOR">FLOOR</option>
                    <option value="DESK">DESK</option>
                    <option value="SEAT">SEAT</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Target
                  <select
                    key={resourceBlockType}
                    name="targetId"
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  >
                    <option value="">
                      {resourceBlockType === "OFFICE"
                        ? "Whole office"
                        : `Choose ${resourceBlockType.toLowerCase()}`}
                    </option>
                    {resourceBlockTargets.map((target) => (
                      <option key={`${target.type}-${target.id}`} value={target.id}>
                        {target.type} / {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Date
                  <input
                    name="date"
                    type="date"
                    required
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Reason
                  <input
                    name="reason"
                    required
                    placeholder="Broken monitor, maintenance..."
                    className="min-h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[var(--color-text)]"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Save Block
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
              <div className="border-b border-[var(--color-border)] px-5 py-4">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Upcoming Closures</h2>
              </div>
              {dashboard.closures.length > 0 ? (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[var(--color-surface-strong)] text-white">
                    <tr>
                      <th className="px-4 py-3 font-black uppercase">Date</th>
                      <th className="px-4 py-3 font-black uppercase">Office</th>
                      <th className="px-4 py-3 font-black uppercase">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {dashboard.closures.map((closure) => (
                      <tr key={closure.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatDate(closure.date)}</td>
                        <td className="px-4 py-3">{closure.officeName}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{closure.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-8 text-sm font-semibold text-[var(--color-text-muted)]">
                  No office closures scheduled
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
              <div className="border-b border-[var(--color-border)] px-5 py-4">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Upcoming Resource Blocks</h2>
              </div>
              {dashboard.resourceBlocks.length > 0 ? (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[var(--color-surface-strong)] text-white">
                    <tr>
                      <th className="px-4 py-3 font-black uppercase">Date</th>
                      <th className="px-4 py-3 font-black uppercase">Office</th>
                      <th className="px-4 py-3 font-black uppercase">Target</th>
                      <th className="px-4 py-3 font-black uppercase">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {dashboard.resourceBlocks.map((block) => (
                      <tr key={block.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatDate(block.date)}</td>
                        <td className="px-4 py-3">{block.officeName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-black text-[var(--color-primary)]">
                            {block.blockType}
                          </span>{" "}
                          {block.targetName}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{block.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-8 text-sm font-semibold text-[var(--color-text-muted)]">
                  No resource blocks scheduled
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
