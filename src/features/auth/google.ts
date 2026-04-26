import { randomBytes } from "node:crypto";

import type { UserRole } from "@prisma/client";

import { DEV_USER_EMAIL } from "@/features/dev-user/dev-user";
import { prisma } from "@/lib/prisma";

import {
  emailMatchesHostedDomain,
  getRoleForEmail,
  parseEmailList,
} from "./session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export type GoogleProfile = {
  email: string;
  name: string;
  hostedDomain?: string;
};

type TokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

type TokenInfoResponse = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  hd?: string;
  nonce?: string;
  error?: string;
  error_description?: string;
};

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function getGoogleRedirectUri(requestUrl: string) {
  return process.env.GOOGLE_REDIRECT_URI ?? new URL("/auth/google/callback", requestUrl).toString();
}

export function createGoogleAuthUrl(input: {
  requestUrl: string;
  state: string;
  nonce: string;
}) {
  const hostedDomain = process.env.GOOGLE_HOSTED_DOMAIN?.trim();
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(input.requestUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("prompt", "select_account");

  if (hostedDomain) {
    url.searchParams.set("hd", hostedDomain);
  }

  return url;
}

export async function exchangeGoogleCode(input: {
  code: string;
  requestUrl: string;
}) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: getGoogleRedirectUri(input.requestUrl),
      grant_type: "authorization_code",
    }),
  });
  const body = (await response.json()) as TokenResponse;

  if (!response.ok || !body.id_token) {
    throw new Error(body.error_description ?? body.error ?? "Google token exchange failed");
  }

  return body.id_token;
}

function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const [, encodedPayload] = idToken.split(".");

  if (!encodedPayload) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function verifyGoogleIdToken(input: {
  idToken: string;
  expectedNonce: string;
}): Promise<GoogleProfile> {
  const url = new URL(GOOGLE_TOKENINFO_URL);
  url.searchParams.set("id_token", input.idToken);

  const response = await fetch(url);
  const tokenInfo = (await response.json()) as TokenInfoResponse;

  if (!response.ok || tokenInfo.error) {
    throw new Error(tokenInfo.error_description ?? tokenInfo.error ?? "Google token verification failed");
  }

  if (tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google token audience mismatch");
  }

  if (tokenInfo.email_verified !== true && tokenInfo.email_verified !== "true") {
    throw new Error("Google email is not verified");
  }

  const jwtPayload = decodeJwtPayload(input.idToken);
  if (jwtPayload.nonce !== input.expectedNonce) {
    throw new Error("Google nonce mismatch");
  }

  if (!tokenInfo.email) {
    throw new Error("Google token is missing email");
  }

  if (
    !emailMatchesHostedDomain({
      email: tokenInfo.email,
      hostedDomain: process.env.GOOGLE_HOSTED_DOMAIN,
      googleHostedDomain: tokenInfo.hd,
    })
  ) {
    throw new Error("Google account is outside the allowed domain");
  }

  return {
    email: tokenInfo.email.toLowerCase(),
    name: tokenInfo.name ?? tokenInfo.email,
    hostedDomain: tokenInfo.hd,
  };
}

async function getDefaultOfficeId() {
  const configuredOffice = process.env.AUTH_DEFAULT_OFFICE_CODE
    ? await prisma.office.findUnique({
        where: { code: process.env.AUTH_DEFAULT_OFFICE_CODE },
        select: { id: true },
      })
    : undefined;

  if (configuredOffice) {
    return configuredOffice.id;
  }

  const devUser = await prisma.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    select: { assignedOfficeId: true },
  });

  if (devUser) {
    return devUser.assignedOfficeId;
  }

  const office = await prisma.office.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!office) {
    throw new Error("No office available for new Google user");
  }

  return office.id;
}

function roleForEmail(email: string): UserRole {
  return getRoleForEmail(email, parseEmailList(process.env.AUTH_ADMIN_EMAILS));
}

export async function upsertGoogleUser(profile: GoogleProfile) {
  const role = roleForEmail(profile.email);
  const existingUser = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true },
  });

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: { name: profile.name, role },
      include: { assignedOffice: true },
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      role,
      assignedOfficeId: await getDefaultOfficeId(),
    },
    include: { assignedOffice: true },
  });
}
