import { execFileSync } from "node:child_process";

import { expect, test } from "playwright/test";

test.beforeAll(() => {
  execFileSync("npm", ["run", "db:seed"], { stdio: "inherit" });
});

test("filters resource block targets when type changes", async ({ page }) => {
  await page.goto("/auth/dev/admin");
  await page.goto("/admin?tab=availability");

  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: "Resource Block" }),
  });
  const type = form.locator('select[name="blockType"]');
  const target = form.locator('select[name="targetId"]');
  const targetOptions = async () =>
    target.locator("option").evaluateAll((options) =>
      options.map((option) => option.textContent?.trim() ?? ""),
    );

  await type.selectOption("FLOOR");
  let options = await targetOptions();
  expect(options).not.toContain(expect.stringContaining("DESK /"));
  expect(options).not.toContain(expect.stringContaining("SEAT /"));
  expect(options.at(1)).toContain("FLOOR /");

  await type.selectOption("DESK");
  options = await targetOptions();
  expect(options).not.toContain(expect.stringContaining("FLOOR /"));
  expect(options).not.toContain(expect.stringContaining("SEAT /"));
  expect(options.at(1)).toContain("DESK /");

  await type.selectOption("OFFICE");
  options = await targetOptions();
  expect(options).toEqual(["Whole office"]);
});
