import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/features/auth/session";
import { appRedirectUrl } from "@/lib/local-url";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(appRedirectUrl("/login", request));

  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}
