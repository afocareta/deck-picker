const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BOOKING_HORIZON_DAYS = 21;

export function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(normalizeDate(date).getTime() + days * DAY_IN_MS);
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();

  return day === 0 || day === 6;
}

export function isBookableDate(candidate: Date, baseDate = new Date()): boolean {
  const normalizedCandidate = normalizeDate(candidate);
  const startDate = addUtcDays(baseDate, 1);
  const endDate = addUtcDays(baseDate, BOOKING_HORIZON_DAYS);

  return (
    normalizedCandidate >= startDate &&
    normalizedCandidate <= endDate &&
    !isWeekend(normalizedCandidate)
  );
}

export function getBookableDates(baseDate = new Date()): Date[] {
  const dates: Date[] = [];

  for (let dayOffset = 1; dayOffset <= BOOKING_HORIZON_DAYS; dayOffset += 1) {
    const candidate = addUtcDays(baseDate, dayOffset);

    if (!isWeekend(candidate)) {
      dates.push(candidate);
    }
  }

  return dates;
}
