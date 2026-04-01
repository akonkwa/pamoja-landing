import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0-client";

export async function proxy(request) {
  if (!auth0) {
    return NextResponse.next();
  }
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/auth/:path*"],
};
