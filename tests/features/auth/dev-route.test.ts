import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";

import { GET } from "../../../src/app/auth/dev/route";
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  verifySessionCookieValue,
} from "../../../src/features/auth/session";

describe("dev auth route", () => {
  test("creates a signed dev session and redirects to dashboard", async () => {
    const response = await GET(new NextRequest("http://127.0.0.1:3000/auth/dev"));
    const setCookie = response.headers.getSetCookie().join("\n");
    const sessionCookie = /desk_picker_session=([^;]+)/.exec(setCookie)?.[1];

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/dashboard");
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(sessionCookie).toBeTruthy();
    expect(
      verifySessionCookieValue({
        value: sessionCookie,
        secret: getSessionSecret(),
      })?.email,
    ).toBe("dev.user@example.com");
  });

  test("creates a browser-session cookie", async () => {
    const response = await GET(new NextRequest("http://127.0.0.1:3000/auth/dev"));
    const sessionSetCookie = response.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

    expect(sessionSetCookie).toBeTruthy();
    expect(sessionSetCookie).not.toContain("Max-Age=");
    expect(sessionSetCookie).not.toContain("Expires=");
  });
});
