import { NextRequest, NextResponse } from "next/server";

import {
  exchangeGoogleCode,
  upsertGoogleUser,
  verifyGoogleIdToken,
} from "@/features/auth/google";
import {
  OIDC_NONCE_COOKIE_NAME,
  OIDC_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  getSessionSecret,
} from "@/features/auth/session";
import { appRedirectUrl } from "@/lib/local-url";

function loginError(request: NextRequest, error: string) {
  return NextResponse.redirect(appRedirectUrl(`/login?error=${encodeURIComponent(error)}`, request));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(OIDC_STATE_COOKIE_NAME)?.value;
  const expectedNonce = request.cookies.get(OIDC_NONCE_COOKIE_NAME)?.value;

  if (!code || !state || !expectedState || state !== expectedState || !expectedNonce) {
    return loginError(request, "invalid_google_state");
  }

  try {
    const idToken = await exchangeGoogleCode({ code, requestUrl: request.url });
    const profile = await verifyGoogleIdToken({ idToken, expectedNonce });
    const user = await upsertGoogleUser(profile);
    const response = NextResponse.redirect(appRedirectUrl("/dashboard", request));

    response.cookies.delete(OIDC_STATE_COOKIE_NAME);
    response.cookies.delete(OIDC_NONCE_COOKIE_NAME);
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionCookieValue({
        payload: {
          userId: user.id,
          email: user.email,
          issuedAt: Math.floor(Date.now() / 1000),
        },
        secret: getSessionSecret(),
      }),
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    );

    return response;
  } catch (error) {
    return loginError(request, error instanceof Error ? error.message : "google_login_failed");
  }
}
