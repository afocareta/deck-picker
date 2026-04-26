import { execFileSync } from "node:child_process";

import { expect, test } from "playwright/test";

import { getBookableDates } from "../../src/features/booking/date-rules";
import { prisma } from "../../src/lib/prisma";

const DEV_USER_EMAIL = "dev.user@example.com";

test.beforeAll(() => {
  execFileSync("npm", ["run", "db:seed"], { stdio: "inherit" });
});

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDashboardDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

async function findOpenDevUserDate(): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: DEV_USER_EMAIL },
    select: { id: true },
  });
  const bookedDates = await prisma.reservation.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      date: { in: getBookableDates() },
    },
    select: { date: true },
  });
  const bookedDateKeys = new Set(bookedDates.map((reservation) => toDateKey(reservation.date)));
  const openDate = getBookableDates().find((date) => !bookedDateKeys.has(toDateKey(date)));

  if (!openDate) {
    throw new Error("No open dev-user booking date available for E2E test");
  }

  return toDateKey(openDate);
}

test("books a spot and shows the reservation on the dashboard", async ({ page }) => {
  const bookingDate = await findOpenDevUserDate();

  await page.goto("/auth/dev");

  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Book a Spot" }).first().click();

  await expect(page.getByRole("heading", { level: 1, name: "Book a Spot" })).toBeVisible();
  await page.getByRole("textbox", { name: "Date" }).fill(bookingDate);

  await page.getByRole("button", { name: "Continue to Desk Selection" }).click();

  await expect(page.getByRole("heading", { name: "Select Workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Auto-assign" }).click();

  await expect(page.getByRole("heading", { name: "Confirmation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Booked dates" })).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).last().click();

  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  const upcomingReservations = page.getByRole("region", {
    name: "Upcoming Reservations",
  });

  await expect(
    upcomingReservations.getByRole("button", { name: /Cancel reservation for/ }).first(),
  ).toBeVisible();
  await expect(upcomingReservations).toContainText(formatDashboardDate(bookingDate));
  await expect(upcomingReservations).toContainText(/Seat \d+/);
});
