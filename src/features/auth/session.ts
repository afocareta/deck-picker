import { createHmac, timingSafeEqual } from "node:crypto";

import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "desk_picker_session";
export const OIDC_STATE_COOKIE_NAME = "desk_picker_oidc_state";
export const OIDC_NONCE_COOKIE_NAME = "desk_picker_oidc_nonce";
export const OIDC_COOKIE_MAX_AGE_SECONDS = 60 * 10;

export type SessionPayload = {
  userId: string;
  email: string;
  issuedAt: number;
};

type CreateSessionInput = {
  payload: SessionPayload;
  secret: string;
};

type VerifySessionInput = {
  value: string | undefined;
  secret: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionCookieValue({ payload, secret }: CreateSessionInput) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifySessionCookieValue({ value, secret }: VerifySessionInput): SessionPayload | undefined {
  if (!value) {
    return undefined;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return undefined;
  }

  const expectedSignature = sign(encodedPayload, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<SessionPayload>;

    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.issuedAt !== "number"
    ) {
      return undefined;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return undefined;
  }
}

export function parseEmailList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getRoleForEmail(email: string, adminEmails: Set<string>): UserRole {
  return adminEmails.has(email.toLowerCase()) ? "ADMIN" : "USER";
}

export function emailMatchesHostedDomain(input: {
  email: string;
  hostedDomain: string | undefined;
  googleHostedDomain?: string;
}) {
  const hostedDomain = input.hostedDomain?.trim().toLowerCase();

  if (!hostedDomain) {
    return true;
  }

  const googleHostedDomain = input.googleHostedDomain?.trim().toLowerCase();

  if (googleHostedDomain) {
    return googleHostedDomain === hostedDomain;
  }

  const [, emailDomain] = input.email.toLowerCase().split("@");
  return emailDomain === hostedDomain;
}

export function getSessionSecret() {
  if (process.env.AUTH_SESSION_SECRET) {
    return process.env.AUTH_SESSION_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SESSION_SECRET is required in production");
  }

  return "desk-picker-local-development-session-secret";
}
