import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" && request.nextUrl.hostname === "localhost") {
    const url = request.nextUrl.clone();

    url.hostname = "127.0.0.1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
