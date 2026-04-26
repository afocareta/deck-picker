import { NextRequest, NextResponse } from "next/server";

import {
  createGoogleAuthUrl,
  createOpaqueToken,
  isGoogleAuthConfigured,
} from "@/features/auth/google";
import {
  OIDC_COOKIE_MAX_AGE_SECONDS,
  OIDC_NONCE_COOKIE_NAME,
  OIDC_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/features/auth/session";
import { appRedirectUrl } from "@/lib/local-url";

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(appRedirectUrl("/login?error=google_not_configured", request));
  }

  const state = createOpaqueToken();
  const nonce = createOpaqueToken();
  const response = NextResponse.redirect(
    createGoogleAuthUrl({
      requestUrl: request.url,
      state,
      nonce,
    }),
  );

  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.set(OIDC_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    maxAge: OIDC_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(OIDC_NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    maxAge: OIDC_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
