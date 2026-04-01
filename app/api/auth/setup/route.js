import { NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/crypto-utils";
import { logEvent, readUser, writeUser } from "../../../../lib/fs-store";
import { COOKIE_NAME, createSessionValue } from "../../../../lib/session";

export async function POST(request) {
  if (readUser()) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  const body = await request.json();
  if (!body.username || !body.password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  writeUser({
    username: body.username,
    password: hashPassword(body.password),
    createdAt: new Date().toISOString(),
  });
  logEvent("user_created", { username: body.username });

  const response = NextResponse.json({ ok: true, username: body.username });
  response.cookies.set(COOKIE_NAME, createSessionValue(body.username), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
