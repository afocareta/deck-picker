import { NextRequest, NextResponse } from "next/server";

import { getDevUser } from "@/features/dev-user/dev-user";
import {
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  getSessionSecret,
} from "@/features/auth/session";
import { appRedirectUrl } from "@/lib/local-url";

export async function GET(request: NextRequest) {
  const user = await getDevUser();
  const response = NextResponse.redirect(appRedirectUrl("/dashboard", request));

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
}
