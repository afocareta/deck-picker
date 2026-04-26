import { describe, expect, test } from "vitest";

import {
  createSessionCookieValue,
  emailMatchesHostedDomain,
  getRoleForEmail,
  parseEmailList,
  verifySessionCookieValue,
} from "../../../src/features/auth/session";

describe("auth session helpers", () => {
  test("signed session cookies round-trip and reject tampering", () => {
    const cookie = createSessionCookieValue({
      payload: { userId: "user-1", email: "person@example.com", issuedAt: 1 },
      secret: "test-secret",
    });

    expect(verifySessionCookieValue({ value: cookie, secret: "test-secret" })).toEqual({
      userId: "user-1",
      email: "person@example.com",
      issuedAt: 1,
    });

    const tamperedCookie = `${cookie.slice(0, -1)}${cookie.endsWith("a") ? "b" : "a"}`;
    expect(verifySessionCookieValue({ value: tamperedCookie, secret: "test-secret" })).toBeUndefined();
  });

  test("hosted domain accepts exact hd claims and email-domain fallback", () => {
    expect(emailMatchesHostedDomain({ email: "Person@Example.com", hostedDomain: "example.com" })).toBe(true);
    expect(emailMatchesHostedDomain({ email: "person@sub.example.com", hostedDomain: "example.com" })).toBe(false);
    expect(
      emailMatchesHostedDomain({
        email: "person@other.com",
        hostedDomain: "example.com",
        googleHostedDomain: "example.com",
      }),
    ).toBe(true);
  });

  test("admin role comes from env allowlist", () => {
    const allowlist = parseEmailList("admin@example.com, lead@example.com\nowner@example.com");

    expect(getRoleForEmail("LEAD@example.com", allowlist)).toBe("ADMIN");
    expect(getRoleForEmail("user@example.com", allowlist)).toBe("USER");
  });
});
