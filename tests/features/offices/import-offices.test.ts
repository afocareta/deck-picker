import { describe, expect, test } from "vitest";

import { loadOfficeSources } from "../../../src/features/offices/import-offices";

describe("loadOfficeSources", () => {
  test("loads the supported office sources and counts seats", async () => {
    const offices = await loadOfficeSources();

    expect(offices.map((office) => office.code)).toEqual(["cs", "fi", "mi", "rm", "to"]);
    expect(offices.reduce((total, office) => total + office.seatCount, 0)).toBe(82);
  });
});
