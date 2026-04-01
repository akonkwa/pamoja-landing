import { NextResponse } from "next/server";
import { verifyPassword } from "../../../../lib/crypto-utils";
import { logEvent, readUser } from "../../../../lib/fs-store";
import { COOKIE_NAME, createSessionValue } from "../../../../lib/session";

export async function POST(request) {
  const user = readUser();
  if (!user) {
    return NextResponse.json({ error: "No local user is configured yet" }, { status: 400 });
  }
  const body = await request.json();
  const valid = body.username === user.username && verifyPassword(body.password || "", user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  logEvent("user_logged_in", { username: user.username });
  const response = NextResponse.json({ ok: true, username: user.username });
  response.cookies.set(COOKIE_NAME, createSessionValue(user.username), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
