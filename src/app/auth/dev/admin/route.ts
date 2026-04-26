import { NextRequest, NextResponse } from "next/server";

import { DEV_ADMIN_EMAIL, getDevUser } from "@/features/dev-user/dev-user";
import {
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  getSessionSecret,
} from "@/features/auth/session";
import { appRedirectUrl } from "@/lib/local-url";

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return NextResponse.redirect(appRedirectUrl("/login", request));
  }

  const user = await getDevUser(DEV_ADMIN_EMAIL);
  const response = NextResponse.redirect(appRedirectUrl("/admin", request));

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
      secure: isProduction,
    },
  );

  return response;
}
