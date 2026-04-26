import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";

import { SESSION_COOKIE_NAME } from "../../../src/features/auth/session";
import { GET } from "../../../src/app/logout/route";

describe("logout route", () => {
  test("clears the session cookie and redirects to login", async () => {
    const response = await GET(new NextRequest("http://127.0.0.1:3000/logout"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
    expect(response.headers.getSetCookie().join("\n")).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(response.headers.getSetCookie().join("\n")).toContain("Expires=Thu, 01 Jan 1970");
  });
});
