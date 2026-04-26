import { describe, expect, test } from "vitest";

import { getBookableDates, isBookableDate } from "../../../src/features/booking/date-rules";

const base = new Date("2026-04-24T12:00:00.000Z");

describe("booking date rules", () => {
  test("rejects today", () => {
    expect(isBookableDate(new Date("2026-04-24T23:59:59.999Z"), base)).toBe(false);
  });

  test("accepts the next weekday", () => {
    expect(isBookableDate(new Date("2026-04-27T08:30:00.000Z"), base)).toBe(true);
  });

  test("rejects weekends", () => {
    expect(isBookableDate(new Date("2026-04-25T12:00:00.000Z"), base)).toBe(false);
    expect(isBookableDate(new Date("2026-04-26T12:00:00.000Z"), base)).toBe(false);
  });

  test("rejects dates beyond 21 calendar days", () => {
    expect(isBookableDate(new Date("2026-05-15T12:00:00.000Z"), base)).toBe(true);
    expect(isBookableDate(new Date("2026-05-16T00:00:00.000Z"), base)).toBe(false);
  });

  test("returns only weekdays in the booking horizon", () => {
    const dates = getBookableDates(base);

    expect(dates).toHaveLength(15);
    expect(dates.at(0)?.toISOString()).toBe("2026-04-27T00:00:00.000Z");
    expect(dates.at(-1)?.toISOString()).toBe("2026-05-15T00:00:00.000Z");
    expect(dates.every((date) => isBookableDate(date, base))).toBe(true);
    expect(dates.map((date) => date.getUTCDay())).not.toContain(0);
    expect(dates.map((date) => date.getUTCDay())).not.toContain(6);
  });
});
