import { NextResponse } from "next/server";
import { getLinkedInConnectionState } from "../../../../lib/auth-access";

export async function GET(request) {
  return NextResponse.json(await getLinkedInConnectionState(request));
}
