import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";

import { GET } from "../../../src/app/auth/google/start/route";
import {
  OIDC_NONCE_COOKIE_NAME,
  OIDC_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "../../../src/features/auth/session";

describe("google start route", () => {
  test("clears any existing app session before starting oidc", async () => {
    const response = await GET(new NextRequest("http://127.0.0.1:3000/auth/google/start"));
    const setCookie = response.headers.getSetCookie().join("\n");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("accounts.google.com");
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970");
    expect(setCookie).toContain(`${OIDC_STATE_COOKIE_NAME}=`);
    expect(setCookie).toContain(`${OIDC_NONCE_COOKIE_NAME}=`);
  });
});
