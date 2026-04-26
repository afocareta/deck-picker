import { NextRequest } from "next/server";

export function appRedirectUrl(path: string, request: NextRequest) {
  const url = new URL(path, request.url);

  if (process.env.NODE_ENV !== "production" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    url.hostname = "127.0.0.1";
  }

  return url;
}
