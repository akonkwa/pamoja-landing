import { NextResponse } from "next/server";
import { clearLinkedInConnection, logEvent } from "../../../../lib/fs-store";

export async function POST() {
  clearLinkedInConnection();
  logEvent("linkedin_direct_disconnected", {});
  return NextResponse.json({ ok: true });
}
